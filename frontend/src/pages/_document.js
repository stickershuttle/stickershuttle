import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
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
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 