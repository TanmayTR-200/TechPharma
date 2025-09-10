'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import type { CloudinaryInterface } from '@/types/cloudinary';

export function CloudinaryScriptLoader() {
  const [scriptError, setScriptError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = (e: Error) => {
    console.error('Error loading Cloudinary script:', e);
    setScriptError(true);
  };

  const handleLoad = () => {
    console.log('Cloudinary script loaded successfully');
    setIsLoaded(true);
  };

  // Fallback check in case the script loads but the onLoad event doesn't fire
  useEffect(() => {
    if (!isLoaded) {
      const checkInterval = setInterval(() => {
        if (window.cloudinary) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 1000);

      // Clear interval after 10 seconds if script hasn't loaded
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isLoaded && !window.cloudinary) {
          setScriptError(true);
        }
      }, 10000);

      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [isLoaded]);

  return (
    <>
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        strategy="lazyOnload"
        onError={handleError}
        onLoad={handleLoad}
      />
      {scriptError && (
        <div role="alert" className="sr-only">
          Error loading image upload functionality. Please refresh the page.
        </div>
      )}
    </>
  );
}
