import { API_BASE_URL } from './api-config';

interface TokenData {
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

let tokenRefreshPromise: Promise<string | null> | null = null;

export const refreshToken = async (): Promise<string | null> => {
  try {
    // Ensure only one refresh request is in flight
    if (tokenRefreshPromise) {
      return tokenRefreshPromise;
    }

    tokenRefreshPromise = (async () => {
      const currentToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!currentToken || !refreshToken) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        // Clear tokens on refresh failure
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return null;
      }

      const data: TokenData = await response.json();
      
      // Store new tokens
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      return data.token;
    })();

    const result = await tokenRefreshPromise;
    tokenRefreshPromise = null;
    return result;
  } catch (error) {
    console.error('Token refresh failed:', error);
    tokenRefreshPromise = null;
    return null;
  }
};