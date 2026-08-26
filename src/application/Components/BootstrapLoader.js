'use client';

import { useEffect } from 'react';

/**
 * BootstrapLoader Component
 * Dynamically loads Bootstrap JS only on the client side
 * This prevents SSR errors since Bootstrap JS requires browser APIs (document, window)
 */
export default function BootstrapLoader() {
  useEffect(() => {
    // Only import Bootstrap JS on the client side
    if (typeof window !== 'undefined') {
      // Import Bootstrap as a module (Bootstrap 5 exports everything as named exports)
      import('bootstrap')
        .then((bootstrapModule) => {
          // Bootstrap 5 exports all components as named exports
          // Create a bootstrap object with all components
          const bootstrap = {};
          
          // Copy all exports to bootstrap object
          Object.keys(bootstrapModule).forEach(key => {
            bootstrap[key] = bootstrapModule[key];
          });
          
          // Explicitly expose Bootstrap on window object (like Hello Kuppam does)
          window.bootstrap = bootstrap;
          
          console.log('✅ Bootstrap JS loaded and exposed on window.bootstrap');
          console.log('✅ Bootstrap Offcanvas available:', !!window.bootstrap.Offcanvas);
          console.log('✅ Bootstrap Modal available:', !!window.bootstrap.Modal);
          console.log('✅ Bootstrap keys:', Object.keys(bootstrap).slice(0, 15));
        })
        .catch((error) => {
          console.error('❌ Failed to load Bootstrap JS:', error);
        });
    }
  }, []);

  // This component doesn't render anything
  return null;
}

