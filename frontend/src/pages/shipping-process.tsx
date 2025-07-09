import Layout from "@/components/Layout";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import Link from "next/link";
import { useState } from "react";

export default function ShippingProcess() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How long does it take to ship?",
      answer: "For most cases, 2-5 business days. At checkout, you'll be able to split Next-Day Air with us. All orders with 1,000+ stickers get upgraded to Next-Day Air."
    },
    {
      question: "Where do you ship from?",
      answer: "Sticker Shuttle is located and operated out of Denver, CO. We print and ship everything from this location."
    },
    {
      question: "Can you do expedited shipping?",
      answer: "Absolutely. At checkout, you can select to split Next-Day Air via UPS with us."
    },
    {
      question: "Can you ship to all 50 states?",
      answer: "Yes. Hawaii, Alaska, and Puerto Rico... we got you."
    },
    {
      question: "What if my stickers come damaged?",
      answer: "Contact us immediately and we'll find a resolution we're both happy with!"
    },
    {
      question: "What if I don't receive my package?",
      answer: "Again, no biggie! Sometimes s happens in transit, and it can get lost. We'll send you some more if it's been ten days and you haven't recieved your stickers."
    }
  ];

  return (
    <Layout title="Shipping Process - Fast & Reliable Delivery | Sticker Shuttle">
      <style jsx>{`
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        .button-style {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(59, 130, 246, 0.4);
          box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
        }
        .pulse-ring {
          animation: pulseRing 2s infinite;
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Hero Section with Banner Background */}
      <section className="pt-[20px] pb-2 md:pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl pt-12 pb-8 px-8 md:px-12 md:p-12 relative overflow-hidden"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750888554/0cbdca9d-24bc-4d66-b744-ec7012d2cd50.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Mobile gradient overlay */}
            <div 
              className="absolute inset-0 md:hidden rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #4c1d95 0%, #6b21a8 25%, #7c3aed 50%, #8b5cf6 75%, #a855f7 100%)'
              }}
            ></div>
            
            <div className="text-center relative z-10">
              {/* Desktop Stars, Facebook, and Google - Above Title */}
              <div className="hidden md:flex items-center justify-center gap-2 mb-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4"
                      style={{
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                        backgroundColor: '#fbbf24',
                        boxShadow: '0 0 8px rgba(251, 191, 36, 0.6), 0 0 16px rgba(251, 191, 36, 0.3)'
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <img 
                    src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" 
                    alt="Google" 
                    className="h-4 w-4 opacity-80"
                  />
                </div>
              </div>

              {/* Desktop Title and Subtitle */}
              <div className="hidden md:block mb-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl leading-none mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  Shipping Process
                </h1>
                <p className="text-gray-300 text-base">
                  Fast, reliable delivery to your doorstep
                </p>
              </div>

              {/* Mobile Stars, Facebook, and Google - Above Title */}
              <div className="md:hidden flex items-center justify-center gap-2 mb-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4"
                      style={{
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                        backgroundColor: '#fbbf24',
                        boxShadow: '0 0 8px rgba(251, 191, 36, 0.6), 0 0 16px rgba(251, 191, 36, 0.3)'
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <img 
                    src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" 
                    alt="Google" 
                    className="h-4 w-4 opacity-80"
                  />
                </div>
              </div>

              {/* Mobile Title and Subtitle */}
              <div className="md:hidden mb-4 text-center">
                <h1 className="text-4xl leading-none mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  Shipping Process
                </h1>
                <p className="text-gray-300 text-sm">
                  Fast, reliable delivery to your doorstep
                </p>
              </div>

              {/* Desktop Description */}
              <p className="hidden md:block text-base sm:text-lg mb-6 text-purple-100 max-w-3xl mx-auto">
                Tired of waiting for your stickers to arrive? We've got you covered. Most orders are printed and shipped within 24-48 hours.
              </p>
              
              {/* Mobile Pills Description */}
              <div className="md:hidden flex flex-wrap justify-center gap-2 mb-4">
                <span className="px-3 py-1 text-xs font-medium bg-white/20 text-white rounded-full">
                  Free Shipping
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-white/20 text-white rounded-full">
                  2-4 Days
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-white/20 text-white rounded-full">
                  Real-time Tracking
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="container-style p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Map */}
              <div className="relative h-64 md:h-96">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750887414/United_States_53730f59-3d19-44e1-8d61-6fd88272eda1_hot3ls.svg"
                  alt="United States Map"
                  className="w-full h-full object-contain"
                />
                
                {/* Overlay text */}
                <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-white text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span>Nationwide Coverage</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  We ship to all 50 states.
                </h2>
                <p className="text-gray-300 text-base mb-6">
                  While we may talk a lot about space, we take pride in helping our communities by operating out of the United States. All orders are printed and shipped out of Denver, CO. Nothing is outsourced. Plus, all of our material is also made in the U.S.
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white font-medium">Free shipping on all orders</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-white font-medium">2-4 business day delivery</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-white font-medium">Real-time tracking updates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shipping Carriers Section */}
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              Trusted Shipping Partners
            </h2>
            <p className="text-gray-300 text-sm">
              We work with the best carriers to ensure reliable delivery
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* UPS */}
            <div className="container-style p-4 text-center relative">
              {/* Most Used Badge */}
              <div className="absolute -top-2 -right-2">
                <span className="bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Most Used
                </span>
              </div>
              
              <div className="flex items-center justify-center mb-3 h-12">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750366915/ups-logo-png-transparent_fpyiwe.png"
                  alt="UPS Logo"
                  className="max-h-full w-auto object-contain"
                />
              </div>
              <p className="text-gray-300 text-sm">
                Reliable express, ground, and overnight shipping
              </p>
            </div>

            {/* USPS */}
            <div className="container-style p-4 text-center">
              <div className="flex items-center justify-center mb-3 h-10">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750366914/USPS-Logo_lnyobe.png"
                  alt="USPS Logo"
                  className="max-h-full w-auto object-contain"
                />
              </div>
              <p className="text-gray-300 text-sm">
                Nationwide postal service coverage
              </p>
            </div>

            {/* FedEx */}
            <div className="container-style p-4 text-center">
              <div className="flex items-center justify-center mb-3 h-10">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750366916/purepng.com-fedex-logologobrand-logoiconslogos-251519939539h7rji_lru3bi.png"
                  alt="FedEx Logo"
                  className="max-h-full w-auto object-contain"
                />
              </div>
              <p className="text-gray-300 text-sm">
                Fast overnight and priority delivery
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Common questions:
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* How long does it take to ship? */}
            <div className="container-style p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg">How long does it take to ship?</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                For most cases, 2-5 business days. At checkout, you'll be able to split Next-Day Air with us. All orders with 1,000+ stickers get upgraded to Next-Day Air.
              </p>
            </div>

            {/* Where do you ship from? */}
            <div className="container-style p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg">Where do you ship from?</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Sticker Shuttle is located and operated out of Denver, CO. We print and ship everything from this location.
              </p>
            </div>

            {/* Can you do expedited shipping? */}
            <div className="container-style p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg">Can you do expedited shipping?</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Absolutely. At checkout, you can select to split Next-Day Air via UPS with us.
              </p>
            </div>

            {/* Can you ship to all 50 states? */}
            <div className="container-style p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg">Can you ship to all 50 states?</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Yes. Hawaii, Alaska, and Puerto Rico... we got you.
              </p>
            </div>

            {/* What if my stickers come damaged? */}
            <div className="container-style p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.865-.833-2.635 0L4.18 14.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg">What if my stickers come damaged?</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Contact us immediately and we'll find a resolution we're both happy with!
              </p>
            </div>

            {/* What if I don't receive my package? */}
            <div className="container-style p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold text-lg">What if I don't receive my package?</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Again, no biggie! Sometimes s happens in transit, and it can get lost. We'll send you some more if it's been ten days and you haven't recieved your stickers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="pt-7 pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="flex justify-center mb-6">
            <div 
              className="px-6 py-2 rounded-full text-center text-lg text-gray-300"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              Brands we ship for:
            </div>
          </div>
          <div className="relative overflow-hidden">
            <div 
              className="flex gap-6 animate-scroll"
              style={{
                animation: 'scroll 35s linear infinite',
                width: 'max-content'
              }}
            >
              {/* First set of brands */}
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" className="h-20 w-auto" />
              
              {/* Duplicate set for seamless loop */}
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" className="h-20 w-auto" />
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" className="h-20 w-auto" />
            </div>
            
            {/* Fade effects */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#030140] to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#030140] to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </Layout>
  );
} 
