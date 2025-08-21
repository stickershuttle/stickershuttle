import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

interface UsePageTransitionOptions {
  duration?: number;
  easing?: string;
  shouldAnimate?: (from: string, to: string) => boolean;
}

export default function usePageTransition({
  duration = 300,
  easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
  shouldAnimate = (from, to) => from.includes('/marketspace') || to.includes('/marketspace')
}: UsePageTransitionOptions = {}) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'exiting' | 'entering'>('idle');

  const startTransition = useCallback((url: string) => {
    if (shouldAnimate(router.asPath, url)) {
      setIsTransitioning(true);
      setTransitionStage('exiting');
    }
  }, [router.asPath, shouldAnimate]);

  const completeTransition = useCallback(() => {
    if (isTransitioning) {
      // Wait for exit animation to complete
      setTimeout(() => {
        setTransitionStage('entering');
        // Then complete the entering animation
        setTimeout(() => {
          setIsTransitioning(false);
          setTransitionStage('idle');
        }, duration);
      }, duration / 2);
    }
  }, [isTransitioning, duration]);

  useEffect(() => {
    router.events.on('routeChangeStart', startTransition);
    router.events.on('routeChangeComplete', completeTransition);
    router.events.on('routeChangeError', completeTransition);

    return () => {
      router.events.off('routeChangeStart', startTransition);
      router.events.off('routeChangeComplete', completeTransition);
      router.events.off('routeChangeError', completeTransition);
    };
  }, [router.events, startTransition, completeTransition]);

  return {
    isTransitioning,
    transitionStage,
    transitionStyles: {
      transition: `all ${duration}ms ${easing}`,
      willChange: isTransitioning ? 'transform, opacity' : 'auto',
    }
  };
}
