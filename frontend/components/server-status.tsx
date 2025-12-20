'use client';

import { useState, useEffect } from 'react';
import { useToast } from './ui/use-toast';
import { checkServerStatus } from '@/lib/api-config';

export function ServerStatus() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    let checkInterval: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        const status = await checkServerStatus();
        if (!cancelled) {
          setIsConnected(status);
          if (!status) {
            toast({
              title: 'Server Connection Error',
              description: 'Unable to connect to the server. Please ensure the backend server is running.',
              variant: 'destructive',
              duration: 5000,
            });
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setIsConnected(false);
          // Show more specific error messages
          const errorMessage = err.message === 'Failed to fetch'
            ? 'Server is not responding. Please ensure the backend server is running on port 4000.'
            : err.message.includes('CORS')
              ? 'CORS error detected. Please check server configuration.'
              : 'Network error. Please check your connection and the backend server.';
              
          toast({
            title: 'Server Connection Error',
            description: errorMessage,
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    };

    // Initial check
    checkConnection();

    // Set up periodic checks every 30 seconds
    checkInterval = setInterval(checkConnection, 30000);

    return () => {
      cancelled = true;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [toast]);

  if (isConnected) return null; // Don't show anything when connected

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center space-x-2">
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>Server Disconnected</span>
      <button
        className="ml-4 px-2 py-1 bg-white text-red-500 rounded hover:bg-gray-100"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  );
}