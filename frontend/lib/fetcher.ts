interface FetcherError extends Error {
  status?: number;
  info?: any;
}

export async function fetcher<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const info = await response.json();
      const error = new Error(info.message || 'Failed to fetch data') as FetcherError;
      error.status = response.status;
      error.info = info;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch data');
  }
}