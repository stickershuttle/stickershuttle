import { ReactNode } from "react";
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
        <main className="pt-[calc(4rem+var(--header-alerts-height,0px)+52px)] sm:pt-[calc(4rem+var(--header-alerts-height,0px)+44px)]">
          {children}
        </main>
        <UniversalFooter />
      </div>
    </>
  );
} 