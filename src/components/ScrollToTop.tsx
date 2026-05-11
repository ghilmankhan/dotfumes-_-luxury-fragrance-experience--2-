import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
};
