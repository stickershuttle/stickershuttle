import Head from 'next/head';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  keywords?: string;
  robots?: string;
  structuredData?: object;
  preconnect?: string[];
  prefetch?: string[];
}

export default function SEOHead({
  title = "Sticker Shuttle - Custom Stickers & Vinyl Signs | High Quality Printing",
  description = "Custom stickers, vinyl banners, and decals with fast shipping. Professional quality printing for business, personal, and promotional use. Order now!",
  canonical,
  ogTitle,
  ogDescription,
  ogImage = "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png",
  ogType = "website",
  ogUrl,
  twitterCard = "summary_large_image",
  twitterSite = "@stickershuttle",
  twitterCreator = "@stickershuttle",
  keywords = "custom stickers, vinyl stickers, decals, labels, printing, vinyl banners, holographic stickers, clear stickers, glitter stickers",
  robots = "index, follow",
  structuredData,
  preconnect = [],
  prefetch = []
}: SEOHeadProps) {
  const fullTitle = title.includes('Sticker Shuttle') ? title : `${title} - Sticker Shuttle`;
  const finalOgTitle = ogTitle || fullTitle;
  const finalOgDescription = ogDescription || description;
  const finalCanonical = canonical || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://stickershuttle.com');
  const finalOgUrl = ogUrl || finalCanonical;

  // Default structured data for organization
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sticker Shuttle",
    "url": "https://stickershuttle.com",
    "logo": "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png",
    "description": "Professional custom sticker printing with fast shipping and high quality materials.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-555-STICKER",
      "contactType": "customer service",
      "email": "orbit@stickershuttle.com"
    },
    "sameAs": [
      "https://twitter.com/stickershuttle",
      "https://instagram.com/stickershuttle"
    ],
    "foundingDate": "2024",
    "numberOfEmployees": "1-10",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    }
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />
      <meta name="author" content="Sticker Shuttle" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:site_name" content="Sticker Shuttle" />
      <meta property="og:locale" content="en_US" />
      
      {/* Additional OG image properties for better display */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content="Sticker Shuttle - Custom Sticker Printing" />
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content="Sticker Shuttle - Custom Sticker Printing" />
      
      {/* Favicon and Icons */}
      <link rel="icon" type="image/svg+xml" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591674/AlienSSFavicon_jlkmoi.svg" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
      
      {/* Theme Color */}
      <meta name="theme-color" content="#030140" />
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#030140" />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#030140" />
      <meta name="msapplication-navbutton-color" content="#030140" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Sticker Shuttle" />
      
      {/* Performance Hints */}
      <link rel="dns-prefetch" href="//res.cloudinary.com" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="dns-prefetch" href="//api.stripe.com" />
      <link rel="dns-prefetch" href="//js.stripe.com" />
      
      {/* Custom preconnect */}
      {preconnect.map((url, index) => (
        <link key={index} rel="preconnect" href={url} />
      ))}
      
      {/* Custom prefetch */}
      {prefetch.map((url, index) => (
        <link key={index} rel="prefetch" href={url} />
      ))}
      
      {/* Preload critical resources */}
      <link
        rel="preload"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Rubik:wght@300;400;500;600;700;800;900&display=swap"
        as="style"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Rubik:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData || defaultStructuredData)
        }}
      />
      
      {/* Additional SEO optimizations */}
      <meta httpEquiv="x-ua-compatible" content="IE=edge" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="generator" content="Next.js" />
      
      {/* Prevent indexing of sensitive pages in production */}
      {typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && (
        <meta name="robots" content="noindex, nofollow" />
      )}
    </Head>
  );
} 