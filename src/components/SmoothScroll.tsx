import React, { useEffect } from 'react';
import Lenis from 'lenis';

interface SmoothScrollProps {
  children: React.ReactNode;
}

export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children }) => {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId: number | undefined;
    let lenis: Lenis | undefined;

    const stopSmoothScroll = () => {
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
        frameId = undefined;
      }
      lenis?.destroy();
      lenis = undefined;
    };

    const updateSmoothScroll = () => {
      stopSmoothScroll();
      if (reducedMotion.matches) {
        return;
      }

      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      });

      const raf = (time: number) => {
        lenis?.raf(time);
        frameId = requestAnimationFrame(raf);
      };
      frameId = requestAnimationFrame(raf);
    };

    updateSmoothScroll();
    reducedMotion.addEventListener('change', updateSmoothScroll);

    return () => {
      reducedMotion.removeEventListener('change', updateSmoothScroll);
      stopSmoothScroll();
    };
  }, []);

  return <>{children}</>;
};
