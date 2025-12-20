// API Configuration

export const API_CONFIG = {// API Configuration

  port: 5001,export const API_CONFIG = {

  timeout: 8000,  port: 5001,

  retries: 3,  timeout: 8000,

  retryDelay: 1000  retries: 3,

};  retryDelay: 1000

};

// Backend base URL without /api prefix

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';// Backend base URL without /api prefix

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Function to build API URL properly

export const buildApiUrl = (path: string) => {// Function to build API URL properly

  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;export const buildApiUrl = (path: string) => {

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

  return `${base}/api/${cleanPath}`;  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

};  return `${base}/api/${cleanPath}`;

};

// Helper to check server health

export const checkServerStatus = async (): Promise<boolean> => {// Helper to check server health

  try {const checkServerHealth = async (): Promise<boolean> => {

    const response = await fetch(buildApiUrl('health'), {  try {

      headers: { 'Accept': 'application/json' }    const response = await fetch(buildApiUrl('health'));

    });    return response.ok;

    return response.ok;  } catch (error) {

  } catch (error) {    console.warn('Health check failed:', error);

    console.warn('Health check failed:', error);    return false;

    return false;  }

  }};

};

// Helper for retrying failed requests

// Helper for retrying failed requestsconst wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const API_ENDPOINTS = {

// Cache for API responses  auth: {

const apiCache = new Map<string, { data: any; timestamp: number; etag?: string }>();    login: buildApiUrl('auth/login'),

const CACHE_DURATION = 30000; // 30 seconds cache    register: buildApiUrl('auth/register'),

    me: buildApiUrl('auth/me'),

// API Endpoints using the buildApiUrl function    health: buildApiUrl('health'),

export const API_ENDPOINTS = {    forgotPassword: buildApiUrl('auth/forgot-password'),

  auth: {    resetPassword: buildApiUrl('auth/reset-password'),

    login: buildApiUrl('auth/login'),  },

    register: buildApiUrl('auth/register'),  products: {

    me: buildApiUrl('auth/me'),    base: buildApiUrl('products'),

    health: buildApiUrl('health'),    list: (page: number = 1, sort: string = '') => 

    forgotPassword: buildApiUrl('auth/forgot-password'),      buildApiUrl(`products?page=${page}${sort ? `&sort=${sort}` : ''}`),

    resetPassword: buildApiUrl('auth/reset-password'),    delete: (id: string) => buildApiUrl(`products/${id}`),

  },    update: (id: string) => buildApiUrl(`products/${id}`),

  products: {    create: buildApiUrl('products'),

    base: buildApiUrl('products'),  },

    list: (page: number = 1, sort: string = '', filters?: Record<string, string>) => {  categories: {

      const params = new URLSearchParams();    base: buildApiUrl('categories'),

      params.append('page', page.toString());  },

      if (sort) params.append('sort', sort);  orders: {

      if (filters) {    base: buildApiUrl('orders'),

        Object.entries(filters).forEach(([key, value]) => {    stats: buildApiUrl('orders/stats'),

          if (value) params.append(key, value);  },

        });  dashboard: {

      }    base: buildApiUrl('dashboard'),

      return `${buildApiUrl('products')}?${params.toString()}`;    analytics: buildApiUrl('dashboard/analytics'),

    },    stats: buildApiUrl('dashboard/stats'),

    delete: (id: string) => buildApiUrl(`products/${id}`),  },

    update: (id: string) => buildApiUrl(`products/${id}`),  cart: {

    create: buildApiUrl('products'),    base: buildApiUrl('cart'),

  },    add: buildApiUrl('cart/add'),

  categories: {  },

    base: buildApiUrl('categories'),  messages: {

  },    list: buildApiUrl('messages'),

  orders: {    conversations: buildApiUrl('messages/conversations'),

    base: buildApiUrl('orders'),    thread: (userId: string) => buildApiUrl(`messages/${userId}`),

    stats: buildApiUrl('orders/stats'),    send: buildApiUrl('messages/send'),

  },  }

  dashboard: {};

    base: buildApiUrl('dashboard'),

    analytics: buildApiUrl('dashboard/analytics'),

    stats: buildApiUrl('dashboard/stats'),export const checkServerStatus = async (): Promise<boolean> => {

  },  try {

  cart: {    // Check the API health endpoint

    base: buildApiUrl('cart'),    const response = await fetch(`${API_BASE_URL}/api/health`);

    add: buildApiUrl('cart/add'),    return response.ok;

  },  } catch (error) {

  messages: {    // Don't throw, just return false for network errors

    list: buildApiUrl('messages'),    console.warn('Error checking server status:', error);

    conversations: buildApiUrl('messages/conversations'),    return false;

    thread: (userId: string) => buildApiUrl(`messages/${userId}`),  }

    send: buildApiUrl('messages/send'),};

  }

};// Cache for API responses

