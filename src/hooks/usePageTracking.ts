import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    const isEnabled = import.meta.env.VITE_GA4_ENABLED === 'true';
    if (isEnabled && typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
      if (import.meta.env.DEV) {
        console.log(`[GA4 PageView] ${location.pathname + location.search}`);
      }
    }
  }, [location]);
}
