'use client';

import { useState } from 'react';

interface UseApiStateProps<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApiState<T>({ onSuccess, onError }: UseApiStateProps<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (apiCall: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err: any) {
      const error = new Error(err.response?.data?.message || err.message);
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    error,
    isLoading,
    execute,
    setData,
  };
}
