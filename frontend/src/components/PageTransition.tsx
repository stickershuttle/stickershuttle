import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      // Only animate for marketspace routes
      if (url.includes('/marketspace') || router.asPath.includes('/marketspace')) {
        setIsAnimating(true);
      }
    };

    const handleRouteChangeComplete = () => {
      if (isAnimating) {
        // Wait for exit animation, then update content and animate in
        setTimeout(() => {
          setDisplayChildren(children);
          setIsAnimating(false);
        }, 200); // Slightly longer for smoother transition
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeComplete);
    };
  }, [router, isAnimating, children]);

  // Update display children when not animating
  useEffect(() => {
    if (!isAnimating) {
      setDisplayChildren(children);
    }
  }, [children, isAnimating]);

  return (
    <div 
      className={`page-transition ${className} ${isAnimating ? 'page-transition-exit' : 'page-transition-enter'}`}
      style={{
        willChange: 'transform, opacity',
      }}
    >
      {displayChildren}
      
      <style jsx>{`
        .page-transition {
          opacity: 1;
          transform: translateY(0px) scale(1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
          backface-visibility: hidden;
          perspective: 1000px;
          transform-style: preserve-3d;
        }
        
        .page-transition-exit {
          opacity: 0;
          transform: translateY(-20px) scale(0.98);
        }
        
        .page-transition-enter {
          animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }
        
        /* Performance optimizations */
        .page-transition,
        .page-transition * {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          -moz-backface-visibility: hidden;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* GPU acceleration hints */
        .page-transition {
          contain: layout style paint;
          content-visibility: auto;
        }
        
        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          .page-transition {
            transition: opacity 0.2s ease !important;
            transform: none !important;
            animation: none !important;
          }
          
          .page-transition-exit {
            transform: none !important;
          }
          
          .page-transition-enter {
            animation: fadeIn 0.2s ease forwards !important;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        }
        
        /* Hardware acceleration for mobile */
        @media (max-width: 768px) {
          .page-transition {
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
          }
        }
      `}</style>
    </div>
  );
}
