'use client';

import { useEffect, useState } from 'react';
import type { CloudinaryInterface } from '@/types/cloudinary';

export function CloudinaryScriptLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const CLOUDINARY_SCRIPT_URL = 'https://upload-widget.cloudinary.com/global/all.js';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${CLOUDINARY_SCRIPT_URL}"]`);
    if (existingScript || window.cloudinary) {
      setIsLoaded(true);
      return;
    }

    let mounted = true;

    // Create and load script if not present
    const script = document.createElement('script');
    script.src = CLOUDINARY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (mounted) {
        if (window.cloudinary) {
          setIsLoaded(true);
          setError(null);
        } else {
          setError(new Error('Cloudinary script loaded but global object not found'));
        }
      }
    };

    script.onerror = (e) => {
      if (mounted) {
        console.error('Error loading Cloudinary script:', e);
        setIsLoaded(false);
        setError(new Error('Failed to load Cloudinary script'));
      }
    };

    // Add script to head
    document.head.appendChild(script);

    // Start checking for cloudinary object
    const checkInterval = setInterval(() => {
      if (window.cloudinary) {
        setIsLoaded(true);
        setError(null);
        clearInterval(checkInterval);
      }
    }, 100);

    // Cleanup function
    return () => {
      mounted = false;
      clearInterval(checkInterval);
      const scriptToRemove = document.querySelector(`script[src="${CLOUDINARY_SCRIPT_URL}"]`);
      if (scriptToRemove && scriptToRemove.parentNode) {
        scriptToRemove.parentNode.removeChild(scriptToRemove);
      }
    };
  }, []);

  if (error) {
    return (
      <div role="alert" className="sr-only">
        Error loading image upload functionality. Please refresh the page.
      </div>
    );
  }

  return null;
}
