export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
};

async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    return false;
  }
}

async function makeRequest(url: string, options: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
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
      const errorMessage = response.statusText || 'Network response was not ok';
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const fetcher = async (url: string, options: RequestInit = {}, retries = 2): Promise<any> => {
  try {
    // Skip health check for health endpoint to avoid loops
    if (!url.includes('/health')) {
      const isHealthy = await checkServerHealth();
      if (!isHealthy && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetcher(url, options, retries - 1);
      } else if (!isHealthy) {
        throw new Error('Cannot connect to the server. Please try again later.');
      }
    }

    return await makeRequest(url, options);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetcher(url, options, retries - 1);
    }

    throw error;
  }
};