const apiCache = new Map<string, { data: any; timestamp: number; etag?: string }>();

export const fetcher = async (url: string, options: RequestInit = {}): Promise<any> => {const CACHE_DURATION = 30000; // 30 seconds cache

  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {export const fetcher = async (url: string, options: RequestInit = {}): Promise<any> => {

    'Content-Type': 'application/json',  const token = localStorage.getItem('token');

    'Accept': 'application/json',  const headers: Record<string, string> = {

  };    'Content-Type': 'application/json',

  if (token) {    'Accept': 'application/json',

    headers['Authorization'] = `Bearer ${token}`;  };

  }  if (token) {

    headers['Authorization'] = `Bearer ${token}`;

  // Override cache settings if specified in options  }

  if (options.cache === 'no-store') {

    return fetch(url, {  // Override cache settings if specified in options

      ...options,  if (options.cache === 'no-store') {

      headers: { ...headers, ...options.headers }    return fetch(url, {

    }).then(r => r.json());      ...options,

  }      headers: { ...headers, ...options.headers }

    }).then(r => r.json());

  // Handle caching for GET requests  }

  const cacheKey = `${url}-${token}`; // Cache key includes auth token

  const cached = apiCache.get(cacheKey);  // Handle caching for GET requests

    const cacheKey = `${url}-${token}`; // Cache key includes auth token

  if (options.method === undefined || options.method === 'GET') {  const cached = apiCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {  

      return cached.data;  if (options.method === undefined || options.method === 'GET') {

    }    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {

    if (cached?.etag) {      return cached.data;

      headers['If-None-Match'] = cached.etag;    }

    }    if (cached?.etag) {

  }      headers['If-None-Match'] = cached.etag;

    }

  try {  }

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);  try {

    const controller = new AbortController();

    try {    const timeout = setTimeout(() => controller.abort(), 8000);

      let response = await fetch(url, {

        ...options,    try {

        headers: {      let response = await fetch(url, {

          ...headers,        ...options,

          ...options.headers,        headers: {

        },          ...headers,

        signal: controller.signal          ...options.headers,

      });        },

        signal: controller.signal

      // Handle 401 with token refresh      });

      if (response.status === 401 && !url.includes('/auth/login')) {

        const newToken = await import('./token-refresh').then(m => m.refreshToken());      // Handle 401 with token refresh

              if (response.status === 401 && url !== API_ENDPOINTS.auth.login) {

        if (newToken) {        const newToken = await import('./token-refresh').then(m => m.refreshToken());

          // Retry the request with new token        

          response = await fetch(url, {        if (newToken) {

            ...options,          // Retry the request with new token

            headers: {          response = await fetch(url, {

              ...headers,            ...options,

              'Authorization': `Bearer ${newToken}`,            headers: {

              ...options.headers,              ...headers,

            },              'Authorization': `Bearer ${newToken}`,

            signal: controller.signal              ...options.headers,

          });            },

        } else {            signal: controller.signal

          throw new Error('Session expired. Please login again.');          });

        }        } else {

      }          throw new Error('Session expired. Please login again.');

        }

      const contentType = response.headers.get('content-type');      }

      const data = contentType?.includes('application/json') 

        ? await response.json()      const contentType = response.headers.get('content-type');

        : await response.text();      const data = contentType?.includes('application/json') 

        ? await response.json()

      if (!response.ok) {        : await response.text();

        throw new Error(

          typeof data === 'object' && data.message      if (!response.ok) {

            ? data.message        throw new Error(

            : `Request failed with status ${response.status}`          typeof data === 'object' && data.message

        );            ? data.message

      }            : `Request failed with status ${response.status}`

        );

      // Cache successful GET responses      }

      if (options.method === undefined || options.method === 'GET') {

        // Store response in cache with ETag      // Cache successful GET responses

        apiCache.set(cacheKey, {      if (options.method === undefined || options.method === 'GET') {

          data,        // Store response in cache with ETag

          timestamp: Date.now(),        apiCache.set(cacheKey, {

          etag: response.headers.get('ETag') || undefined          data,

        });          timestamp: Date.now(),

      }          etag: response.headers.get('ETag') || undefined

      return data;        });

    } finally {      }

      clearTimeout(timeout);      return data;

    }    } finally {

  } catch (error: any) {      clearTimeout(timeout);

    if (error.name === 'AbortError') {    }

      throw new Error('Request timed out. Please try again.');  } catch (error: any) {

    }    if (error.name === 'AbortError') {

    throw error;      throw new Error('Request timed out. Please try again.');

  }    }

};    throw error;
  }
};
