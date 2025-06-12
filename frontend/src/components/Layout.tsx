import { ReactNode } from "react";
import Head from "next/head";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title = "Sticker Shuttle - Custom Stickers & Vinyl Signs" }: LayoutProps) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Rubik:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/svg+xml" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591674/AlienSSFavicon_jlkmoi.svg" />
        
        {/* iOS Status Bar and Theme Color */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#030140" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#030140" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#030140" />
        <meta name="msapplication-navbutton-color" content="#030140" />
        <meta name="apple-mobile-web-app-title" content="Sticker Shuttle" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        
        <title>{title}</title>
      </Head>
      
      <div className="min-h-screen text-white relative" style={{ backgroundColor: '#030140', fontFamily: 'Inter, sans-serif' }}>
        <Header />
        <main>
          {children}
        </main>
      </div>
    </>
  );
} 