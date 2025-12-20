
// API Configuration
export const API_CONFIG = {
  port: 5001,
  timeout: 8000,
  retries: 3,
  retryDelay: 1000
};

// Backend base URL without /api prefix
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Function to build API URL properly
export const buildApiUrl = (path: string) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/api/${cleanPath}`;
};

// Helper to check server health
const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(buildApiUrl('health'));
    return response.ok;
  } catch (error) {
    console.warn('Health check failed:', error);
    return false;
  }
};

// Helper for retrying failed requests
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const API_ENDPOINTS = {
  auth: {
    login: buildApiUrl('auth/login'),
    register: buildApiUrl('auth/register'),
    me: buildApiUrl('auth/me'),
    health: buildApiUrl('health'),
    forgotPassword: buildApiUrl('auth/forgot-password'),
    resetPassword: buildApiUrl('auth/reset-password'),
  },
  products: {
    base: buildApiUrl('products'),
    list: (page: number = 1, sort: string = '') => 
      buildApiUrl(`products?page=${page}${sort ? `&sort=${sort}` : ''}`),
    delete: (id: string) => buildApiUrl(`products/${id}`),
    update: (id: string) => buildApiUrl(`products/${id}`),
    create: buildApiUrl('products'),
  },
  categories: {
    base: buildApiUrl('categories'),
  },
  orders: {
    base: buildApiUrl('orders'),
    stats: buildApiUrl('orders/stats'),
  },
  dashboard: {
    base: buildApiUrl('dashboard'),
    analytics: buildApiUrl('dashboard/analytics'),
    stats: buildApiUrl('dashboard/stats'),
  },
  cart: {
    base: buildApiUrl('cart'),
    add: buildApiUrl('cart/add'),
  },
  messages: {
    list: buildApiUrl('messages'),
    conversations: buildApiUrl('messages/conversations'),
    thread: (userId: string) => buildApiUrl(`messages/${userId}`),
    send: buildApiUrl('messages/send'),
  }
};


export const checkServerStatus = async (): Promise<boolean> => {
  try {
    // Check the API health endpoint
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    // Don't throw, just return false for network errors
    console.warn('Error checking server status:', error);
    return false;
  }
};

// Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; etag?: string }>();
const CACHE_DURATION = 30000; // 30 seconds cache

export const fetcher = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Override cache settings if specified in options
  if (options.cache === 'no-store') {
    return fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    }).then(r => r.json());
  }

  // Handle caching for GET requests
  const cacheKey = `${url}-${token}`; // Cache key includes auth token
  const cached = apiCache.get(cacheKey);
  
  if (options.method === undefined || options.method === 'GET') {
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      let response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal
      });

      // Handle 401 with token refresh
      if (response.status === 401 && url !== API_ENDPOINTS.auth.login) {
        const newToken = await import('./token-refresh').then(m => m.refreshToken());
        
        if (newToken) {
          // Retry the request with new token
          response = await fetch(url, {
            ...options,
            headers: {
              ...headers,
              'Authorization': `Bearer ${newToken}`,
              ...options.headers,
            },
            signal: controller.signal
          });
        } else {
          throw new Error('Session expired. Please login again.');
        }
      }

      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('application/json') 
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new Error(
          typeof data === 'object' && data.message
            ? data.message
            : `Request failed with status ${response.status}`
        );
      }

      // Cache successful GET responses
      if (options.method === undefined || options.method === 'GET') {
        // Store response in cache with ETag
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          etag: response.headers.get('ETag') || undefined
        });
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
};
