import { ReactNode } from "react";
import { useRouter } from "next/router";
import SEOHead from "./SEOHead";
import UniversalHeader from "./UniversalHeader";
import UniversalFooter from "./UniversalFooter";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
  keywords?: string;
  canonical?: string;
  structuredData?: object;
  preconnect?: string[];
  customLogo?: string;
  customLogoAlt?: string;
  customBackground?: string;
  forceBannershipMode?: boolean;
}

export default function Layout({ 
  children, 
  title = "Sticker Shuttle - Premium Custom Stickers & Vinyl Banners", 
  description,
  ogImage,
  keywords,
  canonical,
  structuredData,
  preconnect,
  customLogo,
  customLogoAlt,
  customBackground,
  forceBannershipMode
}: LayoutProps) {
  const router = useRouter();
  
  // Check if we're on the marketspace page or a marketspace product page
  const isMarketspacePage = router.pathname === '/marketspace' || 
                           router.pathname.startsWith('/marketspace/') || 
                           router.pathname === '/creators-space-apply';
  
  // Check if we're on a bannership page
  const isBannershipPage = router.pathname === '/bannership' || 
                          router.pathname.startsWith('/bannership/');
  
  return (
    <>
      <SEOHead 
        title={title}
        description={description}
        ogImage={ogImage}
        keywords={keywords}
        canonical={canonical}
        structuredData={structuredData}
        preconnect={preconnect}
      />
      
      <div className="min-h-screen text-white relative" style={{ backgroundColor: customBackground || (isBannershipPage ? '#000000' : '#030140'), fontFamily: 'Inter, sans-serif' }}>
        <UniversalHeader customLogo={customLogo} customLogoAlt={customLogoAlt} forceBannershipMode={forceBannershipMode} />
        <main className={isMarketspacePage ? "pt-16" : "pt-16"}>
          {children}
        </main>
        <UniversalFooter forceBannershipMode={forceBannershipMode} />
      </div>
    </>
  );
} 