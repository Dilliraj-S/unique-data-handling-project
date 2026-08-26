'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * ViewModal Component
 * Displays record details in an offcanvas (like Hello Kuppam)
 * Uses Bootstrap offcanvas to show record information
 */
const ViewModal = ({ 
  show, 
  onClose, 
  data 
}) => {
  const offcanvasInstanceRef = useRef(null);
  const offcanvasElementRef = useRef(null);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  // Wait for Bootstrap to be ready
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBootstrap = () => {
      // Check for Bootstrap in multiple ways
      if (window.bootstrap && window.bootstrap.Offcanvas) {
        console.log('✅ Bootstrap Offcanvas is ready');
        setBootstrapReady(true);
        return true;
      }
      // Also check if Bootstrap is available as a default export
      if (window.bootstrap && typeof window.bootstrap.Offcanvas === 'function') {
        console.log('✅ Bootstrap Offcanvas is ready (function check)');
        setBootstrapReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkBootstrap()) {
      return;
    }

    // If not ready, wait and check again
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds (50 * 100ms)
    
    const interval = setInterval(() => {
      attempts++;
      if (checkBootstrap()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('❌ Bootstrap Offcanvas not available after 5 seconds');
        console.error('Window.bootstrap:', window.bootstrap);
        console.error('Available on window:', Object.keys(window).filter(k => k.toLowerCase().includes('bootstrap')));
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!show || !data || !data.content || !bootstrapReady) {
      return;
    }

    console.log('🎯 Initializing offcanvas with data:', { show, hasContent: !!data.content });

    const offcanvasElement = offcanvasElementRef.current;
    if (!offcanvasElement) {
      console.error('❌ Offcanvas element not found');
      return;
    }

    console.log('✅ Offcanvas element found, creating/showing instance');

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        // Check if there's an existing instance
        let offcanvas = window.bootstrap.Offcanvas.getInstance(offcanvasElement);
        
        if (!offcanvas) {
          console.log('📦 Creating new Offcanvas instance');
          // Create new instance if one doesn't exist
          offcanvas = new window.bootstrap.Offcanvas(offcanvasElement, {
            backdrop: 'static'
          });
          offcanvasInstanceRef.current = offcanvas;
        } else {
          console.log('♻️ Using existing Offcanvas instance');
        }

        // Show the offcanvas
        console.log('👁️ Showing offcanvas');
        offcanvas.show();

        // Handle close event
        const handleHidden = () => {
          console.log('🟡 Offcanvas hidden event');
          if (onClose) {
            onClose();
          }
        };
        
        offcanvasElement.addEventListener('hidden.bs.offcanvas', handleHidden, { once: true });

        return () => {
          if (offcanvasElement) {
            offcanvasElement.removeEventListener('hidden.bs.offcanvas', handleHidden);
          }
        };
      } catch (error) {
        console.error('❌ Error showing offcanvas:', error);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [show, data, bootstrapReady, onClose]);

  useEffect(() => {
    if (!show && offcanvasInstanceRef.current) {
      // Hide offcanvas when show is false
      try {
        console.log('🟡 Hiding offcanvas');
        offcanvasInstanceRef.current.hide();
      } catch (e) {
        console.warn('Error hiding offcanvas:', e);
      }
    }
  }, [show]);

  // Always render the offcanvas element (even if no data) so ref is available
  // But only show content when data is available
  return (
    <div
      ref={offcanvasElementRef}
      className="offcanvas offcanvas-end skeleton-offcanvas"
      id="view-offcanvas"
      tabIndex="-1"
      data-bs-backdrop="static"
    >
      <div className="offcanvas-header skeleton-offcanvas-header">
        <div className="skeleton-ofc-hdr-lbl-grp">
          <h5 className="offcanvas-title skeleton-offcanvas-label">
            {data?.label || 'Record Details'}
          </h5>
        </div>
        <div className="skeleton-ofc-hdr-btn-grp">
          <button
            type="button"
            className="offcanvas-data-reload-btn"
            title="Reload"
          >
            <i className="fa-light fa-refresh"></i>
          </button>
          <button
            type="button"
            className="offcanvas-fullscreen-btn"
            title="Fullscreen"
          >
            <i className="fa-light fa-expand"></i>
          </button>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            title="Close"
            data-bs-dismiss="offcanvas"
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
      </div>
      
      <div className="offcanvas-body skeleton-offcanvas-body">
        {data?.content ? (
          <div dangerouslySetInnerHTML={{ __html: data.content }} />
        ) : (
          <div>Loading...</div>
        )}
      </div>

      <div className="offcanvas-footer skeleton-offcanvas-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          data-bs-dismiss="offcanvas"
        >
          Close
        </button>
      </div>

      <div className="offcanvas-dragbar">
        <i className="fa-solid fa-ellipsis-vertical"></i>
      </div>
    </div>
  );
};

export default ViewModal;

