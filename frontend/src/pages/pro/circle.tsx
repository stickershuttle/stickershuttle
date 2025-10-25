import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery, gql } from '@apollo/client';
import UniversalHeader from '../../components/UniversalHeader';
import UniversalFooter from '../../components/UniversalFooter';
import { GET_USER_PROFILE } from '../../lib/profile-mutations';
import { getSupabase } from '../../lib/supabase';
import { Store, ArrowRight, Lock, Instagram, MapPin, BadgeCheck, Crown, TrendingUp } from 'lucide-react';
import { FaTiktok } from 'react-icons/fa';

// GraphQL query to fetch approved Circle businesses
const GET_APPROVED_BUSINESSES = gql`
  query GetApprovedCircleBusinesses {
    getApprovedCircleBusinesses {
      id
      userId
      companyName
      logoUrl
      logoBackgroundColor
      category
      state
      bio
      websiteUrl
      instagramHandle
      tiktokHandle
      discountType
      discountAmount
      status
      isFeatured
      isVerified
    }
  }
`;

// Sample business data - disabled, using only database businesses
const PARTNER_BUSINESSES: any[] = [
  {
    id: 1,
    name: 'Coffee & Canvas',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png',
    bio: 'Local coffee shop & art studio offering unique blends and creative workshops.',
    discount: '10% Off',
    link: 'https://example.com/coffee-canvas',
    instagram: 'https://instagram.com/coffeeandcanvas',
    tiktok: 'https://tiktok.com/@coffeeandcanvas',
    category: 'Food & Beverage',
    state: 'California',
    featured: true,
    verified: true,
  },
  {
    id: 2,
    name: 'Green Thumb Gardens',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png',
    bio: 'Sustainable urban gardening supplies and organic seeds for the modern gardener.',
    discount: '10% Off',
    link: 'https://example.com/green-thumb',
    instagram: 'https://instagram.com/greenthumbgardens',
    tiktok: 'https://tiktok.com/@greenthumbgardens',
    category: 'Home & Garden',
    state: 'Texas',
    verified: true,
  },
  {
    id: 3,
    name: 'Pixel Perfect Design',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png',
    bio: 'Full-service graphic design studio specializing in brand identity and digital assets.',
    discount: '10% Off',
    link: 'https://example.com/pixel-perfect',
    instagram: 'https://instagram.com/pixelperfectdesign',
    tiktok: 'https://tiktok.com/@pixelperfectdesign',
    category: 'Creative Services',
    state: 'New York',
    featured: true,
    verified: true,
  },
  {
    id: 4,
    name: 'Fit & Flow Yoga',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png',
    bio: 'Mind-body wellness studio with yoga, meditation, and holistic health services.',
    discount: '10% Off',
    link: 'https://example.com/fit-flow',
    instagram: 'https://instagram.com/fitflowyoga',
    tiktok: 'https://tiktok.com/@fitflowyoga',
    category: 'Health & Wellness',
    state: 'Florida',
    verified: true,
  },
  {
    id: 5,
    name: 'Tech Haven',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png',
    bio: 'Your one-stop shop for tech accessories, gadgets, and smart home solutions.',
    discount: '10% Off',
    link: 'https://example.com/tech-haven',
    instagram: 'https://instagram.com/techhaven',
    tiktok: 'https://tiktok.com/@techhaven',
    category: 'Technology',
    state: 'Washington',
    verified: true,
  },
  {
    id: 6,
    name: 'Sweet Treats Bakery',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png',
    bio: 'Artisan bakery crafting custom cakes, pastries, and gluten-free goodies.',
    discount: '10% Off',
    link: 'https://example.com/sweet-treats',
    instagram: 'https://instagram.com/sweettreatsbakery',
    tiktok: 'https://tiktok.com/@sweettreatsbakery',
    category: 'Food & Beverage',
    state: 'Colorado',
    verified: true,
  },
  {
    id: 7,
    name: 'Wild & Free Boutique',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png',
    bio: 'Curated fashion and lifestyle boutique featuring sustainable and ethically made products.',
    discount: '10% Off',
    link: 'https://example.com/wild-free',
    instagram: 'https://instagram.com/wildandfreeboutique',
    tiktok: 'https://tiktok.com/@wildandfreeboutique',
    category: 'Fashion & Lifestyle',
    state: 'Oregon',
    verified: true,
  },
  {
    id: 8,
    name: 'The Book Nook',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png',
    bio: 'Independent bookstore with rare finds, bestsellers, and cozy reading spaces.',
    discount: '10% Off',
    link: 'https://example.com/book-nook',
    instagram: 'https://instagram.com/thebooknook',
    tiktok: 'https://tiktok.com/@thebooknook',
    category: 'Retail',
    state: 'Arizona',
    verified: true,
  },
  {
    id: 9,
    name: 'Paws & Claws Pet Care',
    logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png',
    bio: 'Premium pet grooming, boarding, and veterinary services for your furry friends.',
    discount: '10% Off',
    link: 'https://example.com/paws-claws',
    instagram: 'https://instagram.com/pawsandclawspetcare',
    tiktok: 'https://tiktok.com/@pawsandclawspetcare',
    category: 'Pet Services',
    state: 'Illinois',
    verified: true,
  },
];

