import Layout from "@/components/Layout";
import Link from "next/link";

export default function Deals() {
  return (
    <Layout title="100 Custom Stickers for $29 - Sticker Shuttle Deals">
        {/* Hero Section */}
        <section className="py-4 -mt-4 md:mt-0">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div 
              className="relative rounded-xl overflow-hidden pt-1 md:pt-1 pb-0"
              style={{
                backgroundImage: 'url("https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591677/Alien_USA_Map_y6wkf4.png")',
                backgroundSize: '150%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="text-center relative z-10" style={{ 
                  backdropFilter: 'blur(6px)', 
                  backgroundColor: 'rgba(3, 1, 64, 0.15)',
                  borderRadius: '24px',
                  padding: '2rem'
                }}>
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none -z-10">
                  <div 
                    className="w-full h-full opacity-20"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '30px 30px',
                      maskImage: `
                        radial-gradient(ellipse 70% 60% at center, 
                          rgba(0,0,0,1) 0%, 
                          rgba(0,0,0,0.6) 50%, 
                          rgba(0,0,0,0) 100%
                        )
                      `,
                      WebkitMaskImage: `
                        radial-gradient(ellipse 70% 60% at center, 
                          rgba(0,0,0,1) 0%, 
                          rgba(0,0,0,0.6) 50%, 
                          rgba(0,0,0,0) 100%
                        )
                      `
                    }}
                  ></div>
                </div>
                

                <p className="text-lg text-orange-400 mb-4 mt-1 font-bold" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  🔥 Limited Time Deal
                </p>
                
                <h1 className="text-5xl sm:text-6xl md:text-7xl mb-4 md:mb-8 leading-none relative" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  <span className="block">100 custom</span>
                  <span className="block">stickers for <span className="whitespace-nowrap">$29</span></span>
                </h1>
                <div className="flex flex-wrap justify-center gap-3 mb-6 md:mb-10">
                  <div 
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: 'rgba(168, 242, 106, 0.2)',
                      border: '1px solid rgba(168, 242, 106, 0.4)',
                      color: 'rgb(168, 242, 106)',
                      backdropFilter: 'blur(15px)'
                    }}
                  >
                    🏷️ Matte Vinyl Stickers
                  </div>
                  <div 
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: 'rgb(59, 130, 246)',
                      backdropFilter: 'blur(15px)'
                    }}
                  >
                    📏 3" Max Width
                  </div>
                  <div 
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: 'rgba(255, 215, 19, 0.2)',
                      border: '1px solid rgba(255, 215, 19, 0.4)',
                      color: 'rgb(255, 215, 19)',
                      backdropFilter: 'blur(15px)'
                    }}
                  >
                    🚀 Ships Next Day
                  </div>
                  <div 
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(15px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#d1d5db'
                    }}
                  >
                    👽 Not a conspiracy theory, just great deals.
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 mb-4">
                  <button 
                    className="px-12 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105"
                    style={{
                      backgroundColor: '#ffd713',
                      color: '#030140',
                      boxShadow: '2px 2px #cfaf13, 0 0 30px rgba(255, 215, 19, 0.42), 0 0 60px rgba(255, 215, 19, 0.28), 0 0 90px rgba(255, 215, 19, 0.14)',
                      borderRadius: '10px',
                      border: 'solid',
                      borderWidth: '0.03125rem',
                      borderColor: '#8d9912',
                      transform: 'scale(1.1)'
                    }}
                  >
                    Order Now →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Reviews Section */}
        <section className="py-12">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-white mb-8">What customers say</h2>
            
            {/* Desktop Reviews Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Review 1 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                    alt="Certified Garbage Rat"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                </p>
              </div>

              {/* Review 2 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                    alt="Panda Reaper"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                </p>
              </div>

              {/* Review 3 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601646/unnamed_14467655-4d00-451c-bca6-b5be86af2814_100x100_crop_center_cmftk1.webp" 
                    alt="Anita J"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Anita J</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                </p>
              </div>

              {/* Review 4 */}
              <div 
                className="rounded-xl p-6 flex flex-col"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                    alt="Rach Plants"
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                    alt="Google"
                    className="w-8 h-8 ml-auto"
                  />
                </div>
                <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                <div className="flex mb-4">
                  <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                  Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                </p>
              </div>
            </div>

            {/* Mobile Swipeable Reviews */}
            <div className="md:hidden overflow-x-auto pb-4 relative">
              
              <div className="flex space-x-4 w-max" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingLeft: 'calc(2.5vw + 1rem)', paddingRight: '50vw' }}>
                {/* Last review (positioned before first for endless scroll effect) */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                      alt="Rach Plants"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                  </p>
                </div>

                {/* First review - Now centered */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                      alt="Certified Garbage Rat"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                  </p>
                </div>

                {/* Second review */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                      alt="Panda Reaper"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                  </p>
                </div>

                {/* Third review */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601646/unnamed_14467655-4d00-451c-bca6-b5be86af2814_100x100_crop_center_cmftk1.webp" 
                      alt="Anita J"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Anita J</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Absolutely loved the quality and thickness of the stickers but what really made me excited was the ability to speak to the owner directly who provides amazing customer service and truly delivers on the timelines posted. Would recommend to anyone looking!
                  </p>
                </div>

                {/* Fourth review */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif" 
                      alt="Rach Plants"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Rach Plants</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers& Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Incredible! They were able to not only make my business logo into great quality stickers, they also made my own photos into stickers!! I recommend them to everyone looking for custom stickers! Beautiful work, quality, attention to detail, communication! 10/10!
                  </p>
                </div>

                {/* Duplicate first review for seamless loop */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp" 
                      alt="Certified Garbage Rat"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Certified Garbage Rat</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Stickers & Vinyl Banners</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    We got one of our designs custom made into stickers and they definitely did not disappoint! We had previously been using another website but the speed and quality of sticker shuttle is far better than our stickers before. I would highly recommend!
                  </p>
                </div>

                {/* Duplicate second review for seamless loop */}
                <div 
                  className="flex-shrink-0 w-72 rounded-xl p-6 flex flex-col"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="flex items-center mb-4">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif" 
                      alt="Panda Reaper"
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601653/Google__G__logo_svg_100x100_crop_center_hg9knc.avif" 
                      alt="Google"
                      className="w-8 h-8 ml-auto"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Panda Reaper</h3>
                  <p className="text-gray-400 text-sm mb-3">Matte Vinyl Stickers</p>
                  <div className="flex mb-4">
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-grow">
                    Everything was perfect. The sticker themselves is a great quality, and no blurriness on the design. Will be sticking with this company for future stickers!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brands Section - Moved above footer */}
        <section className="py-4">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto px-4">
            <div className="flex justify-center mb-6">
              <div 
                className="px-6 py-2 rounded-full text-center text-lg text-gray-300"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                Brands we print for:
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



                    {/* Styles */}
            <style jsx>{`
              @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }

              .headerButton {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
              }

              .headerButton:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.3);
              }

              .logo-hover {
                transition: transform 0.3s ease;
              }

              .logo-hover:hover {
                transform: scale(1.05);
              }



              /* Hero Animation Keyframes */
              @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(12deg); }
                50% { transform: translateY(-20px) rotate(12deg); }
              }
              
              @keyframes sway {
                0%, 100% { transform: translateX(0px) rotate(6deg); }
                50% { transform: translateX(15px) rotate(-6deg); }
              }
              
              @keyframes drift {
                0% { transform: translateX(0px) translateY(0px); }
                25% { transform: translateX(20px) translateY(-10px); }
                50% { transform: translateX(0px) translateY(-20px); }
                75% { transform: translateX(-20px) translateY(-10px); }
                100% { transform: translateX(0px) translateY(0px); }
              }
              
              @keyframes bob {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }

              /* Hide scrollbar on mobile reviews and product types */
              .md\\:hidden.overflow-x-auto::-webkit-scrollbar {
                display: none;
              }
            `}</style>
    </Layout>
  );
}
