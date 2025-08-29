import { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import FloatingChatWidget from "@/components/FloatingChatWidget";

import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useQuery, useMutation } from "@apollo/client";
import { GET_CREATOR_BY_USER_ID } from "@/lib/profile-mutations";
import { GET_PROMOTIONAL_CONTAINERS, UPDATE_PROMOTIONAL_CONTAINER } from "@/lib/promotional-container-mutations";
import LoadingGrid from "@/components/LoadingGrid";
import { useCart } from "@/components/CartContext";
import { generateCartItemId } from "@/types/product";
import { calculateRealPrice, BasePriceRow, QuantityDiscountRow, loadRealPricingData, PRESET_SIZES } from "@/utils/real-pricing";

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
  collection_id?: string;
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

interface PromotionalContainer {
  id: string;
  position: number;
  title: string;
  subtitle?: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  collectionId?: string;
  creatorId?: string;
  linkText?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  badgeText?: string;
  badgeColor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Helper function to calculate creator earnings using cost-based structure with size support
function calculateCreatorEarnings(price: number, quantity: number = 1, size: string = '4"'): number {
  // Same cost structure as backend
  let materialShippingCost: number;
  let fulfillmentCost: number;

  // Size-based sticker costs
  const stickerCostPerUnit: { [key: string]: number } = {
    '3"': 0.35, // Lower cost for smaller stickers
    '4"': 0.40, // Standard cost
    '5"': 0.45  // Higher cost for larger stickers
  };
  
  const costPerSticker = stickerCostPerUnit[size] || stickerCostPerUnit['4"'];
  let stickerCost = quantity * costPerSticker;

  if (quantity === 1) {
    materialShippingCost = 1.35;
    fulfillmentCost = 0.25;
  } else if (quantity <= 5) {
    materialShippingCost = 1.46;
    fulfillmentCost = 0.26;
  } else if (quantity <= 10) {
    materialShippingCost = 1.61;
    fulfillmentCost = 0.27;
  } else if (quantity <= 25) {
    materialShippingCost = 5.45; // upgrades to tracking
    fulfillmentCost = 0.30;
  } else {
    // For larger quantities, use the 25+ tier costs
    materialShippingCost = 5.45;
    fulfillmentCost = 0.30;
  }

  // Calculate Stripe processing fee: 2.9% + $0.30
  const stripeFee = price > 0 ? (price * 0.029) + 0.30 : 0;

  const totalCosts = materialShippingCost + stickerCost + fulfillmentCost + stripeFee;
  
  // Creator earnings = Revenue - All Costs
  return Math.max(0, price - totalCosts);
}

// Simple Product Card Component
function ProductCard({ product, buildPackMode = false, selected, onToggleSelect, onAddToCart, getPriceOverride }: { product: MarketplaceProduct, buildPackMode?: boolean, selected?: boolean, onToggleSelect?: (id: string) => void, onAddToCart?: (product: MarketplaceProduct) => void, getPriceOverride?: (product: MarketplaceProduct) => number }) {
  const displayPrice = getPriceOverride ? getPriceOverride(product) : product.price;
  const creatorEarnings = calculateCreatorEarnings(displayPrice);
  const storeCredit = displayPrice * 0.05; // 5% store credit
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <div 
      className={`relative group ${buildPackMode ? 'cursor-pointer p-2' : ''} ${
        buildPackMode && selected 
          ? 'ring-2 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.7)] rounded-lg' 
          : buildPackMode 
            ? 'hover:border-2 hover:border-dashed hover:border-purple-400/70 hover:bg-white/5 rounded-lg' 
            : ''
      }`} 
      onClick={buildPackMode ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect && onToggleSelect(product.id);
      } : undefined}
    >
      {!buildPackMode ? (
        <Link href={`/marketspace/product/${product.id}`} className="block transition-transform duration-200 hover:scale-105">
          {/* Product Image with light blue background */}
        <div className="aspect-square mb-3 rounded-lg overflow-hidden flex items-center justify-center p-8" style={{ backgroundColor: '#cae0ff' }}>
          <img
            src={product.default_image || product.images[0] || '/placeholder.png'}
            alt={product.title}
            className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
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
                by {(() => {
                  const c = product.creator;
                  if (c?.creator_name) return c.creator_name;
                  if (c?.user_profiles?.first_name && c?.user_profiles?.last_name) {
                    return `${c.user_profiles.first_name} ${c.user_profiles.last_name}`;
                  }
                  return c?.creator_name || 'Creator';
                })()}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {!buildPackMode && (
                  <span className="text-white font-bold text-base">
                    ${displayPrice.toFixed(2)}
                  </span>
                )}
                {product.original_price && product.original_price > displayPrice && (
                  <span className="text-gray-400 text-xs line-through">
                    ${product.original_price}
                  </span>
                )}
                {product.is_featured && !buildPackMode && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-blue-300 text-xs">Trending</span>
                  </div>
                )}
              </div>
                              {!buildPackMode && (
                <div className="flex items-center text-yellow-200 text-xs">
                  <span>+</span>
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                    alt="Credits" 
                    className="w-3 h-3 object-contain ml-0.5 mr-1.5"
                  />
                  <span>${storeCredit.toFixed(2)} in store credit</span>
                </div>
              )}
            </div>
          </div>
        </div>
        </Link>
      ) : (
        <div className="block">
          {/* Product Image with light blue background */}
          <div className="aspect-square mb-3 rounded-lg overflow-hidden flex items-center justify-center p-8" style={{ backgroundColor: '#cae0ff' }}>
            <img
              src={product.default_image || product.images[0] || '/placeholder.png'}
              alt={product.title}
              className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
              loading="lazy"
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
                    // Prioritize creator's own profile photo, fallback to user profile photo
                    const profilePhotoUrl = product.creator.profile_photo_url || product.creator.user_profiles?.profile_photo_url;
                    
                    if (profilePhotoUrl && profilePhotoUrl.trim() !== '') {
                      return (
                        <img
                          src={profilePhotoUrl}
                          alt={`${product.creator.creator_name} avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide the broken image
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      );
                    } else {
                      return (
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      );
                    }
                  })()}
                </div>
                <span className="text-white/70 text-xs">
                  by {(() => {
                    const c = product.creator;
                    if (c?.creator_name) return c.creator_name;
                    if (c?.user_profiles?.first_name && c?.user_profiles?.last_name) {
                      return `${c.user_profiles.first_name} ${c.user_profiles.last_name}`;
                    }
                    return c?.creator_name || 'Creator';
                  })()}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {!buildPackMode && (
                    <span className="text-white font-bold text-base">
                      ${displayPrice.toFixed(2)}
                    </span>
                  )}
                  {product.original_price && product.original_price > displayPrice && (
                    <span className="text-gray-400 text-xs line-through">
                      ${product.original_price}
                    </span>
                  )}
                  {product.is_featured && !buildPackMode && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h7m0 0v7m0-7l-7 7-4-4-6 6" />
                      </svg>
                      <span className="text-blue-300 text-xs">Trending</span>
                    </div>
                  )}
                </div>
                {!buildPackMode && (
                  <div className="flex items-center text-yellow-200 text-xs">
                    <span>+</span>
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                      alt="Credits" 
                      className="w-3 h-3 object-contain ml-0.5 mr-1.5"
                    />
                    <span>${storeCredit.toFixed(2)} in store credit</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Icon with Plus - hide in build pack mode */}
      {!buildPackMode && (
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
      )}
    </div>
  );
}

export default function Marketplace() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [allProducts, setAllProducts] = useState<MarketplaceProduct[]>([]); // Unfiltered products for backgrounds
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["all"]);
  const [showSaleItems, setShowSaleItems] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("random");
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionPreviews, setCollectionPreviews] = useState<{[key: string]: string}>({});
  const [allCreators, setAllCreators] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<MarketplaceProduct[]>([]);
  const [mostRecentProducts, setMostRecentProducts] = useState<MarketplaceProduct[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({});
  const [buildPackMode, setBuildPackMode] = useState<boolean>(false);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [selectedPackProducts, setSelectedPackProducts] = useState<MarketplaceProduct[]>([]);
  const [selectedPackSize, setSelectedPackSize] = useState<string>('4"');
  const [editingContainer, setEditingContainer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PromotionalContainer>>({});
  
  // Pricing data state
  const [realPricingData, setRealPricingData] = useState<{
    basePricing: BasePriceRow[];
    quantityDiscounts: QuantityDiscountRow[];
  } | null>(null);

  // Load pricing data
  useEffect(() => {
    const loadPricing = async () => {
      try {
        console.log('🔄 Loading marketplace pricing data...');
        const data = await loadRealPricingData();
        setRealPricingData(data);
        console.log('✅ Successfully loaded marketplace pricing data');
      } catch (error) {
        console.error('❌ Failed to load marketplace pricing data:', error);
      }
    };

    loadPricing();
  }, []);

  // Calculate dynamic price for marketplace products (single 3" sticker)
  const getMarketplaceProductPrice = (product: MarketplaceProduct): number => {
    if (!realPricingData) {
      return product.price; // Fallback to database price if pricing data not loaded
    }

    // For marketplace products, calculate the price for a single 3" sticker
    // The CSV pricing is for bulk orders, but we need single-unit pricing
    const sqInches = PRESET_SIZES.medium.sqInches; // 9 sq inches for 3" sticker
    
    // Get the base price for 9 sq inches from the CSV data
    const basePrice = realPricingData.basePricing.find(row => row.sqInches === sqInches)?.basePrice || 1.35;
    
    // For single stickers, apply a markup since bulk pricing doesn't apply
    // Single sticker pricing = base price + setup costs + single-unit markup
    // This should result in exactly $3.99 for a 3" sticker
    const singleStickerPrice = basePrice * 2.955; // Multiplier to get exactly $3.99 from $1.35
    
    return Math.round(singleStickerPrice * 100) / 100; // Round to 2 decimal places
  };

  // Get pack price based on selected size
  const getPackPrice = (): number => {
    switch (selectedPackSize) {
      case '3"':
        return 9.98;
      case '5"':
        return 14.98;
      default: // 4"
        return 12.48;
    }
  };

  // Handle adding marketplace product to cart
  const handleAddMarketplaceProductToCart = (product: MarketplaceProduct) => {
    const calculatedPrice = getMarketplaceProductPrice(product);
    
    const cartItem = {
      id: generateCartItemId(),
      product: {
        id: product.id,
        sku: `MARKETPLACE-${product.id}`,
        name: product.title,
        category: "marketplace" as const,
        description: product.description,
        shortDescription: product.short_description,
        basePrice: calculatedPrice,
        pricingModel: "per-unit" as const,
        images: product.images,
        defaultImage: product.default_image,
        features: [],
        attributes: [],
        customizable: false,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
      customization: {
        productId: product.id,
        selections: {},
        options: {},
        totalPrice: calculatedPrice,
        unitPrice: calculatedPrice,
        quantity: 1,
        notes: "",
        uploadedFiles: [],
        isRushOrder: false,
      },
      quantity: 1,
      unitPrice: calculatedPrice,
      totalPrice: calculatedPrice,
      addedAt: new Date().toISOString(),
    };

    addToCart(cartItem);
    
    // Show success feedback
    alert(`Added ${product.title} to cart!`);
  };
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, showSaleItems, searchQuery, sortBy, selectedCreatorId, selectedCollectionId]);
  
  // State for total count (needed for pagination)
  const [totalCount, setTotalCount] = useState(0);
  
  // Get paginated products (now handled at database level)
  const getPaginatedProducts = (allProducts: MarketplaceProduct[]) => {
    // Products are already paginated from the database
    return allProducts;
  };
  
  // Get total pages
  const getTotalPages = (allProducts: MarketplaceProduct[]) => {
    // Use totalCount for accurate pagination when using database-level pagination
    return Math.ceil(totalCount / itemsPerPage);
  };
  
  const router = useRouter();

  // Function to update URL with current filters
  const updateURL = (newFilters: {
    search?: string;
    creator?: string | null;
    collection?: string | null;
    category?: string[];
    sort?: string;
    sale?: boolean;
  }) => {
    const query: any = {};
    
    if (newFilters.search && newFilters.search.trim()) {
      query.search = newFilters.search;
    }
    
    if (newFilters.creator) {
      query.creator = newFilters.creator;
    }
    
    if (newFilters.collection) {
      query.collection = newFilters.collection;
    }
    
    if (newFilters.category && newFilters.category.length > 0 && !newFilters.category.includes('all')) {
      query.category = newFilters.category[0]; // For simplicity, use first category
    }
    
    if (newFilters.sort && newFilters.sort !== 'random') {
      query.sort = newFilters.sort;
    }
    
    if (newFilters.sale) {
      query.sale = 'true';
    }
    
    router.push({
      pathname: '/marketspace',
      query
    }, undefined, { shallow: true });
  };

  // Admin emails list - same as in admin dashboard
  const ADMIN_EMAILS = ['justin@stickershuttle.com'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  // Check if user is a creator
  const { data: creatorData } = useQuery(GET_CREATOR_BY_USER_ID, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  const isCreator = creatorData?.getCreatorByUserId?.isActive || false;

  // Get promotional containers
  const { data: containersData, loading: containersLoading, refetch: refetchContainers } = useQuery(GET_PROMOTIONAL_CONTAINERS);
  const promotionalContainers = containersData?.getPromotionalContainers || [];
  
  // Debug promotional containers
  useEffect(() => {
    if (containersData?.getPromotionalContainers) {
      console.log('📋 Promotional containers loaded:', containersData.getPromotionalContainers);
    }
  }, [containersData]);

  // Update promotional container mutation
  const [updatePromotionalContainer] = useMutation(UPDATE_PROMOTIONAL_CONTAINER);

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
        setProducts((prevProducts) => 
          prevProducts.map((product: MarketplaceProduct) => {
            if (product.creator?.user_id === user.id) {
              return {
                ...product,
                creator: {
                  ...product.creator!,
                  user_profiles: {
                    ...(product.creator!.user_profiles || {}),
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

  // Handle URL parameters on page load
  useEffect(() => {
    if (router.isReady) {
      const { search, creator, collection, category, sort, sale } = router.query;
      
      if (search && typeof search === 'string') {
        setSearchQuery(search);
      }
      
      if (creator && typeof creator === 'string') {
        setSelectedCreatorId(creator);
      }
      
      if (collection && typeof collection === 'string') {
        setSelectedCollectionId(collection);
      }
      
      if (category && typeof category === 'string') {
        setSelectedCategories([category]);
      }
      
      if (sort && typeof sort === 'string') {
        setSortBy(sort);
      }
      
      if (sale === 'true') {
        setShowSaleItems(true);
      }
    }
  }, [router.isReady, router.query]);

  // Fetch all products without filters for background generation
  const fetchAllProducts = async () => {
    try {
      console.log('🚀 Starting fetchAllProducts...');
      
      // Try the simplest query first - just products without relationships
      let { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('📊 fetchAllProducts result:', { error, dataLength: data?.length });

      if (error) {
        console.error('❌ Error with marketplace_products, trying with creators relationship:', error);
        // Fallback: try with creators relationship
        const result = await supabase
          .from('marketplace_products')
          .select(`
            *,
            creators (
              id,
              user_id,
              creator_name
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        data = result.data;
        error = result.error;
        console.log('📊 fetchAllProducts fallback result:', { error, dataLength: data?.length });
      }

      if (error) throw error;

      // Transform the data (creators relationship might not exist, that's ok for backgrounds)
      const transformedProducts = (data || []).map((product: any) => ({
        ...product,
        creator: product.creators
      }));

      setAllProducts(transformedProducts);
      console.log('📦 Loaded all products for backgrounds:', transformedProducts.length);
      // Log collection IDs in all products
      const collectionIds = [...new Set(transformedProducts.map((p: MarketplaceProduct) => p.collection_id).filter(Boolean))];
      console.log('📋 Available collection IDs in all products:', collectionIds);
      
      // Log some sample products for debugging
      if (transformedProducts.length > 0) {
        console.log('📋 Sample products:', transformedProducts.slice(0, 3).map((p: MarketplaceProduct) => ({
          id: p.id,
          title: p.title,
          collection_id: p.collection_id,
          default_image: p.default_image
        })));
      }
    } catch (error) {
      console.error('❌ Error fetching all products:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchAllProducts(); // Fetch all products for backgrounds
    fetchCollections();
    fetchCreators();
    fetchCategoryCounts();
  }, []);

  // Log when allProducts changes
  useEffect(() => {
    if (allProducts.length > 0) {
      console.log('🎨 All products loaded, ready for backgrounds:', allProducts.length);
      console.log('🎯 Products with collections:', allProducts.filter((p: MarketplaceProduct) => p.collection_id).length);
      console.log('🔍 Collection IDs found in allProducts:', [...new Set(allProducts.map((p: MarketplaceProduct) => p.collection_id).filter(Boolean))]);
      
      // Log some sample products with their collection IDs
      const productsWithCollections = allProducts.filter((p: MarketplaceProduct) => p.collection_id);
      console.log('📋 Sample products with collections:', productsWithCollections.slice(0, 3).map((p: MarketplaceProduct) => ({
        id: p.id,
        title: p.title,
        collection_id: p.collection_id,
        default_image: p.default_image
      })));
    }
  }, [allProducts]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Calculate pagination parameters for database-level pagination
      const offset = (currentPage - 1) * itemsPerPage;
      const limit = itemsPerPage;

      // Build count query to get total number of products
      let countQuery = supabase
        .from('marketplace_products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      // Build the main query with creator join
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

      // Apply filters to both queries
      const applyFilters = (q: any) => {
        // Apply creator filter
        if (selectedCreatorId) {
          q = q.eq('creator_id', selectedCreatorId);
        }

        // Apply category filter
        if (!selectedCategories.includes("all") && selectedCategories.length > 0) {
          q = q.in('category', selectedCategories);
        }

        // Apply collection filter
        if (selectedCollectionId) {
          q = q.eq('collection_id', selectedCollectionId);
        }

        // Apply sale items filter
        if (showSaleItems) {
          q = q.not('original_price', 'is', null).gt('original_price', 'price');
        }

        // Apply search filter
        if (searchQuery.trim()) {
          q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
        }

        return q;
      };

      countQuery = applyFilters(countQuery);
      query = applyFilters(query);

      // Apply sorting (handle random sorting differently)
      if (buildPackMode) {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === "random") {
        // For random sorting, we need to fetch all first, then randomize
        query = query.order('created_at', { ascending: false });
      } else {
        switch (sortBy) {
          case "price-low":
            query = query.order('price', { ascending: true });
            break;
          case "price-high":
            query = query.order('price', { ascending: false });
            break;
          case "popular":
            query = query.order('views_count', { ascending: false }).order('title', { ascending: true });
            break;
          case "featured":
            query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
            break;
          case "alphabetical":
            query = query.order('title', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }
      }

      // Apply database-level pagination for non-random sorting
      if (sortBy !== "random") {
        query = query.range(offset, offset + limit - 1);
      }

      // Execute both queries in parallel
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        query,
        countQuery
      ]);

      if (error) throw error;
      if (countError) throw countError;
      
      // Set total count for pagination
      setTotalCount(count || 0);
      
      // Transform the data to match expected structure
      const transformedProducts = (data || []).map((product: any) => ({
        ...product,
        creator: product.creators
      }));
      
      // Handle random sorting with client-side pagination
      let finalProducts = transformedProducts;
      if (sortBy === "random" && !buildPackMode) {
        // For random sorting, we fetched all products, now randomize and paginate
        const randomizedProducts = [...transformedProducts].sort(() => Math.random() - 0.5);
        finalProducts = randomizedProducts.slice(offset, offset + limit);
      }
      // For non-random sorting, products are already paginated by the database
      
      setProducts(finalProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategories, showSaleItems, searchQuery, sortBy, selectedCreatorId, selectedCollectionId, buildPackMode, currentPage]);

  // Fetch most recent products on component mount
  useEffect(() => {
    fetchMostRecentProducts();
  }, []);

  // Fetch featured products when collection changes
  useEffect(() => {
    if (selectedCollectionId) {
      fetchFeaturedProducts(selectedCollectionId);
    } else {
      setFeaturedProducts([]);
    }
  }, [selectedCollectionId]);

  const fetchCollections = async () => {
    try {
      console.log('🔍 Fetching collections...');
      
      // Prefer creator_collections (older schema where FK references that table)
      let result = await supabase
        .from('creator_collections')
        .select('id, name')
        .order('name', { ascending: true });

      console.log('📊 creator_collections result:', result);

      if ((result.error && (result as any).status !== 406) || (result.data || []).length === 0) {
        console.log('🔄 Trying regular collections table...');
        result = await supabase
          .from('collections')
          .select('id, name')
          .order('name', { ascending: true });
        
        console.log('📊 collections result:', result);
      }

      if (result.error) throw result.error;
      console.log('✅ Collections loaded:', result.data);
      console.log('📋 Collection IDs:', result.data?.map((c: any) => `${c.name}: ${c.id}`));
      setCollections(result.data || []);
      
      // Fetch preview images for each collection
      if (result.data && result.data.length > 0) {
        const previews: {[key: string]: string} = {};
        
        console.log('🔍 Fetching preview images for collections...');
        
        for (const collection of result.data) {
          console.log(`🔎 Looking for products in collection "${collection.name}" (ID: ${collection.id})`);
          
          // Try marketspace_products first (new table)
          let { data: productData, error: productError } = await supabase
            .from('marketspace_products')
            .select('default_image, images, collection_id')
            .eq('collection_id', collection.id)
            .eq('is_active', true)
            .limit(1)
            .single();
          
          // If not found, try marketplace_products (old table)
          if (!productData) {
            console.log(`  📦 No products in marketspace_products, trying marketplace_products...`);
            const oldResult = await supabase
              .from('marketplace_products')
              .select('default_image, images, collection_id')
              .eq('collection_id', collection.id)
              .eq('is_active', true)
              .limit(1)
              .single();
            
            if (oldResult.data) {
              productData = oldResult.data;
              console.log(`  ✅ Found in marketplace_products!`);
            } else {
              console.log(`  ❌ Not found in marketplace_products either`);
            }
          } else {
            console.log(`  ✅ Found in marketspace_products! Collection ID in product:`, productData.collection_id);
          }
          
          if (productData) {
            const imageUrl = productData.default_image || productData.images?.[0] || '';
            if (imageUrl) {
              previews[collection.id] = imageUrl;
              console.log(`  🖼️ Using preview image:`, imageUrl);
            } else {
              console.log(`  ⚠️ Product found but no images available`);
            }
          } else {
            console.log(`  ❌ No products found for collection ${collection.name} (${collection.id})`);
          }
        }
        
        console.log('📸 Collection previews loaded:', Object.keys(previews).length, 'previews for', result.data.length, 'collections');
        setCollectionPreviews(previews);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
      setCollections([]);
    }
  };

  const fetchFeaturedProducts = async (collectionId: string) => {
    try {
      console.log('🌟 Fetching featured products for collection:', collectionId);
      
      const { data, error } = await supabase
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
        .eq('collection_id', collectionId)
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('views_count', { ascending: false })
        .order('sold_quantity', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process creator profiles like in fetchProducts
      const processedProducts = await Promise.all((data || []).map(async (product: any) => {
        if (product.creators?.user_id) {
          try {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, profile_photo_url')
              .eq('user_id', product.creators.user_id)
              .single();
            
            return {
              ...product,
              creator: {
                ...product.creators,
                user_profiles: profileData
              }
            };
          } catch (profileError) {
            return {
              ...product,
              creator: product.creators
            };
          }
        } else {
          return {
            ...product,
            creator: product.creators
          };
        }
      }));
      
      console.log('✅ Featured products loaded:', processedProducts.length);
      setFeaturedProducts(processedProducts);
    } catch (err) {
      console.error('Error fetching featured products:', err);
      setFeaturedProducts([]);
    }
  };

  const fetchMostRecentProducts = async () => {
    try {
      console.log('🕒 Fetching most recent products...');
      
      const { data, error } = await supabase
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
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      
      // Process creator profiles like in fetchProducts
      const processedProducts = await Promise.all((data || []).map(async (product: any) => {
        if (product.creators?.user_id) {
          try {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, profile_photo_url')
              .eq('user_id', product.creators.user_id)
              .single();
            
            return {
              ...product,
              creator: {
                ...product.creators,
                user_profiles: profileData
              }
            };
          } catch (profileError) {
            return {
              ...product,
              creator: product.creators
            };
          }
        } else {
          return {
            ...product,
            creator: product.creators
          };
        }
      }));
      
      console.log('✅ Most recent products loaded:', processedProducts.length);
      setMostRecentProducts(processedProducts);
    } catch (err) {
      console.error('Error fetching most recent products:', err);
      setMostRecentProducts([]);
    }
  };

  const fetchCreators = async () => {
    try {
      // Fetch all unique creators who have active products with their product counts
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select(`
          id,
          creator_name,
          user_id,
          profile_photo_url
        `);

      if (creatorsError) {
        console.error('Error fetching creators:', creatorsError);
        setAllCreators([]);
        return;
      }

      // Get product counts for each creator
      const creatorsWithCounts = await Promise.all(
        (creatorsData || []).map(async (creator: any) => {
          const { count, error: countError } = await supabase
            .from('marketplace_products')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', creator.id)
            .eq('is_active', true);

          if (countError) {
            console.error('Error counting products for creator:', creator.creator_name, countError);
            return { ...creator, productCount: 0 };
          }

          return { ...creator, productCount: count || 0 };
        })
      );

      // Filter out creators with no products
      const activeCreators = creatorsWithCounts.filter(creator => creator.productCount > 0);
      
      setAllCreators(activeCreators);
    } catch (error) {
      console.error('Error fetching creators:', error);
      setAllCreators([]);
    }
  };

  const fetchCategoryCounts = async () => {
    try {
      // Get all unique categories and their counts
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('category')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching category counts:', error);
        setCategoryCounts({});
        return;
      }

      // Count products by category
      const counts: {[key: string]: number} = {};
      data?.forEach((product: any) => {
        const category = product.category;
        counts[category] = (counts[category] || 0) + 1;
      });

      // Add total count for "all" category
      counts['all'] = data?.length || 0;

      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching category counts:', error);
      setCategoryCounts({});
    }
  };

  // Build-a-Pack helpers
  const toggleBuildPack = () => {
    const next = !buildPackMode;
    setBuildPackMode(next);
    setSelectedPackIds([]);
    setSelectedPackSize('4"'); // Reset to default 4" size
    if (next) {
      setSelectedCategories(["all"]);
      setSearchQuery("");
      setSortBy("random");
      setSelectedCreatorId(null);
      setSelectedCollectionId(null);
    }
  };

  const togglePackSelection = (id: string) => {
    setSelectedPackIds(prev => {
      if (prev.includes(id)) {
        // Remove from selection
        setSelectedPackProducts(prevProducts => prevProducts.filter(p => p.id !== id));
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 5) return prev; // max 5
      
      // Add to selection - find the product and store it
      const productToAdd = products.find(p => p.id === id);
      if (productToAdd) {
        setSelectedPackProducts(prevProducts => [...prevProducts, productToAdd]);
      }
      return [...prev, id];
    });
  };

  const handleAddPackToCart = () => {
    if (selectedPackIds.length !== 5) return;
    const selectedProducts = selectedPackProducts;
    const packPrice = getPackPrice();
    
    const packCartItem = {
      id: generateCartItemId(),
      product: {
        id: `marketplace-pack-${Date.now()}`,
        sku: `MARKETPLACE-PACK-${Date.now()}`,
        name: `Custom 5-Pack`,
        category: "marketplace-pack" as const,
        description: `Custom 5-pack of stickers in ${selectedPackSize} size`,
        shortDescription: `Custom 5-Pack (${selectedPackSize})`,
        basePrice: packPrice,
        pricingModel: "per-unit" as const,
        images: selectedProducts.map(p => p.default_image || p.images?.[0]).filter(Boolean),
        defaultImage: selectedProducts[0]?.default_image || selectedProducts[0]?.images?.[0] || '/placeholder.png',
        // Store all pack images for display
        packImages: selectedProducts.map(p => p.default_image || p.images?.[0]).filter(Boolean),
        features: [],
        attributes: [],
        customizable: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      customization: {
        productId: `marketplace-pack-${Date.now()}`,
        selections: {},
        options: {
          packItems: selectedProducts.map(p => ({ 
            id: p.id, 
            title: p.title, 
            image: p.default_image || p.images?.[0] 
          })),
          packSize: selectedPackSize
        },
        totalPrice: packPrice,
        unitPrice: packPrice,
        quantity: 1,
        notes: `Pack contains: ${selectedProducts.map(p => p.title).join(', ')} - Size: ${selectedPackSize}`,
        uploadedFiles: [],
        isRushOrder: false,
      },
      quantity: 1,
      unitPrice: packPrice,
      totalPrice: packPrice,
      addedAt: new Date().toISOString(),
    };

    addToCart(packCartItem);
    setBuildPackMode(false);
    setSelectedPackIds([]);
    setSelectedPackProducts([]);
    setSelectedPackSize('4"'); // Reset to default size
    
    // Redirect to cart page
    router.push('/cart');
  };

  // Generate scattered sticker background from collection products
  const generateScatteredBackground = (collectionId: string) => {
    if (!collectionId) return null;
    
    // Use allProducts for backgrounds to ensure we have all collection items
    if (allProducts.length === 0) {
      console.log('⏳ All products not loaded yet, skipping background generation');
      return null;
    }
    
    // Debug logging
    console.log('🔍 generateScatteredBackground called with collectionId:', collectionId);
    console.log('📦 Total all products available:', allProducts.length);
    console.log('📦 Products with collection_id:', allProducts.filter(p => p.collection_id).length);
    console.log('📦 All collection IDs in all products:', [...new Set(allProducts.map(p => p.collection_id).filter(Boolean))]);
    
    // Get products from the selected collection using the unfiltered allProducts array
    const collectionProducts = allProducts.filter(p => p.collection_id === collectionId);
    console.log('🎯 Products found for collection', collectionId, ':', collectionProducts.length);
    
    if (collectionProducts.length === 0) {
      console.log('❌ No products found for collection', collectionId);
      return null;
    }
    
    // Use ALL products from this specific collection if less than 6, otherwise randomly select 6
    const maxStickers = 6;
    let backgroundProducts;
    
    if (collectionProducts.length <= maxStickers) {
      // Use all available products if we have 6 or fewer
      backgroundProducts = collectionProducts;
    } else {
      // Randomly select 6 products if we have more than 6
      const shuffled = [...collectionProducts].sort(() => Math.random() - 0.5);
      backgroundProducts = shuffled.slice(0, maxStickers);
    }
    
    console.log('✅ Using', backgroundProducts.length, 'products for scattered background (out of', collectionProducts.length, 'available)');
    
    // Generate positions - moved further right, avoiding left half of container
    const scatteredStickers = backgroundProducts.map((product, index) => {
      const positions = [
        { top: '8%', right: '15%', rotation: -15 },
        { top: '35%', right: '5%', rotation: 20 },
        { top: '60%', right: '20%', rotation: -12 },
        { bottom: '20%', right: '10%', rotation: 18 },
        { bottom: '45%', right: '2%', rotation: -25 },
        { top: '25%', right: '25%', rotation: 28 }
      ];
      
      // Use the actual index to ensure all positions are used when we have fewer than 6 items
      const position = positions[index];
      return {
        ...product,
        ...position
      };
    });
    
    return scatteredStickers;
  };

  // Get creator info for a collection or direct creator assignment
  const getCollectionCreator = (collectionId: string, creatorId?: string) => {
    // If a specific creator is selected, find them in allCreators
    if (creatorId) {
      const selectedCreator = allCreators.find(c => c.id === creatorId);
      if (selectedCreator) return selectedCreator;
    }
    
    // Fallback to finding creator from collection products
    if (!collectionId || allProducts.length === 0) return null;
    
    // Find the first product in this collection that has creator info
    const collectionProduct = allProducts.find(p => 
      p.collection_id === collectionId && p.creator
    );
    
    return collectionProduct?.creator || null;
  };

  // Get collection link URL
  const getCollectionLink = (collectionId: string) => {
    if (!collectionId) return '#';
    // Use the existing collection filtering mechanism
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      // Trigger collection filter when clicked
      return `/marketspace`;
    }
    return '#';
  };

  // Handle collection link click
  const handleCollectionClick = (collectionId: string) => {
    if (collectionId) {
      setSelectedCollectionId(collectionId);
      setSortBy("popular");
      scrollToTop();
    }
  };

  // Container editing functions
  const handleEditContainer = (container: PromotionalContainer) => {
    setEditingContainer(container.id);
    setEditForm(container);
  };

  const handleCancelEdit = () => {
    setEditingContainer(null);
    setEditForm({});
  };

  const handleSaveContainer = async () => {
    if (!editingContainer) return;
    
    try {
      await updatePromotionalContainer({
        variables: {
          id: editingContainer,
          input: {
            title: editForm.title,
            subtitle: editForm.subtitle,
            description: editForm.description,
            price: editForm.price,
            originalPrice: editForm.originalPrice,
            collectionId: editForm.collectionId,
            creatorId: editForm.creatorId,
            linkText: editForm.linkText,
            backgroundImage: editForm.backgroundImage,
            backgroundGradient: editForm.backgroundGradient,
            badgeText: editForm.badgeText,
            badgeColor: editForm.badgeColor,
            isActive: editForm.isActive
          }
        }
      });
      
      await refetchContainers();
      setEditingContainer(null);
      setEditForm({});
      alert('Container updated successfully!');
    } catch (error) {
      console.error('Error updating container:', error);
      alert('Error updating container. Please try again.');
    }
  };

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
    { value: "random", label: "Random" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "popular", label: "Most Popular" },
    { value: "featured", label: "Featured" }
  ];

  // Scroll to top utility function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to explore stickers section for pagination
  const scrollToExploreStickers = () => {
    const exploreSection = document.querySelector('[data-section="explore-stickers"]') || 
                          document.querySelector('[data-section="recently-added"]');
    if (exploreSection) {
      exploreSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Fallback to scrolling to top if section not found
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleCategory = (categoryValue: string) => {
    let newCategories: string[] = [];
    
    if (categoryValue === "all") {
      newCategories = ["all"];
      setSelectedCategories(newCategories);
    } else {
      setSelectedCategories(prev => {
        const filtered = prev.filter(cat => cat !== "all");
        if (filtered.includes(categoryValue)) {
          const result = filtered.filter(cat => cat !== categoryValue);
          newCategories = result.length === 0 ? ["all"] : result;
        } else {
          newCategories = [...filtered, categoryValue];
        }
        return newCategories;
      });
    }
    
    // Update URL with new filters
    updateURL({
      search: searchQuery,
      creator: selectedCreatorId,
      collection: selectedCollectionId,
      category: newCategories,
      sort: sortBy,
      sale: showSaleItems
    });
    
    scrollToTop();
  };

  if (userLoading || (user && !creatorData)) {
    return (
      <Layout title="Market Space - Sticker Shuttle">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading Creators Space...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Allow access for admin or active creators
  const hasAccess = user && (ADMIN_EMAILS.includes(user.email || '') || creatorData?.getCreatorByUserId?.isActive);
  
  if (!hasAccess) {
    return (
      <Layout title="Market Space - Coming Soon | Sticker Shuttle">
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
                    <button className="px-8 py-3 font-semibold text-lg transition-all duration-300 transform hover:scale-101 rounded-lg"
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
    <Layout title="Market Space by Sticker Shuttle">
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
        
        /* Responsive Background Image for Custom Stickers CTA */
        .custom-stickers-cta {
          background-image: url('https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751994147/StickerShuttle_Banner_MainMobile_a93h3q.png');
        }
        
        @media (min-width: 768px) {
          .custom-stickers-cta {
            background-image: url('https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751382016/StickerShuttle_Banner_Main_nlzoro.png');
          }
        }
      `}</style>




        {/* Main Content with Sidebar */}
        <section className="pt-[20px] pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-2">
            
            {/* Left Sidebar - Enhanced Filters */}
            <aside className={`lg:w-72 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="rounded-xl p-6 space-y-4 sticky top-24" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>



                {/* Build a Pack Button - Desktop only */}
                <div className="hidden lg:block mb-6">
                  <div className="relative">
                                      {/* 50% OFF Pill - Positioned like a bow at top right */}
                  {!buildPackMode && (
                    <div className="absolute -top-2 -right-5 z-10 transform rotate-12">
                      <span className="inline-flex items-center justify-center text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold shadow-lg">
                        50% OFF
                      </span>
                    </div>
                  )}
                    
                    <button
                      onClick={() => {
                        const next = !buildPackMode;
                        setBuildPackMode(next);
                        setSelectedPackIds([]);
                        setSelectedPackProducts([]);
                        setSelectedPackSize('4"'); // Reset to default size
                        if (next) {
                          setSelectedCategories(["all"]);
                          setSearchQuery("");
                          setSortBy("random");
                          setSelectedCreatorId(null);
                          setSelectedCollectionId(null);
                        }
                      }}
                      className="w-full text-center px-4 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.015] relative overflow-hidden holographic-button"
                      style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.75), rgba(255, 255, 255, 0.33) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      {/* Holographic moving gradient overlay */}
                      <div 
                        className="absolute inset-0 opacity-30"
                        style={{
                          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)',
                          backgroundSize: '400% 400%',
                          animation: 'holographicMove 3s ease-in-out infinite'
                        }}
                      ></div>
                      <span className="inline-flex items-center justify-center relative z-10 text-white">
                        {buildPackMode && (
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {buildPackMode ? 'Back to Marketplace' : 'Build a 5-Pack'}
                        {!buildPackMode && (
                          <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </div>
                </div>

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
                        setSearchQuery("");
                        setSortBy("random");
                        setSelectedCreatorId(null);
                        setSelectedCollectionId(null);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
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
                      const categoryCount = categoryCounts[category.value] || 0;
                      
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

                {/* Browse by Creator */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Browse by Creator
                    </div>
                  </label>
                  <div className="space-y-0.5">
                    {/* Use all creators from separate fetch */}
                    {allCreators.length === 0 ? (
                      <div className="text-white/50 text-xs text-center py-2">
                        No creators found
                      </div>
                    ) : (
                      allCreators.map((creator: any) => {
                        const initials = creator.creator_name
                          .split(' ')
                          .map((word: string) => word[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);
                        
                        // Generate a consistent color based on creator name
                        const colors = [
                          'from-purple-500 to-pink-500',
                          'from-blue-500 to-cyan-500',
                          'from-pink-500 to-rose-500',
                          'from-green-500 to-emerald-500',
                          'from-yellow-500 to-orange-500',
                          'from-indigo-500 to-purple-500'
                        ];
                        const colorIndex = creator.creator_name.charCodeAt(0) % colors.length;
                        const gradientColor = colors[colorIndex];
                        
                        const isSelected = selectedCreatorId === creator.id;
                        
                        return (
                          <button
                            key={creator.id}
                            onClick={() => {
                              const newCreatorId = isSelected ? null : creator.id;
                              setSelectedCreatorId(newCreatorId);
                              
                              // Update URL with new filters
                              updateURL({
                                search: searchQuery,
                                creator: newCreatorId,
                                collection: selectedCollectionId,
                                category: selectedCategories,
                                sort: sortBy,
                                sale: showSaleItems
                              });
                              
                              scrollToTop();
                            }}
                            className={`w-full group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden ${
                              isSelected 
                                ? 'bg-blue-600/30 border border-blue-500/50' 
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="relative z-10">
                              <div className="flex items-center gap-3 mb-1">
                                {creator.profile_photo_url || creator.user_profiles?.profile_photo_url ? (
                                  <div className="w-8 h-8 rounded-full overflow-hidden">
                                    <img
                                      src={creator.profile_photo_url || creator.user_profiles.profile_photo_url}
                                      alt={creator.creator_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className={`w-8 h-8 bg-gradient-to-br ${gradientColor} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                                    {initials}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h3 className={`font-semibold text-sm transition-colors ${
                                    isSelected 
                                      ? 'text-blue-300' 
                                      : 'text-white/80 group-hover:text-white'
                                  }`}>
                                    {creator.creator_name || (
                                      creator.user_profiles?.first_name && creator.user_profiles?.last_name
                                        ? `${creator.user_profiles.first_name} ${creator.user_profiles.last_name}`
                                        : 'Creator'
                                    )}
                                  </h3>
                                  <p className={`text-xs transition-colors ${
                                    isSelected 
                                      ? 'text-blue-400/70' 
                                      : 'text-white/50 group-hover:text-white/60'
                                  }`}>
                                    {creator.productCount} {creator.productCount === 1 ? 'design' : 'designs'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Browse by Collection */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Browse by Collection
                    </div>
                  </label>
                  <div className="space-y-0.5">
                    {collections.length === 0 ? (
                      <div className="text-white/50 text-xs text-center py-2">No collections yet</div>
                    ) : (
                      collections.map((collection: any) => {
                        const isSelected = selectedCollectionId === collection.id;
                        // Get preview image from collectionPreviews state
                        const previewImage = collectionPreviews[collection.id] || collection.image_url;
                        
                        return (
                          <button
                            key={collection.id}
                            onClick={() => {
                              setSelectedCollectionId(isSelected ? null : collection.id);
                              if (!isSelected) {
                                setSortBy("popular");
                              }
                              scrollToTop();
                            }}
                            className={`w-full group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden ${
                              isSelected 
                                ? 'bg-green-600/30 border border-green-500/50' 
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="relative z-10">
                              <div className="flex items-center gap-3 mb-1">
                                {previewImage ? (
                                  <div className="w-8 h-8 flex items-center justify-center">
                                    <img 
                                      src={previewImage} 
                                      alt={collection.name} 
                                      className="max-w-full max-h-full object-contain" 
                                      style={{ 
                                        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' 
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h3 className={`font-semibold text-sm transition-colors ${
                                    isSelected ? 'text-green-300' : 'text-white/80 group-hover:text-white'
                                  }`}>
                                    {collection.name}
                                  </h3>
                                </div>
                                {isSelected && (
                                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Sort - Only show when filtering and not in build pack mode */}
                {!buildPackMode && (!selectedCategories.includes("all") || showSaleItems || searchQuery.trim() || selectedCreatorId || selectedCollectionId) && (
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
            <main className="flex-1 min-w-0 space-y-4 lg:pl-4 lg:pt-2">
              
              {/* Build a Pack CTA - Mobile only */}
              <div className="max-w-md mx-auto lg:hidden">
                <div className="relative">
                  {/* 50% OFF Pill - Positioned like a bow at top right */}
                  {!buildPackMode && (
                    <div className="absolute -top-3 -right-3 z-10 transform rotate-12">
                      <span className="inline-flex items-center justify-center text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold shadow-lg">
                        50% OFF
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      const next = !buildPackMode;
                      setBuildPackMode(next);
                      setSelectedPackIds([]);
                      setSelectedPackProducts([]);
                      setSelectedPackSize('4"'); // Reset to default size
                      if (next) {
                        setSelectedCategories(["all"]);
                        setSearchQuery("");
                        setSortBy("random");
                        setSelectedCreatorId(null);
                        setSelectedCollectionId(null);
                      }
                    }}
                    className="w-full text-center px-4 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.015] relative overflow-hidden holographic-button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.75), rgba(255, 255, 255, 0.33) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    {/* Holographic moving gradient overlay */}
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)',
                        backgroundSize: '400% 400%',
                        animation: 'holographicMove 3s ease-in-out infinite'
                      }}
                    ></div>
                    <span className="inline-flex items-center justify-center relative z-10 text-white">
                      {buildPackMode && (
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {buildPackMode ? 'Back to Marketplace' : 'Build a 5-Pack'}
                      {!buildPackMode && (
                        <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                </div>
              </div>
              {/* Show promotional sections only when "All Shapes" is selected, no sale filter, no search, no creator/collection selected, and not in build pack mode */}
              {selectedCategories.includes("all") && !searchQuery.trim() && !selectedCreatorId && !selectedCollectionId && !buildPackMode && (
                <>
                  {/* Dynamic Promotional Containers */}
                  {containersLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="h-44 sm:h-48 rounded-xl bg-white/5 animate-pulse"></div>
                      <div className="h-44 sm:h-48 rounded-xl bg-white/5 animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
                      {promotionalContainers.map((container: PromotionalContainer, index: number) => {
                        console.log('🎨 Rendering promotional container:', {
                          id: container.id,
                          title: container.title,
                          collectionId: container.collectionId,
                          allProductsCount: allProducts.length,
                          hasProducts: allProducts.length > 0,
                          collectionProductsCount: allProducts.filter(p => p.collection_id === container.collectionId).length
                        });
                        return (
                        <div key={container.id} className={`relative ${index > 0 ? 'hidden md:block' : ''}`}>
                          {/* Admin Edit Button */}
                          {isAdmin && (
                            <button
                              onClick={() => handleEditContainer(container)}
                              className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                              style={{
                                background: 'rgba(59, 130, 246, 0.8)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                backdropFilter: 'blur(12px)'
                              }}
                              title="Edit Container"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          
                          {/* Container */}
                          <div 
                            onClick={() => handleCollectionClick(container.collectionId || '')}
                            className="rounded-xl p-6 sm:p-8 cursor-pointer transition-all duration-200 hover:scale-[1.025] group h-52 sm:h-56 relative overflow-hidden"
                              style={{
                                backgroundImage: container.backgroundImage ? `url(${container.backgroundImage})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat'
                              }}
                            >
                              {/* Scattered Stickers Background */}
                              {container.collectionId && (() => {
                                console.log('🎨 Rendering scattered background for container:', container.collectionId, 'allProducts:', allProducts.length);
                                const scatteredStickers = generateScatteredBackground(container.collectionId);
                                console.log('🖼️ Generated stickers:', scatteredStickers?.length || 0);
                                return scatteredStickers ? (
                                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                                    {scatteredStickers.map((sticker, index) => (
                                      <div
                                        key={`${sticker.id}-${index}`}
                                        className="absolute w-24 h-24 sm:w-32 sm:h-32 transition-all duration-300"
                                        style={{
                                          top: sticker.top,
                                          left: (sticker as any).left,
                                          right: sticker.right,
                                          bottom: sticker.bottom,
                                          transform: `rotate(${sticker.rotation}deg) scale(1)`,
                                          filter: 'brightness(1.1) contrast(1.05) saturate(1.1)',
                                          zIndex: 1
                                        }}
                                      >
                                        <img
                                          src={sticker.default_image || sticker.images[0]}
                                          alt=""
                                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                          style={{ 
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2)) drop-shadow(0 2px 4px rgba(0,0,0,0.2)) drop-shadow(0 1px 1px rgba(0,0,0,0.4))'
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                              
                              {/* Blue gradient overlay for text readability */}
                              <div 
                                className="absolute inset-0 rounded-xl"
                                style={{
                                  background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.85) 0%, rgba(59, 130, 246, 0.6) 50%, rgba(59, 130, 246, 0.3) 100%)'
                                }}
                              ></div>
                              
                              {/* Additional fade overlay on top of stickers for better text readability */}
                              <div 
                                className="absolute inset-0 rounded-xl"
                                style={{
                                  background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)',
                                  zIndex: 2
                                }}
                              ></div>
                              
                              {/* Original gradient overlay (reduced opacity) */}
                              <div 
                                className="absolute inset-0 rounded-xl"
                                style={{
                                  background: container.backgroundGradient || 'linear-gradient(135deg, rgba(92, 80, 217, .3) 50%, rgba(92, 80, 217, 0.1) 100%)',
                                  mixBlendMode: 'multiply'
                                }}
                              ></div>
                              <div className="relative z-10 text-left h-full flex flex-col justify-start px-0 pt-0 space-y-2">
                                {/* Badge */}
                                {container.badgeText && (
                                  <div className={`inline-flex px-2 py-0.5 rounded-full text-sm font-medium w-fit ${
                                    container.badgeColor === 'pink' ? 'bg-pink-400/20 text-pink-300' :
                                    container.badgeColor === 'green' ? 'bg-green-400/20 text-green-300' :
                                    container.badgeColor === 'yellow' ? 'bg-yellow-400/20 text-yellow-300' :
                                    'bg-blue-400/20 text-blue-300'
                                  }`}>
                                    {container.badgeText}
                                  </div>
                                )}
                                
                                {/* Title */}
                                <h3 className="text-2xl font-bold text-white group-hover:text-indigo-200 transition-colors">
                                  {container.title}
                                </h3>
                                
                                {/* Creator Info */}
                                {(container.collectionId || container.creatorId) && (() => {
                                  const creator = getCollectionCreator(container.collectionId || '', container.creatorId);
                                  if (!creator) return null;
                                  
                                  const displayName = creator.creator_name || (
                                    creator.user_profiles?.first_name && creator.user_profiles?.last_name
                                      ? `${creator.user_profiles.first_name} ${creator.user_profiles.last_name}`
                                      : 'Creator'
                                  );
                                  
                                  const profilePhotoUrl = creator.profile_photo_url || creator.user_profiles?.profile_photo_url;
                                  
                                  return (
                                    <div className="flex items-center space-x-2">
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                        {profilePhotoUrl ? (
                                          <img
                                            src={profilePhotoUrl}
                                            alt={`${displayName} avatar`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              const parent = e.currentTarget.parentElement;
                                              if (parent) {
                                                parent.innerHTML = displayName.charAt(0).toUpperCase();
                                                parent.className = parent.className.replace('bg-white/10', 'bg-gradient-to-br from-purple-500 to-pink-500');
                                              }
                                            }}
                                          />
                                        ) : (
                                          <span className="text-white text-xs font-semibold">
                                            {displayName.charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-white/80 text-sm">
                                        by {displayName}
                                      </span>
                                    </div>
                                  );
                                })()}
                                
                                {/* Subtitle */}
                                {container.subtitle && (
                                  <p className="text-gray-200 text-sm">
                                    {container.subtitle}
                                  </p>
                                )}
                                
                                {/* Price and Button Row */}
                                <div className="flex items-center justify-between">
                                  <div className="text-white">
                                    {container.price && (
                                      <span className="text-2xl font-bold">{container.price}</span>
                                    )}
                                    {container.originalPrice && (
                                      <span className="text-gray-300 text-sm ml-2 line-through">{container.originalPrice}</span>
                                    )}
                                  </div>
                                  {container.linkText && (
                                    <div 
                                      className="inline-block px-3 py-1.5 text-white text-sm font-medium group-hover:text-gray-100 transition-colors"
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                        backdropFilter: 'blur(12px)',
                                        borderRadius: '9999px'
                                      }}
                                    >
                                      {container.linkText}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Store Credit Info Container */}
                  <div 
                    className="hidden sm:block rounded-2xl overflow-hidden mb-6"
                    style={{
                      background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.6) 0%, rgba(255, 215, 0, 0.4) 25%, rgba(250, 204, 21, 0.25) 50%, rgba(255, 193, 7, 0.15) 75%, rgba(250, 204, 21, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(200%)',
                      border: '1px solid rgba(255, 215, 0, 0.5)',
                      boxShadow: 'rgba(250, 204, 21, 0.25) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
                    }}
                  >
                    <div className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                            alt="Credits" 
                            className="w-8 h-8 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                              Earn 5% in store credit on every purchase!
                            </h3>
                            <p className="text-sm text-yellow-300 mt-1">
                              Available on all orders
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Filter Toggle Button */}
                  <div className="lg:hidden mb-4">
                    <div className="max-w-2xl mx-auto flex justify-start">
                      <button
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                        className="relative p-2 transition-all duration-200 hover:scale-110"
                      >
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                        </svg>
                        {/* Mobile notification dot */}
                        {(!selectedCategories.includes("all") || selectedCreatorId || selectedCollectionId) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {selectedCategories.filter(cat => cat !== "all").length + (selectedCreatorId ? 1 : 0) + (selectedCollectionId ? 1 : 0)}
                            </span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>


                  {/* Search Bar - Mobile only */}
                  <div className="mb-4 lg:hidden">
                    <div className="max-w-2xl mx-auto">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search all stickers..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-3 pl-12 rounded-lg text-white placeholder-white/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                            backdropFilter: 'blur(12px)'
                          }}
                        />
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recently Added Section - Without Title */}
                  {mostRecentProducts.length > 0 && !searchQuery.trim() && (
                    <div data-section="recently-added" className="mb-8">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                        {mostRecentProducts.map((product) => (
                          <ProductCard 
                            key={`recent-${product.id}`} 
                            product={product} 
                            buildPackMode={buildPackMode} 
                            selected={selectedPackIds.includes(product.id)} 
                            onToggleSelect={togglePackSelection} 
                            onAddToCart={handleAddMarketplaceProductToCart} 
                            getPriceOverride={getMarketplaceProductPrice} 
                          />
                        ))}
                      </div>
                    </div>
                  )}



                  {/* Featured Creators Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                    {(() => {
                      // Use the first 3 creators from allCreators (which already have correct counts)
                      const creatorsArray = allCreators.slice(0, 3);
                      
                       return creatorsArray.map((creator: any) => {
                        const initials = creator.creator_name
                          .split(' ')
                          .map((word: string) => word[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2);
                        
                        // Generate a consistent color based on creator name
                        const colors = [
                          'from-purple-500 to-pink-500',
                          'from-blue-500 to-cyan-500',
                          'from-pink-500 to-rose-500',
                          'from-green-500 to-emerald-500',
                          'from-yellow-500 to-orange-500',
                          'from-indigo-500 to-purple-500'
                        ];
                        const colorIndex = creator.creator_name.charCodeAt(0) % colors.length;
                        const gradientColor = colors[colorIndex];
                        
                        return (
                          <div
                            key={creator.id}
                            onClick={() => {
                              setSelectedCreatorId(creator.id);
                              
                              // Update URL with new filters
                              updateURL({
                                search: searchQuery,
                                creator: creator.id,
                                collection: selectedCollectionId,
                                category: selectedCategories,
                                sort: sortBy,
                                sale: showSaleItems
                              });
                              
                              scrollToTop();
                            }}
                            className="rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:scale-105 group h-28 sm:h-32 relative overflow-hidden"
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                              backdropFilter: 'blur(12px)'
                            }}
                          >
                            <div className="relative z-10 h-full flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {creator.profile_photo_url || creator.user_profiles?.profile_photo_url ? (
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-white/20">
                                    <img
                                      src={creator.profile_photo_url || creator.user_profiles.profile_photo_url}
                                      alt={creator.creator_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${gradientColor} rounded-full flex items-center justify-center text-white text-lg font-bold ring-2 ring-white/20`}>
                                    {initials}
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-white font-semibold text-base sm:text-lg group-hover:text-blue-300 transition-colors">
                                    {creator.creator_name || (
                                      creator.user_profiles?.first_name && creator.user_profiles?.last_name
                                        ? `${creator.user_profiles.first_name} ${creator.user_profiles.last_name}`
                                        : 'Creator'
                                    )}
                                  </h3>
                                  <p className="text-white/60 text-sm">
                                    {creator.productCount} {creator.productCount === 1 ? 'design' : 'designs'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-blue-400 group-hover:text-blue-300 transition-colors">
                                <span className="text-sm font-medium hidden sm:inline">Shop Creator</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}

              {/* Custom Stickers Container */}
              <div 
                className="rounded-2xl overflow-hidden mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(96, 165, 250, 0.4) 25%, rgba(59, 130, 246, 0.25) 50%, rgba(37, 99, 235, 0.15) 75%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(200%)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  boxShadow: 'rgba(59, 130, 246, 0.25) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
                }}
              >
                <div className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                        alt="Vinyl Stickers" 
                        className="w-10 h-10 sm:w-8 sm:h-8 object-contain flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                          Need custom stickers for your project?
                        </h3>
                        <p className="text-sm text-blue-300 mt-1">
                          We can print your own custom designs
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => window.location.href = '/products'}
                      className="px-4 py-3 sm:px-3 sm:py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.5) 0%, rgba(96, 165, 250, 0.35) 50%, rgba(37, 99, 235, 0.2) 100%)',
                        backdropFilter: 'blur(25px) saturate(200%)',
                        border: '1px solid rgba(59, 130, 246, 0.6)',
                        boxShadow: 'rgba(59, 130, 246, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                      }}
                    >
                      <svg className="w-4 h-4 sm:w-3 sm:h-3 inline mr-2 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm sm:text-xs">Create Custom Stickers</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Explore Stickers Section - Always show when filtering */}
              <div data-section="explore-stickers">
                <div className="flex items-center gap-4 mb-4">
                  {/* Back Button - Show when any filters are active */}
                  {(!selectedCategories.includes("all") || showSaleItems || searchQuery.trim() || selectedCreatorId || selectedCollectionId) && !buildPackMode && (
                    <button
                      onClick={() => {
                        // Clear all filters
                        setSelectedCategories(["all"]);
                        setShowSaleItems(false);
                        setSearchQuery("");
                        setSelectedCreatorId(null);
                        setSelectedCollectionId(null);
                        setSortBy("random");
                        
                        // Update URL to clear all filters
                        router.push('/marketspace', undefined, { shallow: true });
                        
                        scrollToTop();
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:scale-110"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                      title="Back to all stickers"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
                  <h2 className="text-2xl font-bold text-white">
                    {(!selectedCategories.includes("all") || showSaleItems || searchQuery.trim() || selectedCreatorId || selectedCollectionId) ? 
                      (searchQuery.trim() ? `Search Results for "${searchQuery}"` :
                        selectedCreatorId ? (() => {
                         const creator = allCreators.find(c => c.id === selectedCreatorId);
                         if (!creator) return "Creator's Designs";
                         const displayName = creator.creator_name || (creator.user_profiles?.first_name && creator.user_profiles?.last_name
                           ? `${creator.user_profiles.first_name} ${creator.user_profiles.last_name}`
                           : 'Creator');
                         return `Designs by ${displayName}`;
                       })() :
                       selectedCollectionId ? (() => {
                         const collection = collections.find(c => c.id === selectedCollectionId);
                         return collection ? `${collection.name} Collection` : "Collection";
                       })() :
                       showSaleItems ? "Sale Items" : 
                       selectedCategories.length === 1 ? 
                         categories.find(cat => cat.value === selectedCategories[0])?.label || "Filtered Stickers" :
                         "Filtered Stickers"
                      ) : 
                      ""
                    }
                  </h2>
                  {buildPackMode && (
                     <>
                       {/* Desktop Layout - Inline with content */}
                       <div className="hidden lg:flex items-center justify-start mt-4">
                         {/* Build Pack Add to Cart Button - Inline with content */}
                         <div className="flex items-center gap-3">
                           {/* Selected Sticker Thumbnails */}
                           {selectedPackProducts.map((product, index) => (
                             <div
                     key={product.id}
                     className={`relative w-12 h-12 rounded-lg border-2 transition-all duration-300 ${
                                 selectedPackIds.length === 5 
                                   ? 'border-yellow-400/80 scale-110 shadow-lg shadow-yellow-400/30' 
                                   : 'border-white/20'
                               }`}
                               style={{
                                 background: selectedPackIds.length === 5 
                                   ? 'rgba(255, 215, 0, 0.1)' 
                                   : 'rgba(255, 255, 255, 0.05)',
                                 backdropFilter: 'blur(12px)'
                               }}
                             >
                               <img 
                                 src={product.default_image} 
                                 alt={product.title}
                                 className="w-full h-full object-cover"
                               />
                               {/* Remove button */}
                     <button
                       onClick={() => togglePackSelection(product.id)}
                       className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full text-white text-sm flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                     >
                       ×
                     </button>
                               
                               {/* Success indicator when 5 selected */}
                               {selectedPackIds.length === 5 && (
                                 <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                   <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                   </svg>
                                 </div>
                  )}
                </div>
                           ))}
                           
                           {/* Placeholder thumbnails for remaining slots */}
                           {Array.from({ length: 5 - selectedPackIds.length }, (_, index) => (
                             <div 
                               key={`placeholder-${index}`}
                               className="w-12 h-12 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center"
                               style={{
                                 background: 'rgba(255, 255, 255, 0.02)',
                                 backdropFilter: 'blur(12px)'
                               }}
                             >
                               <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                               </svg>
                             </div>
                           ))}
                           
                           {/* Size Selection Buttons */}
                 <div className="flex items-center gap-2 ml-4 mr-4">
                   {[
                     { size: '3"', price: 9.98 },
                     { size: '4"', price: 12.48 },
                     { size: '5"', price: 14.98 }
                   ].map((sizeOption) => (
                     <button
                       key={sizeOption.size}
                       onClick={() => setSelectedPackSize(sizeOption.size)}
                       className={`w-16 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                         selectedPackSize === sizeOption.size
                           ? 'border-yellow-400/80 scale-110 shadow-md shadow-yellow-400/15'
                           : 'border-dashed border-white/30 opacity-65'
                       }`}
                       style={{
                         background: selectedPackSize === sizeOption.size
                           ? 'rgba(255, 215, 0, 0.1)'
                           : 'rgba(255, 255, 255, 0.02)',
                         backdropFilter: 'blur(12px)'
                       }}
                     >
                       <span className={`text-xs font-medium ${
                         selectedPackSize === sizeOption.size
                           ? 'text-yellow-200'
                           : 'text-white/65'
                       }`}>
                         {sizeOption.size}
                       </span>
                     </button>
                   ))}
                 </div>

                 {/* Add to Cart Button */}
                 <button
                   disabled={selectedPackIds.length !== 5}
                   onClick={handleAddPackToCart}
                   className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap transform hover:scale-105 ${
                     selectedPackIds.length === 5
                       ? ''
                       : 'opacity-50 cursor-not-allowed'
                   }`}
                   style={{
                     backgroundColor: selectedPackIds.length === 5 ? '#ffd713' : '#ffd713',
                     color: '#030140',
                     border: '1px solid rgba(255, 255, 255, 0.2)',
                     boxShadow: selectedPackIds.length === 5 
                       ? '3px 3px 0px #cfaf13, 0 0 20px rgba(255, 215, 0, 0.4)' 
                       : '3px 3px 0px #cfaf13'
                   }}
                 >
                   {selectedPackIds.length === 5 ? (
                      <>
                        🎉 Add to Cart - ${getPackPrice()} (5/5)
                        <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded inline-flex items-center">
                          50% OFF
                        </span>
                        <span className="ml-2 text-xs text-gray-400 line-through inline-flex items-center">
                          was $24.95
                        </span>
                      </>
                    ) : (
                      `Add to Cart (${selectedPackIds.length}/5)`
                    )}
                 </button>
                         </div>
                       </div>

                       {/* Mobile Layout - Portal to body for proper fixed positioning */}
                       {typeof window !== 'undefined' && createPortal(
                         <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] p-4" style={{
                           background: 'rgba(3, 1, 64, 0.95)',
                           backdropFilter: 'blur(20px)',
                           borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                           position: 'fixed',
                           bottom: '0',
                           left: '0',
                           right: '0'
                         }}>
                           <div className="flex flex-col gap-3">
                             {/* Top Row: Selected Sticker Thumbnails + Size Selection */}
                             <div className="flex items-center justify-between gap-3">
                               {/* Left: Selected Sticker Thumbnails */}
                               <div className="flex items-center gap-2">
                                 {selectedPackProducts.map((product, index) => (
                                   <div
                                     key={product.id}
                                     className={`relative w-10 h-10 rounded-lg border-2 transition-all duration-300 ${
                                       selectedPackIds.length === 5 
                                         ? 'border-yellow-400/80 scale-110 shadow-lg shadow-yellow-400/30' 
                                         : 'border-white/20'
                                     }`}
                                     style={{
                                       background: selectedPackIds.length === 5 
                                         ? 'rgba(255, 215, 0, 0.1)' 
                                         : 'rgba(255, 255, 255, 0.05)',
                                       backdropFilter: 'blur(12px)'
                                     }}
                                   >
                                     <img 
                                       src={product.default_image} 
                                       alt={product.title}
                                       className="w-full h-full object-cover"
                                     />
                                     {/* Remove button */}
                                     <button
                                       onClick={() => togglePackSelection(product.id)}
                                       className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                                     >
                                       ×
                                     </button>
                                     
                                     {/* Success indicator when 5 selected */}
                                     {selectedPackIds.length === 5 && (
                                       <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                         <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                         </svg>
                                       </div>
                                     )}
                                   </div>
                                 ))}
                                 
                                 {/* Placeholder thumbnails for remaining slots */}
                                 {Array.from({ length: 5 - selectedPackIds.length }, (_, index) => (
                                   <div 
                                     key={`placeholder-${index}`}
                                     className="w-10 h-10 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center"
                                     style={{
                                       background: 'rgba(255, 255, 255, 0.02)',
                                       backdropFilter: 'blur(12px)'
                                     }}
                                   >
                                     <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                     </svg>
                                   </div>
                                 ))}
                               </div>

                               {/* Right: Size Selection Dropdown */}
                               <div className="flex items-center gap-1">
                                 {[
                                   { size: '3"', price: 9.98 },
                                   { size: '4"', price: 12.48 },
                                   { size: '5"', price: 14.98 }
                                 ].map((sizeOption) => (
                                   <button
                                     key={sizeOption.size}
                                     onClick={() => setSelectedPackSize(sizeOption.size)}
                                     className={`w-10 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                                       selectedPackSize === sizeOption.size
                                         ? 'border-yellow-400/80 scale-110 shadow-md shadow-yellow-400/15'
                                         : 'border-dashed border-white/30 opacity-65'
                                     }`}
                                     style={{
                                       background: selectedPackSize === sizeOption.size
                                         ? 'rgba(255, 215, 0, 0.1)'
                                         : 'rgba(255, 255, 255, 0.02)',
                                       backdropFilter: 'blur(12px)'
                                     }}
                                   >
                                     <span className={`text-xs font-medium ${
                                       selectedPackSize === sizeOption.size
                                         ? 'text-yellow-200'
                                         : 'text-white/65'
                                     }`}>
                                       {sizeOption.size}
                                     </span>
                                   </button>
                                 ))}
                               </div>
                             </div>

                             {/* Bottom Row: Add to Cart Button - Full Width */}
                             <div className="w-full">
                               <button
                                 disabled={selectedPackIds.length !== 5}
                                 onClick={handleAddPackToCart}
                                 className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap transform hover:scale-105 ${
                                   selectedPackIds.length === 5
                                     ? ''
                                     : 'opacity-50 cursor-not-allowed'
                                 }`}
                                 style={{
                                   backgroundColor: selectedPackIds.length === 5 ? '#ffd713' : '#ffd713',
                                   color: '#030140',
                                   border: '1px solid rgba(255, 255, 255, 0.2)',
                                   boxShadow: selectedPackIds.length === 5 
                                     ? '3px 3px 0px #cfaf13, 0 0 20px rgba(255, 215, 0, 0.4)' 
                                     : '3px 3px 0px #cfaf13'
                                 }}
                               >
                                 {selectedPackIds.length === 5 ? (
                                   <div className="flex flex-col items-center">
                                     <div className="flex items-center">
                                       🎉 Add to Cart - ${getPackPrice()} (5/5)
                                       <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded">
                                         50% OFF
                                       </span>
                                     </div>
                                     <span className="text-xs text-gray-600 line-through">
                                       was $24.95
                                     </span>
                                   </div>
                                 ) : (
                                   `Add to Cart (${selectedPackIds.length}/5)`
                                 )}
                               </button>
                             </div>
                           </div>
                         </div>,
                         document.body
                       )}
                     </>
                   )}
                </div>
                {loading ? (
                  <LoadingGrid count={12} />
                ) : products.length === 0 ? (
            <div className="container-style p-8 text-center">
              <div className="text-gray-400 text-lg mb-4">
                No products found matching your criteria.
              </div>
              <button
                onClick={() => {
                  setSelectedCategories(["all"]);
                  setShowSaleItems(false);
                  setSearchQuery("");
                  setSortBy("random");
                  setSelectedCreatorId(null);
                }}
                className="button-style px-6 py-3 text-white font-medium rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
            {buildPackMode && (
              <></>
            )}
            
            {/* Most Popular Section - Show when a collection is selected */}
            {selectedCollectionId && !buildPackMode && featuredProducts.length > 0 && !searchQuery.trim() && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Most Popular
                  <span className="text-sm font-normal text-gray-400">
                    ({featuredProducts.length} {featuredProducts.length === 1 ? 'item' : 'items'})
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
                  {featuredProducts.map((product) => (
                    <ProductCard 
                      key={`featured-${product.id}`} 
                      product={product} 
                      buildPackMode={buildPackMode} 
                      selected={selectedPackIds.includes(product.id)} 
                      onToggleSelect={togglePackSelection} 
                      onAddToCart={handleAddMarketplaceProductToCart} 
                      getPriceOverride={getMarketplaceProductPrice} 
                    />
                  ))}
                </div>
                
                {/* Divider */}
                <div className="border-t border-white/10 mb-8">
                  <h3 className="text-xl font-semibold text-white mt-8 mb-6">
                    All Items in Collection
                  </h3>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
{(() => {
                // In build pack mode with filters active, show selected items first regardless of filter match
                if (buildPackMode && (
                  !selectedCategories.includes("all") || 
                  showSaleItems || 
                  searchQuery.trim() || 
                  selectedCreatorId || 
                  selectedCollectionId
                )) {
                  // Get filtered products (excluding already selected ones to avoid duplicates)
                  const filteredProducts = products.filter(product => !selectedPackIds.includes(product.id));
                  
                  // Combine: selected first (from stored products), then filtered results, both sorted by newest
                  const combinedProducts = [
                    ...selectedPackProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
                    ...filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  ];
                  
                  // Apply pagination to combined products
                  const paginatedProducts = getPaginatedProducts(combinedProducts);
                  
                  return paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} buildPackMode={buildPackMode} selected={selectedPackIds.includes(product.id)} onToggleSelect={togglePackSelection} onAddToCart={handleAddMarketplaceProductToCart} getPriceOverride={getMarketplaceProductPrice} />
                  ));
                }
                
                // Normal sorting for other cases
                const sortedProducts = products
                  .sort((a, b) => {
                    // When filtering by collection, sort alphabetically by title
                    if (selectedCollectionId) {
                      return a.title.localeCompare(b.title);
                    }
                    // When filtering by category, sale items, searching, or creator, sort by most recent first
                    if (!selectedCategories.includes("all") || showSaleItems || searchQuery.trim() || selectedCreatorId) {
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }
                    // Otherwise use the selected sort order
                    return 0;
                  });
                
                // Apply pagination to sorted products
                const paginatedProducts = getPaginatedProducts(sortedProducts);
                
                return paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} buildPackMode={buildPackMode} selected={selectedPackIds.includes(product.id)} onToggleSelect={togglePackSelection} onAddToCart={handleAddMarketplaceProductToCart} getPriceOverride={getMarketplaceProductPrice} />
                ));
              })()}
            </div>
            
            {/* Pagination */}
            {!buildPackMode && products.length > 0 && (
              <div className="mt-8 flex flex-col items-center gap-4">
                {(() => {
                  const totalPages = getTotalPages(products);
                  const startItem = (currentPage - 1) * itemsPerPage + 1;
                  const endItem = Math.min(currentPage * itemsPerPage, totalCount);
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <>
                      {/* Page Info */}
                      <div className="text-white/70 text-sm">
                        Showing {startItem}-{endItem} of {totalCount} stickers
                      </div>
                      
                      {/* Pagination Controls */}
                      <div className="flex items-center gap-2">
                        {/* Previous Button */}
                        <button
                          onClick={() => {
                            setCurrentPage(Math.max(1, currentPage - 1));
                            scrollToExploreStickers();
                          }}
                          disabled={currentPage === 1}
                          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                        >
                          Previous
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                          {(() => {
                            const pages = [];
                            const showPages = 5; // Show 5 page numbers
                            let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                            let endPage = Math.min(totalPages, startPage + showPages - 1);
                            
                            // Adjust start if we're near the end
                            if (endPage - startPage < showPages - 1) {
                              startPage = Math.max(1, endPage - showPages + 1);
                            }
                            
                            // First page + ellipsis if needed
                            if (startPage > 1) {
                              pages.push(
                                <button
                                  key={1}
                                  onClick={() => {
                                    setCurrentPage(1);
                                    scrollToExploreStickers();
                                  }}
                                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                  1
                                </button>
                              );
                              if (startPage > 2) {
                                pages.push(<span key="ellipsis1" className="text-white/50 px-2">...</span>);
                              }
                            }
                            
                            // Page numbers
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <button
                                  key={i}
                                  onClick={() => {
                                    setCurrentPage(i);
                                    scrollToExploreStickers();
                                  }}
                                  className={`px-3 py-2 rounded-lg transition-colors ${
                                    i === currentPage
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-white/10 hover:bg-white/20 text-white'
                                  }`}
                                >
                                  {i}
                                </button>
                              );
                            }
                            
                            // Ellipsis + last page if needed
                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push(<span key="ellipsis2" className="text-white/50 px-2">...</span>);
                              }
                              pages.push(
                                <button
                                  key={totalPages}
                                  onClick={() => {
                                    setCurrentPage(totalPages);
                                    scrollToExploreStickers();
                                  }}
                                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                  {totalPages}
                                </button>
                              );
                            }
                            
                            return pages;
                          })()}
                        </div>
                        
                        {/* Next Button */}
                        <button
                          onClick={() => {
                            const totalPages = getTotalPages(products);
                            setCurrentPage(Math.min(totalPages, currentPage + 1));
                            scrollToExploreStickers();
                          }}
                          disabled={currentPage >= getTotalPages(products)}
                          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            </>
          )}
              </div>
            </main>

          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div 
            className="container-style custom-stickers-cta p-8 text-center relative overflow-hidden"
            style={{
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              Need custom stickers?
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Don't see what you're looking for? We also offer custom sticker printing. 
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products/vinyl-stickers"
                className="button-style px-6 py-3 text-white font-medium rounded-lg transition-colors"
              >
                Get Started
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* Admin Edit Modal */}
      {editingContainer && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Promotional Container</h2>
              <button
                onClick={handleCancelEdit}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close modal"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title</label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Container title"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Subtitle</label>
                <input
                  type="text"
                  value={editForm.subtitle || ''}
                  onChange={(e) => setEditForm({...editForm, subtitle: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Container subtitle"
                />
              </div>

              {/* Price and Original Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Price</label>
                  <input
                    type="text"
                    value={editForm.price || ''}
                    onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="$19.99"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Original Price</label>
                  <input
                    type="text"
                    value={editForm.originalPrice || ''}
                    onChange={(e) => setEditForm({...editForm, originalPrice: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="$29.99"
                  />
                </div>
              </div>

              {/* Collection, Creator, and Link Text */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Collection</label>
                  <select
                    value={editForm.collectionId || ''}
                    onChange={(e) => setEditForm({...editForm, collectionId: e.target.value || undefined})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title="Select collection"
                    aria-label="Select collection"
                  >
                    <option value="">No Collection</option>
                    {collections.map((collection: any) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Creator Override</label>
                  <select
                    value={editForm.creatorId || ''}
                    onChange={(e) => setEditForm({...editForm, creatorId: e.target.value || undefined})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title="Select creator"
                    aria-label="Select creator"
                  >
                    <option value="">Auto (from collection)</option>
                    {allCreators.map((creator: any) => {
                      const displayName = creator.creator_name || (
                        creator.user_profiles?.first_name && creator.user_profiles?.last_name
                          ? `${creator.user_profiles.first_name} ${creator.user_profiles.last_name}`
                          : 'Creator'
                      );
                      return (
                        <option key={creator.id} value={creator.id}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Link Text</label>
                  <input
                    type="text"
                    value={editForm.linkText || ''}
                    onChange={(e) => setEditForm({...editForm, linkText: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Shop Now →"
                  />
                </div>
              </div>

              {/* Badge */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Badge Text</label>
                  <input
                    type="text"
                    value={editForm.badgeText || ''}
                    onChange={(e) => setEditForm({...editForm, badgeText: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="New!"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Badge Color</label>
                  <select
                    value={editForm.badgeColor || 'blue'}
                    onChange={(e) => setEditForm({...editForm, badgeColor: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title="Badge color"
                    aria-label="Badge color"
                  >
                    <option value="blue">Blue</option>
                    <option value="pink">Pink</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                  </select>
                </div>
              </div>

              {/* Background Image */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Background Image URL</label>
                <input
                  type="text"
                  value={editForm.backgroundImage || ''}
                  onChange={(e) => setEditForm({...editForm, backgroundImage: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              {/* Background Gradient */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Background Gradient (CSS)</label>
                <textarea
                  value={editForm.backgroundGradient || ''}
                  onChange={(e) => setEditForm({...editForm, backgroundGradient: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="linear-gradient(135deg, rgba(92, 80, 217, .95) 50%, rgba(92, 80, 217, 0.6) 100%)"
                  rows={3}
                />
              </div>

              {/* Active Toggle */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={editForm.isActive || false}
                    onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                    className="w-5 h-5 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-white font-medium">Active</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={handleCancelEdit}
                className="px-6 py-3 text-white hover:text-gray-300 transition-colors rounded-lg border border-white/20 hover:border-white/30"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContainer}
                className="px-6 py-3 font-semibold text-white rounded-lg transition-all duration-200 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}






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
  
  @keyframes holographicMove {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  
  .holographic-button:hover {
    box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset, 0 0 30px rgba(255, 107, 107, 0.3), 0 0 60px rgba(78, 205, 196, 0.2);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
} 