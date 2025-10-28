import Head from 'next/head';
import { usePageSEO } from '../hooks/usePageSEO';

interface DynamicSEOHeadProps {
  // Allow overriding any field manually (takes precedence over database)
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

export default function DynamicSEOHead({
  title: manualTitle,
  description: manualDescription,
  canonical: manualCanonical,
  ogTitle: manualOgTitle,
  ogDescription: manualOgDescription,
  ogImage: manualOgImage,
  ogType: manualOgType,
  ogUrl: manualOgUrl,
  twitterCard: manualTwitterCard,
  twitterSite = "@stickershuttle",
  twitterCreator = "@stickershuttle",
  keywords: manualKeywords,
  robots: manualRobots,
  structuredData: manualStructuredData,
  preconnect = [],
  prefetch = []
}: DynamicSEOHeadProps) {
  // Fetch SEO data from database based on current page path
  const { seoData } = usePageSEO();
  
  // Merge: manual props > database > defaults
  const title = manualTitle || seoData?.title || "Sticker Shuttle - Premium Custom Stickers & Vinyl Banners";
  const description = manualDescription || seoData?.description || "Custom stickers, vinyl banners, and decals with fast shipping. Professional quality printing for business, personal, and promotional use. Order now!";
  const keywords = manualKeywords || seoData?.keywords || "custom stickers, vinyl stickers, decals, labels, printing, vinyl banners, holographic stickers, clear stickers, glitter stickers";
  const robots = manualRobots || seoData?.robots || "index, follow";
  
  const ogImage = manualOgImage || seoData?.ogImage || "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png";
  const ogType = manualOgType || seoData?.ogType || "website";
  const twitterCard = manualTwitterCard || seoData?.twitterCard || "summary_large_image";
  
  const fullTitle = title.includes('Sticker Shuttle') ? title : `${title} - Sticker Shuttle`;
  const finalOgTitle = manualOgTitle || seoData?.ogTitle || fullTitle;
  const finalOgDescription = manualOgDescription || seoData?.ogDescription || description;
  const finalCanonical = manualCanonical || seoData?.canonicalUrl || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://stickershuttle.com');
  const finalOgUrl = manualOgUrl || seoData?.ogUrl || finalCanonical;
  
  const twitterTitle = seoData?.twitterTitle || finalOgTitle;
  const twitterDescription = seoData?.twitterDescription || finalOgDescription;
  const twitterImage = seoData?.twitterImage || ogImage;

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
  
  const finalStructuredData = manualStructuredData || seoData?.structuredData || defaultStructuredData;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />
      <meta name="author" content="Sticker Shuttle" />
      
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
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      <meta name="twitter:image" content={twitterImage} />
      <meta name="twitter:image:alt" content="Sticker Shuttle - Custom Sticker Printing" />
      
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
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(finalStructuredData)
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

