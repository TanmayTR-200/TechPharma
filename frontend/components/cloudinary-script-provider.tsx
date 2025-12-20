'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface CloudinaryContextType {
  isReady: boolean;
}

const CloudinaryContext = createContext<CloudinaryContextType>({ isReady: false });

export function useCloudinary() {
  return useContext(CloudinaryContext);
}

export function CloudinaryScriptProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.cloudinary) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Cloudinary widget loaded successfully');
      setIsReady(true);
    };

    script.onerror = () => {
      console.error('Failed to load Cloudinary widget');
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      setIsReady(false);
    };
  }, []);

  return (
    <CloudinaryContext.Provider value={{ isReady }}>
      {children}
    </CloudinaryContext.Provider>
  );
}