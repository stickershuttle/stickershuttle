import { ReactNode } from "react";
import SEOHead from "./SEOHead";
import UniversalHeader from "./UniversalHeader";
import UniversalFooter from "./UniversalFooter";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
}

export default function Layout({ 
  children, 
  title = "Sticker Shuttle - Custom Stickers & Vinyl Signs", 
  description,
  ogImage 
}: LayoutProps) {
  return (
    <>
      <SEOHead 
        title={title}
        description={description}
        ogImage={ogImage}
      />
      
      <div className="min-h-screen text-white relative" style={{ backgroundColor: '#030140', fontFamily: 'Inter, sans-serif' }}>
        <UniversalHeader />
        <main className="pt-16">
          {children}
        </main>
        <UniversalFooter />
      </div>
    </>
  );
} 