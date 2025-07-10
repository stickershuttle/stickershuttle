import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  const fbPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect to font domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Google Fonts - moved to document for better performance */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Rubik:wght@300;400;500;600;700;800;900&family=VT323&display=swap"
          rel="stylesheet"
        />
        
        {/* Font Awesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591675/Asset_8_mhjgsx.svg?v=2" />
        <link rel="shortcut icon" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591675/Asset_8_mhjgsx.svg?v=2" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591675/Asset_8_mhjgsx.svg?v=2" />
        <link rel="icon" sizes="16x16 32x32 48x48" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591675/Asset_8_mhjgsx.svg?v=2" />
        
        {/* SEO Meta tags */}
        <meta name="description" content="Custom stickers, labels, and decals - High quality printing with fast shipping" />
        <meta name="keywords" content="stickers, custom stickers, labels, decals, printing" />
        <meta name="author" content="Sticker Shuttle" />
        
        {/* Mobile Web App Meta Tags (removed viewport - handled in _app.tsx) */}
        <meta name="theme-color" content="#030140" id="theme-color-meta" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sticker Shuttle" />
        
        {/* Safari specific meta tags for color matching */}
        <meta name="msapplication-navbutton-color" content="#030140" />
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* Console suppression script - runs immediately in production */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Only suppress in production
                if (typeof window !== 'undefined' && '${process.env.NODE_ENV}' === 'production') {
                  // Store original console methods
                  const originalConsole = {
                    log: console.log,
                    warn: console.warn,
                    error: console.error,
                    info: console.info,
                    debug: console.debug,
                    trace: console.trace,
                    table: console.table,
                    dir: console.dir,
                    dirxml: console.dirxml,
                    group: console.group,
                    groupCollapsed: console.groupCollapsed,
                    groupEnd: console.groupEnd,
                    time: console.time,
                    timeEnd: console.timeEnd,
                    timeLog: console.timeLog,
                    count: console.count,
                    countReset: console.countReset,
                    clear: console.clear,
                    assert: console.assert
                  };
                  
                  // Show suppression message before overriding
                  originalConsole.log('🔕 Console logs suppressed in production environment');
                  
                  // Override console methods with no-op functions
                  console.log = function() {};
                  console.warn = function() {};
                  console.info = function() {};
                  console.debug = function() {};
                  console.trace = function() {};
                  console.table = function() {};
                  console.dir = function() {};
                  console.dirxml = function() {};
                  console.group = function() {};
                  console.groupCollapsed = function() {};
                  console.groupEnd = function() {};
                  console.time = function() {};
                  console.timeEnd = function() {};
                  console.timeLog = function() {};
                  console.count = function() {};
                  console.countReset = function() {};
                  console.clear = function() {};
                  console.assert = function() {};
                  
                  // Also override window.console to be safe
                  if (window.console) {
                    window.console.log = function() {};
                    window.console.warn = function() {};
                    window.console.info = function() {};
                    window.console.debug = function() {};
                    window.console.trace = function() {};
                    window.console.table = function() {};
                    window.console.dir = function() {};
                    window.console.dirxml = function() {};
                    window.console.group = function() {};
                    window.console.groupCollapsed = function() {};
                    window.console.groupEnd = function() {};
                    window.console.time = function() {};
                    window.console.timeEnd = function() {};
                    window.console.timeLog = function() {};
                    window.console.count = function() {};
                    window.console.countReset = function() {};
                    window.console.clear = function() {};
                    window.console.assert = function() {};
                  }
                }
              })();
            `,
          }}
        />
        {/* Google Analytics 4 (GA4) */}
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
        {/* Meta Pixel (Facebook) */}
        {fbPixelId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${fbPixelId}');fbq('track', 'PageView');`,
            }}
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* Meta Pixel noscript fallback */}
        {fbPixelId && (
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1" />`,
            }}
          />
        )}
      </body>
    </Html>
  )
} 