// Define state icons mapping
const STATE_ICONS: { [key: string]: string } = {
  'California': '🌴',
  'Texas': '🤠',
  'New York': '🗽',
  'Florida': '🌴',
  'Washington': '🌲',
  'Colorado': '🏔️',
  'Oregon': '🌲',
  'Arizona': '🌵',
  'Illinois': '🏙️',
};

// Helper function to get category border colors
const getCategoryBorderColor = (color: string) => {
  const colors: { [key: string]: string } = {
    indigo: 'rgba(99, 102, 241, 0.5)',
    purple: 'rgba(124, 58, 237, 0.5)',
    blue: 'rgba(37, 99, 235, 0.5)',
    green: 'rgba(5, 150, 105, 0.5)',
    emerald: 'rgba(16, 185, 129, 0.5)',
    yellow: 'rgba(217, 119, 6, 0.5)',
    pink: 'rgba(219, 39, 119, 0.5)',
    cyan: 'rgba(6, 182, 212, 0.5)',
    rose: 'rgba(225, 29, 72, 0.5)',
  };
  return colors[color] || 'rgba(37, 99, 235, 0.5)';
};

// Define categories for filtering with icons and colors
const CATEGORIES = [
  { label: 'All', value: 'all', icon: '🏪', color: 'indigo' },
  { label: 'Food & Beverage', value: 'Food & Beverage', icon: '☕', color: 'purple' },
  { label: 'Home & Garden', value: 'Home & Garden', icon: '🌱', color: 'green' },
  { label: 'Creative Services', value: 'Creative Services', icon: '🎨', color: 'blue' },
  { label: 'Health & Wellness', value: 'Health & Wellness', icon: '🧘', color: 'pink' },
  { label: 'Technology', value: 'Technology', icon: '💻', color: 'cyan' },
  { label: 'Fashion & Lifestyle', value: 'Fashion & Lifestyle', icon: '👗', color: 'rose' },
  { label: 'Retail', value: 'Retail', icon: '🛍️', color: 'yellow' },
  { label: 'Pet Services', value: 'Pet Services', icon: '🐾', color: 'emerald' },
  { label: 'Automotive', value: 'Automotive', icon: '🚗', color: 'red' },
  { label: 'Beauty & Personal Care', value: 'Beauty & Personal Care', icon: '💄', color: 'pink' },
  { label: 'Entertainment & Events', value: 'Entertainment & Events', icon: '🎉', color: 'yellow' },
  { label: 'Education & Training', value: 'Education & Training', icon: '📚', color: 'blue' },
  { label: 'Professional Services', value: 'Professional Services', icon: '💼', color: 'indigo' },
  { label: 'Sports & Recreation', value: 'Sports & Recreation', icon: '⚽', color: 'green' },
  { label: 'Travel & Tourism', value: 'Travel & Tourism', icon: '✈️', color: 'cyan' },
  { label: 'Photography & Videography', value: 'Photography & Videography', icon: '📷', color: 'purple' },
  { label: 'Music & Audio', value: 'Music & Audio', icon: '🎵', color: 'red' },
  { label: 'Real Estate', value: 'Real Estate', icon: '🏠', color: 'yellow' },
  { label: 'Non-Profit & Charity', value: 'Non-Profit & Charity', icon: '🤝', color: 'green' },
  { label: 'E-commerce & Online Business', value: 'E-commerce & Online Business', icon: '🛒', color: 'blue' },
  { label: 'Fitness & Athletics', value: 'Fitness & Athletics', icon: '💪', color: 'red' },
];

