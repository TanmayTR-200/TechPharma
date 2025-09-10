export async function fetchFromApi(path: string, options: RequestInit = {}) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const response = await fetch(`http://localhost:5000/api${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    // Try to parse JSON response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      throw new Error('Invalid response format from server');
    }

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        throw new Error('Authentication required');
      }
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    // Enhance error message with path information
    if (error instanceof Error) {
      error.message = `API Error (${path}): ${error.message}`;
    }
    throw error;
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
