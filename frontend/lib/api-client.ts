// Constants
const API_BASE_URL = 'http://localhost:4000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TIMEOUT = 8000;

// Helper functions
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

// Main fetch wrapper with retries and error handling
export const fetchWithRetry = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Health check on first attempt
      if (attempt === 0 && !url.includes('/health')) {
        const isHealthy = await checkServerHealth();
        if (!isHealthy) {
          throw new Error('Server is not responding to health checks');
        }
      }

      // Setup request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || 
            `Request failed with status ${response.status}`
          );
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }
        return await response.text();

      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Server may be overloaded.');
        }
        throw error;
      }

    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);

      // Special handling for network errors
      if (error.message === 'Failed to fetch' || error.message.includes('Server is not responding')) {
        if (attempt === MAX_RETRIES - 1) {
          throw new Error('Cannot connect to server. Please ensure the backend is running.');
        }
        await wait(RETRY_DELAY);
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError || new Error('Request failed after multiple attempts');
};

// API client functions
export const apiClient = {
  auth: {
    login: async (email: string, password: string) => {
      return fetchWithRetry(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    },
    getMe: async () => {
      return fetchWithRetry(`${API_BASE_URL}/api/auth/me`);
    }
  },
  dashboard: {
    getStats: async () => {
      return fetchWithRetry(`${API_BASE_URL}/api/dashboard/stats`);
    }
  },
  products: {
    getAll: async () => {
      return fetchWithRetry(`${API_BASE_URL}/api/products`);
    }
  }
};