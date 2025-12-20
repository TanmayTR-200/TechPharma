export interface FetcherError extends Error {
  status?: number;
  info?: any;
}

export function fetcher<T = any>(
  url: string,
  options?: RequestInit
): Promise<T>;