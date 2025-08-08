import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { GET_CREATOR_BY_USER_ID } from "@/lib/profile-mutations";

interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  short_description: string;
  price: number;
  original_price?: number;
  images: string[];
  default_image: string;
  category: string;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number;
  sold_quantity: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    creator_name: string;
    user_id: string;
    profile_photo_url?: string;
    user_profiles?: {
      first_name?: string;
      last_name?: string;
      profile_photo_url?: string;
    };
  };
}

// Simple Product Card Component
function ProductCard({ product }: { product: MarketplaceProduct }) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add to cart logic here - you can integrate with your existing cart system
    const cartItem = {
      id: product.id,
      title: product.title,
      image: product.default_image || product.images[0],
      price: product.price,
      type: 'marketplace'
    };
    
    // Get existing cart from localStorage
    const existingCart = JSON.parse(localStorage.getItem('marketplaceCart') || '[]');
    existingCart.push(cartItem);
    localStorage.setItem('marketplaceCart', JSON.stringify(existingCart));
    
    // Show success feedback
    alert(`Added ${product.title} to cart!`);
  };

  return (
    <div className="relative group">
      <Link href={`/marketplace/product/${product.id}`} className="block transition-transform duration-200 hover:scale-105">
        {/* Product Image with light blue background */}
        <div className="aspect-square mb-3 rounded-lg overflow-hidden" style={{ backgroundColor: '#cae0ff' }}>
          <img
            src={product.default_image || product.images[0] || '/placeholder.png'}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
          />
        </div>

        {/* Product Info */}
        <div className="space-y-2 px-1">
          <h3 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-blue-300 transition-colors">
            {product.title}
          </h3>
          
          {/* Creator Info */}
          {product.creator && (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500/20 flex items-center justify-center">
                {(() => {
                  console.log('🎨 Rendering creator avatar for:', product.creator.creator_name);
                  console.log('📸 Photo URL:', product.creator.profile_photo_url || product.creator.user_profiles?.profile_photo_url || 'NO PHOTO');
                  console.log('👤 Creator data:', JSON.stringify(product.creator, null, 2));
                  
                  // Prioritize creator's own profile photo, fallback to user profile photo
                  const profilePhotoUrl = product.creator.profile_photo_url || product.creator.user_profiles?.profile_photo_url;
                  
                  if (profilePhotoUrl && profilePhotoUrl.trim() !== '') {
                    return (
                      <img
                        src={profilePhotoUrl}
                        alt={`${product.creator.creator_name} avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('❌ Failed to load image:', profilePhotoUrl);
                          console.error('❌ Image error event:', e);
                          // Try to hide the broken image
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('✅ Image loaded successfully:', profilePhotoUrl);
                        }}
                      />
                    );
                  } else {
                    console.log('🔄 Using default avatar icon');
                    return (
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    );
                  }
                })()}
              </div>
              <span className="text-white/70 text-xs">
                by {product.creator.user_profiles?.first_name && product.creator.user_profiles?.last_name 
                  ? `${product.creator.user_profiles.first_name} ${product.creator.user_profiles.last_name}`
                  : product.creator.creator_name
                }
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">
                ${product.price}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-gray-400 text-xs line-through">
                  ${product.original_price}
                </span>
              )}
            </div>
            
            {product.is_featured && (
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                Featured
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Cart Icon with Plus - Positioned relative to product image */}
      <button
        onClick={handleAddToCart}
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 group/cart"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
        aria-label="Add to cart"
      >
        <div className="relative">
          {/* Cart Icon */}
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {/* Plus Icon */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function Marketplace() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"]);
  const [showSaleItems, setShowSaleItems] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const router = useRouter();

  // Check if user is a creator
  const { data: creatorData } = useQuery(GET_CREATOR_BY_USER_ID, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  const isCreator = creatorData?.getCreatorByUserId?.isActive || false;

  const supabase = getSupabase();

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    
    checkUser();
  }, []);

  // Listen for profile updates to sync profile photos
  useEffect(() => {
    const handleProfileUpdate = (event: any) => {
      const { profile_photo_url } = event.detail;
      
      // Update products with the new profile photo for the current user
      if (user?.id && profile_photo_url) {
        setProducts(prevProducts => 
          prevProducts.map(product => {
            if (product.creator?.user_id === user.id) {
              return {
                ...product,
                creator: {
                  ...product.creator,
                  user_profiles: {
                    ...product.creator.user_profiles,
                    profile_photo_url: profile_photo_url
                  }
                }
              };
            }
            return product;
          })
        );
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id]);

  // Handle search from URL parameter
  useEffect(() => {
    if (router.query.search && typeof router.query.search === 'string') {
      setSearchQuery(router.query.search);
    }
  }, [router.query.search]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('marketplace_products')
        .select(`
          *,
          creators (
            id,
            creator_name,
            user_id,
            profile_photo_url
          )
        `)
        .eq('is_active', true);

      // Apply category filter
      if (!selectedCategories.includes("all") && selectedCategories.length > 0) {
        query = query.in('category', selectedCategories);
      }

      // Apply sale items filter
      if (showSaleItems) {
        query = query.not('original_price', 'is', null).gt('original_price', 'price');
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
      }

      // Apply sorting
      switch (sortBy) {
        case "price-low":
          query = query.order('price', { ascending: true });
          break;
        case "price-high":
          query = query.order('price', { ascending: false });
          break;
        case "popular":
          query = query.order('views_count', { ascending: false });
          break;
        case "featured":
          query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch user profile data for creators
      const productsWithCreatorProfiles = await Promise.all(
        (data || []).map(async (product) => {
          if (product.creators?.user_id) {
            console.log('🔍 Fetching profile for creator:', product.creators.creator_name, 'user_id:', product.creators.user_id);
            try {
              let profileData = null;
              const { data: fetchedProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('first_name, last_name, profile_photo_url')
                .eq('user_id', product.creators.user_id)
                .single();
              
              if (profileError) {
                console.warn('❌ Profile fetch error for user_id:', product.creators.user_id, profileError);
                
                // If no profile exists, create a basic one automatically
                if (profileError.code === 'PGRST116') { // No rows returned
                  console.log('🔧 Creating missing user_profiles record for creator:', product.creators.creator_name);
                  try {
                    const nameParts = product.creators.creator_name.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    const { data: newProfile, error: createError } = await supabase
                      .from('user_profiles')
                      .insert({
                        user_id: product.creators.user_id,
                        first_name: firstName,
                        last_name: lastName,
                        display_name: product.creators.creator_name,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })
                      .select('first_name, last_name, profile_photo_url')
                      .single();
                    
                    if (createError) {
                      console.error('❌ Failed to create profile for creator:', createError);
                      profileData = null;
                    } else {
                      console.log('✅ Created profile for creator:', product.creators.creator_name);
                      profileData = newProfile;
                    }
                  } catch (createErr) {
                    console.error('❌ Error creating profile:', createErr);
                    profileData = null;
                  }
                }
              } else {
                profileData = fetchedProfile;
                console.log('✅ Profile loaded for creator:', product.creators.creator_name);
                console.log('📸 Profile photo URL:', profileData?.profile_photo_url || 'NO PHOTO');
                console.log('🔍 Profile photo exists?', !!profileData?.profile_photo_url);
                console.log('🔍 Profile photo length:', profileData?.profile_photo_url?.length || 0);
                console.log('👤 Full profile data:', JSON.stringify(profileData, null, 2));
              }
              
              return {
                ...product,
                creator: {
                  ...product.creators,
                  user_profiles: profileData
                }
              };
            } catch (profileError) {
              console.warn('Error fetching profile for creator:', profileError);
              return {
                ...product,
                creator: product.creators
              };
            }
          }
          return {
            ...product,
            creator: product.creators
          };
        })
      );
      
      setProducts(productsWithCreatorProfiles);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategories, showSaleItems, searchQuery, sortBy]);

  const categories = [
    { 
      value: "all", 
      label: "All Shapes",
      color: "green",
      bgColor: "bg-green-500/20",
      textColor: "text-green-400",
      selectedBg: "bg-green-600/80",
      selectedText: "text-green-200",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4H3m16 8H7m12 4H9" />
        </svg>
      )
    },
    { 
      value: "Die-Cut", 
      label: "Die-Cut",
      color: "purple",
      bgColor: "bg-purple-500/20",
      textColor: "text-purple-400",
      selectedBg: "bg-purple-600/80",
      selectedText: "text-purple-200",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M3 3h6c0 1.1.9 2 2 2s2-.9 2-2h6v6c-1.1 0-2 .9-2 2s.9 2 2 2v6h-6c0-1.1-.9-2-2-2s-2 .9-2 2H3v-6c1.1 0 2-.9 2-2s-.9-2-2-2V3z" />
        </svg>
      )
    },
    { 
      value: "Circle", 
      label: "Circle",
      color: "blue",
      bgColor: "bg-blue-500/20",
      textColor: "text-blue-400",
      selectedBg: "bg-blue-600/80",
      selectedText: "text-blue-200",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
        </svg>
      )
    },
    { 
      value: "Rectangle", 
      label: "Rectangle",
      color: "green",
      bgColor: "bg-green-500/20",
      textColor: "text-green-400",
      selectedBg: "bg-green-600/80",
      selectedText: "text-green-200",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="6" width="18" height="12" rx="2" ry="2" strokeWidth={2} />
        </svg>
      )
    },
    { 
      value: "Square", 
      label: "Square",
      color: "red",
      bgColor: "bg-red-500/20",
      textColor: "text-red-400",
      selectedBg: "bg-red-600/80",
      selectedText: "text-red-200",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2" strokeWidth={2} />
        </svg>
      )
    },
    { 
      value: "Oval", 
      label: "Oval",
      color: "yellow",
      bgColor: "bg-yellow-500/20",
      textColor: "text-yellow-400",
      selectedBg: "bg-yellow-600/80",
      selectedText: "text-yellow-200",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <ellipse cx="12" cy="12" rx="9" ry="6" strokeWidth={2} />
        </svg>
      )
    },

  ];

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "popular", label: "Most Popular" },
    { value: "featured", label: "Featured" }
  ];

  const toggleCategory = (categoryValue: string) => {
    if (categoryValue === "all") {
      setSelectedCategories(["all"]);
    } else {
      setSelectedCategories(prev => {
        const newCategories = prev.filter(cat => cat !== "all");
        if (newCategories.includes(categoryValue)) {
          const filtered = newCategories.filter(cat => cat !== categoryValue);
          return filtered.length === 0 ? ["all"] : filtered;
        } else {
          return [...newCategories, categoryValue];
        }
      });
    }
  };

  if (userLoading || loading) {
    return (
      <Layout title="Marketplace - Sticker Shuttle">
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading marketplace...</div>
        </div>
      </Layout>
    );
  }

  // Allow access for admin or active creators
  const hasAccess = user && (user.email === 'justin@stickershuttle.com' || isCreator);
  
  if (!hasAccess) {
    return (
      <Layout title="Marketplace - Coming Soon | Sticker Shuttle">
        <section className="pt-[20px] pb-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div 
              className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl py-12 px-8 md:px-12 relative overflow-hidden text-center"
              style={{
                background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4a 25%, #2d1b6b 50%, #4c1d95 75%, #7c3aed 100%)',
                backgroundImage: `
                  radial-gradient(ellipse at 25% 30%, rgba(139, 92, 246, 0.5) 0%, transparent 60%),
                  radial-gradient(ellipse at 75% 70%, rgba(124, 58, 237, 0.4) 0%, transparent 50%),
                  radial-gradient(ellipse at 50% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 40%)
                `
              }}
            >
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                  Marketplace Coming Soon
                </h1>
                <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                  We're building an amazing marketplace for pre-made sticker designs. Stay tuned for the launch!
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/products/vinyl-stickers">
                    <button className="px-8 py-3 font-semibold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                        color: 'white'
                      }}
                    >
                      Custom Vinyl Stickers
                    </button>
                  </Link>
                  
                  <Link href="/products">
                    <button className="px-8 py-3 font-semibold text-lg text-white hover:text-gray-200 transition-all duration-300 hover:scale-105 rounded-lg border border-gray-400 hover:border-gray-300">
                      View All Products
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <FloatingChatWidget />
      </Layout>
    );
  }

  return (
    <Layout title="Marketplace - Sticker Shuttle">
      {/* Promotional Banner */}
      <section className="pt-[20px] pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div 
            className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl py-8 px-8 md:px-12 relative overflow-hidden h-32 md:h-36"
            style={{
              backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Overlay for better text readability */}
            <div 
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(10, 10, 46, 0.7) 0%, rgba(26, 26, 74, 0.6) 25%, rgba(45, 27, 107, 0.5) 50%, rgba(76, 29, 149, 0.4) 75%, rgba(124, 58, 237, 0.3) 100%)'
              }}
            ></div>
            
            <div className="relative z-10 flex items-center justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-8 mb-0">
                  <div className="flex flex-col items-center gap-1 cursor-pointer transition-all duration-500 hover:drop-shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:scale-105">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1754416141/CreatorsSpaceWhite_ebiqt3.svg" 
                      alt="Creators Space" 
                      className="h-12 md:h-16 w-auto transition-all duration-500"
                    />
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium transition-all duration-500 hover:bg-blue-500/30 hover:text-blue-200">
                      BETA
                    </span>
                  </div>
                  <p className="text-white/80 text-sm md:text-base leading-relaxed">
                    A collaborative space for Sticker Shuttle and amazing creators around the United States.
                  </p>
                </div>
              </div>
              
              <div className="ml-8 text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-400/30">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-red-200 font-semibold text-sm">
                    Active Sale - Up to 30% Off
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
      `}</style>



      {/* Main Content with Sidebar */}
      <section className="pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          {/* Mobile Filter Toggle Button */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                <span className="text-white font-semibold">Filters & Categories</span>
                <div className="flex items-center gap-2">
                  {(!selectedCategories.includes("all") || showSaleItems) && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                      {selectedCategories.filter(cat => cat !== "all").length + (showSaleItems ? 1 : 0)} active
                    </span>
                  )}
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-white transition-transform duration-200 ${showMobileFilters ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Sidebar - Enhanced Filters */}
            <aside className={`lg:w-72 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="rounded-xl p-6 space-y-8 sticky top-6" style={{
                background: '#210d54',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                {/* Filter Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  {/* Mobile Close Button */}
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close filters"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Filters</h2>
                  <div className="ml-auto">
                    <button
                      onClick={() => {
                        setSelectedCategories(["all"]);
                        setShowSaleItems(false);
                        setSearchQuery("");
                        setSortBy("newest");
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Creator Add Product Button */}
                {isCreator && (
                  <div className="pb-6 border-b border-white/10">
                    <Link href="/admin/marketplace">
                      <button
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-105 group"
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.25) 50%, rgba(16, 185, 129, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          boxShadow: 'rgba(16, 185, 129, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-white font-semibold text-lg">Add a Sticker</span>
                      </button>
                    </Link>
                  </div>
                )}

                {/* Sale Items Filter */}
                <div>
                  <button
                    onClick={() => setShowSaleItems(!showSaleItems)}
                    className={`w-full relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden ${
                      showSaleItems
                        ? ''
                        : 'border-2 border-dashed border-orange-400/50'
                    } ${!showSaleItems ? 'hover:border-orange-400/70 hover:bg-white/5' : ''}`}
                    style={{
                      background: showSaleItems 
                        ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)'
                        : 'transparent'
                    }}
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-2 right-2 text-white/30 text-4xl">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`text-sm ${showSaleItems ? 'text-white/90' : 'text-white/60'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <span className={`font-semibold text-sm ${showSaleItems ? 'text-white' : 'text-white/80'}`}>
                            Sale Items
                          </span>
                        </div>
                        {showSaleItems && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${showSaleItems ? 'text-white/70' : 'text-white/50'}`}>
                        Special offers & discounts
                      </p>
                    </div>
                  </button>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Browse by Category
                    </div>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map((category) => {
                      const isSelected = selectedCategories.includes(category.value);
                      const categoryCount = products.filter(p => 
                        category.value === "all" ? true : p.category === category.value
                      ).length;
                      
                      return (
                        <button
                          key={category.value}
                          onClick={() => toggleCategory(category.value)}
                          className={`group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden ${
                            isSelected
                              ? ''
                              : `border-2 border-dashed border-${category.color}-400/50`
                          } ${!isSelected ? `hover:border-${category.color}-400/70 hover:bg-white/5` : ''}`}
                          style={{
                            background: isSelected 
                              ? `linear-gradient(135deg, ${category.color === 'gray' ? '#374151' : 
                                  category.color === 'purple' ? '#7C3AED' :
                                  category.color === 'blue' ? '#2563EB' :
                                  category.color === 'green' ? '#059669' :
                                  category.color === 'red' ? '#DC2626' :
                                  category.color === 'yellow' ? '#D97706' :
                                  category.color === 'pink' ? '#DB2777' :
                                  '#4F46E5'} 0%, ${category.color === 'gray' ? '#1F2937' : 
                                  category.color === 'purple' ? '#5B21B6' :
                                  category.color === 'blue' ? '#1D4ED8' :
                                  category.color === 'green' ? '#047857' :
                                  category.color === 'red' ? '#B91C1C' :
                                  category.color === 'yellow' ? '#B45309' :
                                  category.color === 'pink' ? '#BE185D' :
                                  '#3730A3'} 100%)`
                              : 'transparent'
                          }}
                        >
                          {/* Background Pattern */}
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-2 right-2 text-white/30 text-4xl">
                              {category.icon}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`text-sm ${isSelected ? 'text-white/90' : 'text-white/60'}`}>
                                {category.icon}
                              </div>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <h3 className={`font-semibold text-sm mb-1 leading-tight ${isSelected ? 'text-white' : 'text-white/80'}`}>
                              {category.label}
                            </h3>
                            <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-white/50'}`}>
                              {categoryCount} sticker{categoryCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Browse by Artist */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Browse by Artist
                    </div>
                  </label>
                  <div className="space-y-0.5">
                    {/* Steve Wolf */}
                    <button
                      className="w-full group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden hover:bg-white/5"
                    >
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            SW
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-white/80 group-hover:text-white transition-colors">
                              Steve Wolf
                            </h3>
                            <p className="text-xs text-white/50 group-hover:text-white/60 transition-colors">
                              12 designs • Digital Art
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Sticker Shuttle */}
                    <button
                      className="w-full group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden hover:bg-white/5"
                    >
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            SS
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-white/80 group-hover:text-white transition-colors">
                              Sticker Shuttle
                            </h3>
                            <p className="text-xs text-white/50 group-hover:text-white/60 transition-colors">
                              25+ designs • Official Collection
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Maya Rodriguez */}
                    <button
                      className="w-full group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden hover:bg-white/5"
                    >
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            MR
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-white/80 group-hover:text-white transition-colors">
                              Maya Rodriguez
                            </h3>
                            <p className="text-xs text-white/50 group-hover:text-white/60 transition-colors">
                              8 designs • Illustration
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Alex Chen */}
                    <button
                      className="w-full group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden hover:bg-white/5"
                    >
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            AC
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-white/80 group-hover:text-white transition-colors">
                              Alex Chen
                            </h3>
                            <p className="text-xs text-white/50 group-hover:text-white/60 transition-colors">
                              15 designs • Typography
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sort - Only show when filtering */}
                {(!selectedCategories.includes("all") || showSaleItems || searchQuery.trim()) && (
                  <div>
                    <label htmlFor="sort" className="block text-sm font-semibold text-white mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v6m3-3l-3-3-3 3" />
                        </svg>
                        Sort By
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        id="sort"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                        aria-label="Sort products"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">Results</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {products.length} product{products.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {searchQuery && (
                    <div className="mt-2 text-xs text-gray-400">
                      Showing results for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Main Content - Products */}
            <main className="flex-1 min-w-0 space-y-8">
              {/* Show promotional sections only when "All Shapes" is selected, no sale filter, and no search */}
              {selectedCategories.includes("all") && !showSaleItems && !searchQuery.trim() && (
                <>
                  {/* Featured Sticker Packs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Premium Sticker Pack */}
                <div 
                  className="rounded-xl p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:scale-[1.025] group h-44 sm:h-48 relative overflow-hidden"
                  style={{
                    backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1754420305/b2aeaa61-9cdd-4e99-9782-de45e4b2f987.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(92, 80, 217, .95) 50%, rgba(92, 80, 217, 0.6) 100%)'
                    }}
                  ></div>
                  <div className="relative z-10 text-left h-full flex flex-col justify-between">
                    <div>
                      <div className="inline-block px-3 py-1 bg-blue-400/20 text-blue-300 rounded-full text-sm font-medium mb-3">
                        New!
                      </div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-indigo-200 transition-colors mb-1">
                      ⛰️ National Parks Collection
                      </h3>
                      <p className="text-gray-200 text-sm mb-1">
                        by Steve Wolf • All 63 National Parks 
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-white">
                        <span className="text-2xl font-bold">$3.99/ea.</span>
                        <span className="text-gray-300 text-sm ml-2 line-through">$6.99/ea.</span>
                      </div>
                      <div className="text-indigo-200 text-sm font-medium group-hover:text-indigo-100 transition-colors">
                        Shop Collection  →
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trending Sticker Pack */}
                <div 
                  className="rounded-xl p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:scale-[1.025] group h-44 sm:h-48 relative overflow-hidden"
                  style={{
                    backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.8) 0%, rgba(190, 24, 93, 0.6) 100%)'
                    }}
                  ></div>
                  <div className="relative z-10 text-left h-full flex flex-col justify-between">
                    <div>
                      <div className="inline-block px-3 py-1 bg-pink-400/20 text-pink-300 rounded-full text-sm font-medium mb-3">
                        Leaving Soon! 
                      </div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-pink-200 transition-colors mb-1">
                      😂 Viral Meme Pack
                      </h3>
                      <p className="text-gray-200 text-sm mb-1">
                        30+ trending memes • Internet culture • Pop references
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-white">
                        <span className="text-2xl font-bold">$16.99</span>
                        <span className="text-gray-300 text-sm ml-2 line-through">$24.99</span>
                      </div>
                      <div className="text-pink-200 text-sm font-medium group-hover:text-pink-100 transition-colors">
                        Shop Pack →
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                  {/* Recently Added Section */}
                  {products.length > 0 && (
                    <div data-section="recently-added">
                      <h2 className="text-2xl font-bold text-white mb-6">
                        Recently Added
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
                        {products
                          .sort(() => 0.5 - Math.random()) // Randomize
                          .slice(0, 6) // Take first 6
                          .map((product) => (
                            <ProductCard key={`pick-${product.id}`} product={product} />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Collections Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                {/* For the Holidays */}
                <div 
                  className="rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:scale-105 group h-28 sm:h-32 relative overflow-hidden"
                  style={{
                    backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.7) 0%, rgba(185, 28, 28, 0.5) 100%)'
                    }}
                  ></div>
                  <div className="relative z-10 text-left h-full flex items-center">
                    <h3 className="text-xl font-bold text-white group-hover:text-red-200 transition-colors">
                      For the Holidays
                    </h3>
                  </div>
                </div>

                {/* For the Friends */}
                <div 
                  className="rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:scale-105 group h-28 sm:h-32 relative overflow-hidden"
                  style={{
                    backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.7) 0%, rgba(21, 128, 61, 0.5) 100%)'
                    }}
                  ></div>
                  <div className="relative z-10 text-left h-full flex items-center">
                    <h3 className="text-xl font-bold text-white group-hover:text-green-200 transition-colors">
                      For the Friends
                    </h3>
                  </div>
                </div>

                {/* For the Laughs */}
                <div 
                  className="rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:scale-105 group h-28 sm:h-32 relative overflow-hidden"
                  style={{
                    backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div 
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.7) 0%, rgba(161, 98, 7, 0.5) 100%)'
                    }}
                  ></div>
                  <div className="relative z-10 text-left h-full flex items-center">
                    <h3 className="text-xl font-bold text-white group-hover:text-yellow-200 transition-colors">
                      For the Laughs
                    </h3>
                  </div>
                </div>
                  </div>
                </>
              )}

              {/* Explore Stickers Section - Always show when filtering */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">
                  {(!selectedCategories.includes("all") || showSaleItems || searchQuery.trim()) ? 
                    (searchQuery.trim() ? `Search Results for "${searchQuery}"` :
                     showSaleItems ? "Sale Items" : 
                     selectedCategories.length === 1 ? 
                       categories.find(cat => cat.value === selectedCategories[0])?.label || "Filtered Stickers" :
                       "Filtered Stickers"
                    ) : 
                    "Explore Stickers"
                  }
                </h2>
                {products.length === 0 ? (
            <div className="container-style p-8 text-center">
              <div className="text-gray-400 text-lg mb-4">
                No products found matching your criteria.
              </div>
              <button
                onClick={() => {
                  setSelectedCategories(["all"]);
                  setShowSaleItems(false);
                  setSearchQuery("");
                  setSortBy("newest");
                }}
                className="button-style px-6 py-3 text-white font-medium rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
              {products
                .sort((a, b) => {
                  // When filtering by category, sale items, or searching, sort by most recent first
                  if (!selectedCategories.includes("all") || showSaleItems || searchQuery.trim()) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  }
                  // Otherwise use the selected sort order
                  return 0;
                })
                .map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
            </div>
          )}
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="container-style p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Partner With Us</h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">Want your own Creators Space? We charge a flat $2 per sticker to produce and fulfill—no hidden fees. You set the price and keep the rest.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/creators-space-apply" className="button-style px-6 py-3 text-white font-semibold rounded-lg transition-colors">Apply for a Space</Link>
              <Link href="/products" className="px-6 py-3 text-white font-medium rounded-lg border border-white/20 hover:bg-white/10 transition-colors">Order Custom Stickers</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </Layout>
  );
}

// Add styles for glassmorphism
const styles = `
  .container-style {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
    backdrop-filter: blur(12px);
  }
  
  .button-style {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%);
    backdrop-filter: blur(25px) saturate(180%);
    border: 1px solid rgba(59, 130, 246, 0.4);
    box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
} 