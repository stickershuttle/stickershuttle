import Layout from "@/components/Layout";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import ProductReviews from "@/components/ProductReviews";
import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { ProductCategory } from "@/types/product";
import Link from "next/link";

export default function SamplePacks() {
  const { addToCart } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    
    const samplePackProduct = {
      id: 'sample-pack',
      sku: 'SP-001',
      name: 'Sample Pack by Sticker Shuttle',
      description: 'Sample pack with 6 different sticker types',
      shortDescription: 'Try 6 different sticker types',
      category: 'vinyl-stickers' as ProductCategory,
      basePrice: 9.00,
      images: ['https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750890354/Sample-Pack_jsy2yf.png'],
      defaultImage: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750890354/Sample-Pack_jsy2yf.png',
      features: ['6 Different Sticker Types', 'Free Shipping', 'Premium Quality'],
      customizable: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const samplePackCustomization = {
      productId: 'sample-pack',
      selections: {},
      totalPrice: 9.00
    };

    const samplePackItem = {
      id: `sample-pack-${Date.now()}`,
      product: samplePackProduct,
      customization: samplePackCustomization,
      quantity: 1,
      unitPrice: 9.00,
      totalPrice: 9.00,
      addedAt: new Date().toISOString()
    };

    addToCart(samplePackItem);
    setIsAddingToCart(false);
  };

  const stickerTypes = [
    { 
      name: 'Premium Matte Sticker', 
      description: 'Smooth, non-reflective finish',
      image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
      filter: 'drop-shadow(0 0 12px rgba(168, 242, 106, 0.35)) drop-shadow(0 0 24px rgba(168, 242, 106, 0.21))'
    },
    { 
      name: 'Holographic Sticker', 
      description: 'Rainbow holographic effect',
      image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png',
      filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.35)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.21))'
    },
    { 
      name: 'Glitter Sticker', 
      description: 'Sparkly glitter finish',
      image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png',
      filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.35)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.21))'
    },
    { 
      name: 'Clear Sticker', 
      description: 'Transparent background',
      image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg',
      filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.3))'
    },
    { 
      name: 'Chrome Sticker', 
      description: 'Metallic mirror finish',
      image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png',
      filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.28)) drop-shadow(0 0 12px rgba(180, 180, 180, 0.21)) drop-shadow(0 0 18px rgba(240, 240, 240, 0.14))'
    },
    { 
      name: 'Premium Gloss Sticker', 
      description: 'High-gloss shiny finish',
      image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png',
      filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.35)) drop-shadow(0 0 24px rgba(34, 197, 94, 0.21))'
    }
  ];

  return (
    <Layout title="Sample Pack - Try Our Best Sticker Styles | Sticker Shuttle">
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
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Product Section */}
      <section className="pt-[20px] pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* Product Image */}
            <div className="container-style p-6 md:p-8 h-full">
              <div className="relative w-full aspect-square">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750890354/Sample-Pack_jsy2yf.png"
                  alt="Sample Pack by Sticker Shuttle"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>

            {/* Product Details */}
            <div className="container-style p-6 md:p-8">
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4"
                      style={{
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                        backgroundColor: '#fbbf24',
                        boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)'
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">G</span>
                  </div>
                  <div className="w-4 h-4">
                    <div
                      style={{
                        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                        backgroundColor: '#22c55e'
                      }}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">f</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                Sample Pack by Sticker Shuttle
              </h1>

              {/* Description */}
              <p className="text-gray-300 text-lg mb-4">
                Curious if our quality stands up to your current sticker provider?
              </p>

              <div className="flex items-center gap-2 mb-6">
                <span className="text-purple-300 text-lg font-medium">
                  Get a pack of our most common styles!
                </span>
                <span className="text-2xl">👇</span>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-white text-sm">Now ONLY</span>
                  <span className="text-white text-3xl font-bold">$9</span>
                  <span className="text-green-400 text-sm font-medium">+ Free Shipping</span>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="primaryButton w-full py-4 px-6 font-bold text-lg rounded-lg transition-colors mb-6"
              >
                {isAddingToCart ? 'Adding to Cart...' : 'Add to cart'}
              </button>

              {/* Pickup Info */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-medium">Pickup available at Denver HQ</span>
                </div>
                <p className="text-gray-300 text-sm mb-2 ml-7">
                  Usually ready in 24 hours
                </p>
                <button className="text-purple-300 hover:text-purple-200 underline text-sm ml-7">
                  View store information
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-8">
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
          <div className="container-style p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
              What's In Your Sample Pack
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stickerTypes.map((type, index) => (
                <div key={index} className="container-style p-4 flex items-center gap-4">
                  <div className="w-16 h-16 flex-shrink-0">
                    <img 
                      src={type.image}
                      alt={type.name}
                      className="w-full h-full object-contain"
                      style={{ filter: type.filter }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">
                      {type.name}
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-6">
              <p className="text-purple-300 text-lg">
                Perfect for testing quality before placing larger orders! 🎯
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Brands Section */}
      <section className="pt-7 pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
          <div className="flex justify-center mb-6">
            <div 
              className="px-6 py-2 rounded-full text-center text-lg text-gray-300"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              Quality trusted by these brands:
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