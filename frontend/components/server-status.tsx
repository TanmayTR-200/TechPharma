'use client';

import { useState, useEffect, useRef } from 'react';
import { checkServerStatus } from '@/lib/api-config';

type Status = 'connected' | 'disconnected' | 'waking';

export function ServerStatus() {
  const [status, setStatus] = useState<Status>('disconnected');
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      try {
        const ok = await checkServerStatus();
        if (cancelled) return;

        if (ok) {
          retryCountRef.current = 0;
          setStatus('connected');
        } else {
          // Health check returned but not ok — genuinely down
          setStatus('disconnected');
        }
      } catch {
        if (cancelled) return;
        // Fetch failed — likely Render cold start.
        // Retry with backoff instead of immediately showing "disconnected".
        retryCountRef.current += 1;

        if (retryCountRef.current <= 5) {
          setStatus('waking');
          const delay = Math.min(2000 * retryCountRef.current, 10000);
          retryTimerRef.current = setTimeout(checkConnection, delay);
        } else {
          setStatus('disconnected');
        }
      }
    };

    checkConnection();

    // Periodic check every 60s once connected
    const checkInterval = setInterval(() => {
      if (status === 'connected') {
        retryCountRef.current = 0;
        checkConnection();
      }
    }, 60000);

    return () => {
      cancelled = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  if (status === 'connected') return null;

  if (status === 'waking') {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-500/10 text-foreground px-4 py-2 rounded-md shadow-lg z-50 flex items-center space-x-2">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        <span>Waking up server...</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-destructive/10 text-foreground px-4 py-2 rounded-md shadow-lg z-50 flex items-center space-x-2">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span>Server Disconnected</span>
      <button
        className="ml-4 px-2 py-1 bg-card text-destructive rounded hover:bg-secondary"
        onClick={() => {
          retryCountRef.current = 0;
          setStatus('waking');
          // Force immediate re-check
          window.location.reload();
        }}
      >
        Retry
      </button>
    </div>
  );
}
