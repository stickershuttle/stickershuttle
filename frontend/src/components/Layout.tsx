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
}

export default function Layout({ 
  children, 
  title = "Sticker Shuttle - Premium Custom Stickers & Vinyl Banners", 
  description,
  ogImage,
  keywords,
  canonical,
  structuredData,
  preconnect
}: LayoutProps) {
  const router = useRouter();
  
  // Check if we're on the marketspace page or a marketspace product page
  const isMarketspacePage = router.pathname === '/marketspace' || 
                           router.pathname.startsWith('/marketspace/') || 
                           router.pathname === '/creators-space-apply';
  
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
      
      <div className="min-h-screen text-white relative" style={{ backgroundColor: '#030140', fontFamily: 'Inter, sans-serif' }}>
        <UniversalHeader />
        <main className={isMarketspacePage ? "pt-16" : "pt-16"}>
          {children}
        </main>
        <UniversalFooter />
      </div>
    </>
  );
} 