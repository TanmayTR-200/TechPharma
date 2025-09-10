const getBaseUrl = () => {
  // For production deployment
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // For local development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }

  // Fallback for preview deployments
  return 'https://techpharma-api.onrender.com';
};

export const API_BASE_URL = getBaseUrl();

// Make sure the URL doesn't end with a slash
const normalizedBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`,
    me: `${API_BASE_URL}/api/auth/me`,
    health: `${API_BASE_URL}/health`,
  },
  products: {
    base: `${API_BASE_URL}/api/products`,
  },
  categories: {
    base: `${API_BASE_URL}/api/categories`,
  },
  orders: {
    base: `${API_BASE_URL}/api/orders`,
  },
  messages: {
    base: `${API_BASE_URL}/api/messages`,
    conversations: `${API_BASE_URL}/api/messages/conversations`,
  },
};

async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced timeout to 3s for faster feedback

    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-cache' // Ensure fresh response
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    return false;
  }
}

async function makeRequest(url: string, options: RequestInit): Promise<any> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      // Check if the URL exists and is properly formatted
      if (!url) {
        throw new Error('No URL provided for the request');
      }

      // Ensure URL is properly formatted for local development
      const finalUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;

      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} of ${MAX_RETRIES} for ${finalUrl}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }

      // Debug log the request
      console.log('Making request:', {
        url: finalUrl,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? JSON.parse(options.body as string) : undefined,
        attempt: attempt + 1
      });

      const response = await fetch(finalUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = '';
        try {
          const error = await response.json();
          errorMessage = error.message || `Request failed with status: ${response.status}`;
        } catch {
          errorMessage = response.statusText || `Request failed with status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // If successful, return the response and break the retry loop
      return response.json();
    } catch (error: any) {
      lastError = error;
      clearTimeout(timeoutId);

      // If this was our last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        throw lastError;
      }

      // For network errors or timeouts, continue to retry
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        console.log(`Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message);
        continue;
      }

      // For other errors (like 4xx or 5xx), throw immediately
      throw error;
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Request failed after all retry attempts');
}

export const fetcher = async (url: string, options: RequestInit = {}): Promise<any> => {
  try {
    // Check server health for non-health-check requests
    if (!url.includes('/health')) {
      try {
        const isHealthy = await checkServerHealth();
        if (!isHealthy) {
          throw new Error('Server is not responding. Please check if the server is running.');
        }
      } catch (error: any) {
        console.error('Health check failed:', error);
        throw new Error('Cannot connect to server. Please ensure the backend server is running.');
      }
    }

    // Make the request with built-in retries
    return await makeRequest(url, options);
  } catch (error: any) {
    // Safely construct error details object
    const errorDetails: Record<string, any> = {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
    };

    // Only add stack trace if it exists
    if (error instanceof Error && error.stack) {
      errorDetails.stack = error.stack;
    }

    console.error('API request failed:', errorDetails);

    // Transform error messages for user-friendly display
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('failed to fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection and ensure the server is running.');
      } else if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        throw new Error('Request timed out. The server might be busy, please try again.');
      } else if (errorMessage.includes('network error') || errorMessage.includes('network request failed')) {
        throw new Error('Network error. Please check your internet connection.');
      } else if (errorMessage.includes('aborted')) {
        throw new Error('Request was cancelled. Please try again.');
      }
    }

    // If it's an Error object, throw it directly
    if (error instanceof Error) {
      throw error;
    }

    // For non-Error objects, create a new Error with a safe message
    throw new Error(
      typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.'
    );
  }
};
