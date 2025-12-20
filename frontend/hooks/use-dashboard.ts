import useSWR, { SWRConfiguration, Fetcher } from 'swr';
import { API_ENDPOINTS } from '@/lib/api-config';

interface DashboardStats {
  totalProducts: number;
  productViews: number;
  recentOrders: number;
  revenue: number;
}

interface Order {
  _id: string;
  user: string;
  items: Array<{
    product: {
      name: string;
      _id: string;
    };
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: string;
  createdAt: string;
  paymentDetails: {
    status: string;
    method: string;
  };
}

interface DashboardData {
  stats: DashboardStats;
  orders: Order[];
}

const dashboardFetcher: Fetcher<DashboardData, string> = async (url) => {
  // Safe localStorage access for SSR
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const token = getToken();
  if (!token) {
    throw new Error('No authentication token');
  }

  // Always use a fresh AbortController
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 8000);

  // Ensure we have the right token format
  const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': authToken,
        'Accept': 'application/json'
      },
      signal: abortController.signal,
      cache: 'no-store' // Prevent browser caching
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Please try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}`);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Type guard to validate response structure
    interface ApiResponse {
      data?: {
        stats?: DashboardStats;
        orders?: Order[];
      };
      stats?: DashboardStats;
      orders?: Order[];
    }

    const isValidResponse = (data: unknown): data is ApiResponse => {
      return typeof data === 'object' && data !== null;
    };

    if (!isValidResponse(data)) {
      throw new Error('Invalid response format from server');
    }
    
    // Handle different API response structures with better type safety
    const dashboardData: DashboardData = {
      stats: {
        totalProducts: Number(data?.data?.stats?.totalProducts ?? data?.stats?.totalProducts ?? 0),
        productViews: Number(data?.data?.stats?.productViews ?? data?.stats?.productViews ?? 0),
        recentOrders: Number(data?.data?.stats?.recentOrders ?? data?.stats?.recentOrders ?? 0),
        revenue: Number(data?.data?.stats?.revenue ?? data?.stats?.revenue ?? 0)
      },
      orders: (data?.data?.orders ?? data?.orders ?? []).filter((order): order is Order => {
        return Boolean(order && typeof order === 'object');
      })
    };

    // Get cache info from headers
    const cacheStatus = response.headers.get('X-Cache');
    const cacheRemaining = response.headers.get('X-Cache-Remaining');
    console.log(`Cache status: ${cacheStatus}, Remaining: ${cacheRemaining}`);

    return dashboardData;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  } finally {
    clearTimeout(timeout);
  }
};

export function useDashboard() {
  const config: SWRConfiguration = {
    refreshInterval: 300000, // Refresh every 5 minutes
    revalidateOnFocus: false, // Don't revalidate on window focus
    revalidateOnReconnect: false, // Don't revalidate on reconnect
    dedupingInterval: 300000, // Dedupe requests within 5 minutes
    focusThrottleInterval: 300000, // Throttle focus events
    loadingTimeout: 4000, // Show loading state after 4 seconds
    errorRetryCount: 2, // Only retry twice on errors
    shouldRetryOnError: (error) => {
      // Don't retry on rate limit errors
      if (error instanceof Error) {
        return !error.message.includes('Rate limit exceeded');
      }
      return true;
    },
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Don't retry on rate limit errors
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        return;
      }

      // Only retry up to 2 times
      if (retryCount >= 2) {
        return;
      }

      // Retry after 5 seconds
      setTimeout(() => {
        void revalidate({ retryCount });
      }, 5000);
    }
  };

  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.dashboard.base,
    dashboardFetcher,
    config
  );

  return {
    data,
    error,
    isLoading
  };
}