export default function ProCircle() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user || null);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  // Query user profile to check Pro status
  const { data: profileData, loading: profileLoading } = useQuery(GET_USER_PROFILE, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  // Query approved businesses
  const { data: businessesData, loading: businessesLoading } = useQuery(GET_APPROVED_BUSINESSES);

  const userProfile = profileData?.getUserProfile;
  const isProMember = userProfile?.isProMember === true && userProfile?.proStatus === 'active';
  const isLoadingProfile = loading || profileLoading;

  // Get businesses from database or fallback to sample data
  const businessesFromDb = businessesData?.getApprovedCircleBusinesses || [];
  
  // Convert database businesses to display format (no sample data)
  const allBusinesses = businessesFromDb.map((b: any) => ({
    id: b.id,
    name: b.companyName,
    logo: b.logoUrl,
    logoBackgroundColor: b.logoBackgroundColor,
    bio: b.bio,
    discount: b.discountType === 'percentage' ? `${b.discountAmount}% Off` : 
              b.discountType === 'credit' ? `$${b.discountAmount} Credit` :
              b.discountType === 'shipping' ? 'Free Shipping' :
              b.discountType === 'bogo' ? 'BOGO' : '10% Off',
    link: b.websiteUrl,
    instagram: b.instagramHandle ? `https://instagram.com/${b.instagramHandle.replace('@', '')}` : '',
    tiktok: b.tiktokHandle ? `https://tiktok.com/@${b.tiktokHandle.replace('@', '')}` : '',
    category: b.category,
    state: b.state,
    featured: b.isFeatured,
    verified: b.isVerified,
  }));

  // Filter businesses by category
  const filteredBusinesses = selectedCategory === 'all' 
    ? allBusinesses 
    : allBusinesses.filter((business: any) => business.category === selectedCategory);

  // Count businesses per category
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    if (cat.value === 'all') {
      acc[cat.value] = allBusinesses.length;
    } else {
      acc[cat.value] = allBusinesses.filter((b: any) => b.category === cat.value).length;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter categories to only show those with businesses
  const availableCategories = CATEGORIES.filter(cat => categoryCounts[cat.value] > 0);

  // Show loading state
  if (isLoadingProfile) {
    return (
      <>
        <Head>
          <title>Pro Circle | Sticker Shuttle</title>
          <meta name="description" content="Exclusive partner discounts for Sticker Shuttle Pro members" />
          <link rel="canonical" href="https://stickershuttle.com/pro/circle" />
        </Head>
        <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
          <UniversalHeader />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-300 text-lg">Loading...</p>
            </div>
          </div>
          <UniversalFooter />
        </div>
      </>
    );
  }

  // Show login prompt if not logged in
  if (!user) {
    return (
      <>
        <Head>
          <title>Pro Circle | Sticker Shuttle</title>
          <meta name="description" content="Exclusive partner discounts for Sticker Shuttle Pro members" />
          <link rel="canonical" href="https://stickershuttle.com/pro/circle" />
        </Head>
        <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
          <UniversalHeader />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <Lock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
                Pro Circle
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Please log in to access exclusive partner discounts
              </p>
              <Link href="/login">
                <button
                  className="px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center gap-3 mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                  }}
                >
                  Log In
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
          <UniversalFooter />
        </div>
      </>
    );
  }

  // Show Pro membership required message
  if (!isProMember) {
    return (
      <>
        <Head>
          <title>Pro Circle | Sticker Shuttle</title>
          <meta name="description" content="Exclusive partner discounts for Sticker Shuttle Pro members" />
          <link rel="canonical" href="https://stickershuttle.com/pro/circle" />
        </Head>
        <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
          <UniversalHeader />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <img
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png"
                alt="Pro Logo"
                className="h-24 w-auto mx-auto mb-6"
              />
              <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
                Pro Circle
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                This exclusive feature is only available to Pro members
              </p>
              <div
                className="p-8 rounded-2xl mb-8 max-w-2xl mx-auto"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <h3 className="text-2xl font-bold mb-4 text-white">What is Pro Circle?</h3>
                <p className="text-gray-300 mb-6">
                  Get exclusive 10% discounts from 100+ small businesses we work with. Support other entrepreneurs while saving money on services you love.
                </p>
                <ul className="text-left text-gray-300 space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <Store className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                    <span>100+ partner businesses across all industries</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Store className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                    <span>Exclusive 10% discounts at each partner</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Store className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                    <span>New partners added monthly</span>
                  </li>
                </ul>
              </div>
              <Link href="/pro">
                <button
                  className="px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center gap-3 mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                  }}
                >
                  Join Pro
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
          <UniversalFooter />
        </div>
      </>
    );
  }

  // Main Pro Circle page for authenticated Pro members
  return (
    <>
      <Head>
        <title>Pro Circle | Sticker Shuttle</title>
        <meta name="description" content="Exclusive partner discounts for Sticker Shuttle Pro members" />
        <meta property="og:title" content="Pro Circle - Exclusive Partner Discounts" />
        <meta property="og:description" content="Exclusive partner discounts for Sticker Shuttle Pro members" />
        <link rel="canonical" href="https://stickershuttle.com/pro/circle" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />

        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 pt-24 pb-12">
          {/* Pro Circle Info Container */}
          <div 
            className="rounded-2xl overflow-hidden mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(61, 209, 249, 0.4) 25%, rgba(59, 130, 246, 0.25) 50%, rgba(37, 99, 235, 0.15) 75%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(200%)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              boxShadow: 'rgba(59, 130, 246, 0.25) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
            }}
          >
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                    alt="Pro Circle" 
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                      Circle
                    </h3>
                    <p className="text-sm text-blue-200 mt-1">
                      We've partnered with 100+ small businesses to offer you exclusive discounts on products and services you love.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content: Sidebar + Grid */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Categories */}
            <div className="lg:w-80 flex-shrink-0">
              {/* Mobile Filter Toggle Button */}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden mb-4 w-full px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
                <svg className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className={`sticky top-24 space-y-4 ${showMobileFilters ? '' : 'hidden lg:block'}`}>
                {/* Add My Business Button */}
                <Link href="/pro/circle/add-my-business">
                 <button
                   className="w-full text-center px-4 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.00375] relative overflow-hidden cursor-pointer"
                  style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.75), rgba(255, 255, 255, 0.33) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)',
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
                    Add My Business
                    <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                </Link>

                {/* Filters Section */}
                <div
                  className="mt-6 p-6 space-y-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                  }}
                >
                  {/* Filter Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-white">Filters</h2>
                    <div className="ml-auto">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Browse by Category Section */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-white mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Browse by Category
                      </div>
                    </label>
                    
                    {/* Category Grid - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                      {availableCategories.map((category) => {
                        const isSelected = selectedCategory === category.value;
                        const categoryCount = categoryCounts[category.value] || 0;
                        
                        return (
                          <button
                            key={category.value}
                            onClick={() => setSelectedCategory(category.value)}
                            className="group relative text-left p-3 rounded-xl transition-all duration-200 overflow-hidden cursor-pointer"
                            style={{
                              background: isSelected 
                                ? `linear-gradient(135deg, ${category.color === 'indigo' ? '#6366F1' :
                                    category.color === 'purple' ? '#7C3AED' :
                                    category.color === 'blue' ? '#2563EB' :
                                    category.color === 'green' ? '#059669' :
                                    category.color === 'emerald' ? '#10B981' :
                                    category.color === 'yellow' ? '#D97706' :
                                    category.color === 'pink' ? '#DB2777' :
                                    category.color === 'cyan' ? '#06B6D4' :
                                    category.color === 'rose' ? '#E11D48' :
                                    '#4F46E5'} 0%, ${category.color === 'indigo' ? '#4F46E5' :
                                    category.color === 'purple' ? '#5B21B6' :
                                    category.color === 'blue' ? '#1D4ED8' :
                                    category.color === 'green' ? '#047857' :
                                    category.color === 'emerald' ? '#059669' :
                                    category.color === 'yellow' ? '#B45309' :
                                    category.color === 'pink' ? '#BE185D' :
                                    category.color === 'cyan' ? '#0891B2' :
                                    category.color === 'rose' ? '#BE123C' :
                                    '#3730A3'} 100%)`
                                : 'transparent',
                              border: isSelected ? 'none' : `2px dashed ${getCategoryBorderColor(category.color)}`
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
                                {categoryCount} business{categoryCount !== 1 ? 'es' : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Browse by State Section */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                        Browse by State
                      </div>
                    </label>
                    
                    <div className="space-y-1.5">
                      {[...new Set(allBusinesses.map((b: any) => b.state).filter(Boolean))].sort().map((state: any) => {
                        const stateCount = allBusinesses.filter((b: any) => b.state === state).length;
                        
                        return (
                          <button
                            key={state as string}
                            className="w-full group relative p-3 rounded-xl transition-all duration-200 overflow-hidden hover:bg-white/5 bg-gray-800/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                                <span className="text-base">{(STATE_ICONS as any)[state] || '📍'}</span>
                              </div>
                              <div className="flex-1 text-left">
                                <h3 className="font-semibold text-sm text-white/80 group-hover:text-white">
                                  {state as string}
                                </h3>
                                <p className="text-xs text-white/50 group-hover:text-white/60">
                                  {stateCount} business{stateCount !== 1 ? 'es' : ''}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Cards Grid */}
            <div className="flex-1 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {filteredBusinesses.map((business: any) => (
                 <div
                 key={business.id}
                 className="rounded-2xl transition-all duration-300 hover:scale-[1.0125] hover:shadow-2xl overflow-hidden relative"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Featured Badge */}
                {business.featured && (
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/90 backdrop-blur-sm">
                    <Crown className="w-3 h-3 text-white" />
                    <span className="text-xs font-bold text-white">Featured</span>
                  </div>
                )}

                {/* Logo Container - Better aspect ratio and centering */}
                <div 
                  className="w-full h-48 flex items-center justify-center p-8"
                  style={{ backgroundColor: business.logoBackgroundColor || '#9ca3af' }}
                >
                  <img
                    src={business.logo}
                    alt={`${business.name} logo`}
                    className="max-w-[80%] max-h-[120px] object-contain"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Company Name */}
                  <h3 className="text-xl font-bold text-left text-white mb-2" style={{ fontFamily: 'Rubik, sans-serif' }}>
                    {business.name}
                  </h3>

                  {/* Category & Location Row */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {(() => {
                      const cat = CATEGORIES.find(c => c.value === business.category);
                      const colorClass = cat?.color === 'indigo' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                                       cat?.color === 'purple' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                                       cat?.color === 'green' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                       cat?.color === 'blue' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                       cat?.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                       cat?.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                       cat?.color === 'pink' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' :
                                       cat?.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                                       cat?.color === 'rose' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                                       'bg-blue-500/20 text-blue-300 border-blue-500/30';
                      
                      return (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                          {business.category}
                        </span>
                      );
                    })()}
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-700/30 text-gray-300">
                      <MapPin className="w-3 h-3" />
                      {business.state}
                    </span>
                  </div>

                  {/* Verified Partner Badge */}
                  {business.verified && (
                    <div className="flex items-center gap-1 mb-3">
                      <BadgeCheck className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-blue-400 font-medium">Verified Partner</span>
                    </div>
                  )}

                  {/* Bio */}
                  <p className="text-gray-300 text-left mb-4 min-h-[4rem]">
                    {business.bio}
                  </p>

                  {/* Social Icons */}
                  <div className="flex items-center gap-3 mb-4">
                    <a
                      href={business.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon-instagram"
                      aria-label={`Visit ${business.name} on Instagram`}
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a
                      href={business.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon-tiktok"
                      aria-label={`Visit ${business.name} on TikTok`}
                    >
                      <FaTiktok className="w-5 h-5" />
                    </a>
                  </div>

                  {/* Shop Button */}
                  <a
                    href={business.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                     <button
                       className="w-full px-6 py-3 rounded-xl text-base font-bold text-white transition-all duration-300 hover:scale-[1.0125] hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(59, 130, 246, 0.06) 0px 8px 32px, rgba(255, 255, 255, 0.04) 0px 1px 0px inset',
                      }}
                    >
                      Shop 10% Off
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </a>

                  {/* Pro Benefit Footer */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-center gap-2">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                        alt="Pro" 
                        className="w-4 h-4 object-contain"
                      />
                      <span className="text-xs text-gray-400">Exclusive Pro Benefit</span>
                    </div>
                  </div>
                </div>
              </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <UniversalFooter />
      </div>

      {/* Custom CSS */}
      <style jsx global>{`
        body {
          background-color: #030140 !important;
        }
        html {
          background-color: #030140 !important;
        }
        
        /* Pro gradient animation */
        @keyframes gradient-move {
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
        
        .pro-gradient {
          background: linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9);
          background-size: 300% 300%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-move 3s ease-in-out infinite;
        }
        
        /* Social media icon styles */
        .social-icon-instagram,
        .social-icon-tiktok {
          color: #9ca3af;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .social-icon-instagram:hover {
          color: #E1306C;
          transform: scale(1.1);
        }
        
        .social-icon-tiktok:hover {
          color: #00f2ea;
          transform: scale(1.1);
        }
      `}</style>
    </>
  );
}

