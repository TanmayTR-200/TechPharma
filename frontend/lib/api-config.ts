type ApiEndpointFunction = (id: string) => string;

interface ApiEndpoints {
  auth: {
    login: string;
    register: string;
    me: string;
    health: string;
    forgotPassword: string;
    resetPassword: string;
  };
  products: {
    base: string;
    list: (page?: number, sort?: string, filters?: Record<string, string>) => string;
    delete: (id: string) => string;
    update: (id: string) => string;
    create: string;
    sold: {
      list: string;
      archiveSale: (id: string) => string;
    };
  };
  categories: {
    base: string;
  };
  orders: {
    base: string;
    stats: string;
    list: string;
    archive: (orderId: string) => string;
  };
  dashboard: {
    base: string;
    analytics: string;
    stats: string;
  };
  cart: {
    base: string;
    add: string;
    update: (productId: string) => string;
    remove: (productId: string) => string;
    checkout: string;
  };
  messages: {
    list: (userId: string) => string;
    thread: (userId: string) => string;
    conversations: string;
    send: string;
  };
  users: {
    get: (id: string) => string;
    list: string;
  };
  notifications: {
    list: string;
    create: string;
    markAsRead: (id: string) => string;
    markAllAsRead: string;
    archive: (id: string) => string;
    listArchived: string;
  };
}

export const API_CONFIG = {
  port: 5000,
  timeout: 8000,
  retries: 3,
  retryDelay: 1000
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const buildApiUrl = (path: string): string => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  // Remove any leading 'api/' from the path to prevent duplication
  const cleanPath = path.replace(/^api\//, '').replace(/^\//, '');
  // Remove any instances of double /api/api/
  return `${base}/api/${cleanPath}`.replace(/\/api\/api\//g, '/api/');
};

export const API_ENDPOINTS: ApiEndpoints = {
  auth: {
    login: buildApiUrl('auth/login'),
    register: buildApiUrl('auth/register'),
    me: buildApiUrl('auth/me'),
    health: buildApiUrl('health'),
    forgotPassword: buildApiUrl('auth/forgot-password'),
    resetPassword: buildApiUrl('auth/reset-password')
  },
  products: {
    base: buildApiUrl('products'),
    list: (page: number = 1, sort: string = '', filters?: Record<string, string>): string => {
      // Create a new URLSearchParams object to avoid duplicates
      const params = new URLSearchParams();
      // Only add the base parameters if they're not in filters
      if (!filters?.page) params.append('page', page.toString());
      if (!filters?.sort && sort) params.append('sort', sort);
      // Add any additional filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && !params.has(key)) params.append(key, value);
        });
      }
      return `${buildApiUrl('products')}?${params.toString()}`;
    },
    delete: (id: string): string => buildApiUrl(`products/${id}`),
    update: (id: string): string => buildApiUrl(`products/${id}`),
    create: buildApiUrl('products'),
    sold: {
      list: buildApiUrl('products/sold'),
      archiveSale: (id: string): string => buildApiUrl(`products/sold/${id}/archive`)
    }
  },
  categories: {
    base: buildApiUrl('categories')
  },
  orders: {
    base: buildApiUrl('orders'),
    stats: buildApiUrl('orders/stats'),
    list: buildApiUrl('orders'),
    archive: (orderId: string) => buildApiUrl(`orders/${orderId}/archive`)
  },
  dashboard: {
    base: buildApiUrl('dashboard'),
    analytics: buildApiUrl('dashboard/analytics'),
    stats: buildApiUrl('dashboard/stats')
  },
  cart: {
    base: buildApiUrl('cart'),
    add: buildApiUrl('cart/add'),
    update: (productId: string) => buildApiUrl(`cart/update/${productId}`),
    remove: (productId: string) => buildApiUrl(`cart/remove/${productId}`),
    checkout: buildApiUrl('cart/checkout')
  },
  messages: {
    list: (userId: string): string => buildApiUrl(`messages/${userId}`),
    thread: (userId: string): string => buildApiUrl(`messages/${userId}`),
    conversations: buildApiUrl('messages/conversations'),
    send: buildApiUrl('messages/send')
  },
  users: {
    get: (id: string): string => buildApiUrl(`users/${id}`),
    list: buildApiUrl('users')
  },
  notifications: {
    list: buildApiUrl('notifications'),
    create: buildApiUrl('notifications/create'),
    markAsRead: (id: string) => buildApiUrl(`notifications/${id}/read`),
    markAllAsRead: buildApiUrl('notifications/mark-all-read'),
    archive: (id: string) => buildApiUrl(`notifications/${id}/archive`),
    listArchived: buildApiUrl('notifications/archived')
  }
};

export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.auth.health, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const fetcher = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Check if this is a public endpoint
  const isPublicEndpoint = url.includes('/health') || url.includes('/auth/login') || url.includes('/auth/register');

  // Only add token for non-public endpoints
  if (token && !isPublicEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    let retries = API_CONFIG.retries;
    while (retries > 0) {
      try {
        let response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            ...options.headers
          },
          signal: controller.signal
        });

        if (response.status === 401 && !url.includes('/auth/login')) {
          const newToken = await import('./token-refresh').then(m => m.refreshToken());
          
          if (newToken) {
            response = await fetch(url, {
              ...options,
              headers: {
                ...headers,
                'Authorization': `Bearer ${newToken}`,
                ...options.headers
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
          if (retries > 1 && response.status >= 500) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
            continue;
          }
          throw new Error(
            typeof data === 'object' && data.message
              ? data.message
              : `Request failed with status ${response.status}`
          );
        }

        return data;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        if (retries > 1 && error.message.includes('failed to fetch')) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Maximum retries reached');
  } finally {
    clearTimeout(timeout);
  }
};
