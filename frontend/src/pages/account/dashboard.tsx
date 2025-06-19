import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { getSupabase } from '../../lib/supabase';
import { useDashboardData } from '../../hooks/useDashboardData';
import OrderInvoice from '../../components/OrderInvoice';
import { useLazyQuery, useMutation, gql } from '@apollo/client';
import { GET_ORDER_BY_ID } from '../../lib/order-mutations';

// Mutation to update proof status (same as proofs page)
const UPDATE_PROOF_STATUS = gql`
  mutation UpdateProofStatus($orderId: ID!, $proofId: ID!, $status: String!, $customerNotes: String) {
    updateProofStatus(orderId: $orderId, proofId: $proofId, status: $status, customerNotes: $customerNotes) {
      id
      proofs {
        id
        status
        customerNotes
      }
    }
  }
`;
import useInvoiceGenerator, { InvoiceData } from '../../components/InvoiceGenerator';
import ErrorBoundary from '../../components/ErrorBoundary';
import dynamic from 'next/dynamic';

// Using real order data only - no more sample/demo data

type DashboardView = 'default' | 'all-orders' | 'financial' | 'items-analysis' | 'design-vault' | 'proofs' | 'order-details';

// Order type interface
interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  size?: string;
  material?: string;
  design?: string;
  price: number;
  image?: string;
  customFiles?: string[];
  _fullOrderData?: any;
}

interface Order {
  id: string;
  orderNumber?: string;
  date: string;
  status: string;
  total: number;
  trackingNumber?: string | null;
  proofUrl?: string;
  items: OrderItem[];
  _fullOrderData?: any;
  // Proof-related fields
  proofs?: Array<{
    id: string;
    proofUrl: string;
    proofTitle?: string;
    uploadedAt: string;
    status: string;
    customerNotes?: string;
    adminNotes?: string;
  }>;
  proof_status?: string;
  proof_sent_at?: string;
}

function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  
  // NEW: Use real dashboard data
  const {
    user,
    userLoading,
    orders: realOrders,
    ordersLoading,
    ordersError,
    refreshOrders,
    hasOrders,
    isLoggedIn
  } = useDashboardData();

  // NEW: Lazy query for fetching full order details
  const [getFullOrderDetails, { loading: orderDetailsLoading }] = useLazyQuery(GET_ORDER_BY_ID, {
    onCompleted: (data) => {
      if (data?.getOrderById) {
        console.log('📋 Full order details loaded:', data.getOrderById);
        setSelectedOrderForInvoice(data.getOrderById);
      }
    },
    onError: (error) => {
      console.error('❌ Error fetching order details:', error);
      // Fallback to basic order data
      console.log('⚠️ Falling back to basic order data');
    }
  });

  // Add proof update mutation
  const [updateProofStatus] = useMutation(UPDATE_PROOF_STATUS, {
    onCompleted: () => {
      // Force a fresh network request for orders data after proof update
      console.log('✅ Proof status updated, refreshing orders data...');
      setTimeout(() => {
        refreshOrders();
      }, 500); // Small delay to ensure backend has processed the update
    },
    onError: (error) => {
      console.error('Error updating proof status:', error);
    }
  });

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [stagedFile, setStagedFile] = useState<{
    file: File;
    preview: string;
    cloudinaryUrl?: string;
    orderId: string;
    proofId: string;
    cutContourInfo?: any;
  } | null>(null);
  const [replacementSent, setReplacementSent] = useState<{[key: string]: boolean}>({});
  
  // Use real orders only - no sample data
  const orders: Order[] = realOrders || [];
  const loading = userLoading;
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('default');

  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    relatedOrder: ''
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [proofAction, setProofAction] = useState<string | null>(null);
  const [proofComments, setProofComments] = useState('');
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [highlightComments, setHighlightComments] = useState(false);
  const [actionNotification, setActionNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  const [recordingMode, setRecordingMode] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  const [sellingPrices, setSellingPrices] = useState<{[orderId: string]: number}>({});
  const [showOrderCompleteMessage, setShowOrderCompleteMessage] = useState(false);
  const [selectedDesignImage, setSelectedDesignImage] = useState<string | null>(null);
  const [showReorderPopup, setShowReorderPopup] = useState(false);
  const [reorderOrderData, setReorderOrderData] = useState<any>(null);
  const [removedRushItems, setRemovedRushItems] = useState<Set<number>>(new Set());
  const [removedItems, setRemovedItems] = useState<Set<number>>(new Set());

  // Add custom styles for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes liquid-flow {
        0% {
          background-position: 0% 50%;
          transform: scale(1) rotate(0deg);
        }
        25% {
          background-position: 100% 50%;
          transform: scale(1.05) rotate(1deg);
        }
        50% {
          background-position: 100% 100%;
          transform: scale(1) rotate(0deg);
        }
        75% {
          background-position: 0% 100%;
          transform: scale(1.05) rotate(-1deg);
        }
        100% {
          background-position: 0% 50%;
          transform: scale(1) rotate(0deg);
        }
      }
      
      .animate-liquid-flow {
        background-size: 400% 400%;
        animation: liquid-flow 8s ease-in-out infinite;
      }
      
      .bg-noise {
        background-image: 
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0);
        background-size: 20px 20px;
        animation: noise-move 3s linear infinite;
      }
      
      @keyframes noise-move {
        0% { transform: translate(0, 0); }
        25% { transform: translate(-2px, 2px); }
        50% { transform: translate(2px, -2px); }
        75% { transform: translate(-1px, -1px); }
        100% { transform: translate(0, 0); }
      }

      .container-style {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(12px);
        border-radius: 16px;
      }

      .nav-inactive {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        backdrop-filter: blur(12px) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Check authentication when component mounts
    if (!userLoading && !user) {
      router.push('/login?message=Please log in to access your dashboard');
      return;
    }

    // Fetch profile data when user is available
    if (user && !profile) {
      fetchProfile();
    }
  }, [user, userLoading, profile, router]);

  // Check for order completion flag from URL
  useEffect(() => {
    if (router.query.orderCompleted === 'true') {
      setShowOrderCompleteMessage(true);
      // Remove the query parameter from URL
      router.replace('/account/dashboard', undefined, { shallow: true });
      
      // Hide the message after 10 seconds
      setTimeout(() => {
        setShowOrderCompleteMessage(false);
      }, 10000);
    }
  }, [router]);

  // Handle URL query parameters for view navigation
  useEffect(() => {
    if (router.query.view && router.query.view !== currentView) {
      const requestedView = router.query.view as string;
      const validViews: DashboardView[] = ['default', 'all-orders', 'financial', 'items-analysis', 'design-vault', 'proofs', 'order-details'];
      
      if (validViews.includes(requestedView as DashboardView)) {
        setCurrentView(requestedView as DashboardView);
      }
    }
  }, [router.query.view, currentView]);

  // Helper function to update view and URL
  const updateCurrentView = (view: DashboardView) => {
    setCurrentView(view);
    // Update URL to reflect the current view
    const url = view === 'default' ? '/account/dashboard' : `/account/dashboard?view=${view}`;
    router.push(url, undefined, { shallow: true });
  };

  // Clear selected design image when navigating away from design vault
  useEffect(() => {
    if (currentView !== 'design-vault') {
      setSelectedDesignImage(null);
    }
  }, [currentView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOrderDropdown) {
        const target = event.target as Element;
        if (!target.closest('.order-dropdown')) {
          setShowOrderDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrderDropdown]);

  // Recording mode toggle with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        setRecordingMode(!recordingMode);
        console.log('Recording mode:', !recordingMode ? 'ON' : 'OFF');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [recordingMode]);

  // Cleanup staged file on unmount
  useEffect(() => {
    return () => {
      if (stagedFile) {
        URL.revokeObjectURL(stagedFile.preview);
      }
    };
  }, [stagedFile]);

  const fetchProfile = async () => {
    if (!user || !(user as any)?.id) {
      console.log('⚠️ No user or user ID available for profile fetch');
      return;
    }
    
    try {
      console.log('👤 Fetching profile for user:', (user as any).id);
      
      const supabase = await getSupabase();
      
      // Fetch from user_profiles table
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', (user as any).id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('❌ Error fetching profile:', error);
      }

      // Combine user metadata with profile data
      const combinedProfile = {
        id: (user as any).id,
        email: (user as any).email,
        first_name: (user as any).user_metadata?.first_name || '',
        last_name: (user as any).user_metadata?.last_name || '',
        phone: (user as any).user_metadata?.phone || '',
        created_at: (user as any).created_at,
        // Profile data from user_profiles table
        profile_photo_url: profileData?.profile_photo_url || null,
        banner_image_url: profileData?.banner_image_url || null,
        profile_photo_public_id: profileData?.profile_photo_public_id || null,
        banner_image_public_id: profileData?.banner_image_public_id || null,
        display_name: profileData?.display_name || null,
        bio: profileData?.bio || null
      };
      
      console.log('✅ Profile data loaded:', combinedProfile);
      setProfile(combinedProfile);

      // Auto-fill contact form with user data
      const displayName = combinedProfile.first_name || 
                         combinedProfile.email?.split('@')[0] || '';
      
      const userEmail = combinedProfile.email || '';

      setContactFormData(prev => ({
        ...prev,
        name: displayName,
        email: userEmail
      }));
      
      console.log('✅ Contact form pre-filled with user data');
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      setProfile(null);
    }
  };

  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showBannerTemplates, setShowBannerTemplates] = useState(false);

  const handleProfilePictureClick = () => {
    if (uploadingProfilePhoto) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleProfilePhotoUpload(file);
      }
    };
    input.click();
  };

  const handleBannerClick = () => {
    if (uploadingBanner) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleBannerUpload(file);
      }
    };
    input.click();
  };

  const handleProfilePhotoUpload = async (file: File) => {
    if (!user) return;
    
    try {
      setUploadingProfilePhoto(true);
      
      // Validate file
      const { validateFile } = await import('../../utils/cloudinary');
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Upload to Cloudinary
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      const result = await uploadToCloudinary(file, undefined, undefined, 'profile-photos');

      // Update Supabase profile
      const supabase = await getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: (user as any).id,
          profile_photo_url: result.secure_url,
          profile_photo_public_id: result.public_id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile photo');
        return;
      }

      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        profile_photo_url: result.secure_url,
        profile_photo_public_id: result.public_id
      }));

      console.log('✅ Profile photo updated successfully');
      
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Failed to upload profile photo');
    } finally {
      setUploadingProfilePhoto(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!user) return;
    
    try {
      setUploadingBanner(true);
      
      // Validate file
      const { validateFile } = await import('../../utils/cloudinary');
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Upload to Cloudinary
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      const result = await uploadToCloudinary(file, undefined, undefined, 'profile-banners');

      // Update Supabase profile
      const supabase = await getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: (user as any).id,
          banner_image_url: result.secure_url,
          banner_image_public_id: result.public_id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating banner:', error);
        alert('Failed to update banner image');
        return;
      }

      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        banner_image_url: result.secure_url,
        banner_image_public_id: result.public_id
      }));

      console.log('✅ Banner image updated successfully');
      
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Failed to upload banner image');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!user) return;
    
    // Check if there's actually a banner to remove
    if (!profile?.banner_image_url && !profile?.banner_template) {
      alert('No banner to remove');
      return;
    }
    
    setUploadingBanner(true);
    
    try {
      // Update profile in Supabase to remove banner
      const supabase = await getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: (user as any).id,
          banner_image_url: null,
          banner_image_public_id: null,
          banner_template: null,
          banner_template_id: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error('Error removing banner:', error);
        alert(`Failed to remove banner: ${error.message}`);
        return;
      }
      
      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        banner_image_url: null,
        banner_image_public_id: null,
        banner_template: null,
        banner_template_id: null
      }));
      
      console.log('✅ Banner removed successfully');
      
    } catch (error) {
      console.error('Banner removal failed:', error);
      alert(`Failed to remove banner. Please try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingBanner(false);
    }
  };

  const bannerTemplates = [
    {
      id: 1,
      name: 'Ocean Waves',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 8s ease-in-out infinite'
      }
    },
    {
      id: 2,
      name: 'Sunset Glow',
      style: {
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 6s ease-in-out infinite'
      }
    },
    {
      id: 3,
      name: 'Forest Mist',
      style: {
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 10s ease-in-out infinite'
      }
    },
    {
      id: 4,
      name: 'Cosmic Purple',
      style: {
        background: 'radial-gradient(circle at 20% 80%, #120078 0%, #9d0191 50%, #fd5e53 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 12s ease-in-out infinite'
      }
    },
    {
      id: 5,
      name: 'Golden Hour',
      style: {
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 7s ease-in-out infinite'
      }
    },
    {
      id: 6,
      name: 'Neon Cyber',
      style: {
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 25%, #16213e 50%, #0f3460 100%)',
        backgroundImage: `radial-gradient(circle at 25% 25%, #00ffff 0%, transparent 50%), 
                         radial-gradient(circle at 75% 75%, #ff00ff 0%, transparent 50%)`,
        backgroundSize: '400% 400%, 200% 200%',
        animation: 'gradient-shift 9s ease-in-out infinite'
      }
    },
    {
      id: 7,
      name: 'Aurora Borealis',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        backgroundSize: '800% 800%',
        animation: 'gradient-shift 15s ease-in-out infinite'
      }
    },
    {
      id: 8,
      name: 'Mint Fresh',
      style: {
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 8s ease-in-out infinite'
      }
    },
    {
      id: 9,
      name: 'Fire Gradient',
      style: {
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 6s ease-in-out infinite'
      }
    },
    {
      id: 10,
      name: 'Deep Space',
      style: {
        background: 'radial-gradient(ellipse at center, #0f0f23 0%, #000000 70%)',
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 20%),
                         radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 20%),
                         radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05) 0%, transparent 20%)`,
        backgroundSize: '100% 100%, 200px 200px, 150px 150px, 100px 100px'
      }
    },
    {
      id: 11,
      name: 'Electric Blue',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 8s ease-in-out infinite'
      }
    },
    {
      id: 12,
      name: 'Peachy Keen',
      style: {
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        backgroundImage: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 7s ease-in-out infinite'
      }
    },
    {
      id: 13,
      name: 'Matrix Green',
      style: {
        background: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
        backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)`,
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 10s ease-in-out infinite'
      }
    },
    {
      id: 14,
      name: 'Retro Wave',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)`,
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 8s ease-in-out infinite'
      }
    },
    {
      id: 15,
      name: 'Lavender Dreams',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        backgroundImage: `radial-gradient(circle at 70% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 12s ease-in-out infinite'
      }
    }
  ];

  const handleSelectBannerTemplate = async (template: any) => {
    if (!user) return;
    
    setUploadingBanner(true);
    setShowBannerTemplates(false);
    
    try {
      // Create a CSS string for the template
      const templateCSS = JSON.stringify(template.style);
      
      // Update profile in Supabase with template data
      const supabase = await getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: (user as any).id,
          banner_image_url: null, // Clear custom image
          banner_image_public_id: null,
          banner_template: templateCSS,
          banner_template_id: template.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error('Error updating banner template:', error);
        alert('Failed to apply template');
        return;
      }
      
      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        banner_image_url: null,
        banner_image_public_id: null,
        banner_template: templateCSS,
        banner_template_id: template.id
      }));
      
      console.log('✅ Banner template applied successfully');
      
    } catch (error) {
      console.error('Banner template application failed:', error);
      alert('Failed to apply template. Please try again.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const getUserDisplayName = () => {
    // Profile data is temporarily disabled due to Supabase client issues
    // Use user metadata or email as fallback
    if ((user as any)?.user_metadata?.first_name) {
      return (user as any).user_metadata.first_name;
    }
    if ((user as any)?.email) {
      return (user as any).email.split('@')[0];
    }
    return 'Astronaut';
  };

  const getOrderDisplayNumber = (order: any) => {
    console.log(`🎯 Getting display number for order ${order.id}:`, {
      orderNumber: order.orderNumber,
      order_number: order.order_number,
      fullOrderOrderNumber: order._fullOrderData?.orderNumber,
      fullOrder_order_number: order._fullOrderData?.order_number,
      fullOrder: order._fullOrderData
    });
    
    // Priority 1: Check for order_number (the SS-00001 format from Stripe webhook)
    if (order.orderNumber) {
      console.log(`✅ Using orderNumber: ${order.orderNumber}`);
      return order.orderNumber;
    }
    
    if (order.order_number) {
      console.log(`✅ Using order_number: ${order.order_number}`);
      return order.order_number;
    }
    
    // Priority 2: Check _fullOrderData for order_number
    if (order._fullOrderData?.orderNumber) {
      console.log(`✅ Using _fullOrderData.orderNumber: ${order._fullOrderData.orderNumber}`);
      return order._fullOrderData.orderNumber;
    }
    
    if (order._fullOrderData?.order_number) {
      console.log(`✅ Using _fullOrderData.order_number: ${order._fullOrderData.order_number}`);
      return order._fullOrderData.order_number;
    }
    
    // Priority 3: Legacy - Try Shopify order numbers
    if (order.shopifyOrderNumber) {
      console.log(`⚠️ Using legacy shopifyOrderNumber: ${order.shopifyOrderNumber}`);
      return order.shopifyOrderNumber;
    }
    
    if (order._fullOrderData?.shopifyOrderNumber) {
      console.log(`⚠️ Using legacy _fullOrderData.shopifyOrderNumber: ${order._fullOrderData.shopifyOrderNumber}`);
      return order._fullOrderData.shopifyOrderNumber;
    }
    
    if (order._fullOrderData?.shopify_order_number) {
      console.log(`⚠️ Using legacy _fullOrderData.shopify_order_number: ${order._fullOrderData.shopify_order_number}`);
      return order._fullOrderData.shopify_order_number;
    }
    
    if (order.shopify_order_number) {
      console.log(`⚠️ Using legacy snake_case shopify_order_number: ${order.shopify_order_number}`);
      return order.shopify_order_number;
    }
    
    // Last resort: Use internal ID but make it shorter and cleaner
    console.log(`🔄 Fallback to internal ID: #${order.id.split('-')[0].toUpperCase()}`);
    return `#${order.id.split('-')[0].toUpperCase()}`;
  };

  const handleReorder = async (orderId: string) => {
    // Find the order data
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      alert('Order not found');
      return;
    }
    
    // Map the full order data to the reorder popup format, using actual database prices
    const reorderData = {
      ...order,
      items: order._fullOrderData?.items?.map((fullItem: any, index: number) => ({
        id: fullItem.id,
        name: fullItem.productName || fullItem.product_name || 'Custom Stickers',
        quantity: fullItem.quantity || 1,
        unitPrice: fullItem.unitPrice || fullItem.unit_price || 0,
        totalPrice: fullItem.totalPrice || fullItem.total_price || 0,
        size: fullItem.calculatorSelections?.size?.displayValue || fullItem.calculatorSelections?.sizePreset?.displayValue,
        material: fullItem.calculatorSelections?.material?.displayValue,
        image: fullItem.customFiles?.[0] || fullItem.custom_files?.[0],
        customFiles: fullItem.customFiles || fullItem.custom_files || [],
        notes: fullItem.customerNotes || fullItem.customer_notes
      })) || order.items
    };
    
    setReorderOrderData(reorderData);
    setRemovedRushItems(new Set()); // Reset removed rush items
    setShowReorderPopup(true);
  };

  const handleReorderConfirm = async (makeChanges: boolean) => {
    if (!reorderOrderData) return;
    
    setShowReorderPopup(false);
    setReorderingId(reorderOrderData.id);
    
    if (makeChanges) {
      // Redirect to product page with pre-filled data
      const firstItem = reorderOrderData.items[0];
      if (firstItem) {
        // Determine product type and redirect to appropriate calculator
        let productPath = '/products/vinyl-stickers';
        const itemName = firstItem.name?.toLowerCase() || '';
        
        if (itemName.includes('holographic') || itemName.includes('holo')) {
          productPath = '/products/holographic-stickers';
        } else if (itemName.includes('clear') || itemName.includes('transparent')) {
          productPath = '/products/clear-stickers';
        } else if (itemName.includes('chrome') || itemName.includes('metallic')) {
          productPath = '/products/chrome-stickers';
        } else if (itemName.includes('glitter')) {
          productPath = '/products/glitter-stickers';
        }
        
        // Store reorder data in localStorage for the calculator to pick up
        localStorage.setItem('reorderData', JSON.stringify({
          items: reorderOrderData.items,
          originalOrderId: reorderOrderData.id
        }));
        
        router.push(productPath);
      }
    } else {
      // Direct reorder - go straight to Shopify checkout
      try {
        // Get current user context
        let currentUser = null;
        try {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          currentUser = session?.user || null;
        } catch (userError) {
          console.warn('Could not get user context, proceeding as guest:', userError);
        }

        // Prepare items for direct checkout (filter out removed items)
        const checkoutItems = reorderOrderData.items
          .map((item: any, itemIndex: number) => ({ item, itemIndex }))
          .filter(({ itemIndex }: { itemIndex: number }) => !removedItems.has(itemIndex))
          .map(({ item, itemIndex }: { item: any, itemIndex: number }) => {
            const itemData = reorderOrderData._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
          
            return {
              product: {
                id: itemData.productId || itemData.product_id || `reorder-${Date.now()}`,
                name: itemData.productName || item.name || 'Custom Stickers',
                category: itemData.productCategory || itemData.product_category || 'vinyl-stickers',
                sku: `REORDER-${reorderOrderData.id}-${itemData.id || itemIndex}`
              },
              quantity: itemData.quantity || item.quantity || 1,
              unitPrice: itemData.unitPrice || item.unitPrice || 0,
              totalPrice: itemData.totalPrice || item.totalPrice || 0,
              customization: {
                selections: itemData.calculatorSelections || {
                  size: { displayValue: item.size || 'Custom' },
                  material: { displayValue: item.material || 'Premium Vinyl' },
                  cut: { displayValue: 'Custom Shape' },
                  quantity: { displayValue: (itemData.quantity || item.quantity || 1).toString() }
                },
                customFiles: itemData.customFiles || itemData.custom_files || (item.image ? [item.image] : []),
                notes: itemData.customerNotes || itemData.customer_notes || `Reorder of original order ${reorderOrderData.id}`,
                instagramHandle: '',
                instagramOptIn: false
              }
            };
          });

        // Create customer info from current user or defaults
        const customerInfo = {
          firstName: currentUser?.user_metadata?.first_name || '',
          lastName: currentUser?.user_metadata?.last_name || '',
          email: currentUser?.email || '',
          phone: currentUser?.user_metadata?.phone || ''
        };

        // Create minimal shipping address - Shopify will collect the full address
        const shippingAddress = {
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName,
          address1: '', // Let Shopify collect this
          address2: '',
          city: '',
          province: '',
          country: 'United States',
          zip: '',
          phone: customerInfo.phone
        };

        console.log('🚀 Direct reorder checkout with items:', checkoutItems.length);

        // TODO: Implement reorder with Stripe checkout
        alert('Reorder functionality is coming soon! We\'re updating our checkout system.');
        
        // For now, redirect to products page so they can manually reorder
        router.push('/products');
        
      } catch (error) {
        console.error('Error processing direct reorder checkout:', error);
        alert('Error starting checkout. Please try again.');
      }
    }
    
    setReorderingId(null);
    setRemovedItems(new Set());
    setRemovedRushItems(new Set());
  };

  const handleRemoveRushOrder = (itemIndex: number) => {
    setRemovedRushItems(prev => new Set([...prev, itemIndex]));
    
    // Update the reorder data to reflect the price change (remove rush fee)
    if (reorderOrderData) {
      const updatedOrderData = { ...reorderOrderData };
      const fullItem = updatedOrderData._fullOrderData?.items?.[itemIndex];
      const item = updatedOrderData.items[itemIndex];
      
      if (item && fullItem) {
        // Get the actual rush price impact from calculator selections
        const rushPriceImpact = fullItem.calculatorSelections?.rush?.priceImpact || 
                               fullItem.calculatorSelections?.rushOrder?.priceImpact || 0;
        
        console.log(`🔄 Removing rush order from item ${itemIndex}:`, {
          currentTotalPrice: item.totalPrice,
          rushPriceImpact: rushPriceImpact,
          newTotalPrice: (item.totalPrice || 0) - rushPriceImpact
        });
        
        if (rushPriceImpact > 0) {
          // Calculate new prices by subtracting the exact rush price impact
          const newTotalPrice = (item.totalPrice || 0) - rushPriceImpact;
          const newUnitPrice = newTotalPrice / (item.quantity || 1);
          
          // Update the item price
          const updatedItem = { ...item, unitPrice: newUnitPrice, totalPrice: newTotalPrice };
          updatedOrderData.items[itemIndex] = updatedItem;
          
          // Update the total order price
          updatedOrderData.total = (updatedOrderData.total || 0) - rushPriceImpact;
        }
        
        // Remove rush order from calculator selections - FIX: Create new array instead of modifying read-only array
        if (fullItem.calculatorSelections) {
          const updatedFullItem = { 
            ...fullItem,
            calculatorSelections: {
              ...fullItem.calculatorSelections,
              rushOrder: { displayValue: 'Standard', value: false, priceImpact: 0 },
              rush: { displayValue: 'Standard', value: false, priceImpact: 0 }
            }
          };
          
          // Create a new items array instead of modifying the read-only one
          const updatedFullOrderData = {
            ...updatedOrderData._fullOrderData,
            items: updatedOrderData._fullOrderData.items.map((fullOrderItem: any, index: number) => 
              index === itemIndex ? updatedFullItem : fullOrderItem
            )
          };
          
          updatedOrderData._fullOrderData = updatedFullOrderData;
        }
        
        setReorderOrderData(updatedOrderData);
      }
    }
  };

  const handleRemoveItem = (itemIndex: number) => {
    setRemovedItems(prev => new Set([...prev, itemIndex]));
    
    // Update the reorder data to reflect the removed item
    if (reorderOrderData) {
      const updatedOrderData = { ...reorderOrderData };
      const item = updatedOrderData.items[itemIndex];
      
      if (item) {
        // Subtract the item's total price from the order total
        updatedOrderData.total = updatedOrderData.total - item.totalPrice;
        setReorderOrderData(updatedOrderData);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-500';
      case 'Out for Delivery':
        return 'bg-green-400';
      case 'In Transit':
        return 'bg-blue-400';
      case 'Shipped':
        return 'bg-purple-500';
      case 'Printing':
      case 'In Production':
      case 'in-production':
        return 'bg-blue-500';
      case 'Awaiting Proof Approval':
      case 'Proof Review Needed':
        return 'bg-orange-500';
      case 'Creating Proofs':
      case 'Creating Proofs...':
        return 'bg-yellow-500';
      case 'Processing':
        return 'bg-yellow-400';
      case 'Reviewing Changes':
      case 'request-changes':
        return 'bg-amber-500';
      case 'deny':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'Creating Proofs':
      case 'Creating Proofs...':
        return 'Building Proof';
      case 'Processing':
        return 'Building Proof';
      case 'Awaiting Proof Approval':
        return 'Awaiting Your Approval';
      case 'Printing':
      case 'In Production':
      case 'in-production':
        return 'Printing';
      case 'Shipped':
        return 'Shipped';
      case 'In Transit':
        return 'In Transit';
      case 'Out for Delivery':
        return 'Out for Delivery';
      case 'Delivered':
        return 'Delivered';
      case 'request-changes':
        return 'Reviewing Requests';
      default:
        return status === 'Processing' ? 'Building Proof' : status;
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmittingContact(false);
      setContactSubmitted(true);
      // Reset form after 3 seconds
      setTimeout(() => {
        setContactSubmitted(false);
        setShowContactForm(false);
        setContactFormData(prev => ({
          ...prev,
          subject: '',
          message: '',
          relatedOrder: ''
        }));
      }, 3000);
    }, 1500);
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactFormData({
      ...contactFormData,
      [name]: value
    });
  };

  const handleGetSupport = () => {
    setShowContactForm(true);
  };

  const handleRaiseConcern = () => {
    setContactFormData(prev => ({
      ...prev,
      subject: 'concern'
    }));
    setShowContactForm(true);
  };

  const handleLogout = async () => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
        return;
      }

      // Redirect to login page
      router.push('/login?message=You have been logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Error logging out. Please try again.');
    }
  };

  const handleViewOrderDetails = (order: any) => {
    console.log('📋 Opening details view for order:', order.id);
    
    // Use full order data if available, otherwise create a basic format
    if (order._fullOrderData) {
      console.log('✅ Using full order data for details');
      const fullOrder = order._fullOrderData;
      
      // Transform full GraphQL data to OrderInvoice format
      const orderDetails = {
        id: fullOrder.id,
        shopifyOrderNumber: fullOrder.shopifyOrderNumber || fullOrder.shopifyOrderId || order.id,
        shopifyOrderId: fullOrder.shopifyOrderId,
        orderCreatedAt: fullOrder.orderCreatedAt || fullOrder.createdAt,
        orderStatus: fullOrder.orderStatus || 'Processing',
        fulfillmentStatus: fullOrder.fulfillmentStatus || 'unfulfilled',
        totalPrice: fullOrder.totalPrice || order.total,
        currency: fullOrder.currency || 'USD',
        customerFirstName: fullOrder.customerFirstName || '',
        customerLastName: fullOrder.customerLastName || '',
        customerEmail: fullOrder.customerEmail || '',
        trackingNumber: fullOrder.trackingNumber || '',
        trackingCompany: fullOrder.trackingCompany || '',
        items: (fullOrder.items || []).map((item: any) => ({
          id: item.id,
          productName: item.productName || 'Custom Stickers',
          productCategory: item.productCategory || 'vinyl-stickers',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          calculatorSelections: item.calculatorSelections || {},
          customFiles: item.customFiles || [],
          customerNotes: item.customerNotes || ''
        }))
      };
      
      setSelectedOrderForInvoice(orderDetails);
    } else {
      console.log('⚠️ Using basic order data for details');
      // Fallback to basic order format
      const transformedOrder = {
        id: order.id,
        shopifyOrderNumber: order.id,
        shopifyOrderId: order.id,
        orderCreatedAt: order.date,
        orderStatus: order.status,
        fulfillmentStatus: order.status,
        totalPrice: order.total,
        currency: 'USD',
        customerFirstName: '',
        customerLastName: '',
        customerEmail: '',
        trackingNumber: order.trackingNumber || '',
        trackingCompany: '',
        items: order.items.map((item: any) => ({
          id: item.id.toString(),
          productName: item.name,
          productCategory: 'vinyl-stickers',
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          calculatorSelections: {
            size: { displayValue: item.size || 'Custom' },
            material: { displayValue: item.material || 'Premium Vinyl' }
          },
          customFiles: item.image ? [item.image] : [],
          customerNotes: ''
        }))
      };
      setSelectedOrderForInvoice(transformedOrder);
    }
    
    // Switch to order details view instead of opening modal
    setCurrentView('order-details');
  };

  const handleProofAction = async (action: 'approve' | 'request_changes', orderId: string, proofId: string) => {
    if (!orderId || !proofId) return;

    console.log(`🔄 Processing proof action: ${action} for order ${orderId}, proof ${proofId}`);

    try {
      setProofAction(action);
      
      await updateProofStatus({
        variables: {
          orderId,
          proofId,
          status: action === 'approve' ? 'approved' : 'changes_requested',
          customerNotes: proofComments || null
        }
      });

      setProofComments('');
      setShowApprovalConfirm(false);
      
      // Show success message
      const message = action === 'approve' ? 'Proof approved! Order is now in production.' : 'Change request submitted! Our design team will review your feedback.';
      setActionNotification({ message, type: 'success' });
      setTimeout(() => setActionNotification(null), 4000);
      
      console.log(`✅ Proof action ${action} completed successfully`);
      
    } catch (error) {
      console.error('Error updating proof:', error);
      setActionNotification({ message: 'Failed to update proof status', type: 'error' });
      setTimeout(() => setActionNotification(null), 4000);
    } finally {
      setProofAction('');
    }
  };

  const handleFileSelect = async (file: File, orderId: string, proofId: string) => {
    if (!file) return;

    try {
      // Validate file before staging
      const { validateFile } = await import('../../utils/cloudinary');
      const validation = validateFile(file);
      
      if (!validation.valid) {
        setActionNotification({ 
          message: validation.error || 'Invalid file', 
          type: 'error' 
        });
        setTimeout(() => setActionNotification(null), 4000);
        return;
      }

      // Check for CutContour1 layers in PDF files
      let cutContourInfo = null;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const { analyzePDFForCutLines } = await import('../../utils/pdf-layer-detection');
          cutContourInfo = await analyzePDFForCutLines(file);
          console.log('📄 PDF layer analysis:', cutContourInfo);
        } catch (error) {
          console.warn('⚠️ Could not analyze PDF layers:', error);
        }
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);
      
      // Stage the file for preview
      setStagedFile({
        file,
        preview,
        orderId,
        proofId,
        cutContourInfo // Add cut contour analysis to staged file
      });

      console.log('📁 File staged for replacement:', file.name);
      
      // Show cut contour feedback if available
      if (cutContourInfo) {
        if (cutContourInfo.hasCutLines) {
          setActionNotification({ 
            message: '✅ CutContour1 layer detected! Your cut lines look good.', 
            type: 'success' 
          });
        } else if (cutContourInfo.recommendations.length > 0) {
          setActionNotification({ 
            message: `⚠️ ${cutContourInfo.recommendations[0]}`, 
            type: 'warning' 
          });
        }
        setTimeout(() => setActionNotification(null), 6000);
      }
      
      // Clear the file input to allow selecting the same file again
      const input = document.getElementById(`proof-file-input-${proofId}`) as HTMLInputElement;
      if (input) {
        input.value = '';
      }

    } catch (error: any) {
      console.error('Error staging file:', error);
      setActionNotification({ 
        message: `Failed to stage file: ${error?.message || 'Unknown error'}`, 
        type: 'error' 
      });
      setTimeout(() => setActionNotification(null), 4000);
    }
  };

  const handleSendReplacement = async () => {
    if (!stagedFile) return;

    try {
      setUploadingFile(true);
      console.log('🔄 Uploading replacement file:', stagedFile.file.name);

      // Use the existing Cloudinary utility function
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      
      const cloudinaryData = await uploadToCloudinary(
        stagedFile.file,
        undefined, // no metadata needed for proof replacements
        undefined, // no progress callback needed
        'customer-replacements' // folder for customer replacements
      );
      
      console.log('✅ File uploaded to Cloudinary:', cloudinaryData.secure_url);

      // Update the ORDER's custom files (not the proof) - this is what gets printed
      const { gql } = await import('@apollo/client');
      const { default: apolloClient } = await import('../../lib/apollo-client');
      
      // For now, we'll just upload the file and track the replacement in frontend state
      // The actual integration with order files can be done later by admin team
      
      console.log('✅ Replacement file uploaded to:', cloudinaryData.secure_url);
      console.log('📝 File details:', {
        orderId: stagedFile.orderId,
        proofId: stagedFile.proofId,
        fileName: stagedFile.file.name,
        fileUrl: cloudinaryData.secure_url,
        timestamp: new Date().toISOString()
      });
      
      // Store replacement info in localStorage for admin reference
      const replacementKey = `replacement_${stagedFile.orderId}_${stagedFile.proofId}`;
      const replacementData = {
        orderId: stagedFile.orderId,
        proofId: stagedFile.proofId,
        originalFileName: stagedFile.file.name,
        replacementFileUrl: cloudinaryData.secure_url,
        uploadedAt: new Date().toISOString(),
        customerEmail: 'current-user-email' // This would come from auth context
      };
      
      try {
        localStorage.setItem(replacementKey, JSON.stringify(replacementData));
        console.log('💾 Replacement data stored in localStorage:', replacementKey);
      } catch (e) {
        console.warn('⚠️ Could not store replacement data in localStorage:', e);
      }
      
      // Mark replacement as sent for this proof
      const proofKey = `${stagedFile.orderId}-${stagedFile.proofId}`;
      setReplacementSent(prev => ({ ...prev, [proofKey]: true }));

      // Clean up staged file
      URL.revokeObjectURL(stagedFile.preview);
      setStagedFile(null);

      // Note: We're not updating the proof image - that stays the same
      // The replacement file will be processed by the admin team
      
      setActionNotification({ 
        message: 'Replacement file sent successfully! We\'ll review it and send you an updated proof shortly.', 
        type: 'success' 
      });
      setTimeout(() => setActionNotification(null), 4000);

    } catch (error: any) {
      console.error('Error uploading replacement file:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      
      setActionNotification({ 
        message: `Failed to upload replacement file: ${errorMessage}`, 
        type: 'error' 
      });
      setTimeout(() => setActionNotification(null), 4000);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCancelReplacement = () => {
    if (stagedFile) {
      URL.revokeObjectURL(stagedFile.preview);
      setStagedFile(null);
    }
  };

  // Order progress tracker function
  const getOrderProgress = (status: string) => {
    const steps = [
      { 
        id: 'building-proof', 
        label: 'Building Proof', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        ),
        statuses: ['Processing', 'Order Received', 'In Production']
      },
      { 
        id: 'review-proof', 
        label: 'Review Proof', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        ),
        statuses: ['Proof Review Needed', 'Reviewing Changes']
      },
      { 
        id: 'printing', 
        label: 'Printing', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
        ),
        statuses: ['Approved', 'Printing', 'In Production']
      },
      { 
        id: 'shipped', 
        label: 'Shipped', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        statuses: ['Shipped', 'In Transit']
      },
      { 
        id: 'out-for-delivery', 
        label: 'Out for Delivery', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0" />
          </svg>
        ),
        statuses: ['Out for Delivery']
      },
      { 
        id: 'delivered', 
        label: 'Delivered', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ),
        statuses: ['Delivered']
      }
    ];

    let currentStepIndex = 0;
    
    // Find current step based on status
    steps.forEach((step, index) => {
      if (step.statuses.includes(status)) {
        currentStepIndex = index;
      }
    });

    return { steps, currentStepIndex };
  };

  const renderOrderProgressTracker = (order: any) => {
    const { steps, currentStepIndex } = getOrderProgress(order.status);
    
    return (
      <div className="px-6 py-4 bg-white/5 border-t border-white/10">
        <div className="relative flex items-start justify-between">
          {/* Progress line background - perfectly centered through circle centers */}
          <div 
            className="absolute h-0.5 bg-gray-600 z-0" 
            style={{ 
              top: '16px', /* Center of 32px circles (16px from top) */
              left: `calc(50% / ${steps.length})`, /* Start from center of first circle */
              right: `calc(50% / ${steps.length})` /* End at center of last circle */
            }}
          ></div>
          
          {/* Active progress line with gradient - ends at center of current step */}
          <div 
            className="absolute h-0.5 transition-all duration-700 ease-in-out z-0"
            style={{ 
              top: '16px', /* Center of 32px circles (16px from top) */
              left: `calc(50% / ${steps.length})`, /* Start from center of first circle */
              width: currentStepIndex === 0 ? '0px' : 
                `calc(${(currentStepIndex / (steps.length - 1)) * 100}% - ${(100 / steps.length)}% + ${(currentStepIndex / (steps.length - 1)) * (100 / steps.length * 2)}%)`,
              background: 'linear-gradient(90deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
              boxShadow: '0 0 8px rgba(249, 115, 22, 0.4), 0 0 16px rgba(249, 115, 22, 0.2)'
            }}
          ></div>
          
          {steps.map((step, index) => {
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-orange-500 text-white border-2 border-orange-400 ring-2 ring-orange-400 ring-offset-2 ring-offset-transparent subtle-pulse' 
                      : isActive 
                        ? 'bg-orange-500 text-white border-2 border-orange-400' 
                        : 'bg-gray-700 text-gray-400 border-2 border-gray-600'
                  }`}
                  title={step.label}
                >
                  {step.icon}
                </div>
                <span 
                  className={`text-xs mt-2 text-center leading-tight w-16 ${
                    isActive ? 'text-orange-300' : 'text-gray-500'
                  }`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.2'
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'all-orders':
        return renderAllOrdersView();
      case 'financial':
        return renderFinancialView();
      case 'items-analysis':
        return renderItemsAnalysisView();
      case 'design-vault':
        return renderDesignVaultView();
      case 'proofs':
        return renderProofsView();
      case 'order-details':
        return renderOrderDetailsView();
      default:
        return renderDefaultView();
    }
  };

  const renderAllOrdersView = () => {
    // Show all orders in My Orders view
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">📋 My Orders</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        {/* Order Summary Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2">📊 Order Summary</h3>
          
          {/* Order Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="container-style p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {orders.length}
                </div>
                <div className="text-sm text-gray-300">Total Orders</div>
              </div>
            </div>
            
            <div className="container-style p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}
                </div>
                <div className="text-sm text-gray-300">Total Stickers</div>
              </div>
            </div>
            
            <div className="container-style p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {orders.filter(order => order.status !== 'Delivered').length}
                </div>
                <div className="text-sm text-gray-300">Active Orders</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Order List - Excel-Style Table */}
        <div 
          className="container-style overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          {/* Table Header */}
          <div className="px-6 py-3 border-b border-white/10 bg-white/5">
            <div className="grid grid-cols-16 gap-6 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <div className="col-span-2">Preview</div>
              <div className="col-span-2">Mission</div>
              <div className="col-span-3">Items</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-2">Actions</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {orders.map((order) => {
              // Calculate total stickers
              const totalStickers = order.items.reduce((sum, item) => {
                const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                return sum + (itemData.quantity || item.quantity || 0);
              }, 0);
              
              return (
                <div key={order.id}>
                  <div className="px-6 py-4 hover:bg-white/5 transition-colors duration-200">
                    <div className="grid grid-cols-16 gap-6 items-center">
                      
                      {/* Preview Column - Side by Side Images */}
                      <div className="col-span-2">
                        <div className="flex gap-2">
                          {order.items.slice(0, 2).map((item, index) => {
                            // Get the full item data with images
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            
                            // Try to get product image from various sources
                            let productImage = null;
                            if (itemData.customFiles?.[0]) {
                              productImage = itemData.customFiles[0];
                            } else if (itemData.image) {
                              productImage = itemData.image;
                            } else if (item.customFiles?.[0]) {
                              productImage = item.customFiles[0];
                            } else if (item.image) {
                              productImage = item.image;
                            }
                            
                            const name = itemData.name || item.name || 'Custom Sticker';
                            
                            return (
                              <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                                {productImage ? (
                                  <div 
                                    className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105"
                                    onClick={() => {
                                      // Set the selected image for highlighting in design vault
                                      setSelectedDesignImage(productImage);
                                      setCurrentView('design-vault');
                                    }}
                                    title={`Click to view ${name} in Design Vault`}
                                  >
                                    <img 
                                      src={productImage} 
                                      alt={name}
                                      className="max-w-full max-h-full object-contain rounded"
                                      onError={(e) => {
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-lg">📄</div>';
                                        }
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center text-gray-400 border border-white/20 text-lg">
                                    📄
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {/* Only show additional count if there are more than 2 items */}
                          {order.items.length > 2 && (
                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-xs font-medium">
                              +{order.items.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Mission Column */}
                      <div className="col-span-2">
                        <div className="font-semibold text-white text-sm">
                          Mission {getOrderDisplayNumber(order)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {order.items.length} styles
                        </div>
                      </div>
                      
                      {/* Items Column - Product Types with Quantities */}
                      <div className="col-span-3">
                        <div className="space-y-1">
                          {(() => {
                            // Group items by product type and sum quantities
                            const productTypes: { [key: string]: number } = {};
                            
                            order.items.forEach(item => {
                              const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                              const quantity = itemData.quantity || item.quantity || 0;
                              const name = itemData.name || item.name || 'Custom Sticker';
                              
                              // Determine product type from name
                              let productType = 'Vinyl Stickers';
                              if (name.toLowerCase().includes('holographic') || name.toLowerCase().includes('holo')) {
                                productType = 'Holographic Stickers';
                              } else if (name.toLowerCase().includes('clear') || name.toLowerCase().includes('transparent')) {
                                productType = 'Clear Stickers';
                              } else if (name.toLowerCase().includes('white') || name.toLowerCase().includes('opaque')) {
                                productType = 'White Stickers';
                              } else if (name.toLowerCase().includes('metallic') || name.toLowerCase().includes('foil')) {
                                productType = 'Metallic Stickers';
                              }
                              
                              if (productTypes[productType]) {
                                productTypes[productType] += quantity;
                              } else {
                                productTypes[productType] = quantity;
                              }
                            });
                            
                            return Object.entries(productTypes).map(([type, quantity]: [string, number]) => (
                              <div key={type} className="text-sm text-white">
                                {quantity} {type}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                      
                      {/* Status Column */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}>
                            <div className="w-full h-full rounded-full animate-pulse"></div>
                          </div>
                          <span className="text-xs text-gray-300 font-medium">
                            {getStatusDisplayText(order.status)}
                          </span>
                        </div>
                        {order.trackingNumber && (
                          <div className="text-xs text-purple-300 mt-1">
                            📦 {order.trackingNumber}
                          </div>
                        )}
                      </div>
                      
                      {/* Date Column */}
                      <div className="col-span-2">
                        <div className="text-xs text-gray-400">
                          {new Date(order.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                      
                      {/* Total Column */}
                      <div className="col-span-2">
                        <div className="text-sm font-semibold text-white">
                          ${order.total}
                        </div>
                      </div>
                      
                      {/* Actions Column */}
                      <div className="col-span-2">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            View Details
                          </button>
                          <button
                            onClick={() => handleReorder(order.id)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.2)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Reorder
                          </button>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                  
                  {/* Order Status Messages - Keep proof messages as requested */}
                  {order.status === 'Proof Review Needed' && (
                    <div className="px-6 pb-4">
                      <div className="p-4 rounded-lg border-2 border-orange-500/30 bg-orange-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                          <span className="text-orange-300 font-semibold text-sm">⚠️ Proof Review Required</span>
                        </div>
                        <p className="text-orange-200 text-sm">
                          Your design proof is ready for review. Please approve or request changes.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {order.status !== 'Delivered' && order.status !== 'Proof Review Needed' && (
                    <div className="px-6 pb-4">
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <p className="text-orange-300 text-sm">📝 We're currently working on your proof. You'll get an e-mail notification when it's ready.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {orders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No orders yet</div>
            <p className="text-gray-500 text-sm">Start your first sticker order to see them here.</p>
          </div>
        )}
      </div>
    );
  };



  const renderFinancialView = () => {
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
    
    // Calculate monthly spending data
    const monthlyData: { [key: string]: number } = {};
    orders.forEach(order => {
      const date = new Date(order.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + order.total;
    });

    // Get current date and generate last 12 months
    const currentDate = new Date();
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      last12Months.push({
        key: monthKey,
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        fullMonth: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: monthlyData[monthKey] || 0
      });
    }

    // Find max value for scaling line graph
    const maxSpending = Math.max(...last12Months.map(d => d.total), 1); // Minimum 1 to avoid division by 0
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">💰 Financial Overview</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center"
               style={{
                 backgroundColor: 'rgba(59, 130, 246, 0.1)',
                 border: '1px solid rgba(59, 130, 246, 0.3)'
               }}>
            <h3 className="text-blue-300 text-sm font-medium">Finances</h3>
            <p className="text-white text-2xl font-bold">${totalSpent.toFixed(2)}</p>
          </div>
          <div className="rounded-xl p-4 text-center"
               style={{
                 backgroundColor: 'rgba(16, 185, 129, 0.1)',
                 border: '1px solid rgba(16, 185, 129, 0.3)'
               }}>
            <h3 className="text-green-300 text-sm font-medium">Average Order</h3>
            <p className="text-white text-2xl font-bold">${avgOrderValue.toFixed(2)}</p>
          </div>
          <div className="rounded-xl p-4 text-center"
               style={{
                 backgroundColor: 'rgba(139, 92, 246, 0.1)',
                 border: '1px solid rgba(139, 92, 246, 0.3)'
               }}>
            <h3 className="text-purple-300 text-sm font-medium">Total Orders</h3>
            <p className="text-white text-2xl font-bold">{orders.length}</p>
          </div>
        </div>

        {/* Monthly Spending Line Chart */}
        <div className="container-style p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <i className="fas fa-chart-line text-blue-400"></i>
            Monthly Spending (12 Months)
          </h3>
          
          {last12Months.some((d: any) => d.total > 0) ? (
            <div className="relative h-80 px-4">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
                <span>${maxSpending.toFixed(0)}</span>
                <span>${(maxSpending * 0.75).toFixed(0)}</span>
                <span>${(maxSpending * 0.5).toFixed(0)}</span>
                <span>${(maxSpending * 0.25).toFixed(0)}</span>
                <span>$0</span>
              </div>
              
              {/* Chart area */}
              <div className="ml-12 h-full relative">
                {/* Grid lines */}
                <div className="absolute inset-0">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                    <div
                      key={ratio}
                      className="absolute w-full border-t border-white/10"
                      style={{ bottom: `${ratio * 100}%` }}
                    />
                  ))}
                </div>
                
                {/* Line chart */}
                <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                  {/* Define the line path */}
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(139, 92, 246, 0.8)" />
                      <stop offset="50%" stopColor="rgba(59, 130, 246, 0.8)" />
                      <stop offset="100%" stopColor="rgba(16, 185, 129, 0.8)" />
                    </linearGradient>
                  </defs>
                  
                  {/* Draw the dotted line */}
                  <polyline
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={last12Months.map((data: any, index: number) => {
                      const x = (index / (last12Months.length - 1)) * 100;
                      const y = 100 - (data.total / maxSpending) * 100;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                    style={{
                      filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))',
                      animation: `lineGrow 2s ease-out forwards`
                    }}
                  />
                  
                  {/* Draw data points */}
                  {last12Months.map((data: any, index: number) => {
                    const x = (index / (last12Months.length - 1)) * 100;
                    const y = 100 - (data.total / maxSpending) * 100;
                    return (
                      <g key={data.key}>
                        <circle
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="4"
                          fill="rgba(59, 130, 246, 0.9)"
                          stroke="white"
                          strokeWidth="2"
                          style={{
                            filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))',
                            animation: `pointAppear 0.5s ease-out ${index * 0.1}s both`
                          }}
                        />
                        {data.total > 0 && (
                          <text
                            x={`${x}%`}
                            y={`${y - 8}%`}
                            textAnchor="middle"
                            className="text-xs fill-green-400 font-semibold"
                            style={{
                              animation: `textAppear 0.5s ease-out ${index * 0.1 + 0.5}s both`
                            }}
                          >
                            ${data.total.toFixed(0)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                
                {/* X-axis labels */}
                <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-gray-400">
                  {last12Months.map((data: any) => (
                    <span key={data.key} className="text-center" title={data.fullMonth}>
                      {data.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-chart-line text-gray-500 text-4xl mb-4"></i>
              <p className="text-gray-400">No spending data available yet</p>
              <p className="text-gray-500 text-sm">Make your first order to see monthly spending trends</p>
            </div>
          )}
        </div>

        {/* ROI Calculator */}
        <div className="container-style p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <i className="fas fa-calculator text-green-400"></i>
            ROI Calculator
          </h3>
          
          {orders.length > 0 ? (
            <div className="space-y-6">
              {/* Overall ROI Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg"
                     style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 className="text-red-300 text-sm font-medium">Total Cost</h4>
                  <p className="text-white text-xl font-bold">${totalSpent.toFixed(2)}</p>
                </div>
                <div className="text-center p-4 rounded-lg"
                     style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <h4 className="text-green-300 text-sm font-medium">Potential Revenue</h4>
                  <p className="text-white text-xl font-bold">${(totalSpent * 3).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">@3x markup</p>
                </div>
                <div className="text-center p-4 rounded-lg"
                     style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <h4 className="text-blue-300 text-sm font-medium">Potential Profit</h4>
                  <p className="text-white text-xl font-bold">${(totalSpent * 2).toFixed(2)}</p>
                </div>
                <div className="text-center p-4 rounded-lg"
                     style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  <h4 className="text-purple-300 text-sm font-medium">Potential ROI</h4>
                  <p className="text-white text-xl font-bold">200%</p>
                </div>
              </div>

                             {/* Individual Order ROI Analysis */}
               <div className="space-y-4">
                 <h4 className="text-lg font-semibold text-white">Order Analysis</h4>
                 {orders.map((order) => {
                   // Calculate per-order metrics
                   const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                   const costPerUnit = order.total / totalQuantity;
                   const suggestedSellingPrice = costPerUnit * 3; // 3x markup
                   const potentialProfit = (suggestedSellingPrice - costPerUnit) * totalQuantity;
                   const potentialROI = ((potentialProfit / order.total) * 100);
                   
                   // Calculate actual ROI if selling price is provided
                   const actualSellingPrice = sellingPrices[order.id] || 0;
                   const actualRevenue = actualSellingPrice * totalQuantity;
                   const actualProfit = actualRevenue - order.total;
                   const actualROI = order.total > 0 ? ((actualProfit / order.total) * 100) : 0;

                  return (
                    <div key={order.id} 
                         className="rounded-lg p-4 border"
                         style={{
                           backgroundColor: 'rgba(255, 255, 255, 0.05)',
                           borderColor: 'rgba(255, 255, 255, 0.1)'
                         }}>
                                             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                         <div>
                           <h5 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h5>
                           <p className="text-sm text-gray-400">
                             {totalQuantity} units • ${costPerUnit.toFixed(2)} cost per unit
                           </p>
                         </div>
                         <div className="text-right">
                           <p className="text-sm text-gray-400">Total Cost</p>
                           <p className="text-white font-bold">${order.total.toFixed(2)}</p>
                         </div>
                       </div>

                       {/* Actual Selling Price Input */}
                       <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                         <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                           <div className="flex-1">
                             <label className="block text-sm font-medium text-blue-300 mb-2">
                               Your Selling Price (per unit)
                             </label>
                             <div className="flex items-center gap-2">
                               <span className="text-white">$</span>
                               <input
                                 type="number"
                                 step="0.01"
                                 min="0"
                                 placeholder={suggestedSellingPrice.toFixed(2)}
                                 value={sellingPrices[order.id] || ''}
                                 onChange={(e) => {
                                   const value = parseFloat(e.target.value) || 0;
                                   setSellingPrices(prev => ({
                                     ...prev,
                                     [order.id]: value
                                   }));
                                 }}
                                 className="flex-1 px-3 py-2 rounded border bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                               />
                               <span className="text-gray-400 text-sm">per unit</span>
                             </div>
                           </div>
                           {actualSellingPrice > 0 && (
                             <div className="text-center sm:text-right">
                               <p className="text-sm text-blue-300">Actual Performance</p>
                               <p className="text-white font-bold">${actualRevenue.toFixed(2)} revenue</p>
                               <p className={`text-sm font-bold ${actualProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 {actualProfit >= 0 ? '+' : ''}${actualProfit.toFixed(2)} profit
                               </p>
                               <p className={`text-xs ${actualROI >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                 {actualROI.toFixed(1)}% ROI
                               </p>
                             </div>
                           )}
                         </div>
                       </div>

                      {/* ROI Scenarios */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Conservative (2x) */}
                        <div className="p-3 rounded bg-white/5">
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Conservative (2x)</p>
                            <p className="text-sm text-white font-medium">${(costPerUnit * 2).toFixed(2)}/unit</p>
                            <p className="text-green-400 font-bold">
                              ${((costPerUnit * 2 - costPerUnit) * totalQuantity).toFixed(2)} profit
                            </p>
                            <p className="text-xs text-purple-300">100% ROI</p>
                          </div>
                        </div>

                        {/* Recommended (3x) */}
                        <div className="p-3 rounded bg-green-500/10 border border-green-500/30">
                          <div className="text-center">
                            <p className="text-xs text-green-300">Recommended (3x)</p>
                            <p className="text-sm text-white font-medium">${suggestedSellingPrice.toFixed(2)}/unit</p>
                            <p className="text-green-400 font-bold">
                              ${potentialProfit.toFixed(2)} profit
                            </p>
                            <p className="text-xs text-green-300">{potentialROI.toFixed(0)}% ROI</p>
                          </div>
                        </div>

                        {/* Aggressive (4x) */}
                        <div className="p-3 rounded bg-white/5">
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Aggressive (4x)</p>
                            <p className="text-sm text-white font-medium">${(costPerUnit * 4).toFixed(2)}/unit</p>
                            <p className="text-green-400 font-bold">
                              ${((costPerUnit * 4 - costPerUnit) * totalQuantity).toFixed(2)} profit
                            </p>
                            <p className="text-xs text-purple-300">300% ROI</p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action */}
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-xs text-gray-400">
                          Market research suggests 2.5-4x markup for custom stickers
                        </div>
                                                 <button className="px-3 py-1 rounded text-xs font-medium transition-colors"
                                 style={{
                                   backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                   color: '#60a5fa',
                                   border: '1px solid rgba(59, 130, 246, 0.3)'
                                 }}
                                 onClick={() => {
                                   const analysisText = actualSellingPrice > 0 
                                     ? `Cost: $${costPerUnit.toFixed(2)}/unit\nActual selling price: $${actualSellingPrice.toFixed(2)}/unit\nActual revenue: $${actualRevenue.toFixed(2)}\nActual profit: $${actualProfit.toFixed(2)}\nActual ROI: ${actualROI.toFixed(1)}%\n\nSuggested price: $${suggestedSellingPrice.toFixed(2)}/unit\nPotential profit: $${potentialProfit.toFixed(2)}\nPotential ROI: ${potentialROI.toFixed(0)}%`
                                     : `Cost: $${costPerUnit.toFixed(2)}/unit\nSuggested price: $${suggestedSellingPrice.toFixed(2)}/unit\nPotential profit: $${potentialProfit.toFixed(2)}\nPotential ROI: ${potentialROI.toFixed(0)}%`;
                                   navigator.clipboard.writeText(analysisText);
                                 }}>
                           📋 Copy Analysis
                </button>
              </div>
            </div>
                  );
                })}
        </div>

              {/* Profitability Tips */}
              <div className="rounded-lg p-4"
                   style={{
                     backgroundColor: 'rgba(34, 197, 94, 0.1)',
                     border: '1px solid rgba(34, 197, 94, 0.3)'
                   }}>
                <h4 className="text-green-300 font-semibold mb-2 flex items-center gap-2">
                  <i className="fas fa-lightbulb"></i>
                  Profitability Tips
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-300">
                      • <strong>Volume discounts:</strong> Order 200+ units to reduce cost per unit
                    </p>
                    <p className="text-gray-300">
                      • <strong>Bundle pricing:</strong> Sell in packs to increase perceived value
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-300">
                      • <strong>Premium materials:</strong> Matte finish commands 20-30% higher prices
                    </p>
                    <p className="text-gray-300">
                      • <strong>Custom shapes:</strong> Unique cuts can justify 2-4x markup
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-calculator text-gray-500 text-4xl mb-4"></i>
              <p className="text-gray-400">No orders available for ROI analysis</p>
              <p className="text-gray-500 text-sm">Place your first order to see profitability insights</p>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes barGrowVertical {
            from {
              height: 0%;
              opacity: 0;
              transform: scaleY(0);
            }
            to {
              opacity: 1;
              transform: scaleY(1);
            }
          }
          
          @keyframes lineGrow {
            from {
              stroke-dasharray: 0, 1000;
            }
            to {
              stroke-dasharray: 8, 4;
            }
          }
          
          @keyframes pointAppear {
            from {
              opacity: 0;
              transform: scale(0);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes textAppear {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  };

  const renderItemsAnalysisView = () => {
    // Calculate item popularity
    const itemCounts: { [key: string]: number } = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.name;
        itemCounts[key] = (itemCounts[key] || 0) + item.quantity;
      });
    });
    
    const sortedItems = Object.entries(itemCounts).sort((a, b) => (b[1] as number) - (a[1] as number));
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">📊 Items Analysis</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div className="container-style p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">🏆 Most Popular Items</h3>
          <div className="space-y-3">
            {sortedItems.slice(0, 5).map(([itemName, count], index) => (
              <div key={itemName} className="flex items-center justify-between p-3 rounded-lg"
                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                  <span className="text-white font-medium">{itemName}</span>
                </div>
                <span className="text-purple-300 font-bold">{count} ordered</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {orders.map((order) => (
            <div key={order.id} className="container-style p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Mission {getOrderDisplayNumber(order)}</h3>
                <p className="text-gray-400">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items total</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{item.name}</p>
                      <p className="text-xs text-purple-300">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleReorder(order.id)}
                  disabled={reorderingId === order.id}
                  className="px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    backgroundColor: reorderingId === order.id ? '#666' : '#ffd713',
                    color: '#030140',
                    boxShadow: reorderingId === order.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                    border: 'solid',
                    borderWidth: '0.03125rem',
                    borderColor: reorderingId === order.id ? '#666' : '#e6c211'
                  }}
                >
                  {reorderingId === order.id ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                      Reorder
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDesignVaultView = () => {
    // Extract unique designs from orders
    const designs: Array<{
      id: number;
      name: string;
      image: string;
      design: string;
      timesOrdered: number;
      lastOrderId: string;
    }> = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!designs.find(d => d.name === item.name)) {
          designs.push({
            id: item.id,
            name: item.name,
            image: item.image || '',
            design: item.design || '',
            timesOrdered: orders.reduce((count, o) => 
              count + o.items.filter(i => i.name === item.name).reduce((sum, i) => sum + i.quantity, 0), 0
            ),
            lastOrderId: order.id
          });
        }
      });
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🎨 Design Vault</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div className="container-style p-6 mb-6">
          <p className="text-gray-300 text-center">☁️ Your cloud library of custom designs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => {
            const isHighlighted = selectedDesignImage === design.image;
            return (
              <div 
                key={design.id} 
                className={`container-style p-6 group hover:scale-105 transition-all duration-300 ${
                  isHighlighted ? 'ring-2 ring-blue-400 ring-opacity-60 shadow-lg shadow-blue-400/20' : ''
                }`}
                style={isHighlighted ? {
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderColor: 'rgba(59, 130, 246, 0.3)'
                } : {}}
              >
                {isHighlighted && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold animate-pulse">
                    Selected
                  </div>
                )}
                <div className="aspect-square mb-4 rounded-lg overflow-hidden relative"
                     style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <img 
                    src={design.image} 
                    alt={design.name}
                    className={`w-full h-full object-contain p-4 transition-all duration-300 ${
                      isHighlighted ? 'ring-2 ring-blue-400 ring-inset' : ''
                    }`}
                  />
                </div>
                <h3 className="font-semibold text-white mb-2">{design.name}</h3>
                <p className="text-xs text-gray-400 mb-4">{design.design} • Ordered {design.timesOrdered} times</p>
                
                <div className="space-y-2">
                  <button className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white transition-all duration-300 hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
                          }}>
                    📥 Download
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 px-3 rounded-lg text-xs font-medium text-white transition-all duration-300 hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                      🔗 Share
                    </button>
                    <button
                      onClick={() => handleReorder(design.lastOrderId)}
                      disabled={reorderingId === design.lastOrderId}
                      className="py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                      style={{
                        backgroundColor: reorderingId === design.lastOrderId ? '#666' : '#ffd713',
                        color: '#030140',
                        boxShadow: reorderingId === design.lastOrderId ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                        border: 'solid',
                        borderWidth: '0.03125rem',
                        borderColor: reorderingId === design.lastOrderId ? '#666' : '#e6c211'
                      }}
                    >
                      {reorderingId === design.lastOrderId ? (
                        <>
                          <svg className="animate-spin w-3 h-3 text-gray-600 inline mr-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 text-black inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                          </svg>
                          Reorder
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper function to render individual proof review interface (like proofs.tsx)
  const renderProofReviewInterface = (order: any) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved':
          return 'bg-green-900 bg-opacity-40 text-green-300';
        case 'changes_requested':
          return 'bg-orange-900 bg-opacity-40 text-orange-300';
        case 'pending':
        case 'sent':
        default:
          return 'bg-yellow-900 bg-opacity-40 text-yellow-300';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'approved':
          return 'Approved';
        case 'changes_requested':
          return 'Changes Requested';
        case 'pending':
        case 'sent':
        default:
          return 'Pending Review';
      }
    };

    // Get proofs from either proofs array or legacy proofUrl
    const proofs = order.proofs && order.proofs.length > 0 
      ? order.proofs 
      : order.proofUrl 
        ? [{
            id: 'legacy',
            proofUrl: order.proofUrl,
            proofTitle: 'Design Proof',
            uploadedAt: order.date,
            status: order.proof_status || 'pending',
            customerNotes: '',
            adminNotes: ''
          }]
        : [];

    if (proofs.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400">
            <svg className="mx-auto h-8 w-8 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-medium text-white mb-1">No proofs uploaded yet</h3>
            <p className="text-xs text-gray-400">We're working on your design proofs.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {proofs.map((proof: any, index: number) => {
          const proofKey = `${order.id}-${proof.id}`;
          const hasReplacementSent = replacementSent[proofKey];
          
          if (hasReplacementSent) {
            // Show replacement confirmation message instead of proof interface
            return (
              <div key={proof.id} className="container-style p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Replacement File Received</h3>
                <p className="text-gray-300 mb-4">
                  We've received your new file and will send you an updated proof shortly. Check back soon.
                </p>
                <div className="inline-flex items-center gap-2 text-sm text-blue-400">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  Processing your replacement file
                </div>
              </div>
            );
          }
          
          return (
          <div key={proof.id} className="container-style p-6">
            {/* Proof Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Design Proof #{index + 1}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-gray-400">Uploaded {formatDate(proof.uploadedAt)}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proof.status)}`}>
                {getStatusText(proof.status)}
              </span>
            </div>

            {/* Improved Proof Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left - Proof Image */}
              <div className="lg:col-span-1">
                <div 
                  className="rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-200 hover:bg-white hover:shadow-lg"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    aspectRatio: '1'
                  }}
                  onClick={() => window.open(proof.proofUrl, '_blank')}
                >
                  <img
                    src={proof.proofUrl}
                    alt={proof.proofTitle}
                    className="w-full h-full object-contain p-2 transition-all duration-200"
                  />
                </div>
                <div className="mt-3 text-center">
                  {/* Cut Line Message Above Status Pill */}
                  {(() => {
                    const firstItem = order.items[0];
                    console.log('🔍 Debug - First item:', firstItem);
                    console.log('🔍 Debug - Full order data:', firstItem?._fullOrderData);
                    
                    // Try multiple possible data paths
                    let cutSelection = firstItem?._fullOrderData?.calculatorSelections?.cut;
                    
                    // Fallback paths
                    if (!cutSelection) {
                      cutSelection = firstItem?.calculatorSelections?.cut;
                    }
                    if (!cutSelection) {
                      cutSelection = order._fullOrderData?.calculatorSelections?.cut;
                    }
                    
                    console.log('🔍 Debug - Cut selection:', cutSelection);
                    
                    // For now, always show a cut line message for testing
                    // This will help us see if the styling works
                    const defaultCutSelection = cutSelection || { displayValue: 'Custom Shape' };
                    
                    const isGreenCut = defaultCutSelection.displayValue.toLowerCase().includes('kiss') || 
                                      defaultCutSelection.displayValue.toLowerCase().includes('cut through backing') ||
                                      !defaultCutSelection.displayValue.toLowerCase().includes('through');
                    
                    return (
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div 
                          className="w-5 h-5 rounded border-2 flex-shrink-0" 
                          style={{ 
                            borderColor: isGreenCut ? '#91c848' : '#6b7280', 
                            backgroundColor: 'transparent' 
                          }}
                        ></div>
                        <span className="text-xs font-medium text-white whitespace-nowrap">
                          This is the cut line, it will not show up on the print.
                        </span>
                      </div>
                    );
                  })()}
                  
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proof.status)}`}>
                    {getStatusText(proof.status)}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">
                    Uploaded {formatDate(proof.uploadedAt)} at {new Date(proof.uploadedAt).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                </div>
              </div>

              {/* Right - Order Summary & Actions */}
              <div className="lg:col-span-2 space-y-4">
                {/* Order Summary Container */}
                <div className="container-style p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Product:</span>
                      <span className="text-white">{order.items[0]?.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Quantity:</span>
                      <span className="text-white">{order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
                    </div>
                    {(() => {
                      const firstItem = order.items[0];
                      const selections = firstItem?._fullOrderData?.calculatorSelections || {};
                      const size = selections.size || selections.sizePreset || {};
                      
                      return (
                        <>
                          {((size.width && size.height) || size.displayValue) && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Size:</span>
                              <span className="text-white">
                                {size.width && size.height ? `${size.width}" × ${size.height}"` : size.displayValue}
                              </span>
                            </div>
                          )}
                          {selections.material?.displayValue && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Material:</span>
                              <span className="text-white">{selections.material.displayValue}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="flex justify-between text-xs pt-2 border-t border-white/10">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-green-400 font-semibold">$122.85</span>
                    </div>
                  </div>

                  {/* Production Info */}
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750314056/cmyk_nypyrn.png" 
                        alt="CMYK" 
                        className="w-4 h-4"
                      />
                      <span className="text-white text-xs">Converted to CMYK</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white text-xs">Printed within 48-hrs of Approval</span>
                    </div>
                    {(() => {
                      // Get cut line selection from the first item's calculator selections
                      const firstItem = order.items[0];
                      const cutSelection = firstItem?._fullOrderData?.calculatorSelections?.cut;
                      
                      if (!cutSelection?.displayValue) return null;
                      
                      const isGreenCut = cutSelection.displayValue.toLowerCase().includes('kiss') || 
                                        cutSelection.displayValue.toLowerCase().includes('cut through backing') ||
                                        !cutSelection.displayValue.toLowerCase().includes('through');
                      
                      return (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border-2 flex-shrink-0" 
                            style={{ 
                              borderColor: isGreenCut ? '#91c848' : '#6b7280', 
                              backgroundColor: 'transparent' 
                            }}
                          ></div>
                          <span className="text-white text-xs">
                            {isGreenCut ? 'Green' : 'Grey'} cut-line shows where sticker will be cut
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Actions Container */}
                <div className="container-style p-4">
                  {(proof.status === 'pending' || proof.status === 'sent') && (
                    <div className="space-y-4">
                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <button
                          className="w-full py-3 px-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] text-sm font-medium backdrop-blur-md"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderColor: 'rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                          }}
                          onClick={() => handleProofAction('approve', order.id, proof.id)}
                        >
                          ✅ Approve This Proof
                        </button>

                        <button
                          className="w-full py-3 px-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] text-sm font-medium backdrop-blur-md"
                          style={{
                            background: 'rgba(251, 146, 60, 0.1)',
                            borderColor: 'rgba(251, 146, 60, 0.3)',
                            color: '#fb923c',
                            boxShadow: '0 4px 16px rgba(251, 146, 60, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                          }}
                          onClick={() => handleProofAction('request_changes', order.id, proof.id)}
                        >
                          ✏️ Request Changes
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/10 my-4"></div>

                      {/* Review & Respond Section */}
                      <div>
                        <h5 className="text-sm font-medium text-white mb-3">Review & Respond</h5>
                        
                        {/* File Upload/Preview Area */}
                        {!stagedFile || (stagedFile.orderId !== order.id || stagedFile.proofId !== proof.id) ? (
                          /* File Upload Drop Zone */
                          <div 
                            className={`border-2 border-dashed rounded-lg p-4 mb-3 text-center transition-colors cursor-pointer ${
                              uploadingFile 
                                ? 'border-blue-400/50 bg-blue-500/10' 
                                : 'border-white/20 hover:border-white/30'
                            }`}
                            onClick={() => !uploadingFile && document.getElementById(`proof-file-input-${proof.id}`)?.click()}
                          >
                            {uploadingFile ? (
                              <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-2"></div>
                                <p className="text-xs text-blue-400 mb-1">Uploading...</p>
                                <p className="text-xs text-gray-500">Please wait</p>
                              </div>
                            ) : (
                              <>
                                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-xs text-gray-400 mb-1">Upload replacement file</p>
                                <p className="text-xs text-gray-500">Click to browse or drag & drop</p>
                              </>
                            )}
                            <input 
                              id={`proof-file-input-${proof.id}`}
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf,.ai,.eps,.psd"
                              title="Upload replacement file"
                              aria-label="Upload replacement file for proof"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileSelect(file, order.id, proof.id);
                                }
                              }}
                              disabled={uploadingFile}
                            />
                          </div>
                        ) : (
                          /* Staged File Preview */
                          <div className="border-2 border-green-400/50 rounded-lg p-4 mb-3 bg-green-500/10">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10">
                                {stagedFile.file.type === 'application/pdf' ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                    </svg>
                                  </div>
                                ) : (
                                  <img 
                                    src={stagedFile.preview} 
                                    alt="New file preview" 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">{stagedFile.file.name}</p>
                                <p className="text-xs text-gray-400">
                                  {(stagedFile.file.size / 1024 / 1024).toFixed(2)} MB • Ready to send
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                  <span className="text-xs text-green-400">Staged for replacement</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSendReplacement}
                                disabled={uploadingFile}
                                className="flex-1 py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {uploadingFile ? 'Sending...' : 'Send Replacement'}
                              </button>
                              <button
                                onClick={handleCancelReplacement}
                                disabled={uploadingFile}
                                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Feedback Textarea */}
                        <textarea
                          value={proofComments}
                          onChange={(e) => setProofComments(e.target.value)}
                          placeholder="Add feedback or notes (optional)..."
                          className="w-full h-20 p-3 rounded-lg text-white placeholder-gray-400 text-sm resize-none bg-white/5 border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Messages for completed proofs */}
                  {proof.status === 'approved' && (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-3">
                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-green-300 text-lg font-medium">Proof Approved!</p>
                      <p className="text-gray-400 text-sm">Your order is now in production</p>
                    </div>
                  )}

                  {proof.status === 'changes_requested' && (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-3">
                        <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-orange-300 text-lg font-medium">Changes Requested</p>
                      <p className="text-gray-400 text-sm">Our team is working on your updates</p>
                    </div>
                  )}
                </div>

                {/* Admin/Customer Notes */}
                {(proof.adminNotes || proof.customerNotes) && (
                  <div className="container-style p-4 space-y-3">
                    {proof.adminNotes && (
                      <div>
                        <h5 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Notes from our team
                        </h5>
                        <p className="text-sm text-gray-300 bg-blue-500/10 p-3 rounded-lg">{proof.adminNotes}</p>
                      </div>
                    )}

                    {proof.customerNotes && (
                      <div>
                        <h5 className="text-sm font-medium text-green-300 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          Your previous feedback
                        </h5>
                        <p className="text-sm text-gray-300 bg-green-500/10 p-3 rounded-lg">{proof.customerNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    );
  };

  const renderProofsView = () => {
    // More comprehensive filtering for proofs that need review
    const proofsToReview = orders.filter(order => {
      // Check if order has proofs available
      const hasProofs = (order.proofs && order.proofs.length > 0) || order.proofUrl;
      if (!hasProofs) return false;
      
      // Include orders with these statuses or proof statuses (more inclusive)
      return (
        order.status === 'Proof Review Needed' ||
        order.proof_status === 'awaiting_approval' ||
        order.proof_status === 'sent' ||
        (hasProofs && order.proof_sent_at && order.proof_status !== 'approved') ||
        // Include orders with pending proofs that need customer action
        (hasProofs && (order.proof_status === 'pending' || !order.proof_status))
      );
    });
    
    const inProduction = orders.filter(order => 
      (order.status === 'In Production' || order.proof_status === 'approved') && 
      ((order.proofs && order.proofs.length > 0) || order.proofUrl)
    );
    
    const requestChanges = orders.filter(order => 
      (order.status === 'request-changes' || order.proof_status === 'changes_requested') && 
      ((order.proofs && order.proofs.length > 0) || order.proofUrl)
    );
    
    const pastProofs = orders.filter(order => 
      (order.proofUrl || (order.proofs && order.proofs.length > 0)) && 
      (order.status === 'Delivered' || order.status === 'Shipped')
    );

    return (
      <div className="space-y-6">
                {/* Current Proofs Needing Review */}
        {proofsToReview.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              ⚠️ Requires Your Review
              <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full animate-pulse">
                {proofsToReview.length} pending
              </span>
            </h3>
            
            {proofsToReview.map((order) => (
              <div key={order.id} className="space-y-4">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-white">
                      Order {getOrderDisplayNumber(order)}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {new Date(order.date).toLocaleDateString()} • $122.85
                    </p>
                  </div>
                </div>

                {/* Full Proof Review Interface */}
                {renderProofReviewInterface(order)}
              </div>
            ))}
          </div>
        )}

        {/* In Production Orders */}
        {inProduction.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              🏭 In Production
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                {inProduction.length} printing
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProduction.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-blue-400/30"
                     style={{
                       backgroundColor: 'rgba(59, 130, 246, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 8px rgba(59, 130, 246, 0.1)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-xs text-blue-300">Printing</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3" style={{ aspectRatio: '7/5' }}>
                    <img 
                      src={order.proofUrl} 
                      alt="Approved Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mb-3">
                    <p className="text-blue-300 text-xs font-medium">✅ Proof Approved</p>
                    <p className="text-blue-200 text-xs">Your stickers are being printed!</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Changes Orders */}
        {requestChanges.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              🔄 Changes Being Reviewed
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                {requestChanges.length} pending
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requestChanges.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-amber-400/30"
                     style={{
                       backgroundColor: 'rgba(245, 158, 11, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 8px rgba(245, 158, 11, 0.1)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-xs text-amber-300">Under Review</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3" style={{ aspectRatio: '7/5' }}>
                    <img 
                      src={order.proofUrl} 
                      alt="Original Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 mb-3">
                    <p className="text-amber-300 text-xs font-medium">🔄 Changes Requested</p>
                    <p className="text-amber-200 text-xs">Your changes are being reviewed</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Proofs */}
        {pastProofs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              📋 Past Proofs
              <span className="text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded-full">
                {pastProofs.length} completed
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastProofs.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl"
                     style={{
                       backgroundColor: 'rgba(255, 255, 255, 0.08)',
                       backdropFilter: 'blur(20px)',
                       border: '1px solid rgba(255, 255, 255, 0.15)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                      <span className="text-xs text-gray-300">{getStatusDisplayText(order.status)}</span>
                    </div>
                  </div>
                  
                                     <div className="rounded-lg overflow-hidden mb-3" style={{ aspectRatio: '7/5' }}>
                     <img 
                       src={order.proofUrl} 
                       alt="Past Proof"
                       className="w-full h-full object-cover"
                     />
                   </div>
                  
                  <p className="text-xs text-gray-400 mb-2">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <button className="w-full py-2 px-3 rounded-lg text-xs font-medium text-white transition-all duration-300 hover:scale-105 backdrop-blur-md border"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          }}>
                    📥 Download Proof
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {proofsToReview.length === 0 && inProduction.length === 0 && requestChanges.length === 0 && pastProofs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Proofs Available</h3>
            <p className="text-gray-400 mb-6">
              When you place an order, design proofs will appear here for your review.
            </p>
            <Link 
              href="/products"
              className="inline-block px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                color: 'white'
              }}
            >
              🚀 Start New Mission
            </Link>
          </div>
        )}

        {/* Show orders with proofs but not matching review criteria */}
        {proofsToReview.length === 0 && orders.some(o => (o.proofs && o.proofs.length > 0) || o.proofUrl) && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-400/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-blue-300 font-medium">You have proofs in other statuses</h4>
            </div>
            <p className="text-blue-200 text-sm mb-3">
              Some of your orders have proofs that may be in production or already approved.
            </p>
            <Link
              href="/proofs"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7l10 10M17 7l-10 10" />
              </svg>
              View All Proofs
            </Link>
          </div>
        )}
      </div>
    );
  };

  const renderOrderDetailsView = () => {
    if (!selectedOrderForInvoice) {
      return (
        <div className="container-style p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Order Selected</h2>
          <p className="text-gray-300 mb-6">Please select an order to view details.</p>
          <button
            onClick={() => setCurrentView('all-orders')}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              color: 'white'
            }}
          >
            ← Back to Orders
          </button>
        </div>
      );
    }

    // Prepare invoice data
    const invoiceData: InvoiceData = {
      orderNumber: selectedOrderForInvoice.shopifyOrderNumber || selectedOrderForInvoice.id,
      orderDate: selectedOrderForInvoice.orderCreatedAt,
      orderStatus: selectedOrderForInvoice.orderStatus,
      totalPrice: selectedOrderForInvoice.totalPrice,
      currency: selectedOrderForInvoice.currency || 'USD',
      subtotal: selectedOrderForInvoice.subtotal || selectedOrderForInvoice.totalPrice,
      tax: selectedOrderForInvoice.tax || 0,
      shipping: selectedOrderForInvoice.shipping || 0,
      items: selectedOrderForInvoice.items.map((item: any) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        customFiles: item.customFiles,
        calculatorSelections: item.calculatorSelections,
        customerNotes: item.customerNotes
      })),
      trackingNumber: selectedOrderForInvoice.trackingNumber,
      trackingCompany: selectedOrderForInvoice.trackingCompany,
      customerEmail: selectedOrderForInvoice.customerEmail || (user as any)?.email,
      // Use Shopify billing address if available
      billingAddress: selectedOrderForInvoice.billingAddress || selectedOrderForInvoice.billing_address,
      customerInfo: {
        name: (user as any)?.user_metadata?.full_name || (user as any)?.email?.split('@')[0] || 'Customer',
        email: (user as any)?.email,
        // Add more customer info if available from order data
      }
    };

    const { generatePrintPDF, generateDownloadPDF } = useInvoiceGenerator(invoiceData);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">📋 Order Details</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={generatePrintPDF}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'white'
              }}
              title="Print Invoice"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zM5 14a1 1 0 011-1h8a1 1 0 011 1v4H5v-4z" clipRule="evenodd" />
              </svg>
              Print Invoice
            </button>
            <button
              onClick={generateDownloadPDF}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: 'white'
              }}
              title="Download Invoice"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Invoice
            </button>
            <button 
              onClick={() => {
                setCurrentView('all-orders');
                setSelectedOrderForInvoice(null);
              }}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
            >
              ← Back to Orders
            </button>
          </div>
        </div>

        <div className="container-style p-8">
          {/* Order Header */}
          <div className="border-b border-white/10 pb-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Order #{selectedOrderForInvoice.shopifyOrderNumber || selectedOrderForInvoice.id}
                </h1>
                <p className="text-gray-300">
                  Placed on {new Date(selectedOrderForInvoice.orderCreatedAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedOrderForInvoice.orderStatus)}`}></div>
                  <span className="text-lg font-semibold text-white">
                    {getStatusDisplayText(selectedOrderForInvoice.orderStatus)}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">
                  ${selectedOrderForInvoice.totalPrice.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Tracking Information */}
            {selectedOrderForInvoice.trackingNumber && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-green-400 mb-2">📦 Tracking Information</h3>
                <p className="text-white">
                  <span className="text-gray-300">Tracking Number:</span> {selectedOrderForInvoice.trackingNumber}
                </p>
                {selectedOrderForInvoice.trackingCompany && (
                  <p className="text-white">
                    <span className="text-gray-300">Carrier:</span> {selectedOrderForInvoice.trackingCompany}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Order Items</h3>
            
            {selectedOrderForInvoice.items.map((item: any, index: number) => (
              <div 
                key={item.id || index} 
                className="rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] transform overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex gap-6">
                  {/* Item Image - Keep same as before */}
                  <div className="flex-shrink-0">
                    {item.customFiles && item.customFiles.length > 0 ? (
                      <div className="w-24 h-24 rounded-lg bg-white/10 border border-white/20 p-2 flex items-center justify-center">
                        <img 
                          src={item.customFiles[0]} 
                          alt={item.productName}
                          className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-600 flex items-center justify-center text-gray-400 border border-white/20">
                        📄
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-2">{item.productName}</h4>
                        <Link 
                          href={`/products/${item.productName.toLowerCase().replace(/\s+/g, '-')}`}
                          className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200 flex items-center gap-1"
                        >
                          View product page →
                        </Link>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white mb-1">
                          ${item.totalPrice.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-300">
                          ${item.unitPrice.toFixed(2)} × {item.quantity}
                        </div>
                      </div>
                    </div>
                    
                    {/* Configuration Features - Home Page Style */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {/* Quantity Badge */}
                        <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/50">
                          📦 Quantity: {item.quantity}
                        </span>
                        
                        {/* Configuration Options as Feature Badges */}
                        {item.calculatorSelections && Object.entries(item.calculatorSelections)
                          .filter(([key, value]: [string, any]) => value && (value.displayValue || value.value))
                          .map(([key, value]: [string, any]) => {
                            // Helper function to get emoji and color for option type
                            const getOptionStyle = (type: string) => {
                              switch (type.toLowerCase()) {
                                case 'shape':
                                case 'cut':
                                  return { emoji: "✂️", color: "green" };
                                case 'finish':
                                case 'material':
                                  return { emoji: "🧻", color: "purple" };
                                case 'size':
                                case 'sizepreset':
                                  return { emoji: "📏", color: "yellow" };
                                case 'whitebase':
                                case 'whiteoption':
                                  return { emoji: "⚪", color: "gray" };
                                default:
                                  return { emoji: "⚙️", color: "blue" };
                              }
                            };

                            // Format option name
                            const formatOptionName = (type: string) => {
                              switch (type.toLowerCase()) {
                                case 'sizepreset':
                                  return 'Size';
                                case 'whiteoption':
                                  return 'White Base';
                                case 'whitebase':
                                  return 'White Base';
                                default:
                                  return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1').trim();
                              }
                            };

                            const style = getOptionStyle(key);
                            const colorClasses = {
                              green: "bg-green-500/20 text-green-200 border-green-400/50",
                              purple: "bg-purple-500/20 text-purple-200 border-purple-400/50",
                              yellow: "bg-yellow-500/20 text-yellow-200 border-yellow-400/50",
                              gray: "bg-gray-500/20 text-gray-200 border-gray-400/50",
                              blue: "bg-blue-500/20 text-blue-200 border-blue-400/50"
                            };

                            return (
                              <span 
                                key={key} 
                                className={`px-3 py-1 text-xs rounded-full border ${colorClasses[style.color as keyof typeof colorClasses]}`}
                              >
                                {style.emoji} {formatOptionName(key)}: {value.displayValue || value.value || 'N/A'}
                              </span>
                            );
                          })}
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {item.customerNotes && (
                      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-300 text-sm">📝</span>
                          <div>
                            <p className="text-sm text-blue-300 font-medium mb-1">Customer Notes:</p>
                            <p className="text-blue-200 text-sm">{item.customerNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="border-t border-white/10 pt-6 mt-8">
            <div className="flex justify-between items-center">
              <div className="text-gray-300">
                <p className="mb-1">Items: {selectedOrderForInvoice.items.length}</p>
                <p>Total Quantity: {selectedOrderForInvoice.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  Total: ${selectedOrderForInvoice.totalPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-300">{selectedOrderForInvoice.currency}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDefaultView = () => (
    <>
      {/* Order Completion Success Message */}
      {showOrderCompleteMessage && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/20 border-2 border-green-400/50 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <i className="fas fa-check text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <h3 className="text-green-300 font-bold text-lg">🎉 Order Complete!</h3>
              <p className="text-green-200 text-sm">
                Your payment has been processed successfully. Your order will appear below shortly.
              </p>
            </div>
            <button
              onClick={() => setShowOrderCompleteMessage(false)}
              className="text-green-300 hover:text-green-100 transition-colors"
              title="Close notification"
              aria-label="Close order completion notification"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}



      {/* Current Deals - Priority Display */}
      <div className="container-style p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            🎯 Current Deals
            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
              Limited Time
            </span>
          </h2>
          <p className="text-sm text-gray-400">Exclusive offers just for you</p>
        </div>
        
        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 gap-4">
          {/* Deal 1 - Reorder Discount */}
          <div className="rounded-lg p-4 border border-yellow-400/30"
               style={{ backgroundColor: 'rgba(255, 215, 19, 0.1)' }}>
            <div className="text-center">
              <div className="text-xs font-bold px-3 py-1 rounded mb-3 inline-block"
                   style={{ background: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' }}>
                10% OFF
              </div>
              <p className="text-sm font-semibold text-white mb-1">🔄 Reorder Special</p>
              <p className="text-xs text-gray-300">10% off any repeat order</p>
            </div>
          </div>

          {/* Deal 2 - Free Shipping */}
          <div className="rounded-lg p-4 border border-green-400/30"
               style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <div className="text-center">
              <div className="text-xs font-bold px-3 py-1 rounded text-white mb-3 inline-block"
                   style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                FREE
              </div>
              <p className="text-sm font-semibold text-white mb-1">🚚 Free Shipping</p>
              <p className="text-xs text-gray-300">Orders over $50</p>
            </div>
          </div>

          {/* Deal 3 - Bulk Discount */}
          <div className="rounded-lg p-4 border border-purple-400/30"
               style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
            <div className="text-center">
              <div className="text-xs font-bold px-3 py-1 rounded text-white mb-3 inline-block"
                   style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                15% OFF
              </div>
              <p className="text-sm font-semibold text-white mb-1">📦 Bulk Orders</p>
              <p className="text-xs text-gray-300">15% off 500+ stickers</p>
            </div>
          </div>
        </div>

        {/* Mobile Swipeable Carousel */}
        <div className="md:hidden">
          <div 
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {/* Create infinite scroll effect by repeating deals */}
            {[
              { emoji: '🔄', title: 'Reorder Special', desc: '10% off any repeat order', discount: '10% OFF', bg: 'rgba(255, 215, 19, 0.1)', border: 'border-yellow-400/30', gradient: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' },
              { emoji: '🚚', title: 'Free Shipping', desc: 'Orders over $50', discount: 'FREE', bg: 'rgba(16, 185, 129, 0.1)', border: 'border-green-400/30', gradient: 'linear-gradient(135deg, #10b981, #34d399)', color: 'white' },
              { emoji: '📦', title: 'Bulk Orders', desc: '15% off 500+ stickers', discount: '15% OFF', bg: 'rgba(139, 92, 246, 0.1)', border: 'border-purple-400/30', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white' },
              { emoji: '🔄', title: 'Reorder Special', desc: '10% off any repeat order', discount: '10% OFF', bg: 'rgba(255, 215, 19, 0.1)', border: 'border-yellow-400/30', gradient: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' },
              { emoji: '🚚', title: 'Free Shipping', desc: 'Orders over $50', discount: 'FREE', bg: 'rgba(16, 185, 129, 0.1)', border: 'border-green-400/30', gradient: 'linear-gradient(135deg, #10b981, #34d399)', color: 'white' },
              { emoji: '📦', title: 'Bulk Orders', desc: '15% off 500+ stickers', discount: '15% OFF', bg: 'rgba(139, 92, 246, 0.1)', border: 'border-purple-400/30', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white' }
            ].map((deal, index) => (
              <div 
                key={index}
                className={`flex-none w-64 rounded-lg p-4 border ${deal.border} snap-start`}
                style={{ backgroundColor: deal.bg }}
              >
                <div className="text-center">
                  <div className="text-xs font-bold px-3 py-1 rounded mb-3 inline-block"
                       style={{ background: deal.gradient, color: deal.color }}>
                    {deal.discount}
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">{deal.emoji} {deal.title}</p>
                  <p className="text-xs text-gray-300">{deal.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Reorder - PRIORITY 2 */}
      {(() => {
        const lastDeliveredOrder = orders.filter(order => order.status === 'Delivered')[0];
        return lastDeliveredOrder ? (
          <div 
            className="rounded-xl shadow-xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">🔄 Quick Reorder</h2>
                <div className="text-xs font-bold px-3 py-1 rounded-full"
                     style={{
                       background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
                       color: '#030140'
                     }}>
                  10% OFF
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-lg p-4"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)'
                   }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">Your Last Order - Mission {getOrderDisplayNumber(lastDeliveredOrder)}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lastDeliveredOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{item.name}</p>
                            <p className="text-xs text-gray-300">Qty: {item.quantity} • ${item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <p className="text-sm text-gray-300">
                        Original: <span className="line-through">${lastDeliveredOrder.total}</span>
                      </p>
                      <p className="text-sm font-bold text-white">
                        With 10% off: <span style={{ color: '#ffd713' }}>${(lastDeliveredOrder.total * 0.9).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleReorder(lastDeliveredOrder.id)}
                      disabled={reorderingId === lastDeliveredOrder.id}
                      className="px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                      style={{
                        backgroundColor: reorderingId === lastDeliveredOrder.id ? '#666' : '#ffd713',
                        color: '#030140',
                        boxShadow: reorderingId === lastDeliveredOrder.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                        border: 'solid',
                        borderWidth: '0.03125rem',
                        borderColor: reorderingId === lastDeliveredOrder.id ? '#666' : '#e6c211'
                      }}
                    >
                      {reorderingId === lastDeliveredOrder.id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          🔄 Reorder Now
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-400 text-center">Save 10% • Same Great Quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Active Orders - Excel-Style Table */}
      {orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length > 0 && (
        <div 
          className="container-style overflow-hidden mb-6"
          style={{
            border: '2px dashed rgba(249, 115, 22, 0.6)',
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.3), 0 0 40px rgba(249, 115, 22, 0.1), inset 0 0 20px rgba(249, 115, 22, 0.1)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🔥 Active Orders
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">
                  {orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length}
                </span>
              </h2>
              <button 
                onClick={() => setCurrentView('all-orders')}
                className="text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200 text-sm"
              >
                View All →
              </button>
            </div>
          </div>
          
          {/* Table Header */}
          <div className="px-6 py-3 border-b border-white/10 bg-white/5">
            <div className="grid grid-cols-16 gap-6 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <div className="col-span-2">Preview</div>
              <div className="col-span-2">Mission</div>
              <div className="col-span-3">Items</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-2">Actions</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').map((order) => {
              // Try multiple paths to get the first file URL
              let firstFileUrl = null;
              
              // Check _fullOrderData first (most complete data)
              if (order._fullOrderData?.items?.[0]?.customFiles?.[0]) {
                firstFileUrl = order._fullOrderData.items[0].customFiles[0];
              }
              // Check direct items structure
              else if (order.items?.[0]?.customFiles?.[0]) {
                firstFileUrl = order.items[0].customFiles[0];
              }
              // Check nested _fullOrderData within items
              else if (order.items?.[0]?._fullOrderData?.items?.[0]?.customFiles?.[0]) {
                firstFileUrl = order.items[0]._fullOrderData.items[0].customFiles[0];
              }
              // Fallback to old image property
              else if (order.items?.[0]?.image) {
                firstFileUrl = order.items[0].image;
              }
              
              // Calculate total stickers
              const totalStickers = order.items.reduce((sum, item) => {
                const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                return sum + (itemData.quantity || item.quantity || 0);
              }, 0);
              
              return (
                <div key={order.id}>
                  <div className="px-6 py-4 hover:bg-white/5 transition-colors duration-200">
                    <div className="grid grid-cols-16 gap-6 items-center">
                    
                    {/* Preview Column - Side by Side Images */}
                    <div className="col-span-2">
                      <div className="flex gap-2">
                        {order.items.slice(0, 2).map((item, index) => {
                          // Get the full item data with images
                          const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                          
                          // Try to get product image from various sources
                          let productImage = null;
                          if (itemData.customFiles?.[0]) {
                            productImage = itemData.customFiles[0];
                          } else if (itemData.image) {
                            productImage = itemData.image;
                          } else if (item.customFiles?.[0]) {
                            productImage = item.customFiles[0];
                          } else if (item.image) {
                            productImage = item.image;
                          }
                          
                          const name = itemData.name || item.name || 'Custom Sticker';
                          
                          return (
                            <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                              {productImage ? (
                                <div 
                                  className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105"
                                  onClick={() => {
                                    // Set the selected image for highlighting in design vault
                                    setSelectedDesignImage(productImage);
                                    setCurrentView('design-vault');
                                  }}
                                  title={`Click to view ${name} in Design Vault`}
                                >
                                  <img 
                                    src={productImage} 
                                    alt={name}
                                    className="max-w-full max-h-full object-contain rounded"
                                    onError={(e) => {
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-lg">📄</div>';
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center text-gray-400 border border-white/20 text-lg">
                                  📄
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Mission Column */}
                    <div className="col-span-2">
                      <div className="font-semibold text-white text-sm">
                        Mission {getOrderDisplayNumber(order)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.items.length} styles
                      </div>
                    </div>
                    
                    {/* Items Column - Product Types with Quantities */}
                    <div className="col-span-3">
                      <div className="space-y-1">
                        {(() => {
                          // Group items by product type and sum quantities
                          const productTypes: { [key: string]: number } = {};
                          
                          order.items.forEach(item => {
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            const quantity = itemData.quantity || item.quantity || 0;
                            const name = itemData.name || item.name || 'Custom Sticker';
                            
                            // Determine product type from name
                            let productType = 'Vinyl Stickers';
                            if (name.toLowerCase().includes('holographic') || name.toLowerCase().includes('holo')) {
                              productType = 'Holographic Stickers';
                            } else if (name.toLowerCase().includes('clear') || name.toLowerCase().includes('transparent')) {
                              productType = 'Clear Stickers';
                            } else if (name.toLowerCase().includes('white') || name.toLowerCase().includes('opaque')) {
                              productType = 'White Stickers';
                            } else if (name.toLowerCase().includes('metallic') || name.toLowerCase().includes('foil')) {
                              productType = 'Metallic Stickers';
                            }
                            
                            if (productTypes[productType]) {
                              productTypes[productType] += quantity;
                            } else {
                              productTypes[productType] = quantity;
                            }
                          });
                          
                          return Object.entries(productTypes).map(([type, quantity]: [string, number]) => (
                            <div key={type} className="text-sm text-white">
                              {quantity} {type}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                    
                    {/* Status Column */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}>
                          <div className="w-full h-full rounded-full animate-pulse"></div>
                        </div>
                        <span className="text-xs text-orange-300 font-medium">
                          {getStatusDisplayText(order.status)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Date Column */}
                    <div className="col-span-2">
                      <div className="text-xs text-gray-400">
                        {new Date(order.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                    
                    {/* Total Column */}
                    <div className="col-span-2">
                      <div className="text-sm font-semibold text-white">
                        ${order.total}
                      </div>
                    </div>
                    
                    {/* Actions Column */}
                    <div className="col-span-2">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleViewOrderDetails(order)}
                          className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: 'white'
                          }}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          View Details
                        </button>
                        <button
                          onClick={() => handleReorder(order.id)}
                          className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: 'white'
                          }}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          Reorder
                        </button>
                        
                        {order.status === 'Proof Review Needed' && (
                          <button
                            onClick={() => setCurrentView('proofs')}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(249, 115, 22, 0.2)',
                              border: '1px solid rgba(249, 115, 22, 0.3)',
                              color: 'white'
                            }}
                          >
                            Review Proof
                          </button>
                        )}
                      </div>
                    </div>
                    
                    </div>
                  </div>
                  
                  {/* Progress Tracker Subrow */}
                  {renderOrderProgressTracker(order)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Orders History */}
      <div 
        className="rounded-xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">📋 Order History</h2>
            <button 
              onClick={() => setCurrentView('all-orders')}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
            >
              View All →
            </button>
          </div>
        </div>
        {/* Table Header */}
        <div className="px-6 py-3 border-b border-white/10 bg-white/5">
          <div className="grid grid-cols-16 gap-6 text-xs font-semibold text-gray-300 uppercase tracking-wider">
            <div className="col-span-2">Preview</div>
            <div className="col-span-2">Mission</div>
            <div className="col-span-3">Items</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-2">Actions</div>
          </div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {orders.slice(0, 3).map((order) => {
            // Calculate total stickers
            const totalStickers = order.items.reduce((sum, item) => {
              const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
              return sum + (itemData.quantity || item.quantity || 0);
            }, 0);
            
            return (
              <div key={order.id} className="px-6 py-4 hover:bg-white/5 transition-colors duration-200">
                <div className="grid grid-cols-16 gap-6 items-center">
                  {/* Preview Column - Side by Side Images */}
                  <div className="col-span-2">
                    <div className="flex gap-2">
                      {order.items.slice(0, 2).map((item, index) => {
                        // Get the full item data with images
                        const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                        
                        // Try to get product image from various sources
                        let productImage = null;
                        if (itemData.customFiles?.[0]) {
                          productImage = itemData.customFiles[0];
                        } else if (itemData.image) {
                          productImage = itemData.image;
                        } else if (item.customFiles?.[0]) {
                          productImage = item.customFiles[0];
                        } else if (item.image) {
                          productImage = item.image;
                        }
                        
                        const name = itemData.name || item.name || 'Custom Sticker';
                        
                        return (
                          <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                            {productImage ? (
                              <div 
                                className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105"
                                onClick={() => {
                                  // Set the selected image for highlighting in design vault
                                  setSelectedDesignImage(productImage);
                                  setCurrentView('design-vault');
                                }}
                                title={`Click to view ${name} in Design Vault`}
                              >
                                <img 
                                  src={productImage} 
                                  alt={name}
                                  className="max-w-full max-h-full object-contain rounded"
                                  onError={(e) => {
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-lg">📄</div>';
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center text-gray-400 border border-white/20 text-lg">
                                📄
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Mission Column */}
                  <div className="col-span-2">
                    <div className="font-semibold text-white text-sm">
                      Mission {getOrderDisplayNumber(order)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {order.items.length} styles
                    </div>
                  </div>
                  
                  {/* Items Column - Product Types with Quantities */}
                  <div className="col-span-3">
                    <div className="space-y-1">
                      {(() => {
                        // Group items by product type and sum quantities
                        const productTypes: { [key: string]: number } = {};
                        
                        order.items.forEach(item => {
                          const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                          const quantity = itemData.quantity || item.quantity || 0;
                          const name = itemData.name || item.name || 'Custom Sticker';
                          
                          // Determine product type from name
                          let productType = 'Vinyl Stickers';
                          if (name.toLowerCase().includes('holographic') || name.toLowerCase().includes('holo')) {
                            productType = 'Holographic Stickers';
                          } else if (name.toLowerCase().includes('clear') || name.toLowerCase().includes('transparent')) {
                            productType = 'Clear Stickers';
                          } else if (name.toLowerCase().includes('white') || name.toLowerCase().includes('opaque')) {
                            productType = 'White Stickers';
                          } else if (name.toLowerCase().includes('metallic') || name.toLowerCase().includes('foil')) {
                            productType = 'Metallic Stickers';
                          }
                          
                          if (productTypes[productType]) {
                            productTypes[productType] += quantity;
                          } else {
                            productTypes[productType] = quantity;
                          }
                        });
                        
                        return Object.entries(productTypes).map(([type, quantity]: [string, number]) => (
                          <div key={type} className="text-sm text-white">
                            {quantity} {type}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  
                  {/* Status Column */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}>
                        <div className="w-full h-full rounded-full animate-pulse"></div>
                      </div>
                      <span className="text-xs text-gray-300 font-medium">
                        {getStatusDisplayText(order.status)}
                      </span>
                    </div>
                    {order.trackingNumber && (
                      <div className="text-xs text-purple-300 mt-1">
                        📦 {order.trackingNumber}
                      </div>
                    )}
                  </div>
                  
                  {/* Date Column */}
                  <div className="col-span-2">
                    <div className="text-xs text-gray-400">
                      {new Date(order.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                  
                  {/* Total Column */}
                  <div className="col-span-2">
                    <div className="text-sm font-semibold text-white">
                      ${order.total}
                    </div>
                  </div>
                  
                  {/* Actions Column */}
                  <div className="col-span-2">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleViewOrderDetails(order)}
                        className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: 'white'
                        }}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        View Details
                      </button>
                      <button
                        onClick={() => handleReorder(order.id)}
                        className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: 'white'
                        }}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Reorder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


    </>
  );

  if (loading) {
    return (
      <Layout title="Dashboard - Sticker Shuttle">
        <div className="min-h-screen flex items-center justify-center"
             style={{
               background: '#030140',
               position: 'relative'
             }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Screen Recording Optimizations */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        
        /* Disable problematic effects during screen recording */
        .recording-mode * {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          animation: none !important;
          transition: none !important;
          transform: none !important;
          box-shadow: none !important;
        }
        
        /* Fallback for backdrop-filter issues */
        @supports not (backdrop-filter: blur(1px)) {
          [style*="backdrop-filter"] {
            background-color: rgba(3, 1, 64, 0.95) !important;
          }
        }
        
        /* Reduce GPU-intensive effects */
        .screen-record-safe {
          will-change: auto !important;
          transform: translateZ(0) !important;
          backface-visibility: hidden !important;
        }
      `}</style>
      <Layout title="Dashboard - Sticker Shuttle">
        <ErrorBoundary>
          <div className={`min-h-screen ${recordingMode ? 'recording-mode' : ''}`}
           style={{
             background: '#030140',
             position: 'relative'
           }}>
        
        <div className="w-full relative z-10">
          {/* Recording Mode Indicator */}
          {recordingMode && (
            <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              🔴 RECORDING MODE
            </div>
          )}
          {/* Header Section */}
          <div className="pt-6 pb-6">
            <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto max-w-sm sm:max-w-md md:max-w-full">
              {/* Header - Mission Control */}
              <div 
                className="relative rounded-xl p-4 md:p-6 shadow-xl mb-6 overflow-hidden cursor-pointer group banner-gradient"
                style={
                  profile?.banner_image_url 
                    ? {
                        backgroundImage: `url(${profile.banner_image_url})`,
                        backgroundSize: '120%',
                        backgroundPosition: 'right 10%',
                        backgroundRepeat: 'no-repeat',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }
                    : profile?.banner_template
                      ? {
                          ...JSON.parse(profile.banner_template),
                          border: '1px solid rgba(255, 255, 255, 0.15)'
                        }
                      : {
                          background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 25%, #ec4899 50%, #a855f7 75%, #ec4899 100%)',
                          backgroundSize: '400% 400%',
                          backgroundPosition: '0% 50%',
                          backgroundRepeat: 'no-repeat',
                          border: '1px solid rgba(255, 255, 255, 0.15)'
                        }
                }
                onClick={handleBannerClick}
                title="Click to change banner image"
              >
                
                {/* Grain texture overlay for default gradient */}
                {!profile?.banner_image_url && (
                  <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='17' cy='17' r='1'/%3E%3Ccircle cx='37' cy='17' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='17' cy='37' r='1'/%3E%3Ccircle cx='37' cy='37' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundSize: '60px 60px'
                    }}
                  ></div>
                )}
                
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/30 z-0"></div>
                
                {/* Upload indicator */}
                {uploadingBanner && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2 mx-auto"></div>
                      <p className="text-white text-sm">Uploading banner...</p>
                    </div>
                  </div>
                )}
                
                {/* Hover overlay with action icons */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 pointer-events-none">
                  <div className="flex gap-4">
                    {/* Upload/Change Banner Icon */}
                    <div 
                      className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200 cursor-pointer pointer-events-auto" 
                      title="Change Banner"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerClick();
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    
                    {/* Template Icon */}
                    <div 
                      className="p-3 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 hover:bg-purple-500/30 transition-all duration-200 cursor-pointer pointer-events-auto relative" 
                      title="Choose Template"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBannerTemplates(!showBannerTemplates);
                      }}
                    >
                      <svg className="w-6 h-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    
                    {/* Replace Banner Icon */}
                    <div 
                      className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200 cursor-pointer pointer-events-auto" 
                      title="Replace Banner"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerClick();
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    
                    {/* Remove Banner Icon (only show if custom banner exists) */}
                    {(profile?.banner_image_url || profile?.banner_template) && (
                      <div 
                        className="p-3 rounded-full bg-red-500/20 backdrop-blur-sm border border-red-400/30 hover:bg-red-500/30 transition-all duration-200 cursor-pointer pointer-events-auto" 
                        title="Remove Banner"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to remove your banner?')) {
                            handleRemoveBanner();
                          }
                        }}
                      >
                        <svg className="w-6 h-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10 pointer-events-none">
                  <div className="flex items-center gap-4">
                    {/* Profile Picture Circle */}
                    <div 
                      className="w-16 h-16 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 flex items-center justify-center relative pointer-events-auto"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                      }}
                      onClick={handleProfilePictureClick}
                      title="Click to change profile photo"
                    >
                      {uploadingProfilePhoto ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1"></div>
                          <span className="text-xs text-white">Uploading...</span>
                        </div>
                      ) : profile?.profile_photo_url ? (
                        <>
                          <img 
                            src={profile.profile_photo_url} 
                            alt="Profile" 
                            className="w-full h-full rounded-full object-cover"
                          />
                          {/* Hover overlay for profile photo */}
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <div className="text-white text-xl font-bold">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1"
                          style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                        Greetings, {getUserDisplayName()}
                      </h1>
                      <p className="text-sm text-gray-400">
                        Mission Control Dashboard
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Proof Alert Banner */}
              {orders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length > 0 && (
                <div 
                  className="rounded-xl p-4 shadow-xl mb-6 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(249, 115, 22, 0.3)',
                    boxShadow: '0 0 12px rgba(249, 115, 22, 0.1)'
                  }}
                  onClick={() => setCurrentView('proofs')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      <div>
                        <h3 className="text-orange-300 font-semibold text-sm">
                          ⚠️ Alert! You have {orders.filter(order => order.status === 'Proof Review Needed').length} proof(s) to approve
                        </h3>
                        <p className="text-orange-200 text-xs">
                          Click here to approve or request changes
                        </p>
                      </div>
                    </div>
                    <div className="text-orange-300 text-xl">
                      →
                    </div>
                  </div>
                </div>
              )}



              {/* Main Layout - Sidebar + Content */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar - Stats & Quick Actions */}
                <div className="lg:col-span-1 space-y-3">
                  {/* Primary Action - Start New Mission */}
                  <Link 
                    href="/products"
                    className="block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden container-style"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                      boxShadow: '0 8px 32px rgba(30, 58, 138, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">🚀 Start New Mission</h4>
                        <p className="text-xs text-white/80">Create custom stickers</p>
                      </div>
                    </div>
                  </Link>

                  {/* Dashboard Button */}
                                      <button 
                      onClick={() => updateCurrentView('default')}
                      className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden ${
                        currentView === 'default' ? 'rounded-2xl' : 'container-style'
                      }`}
                      style={currentView === 'default' ? {
                        background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.3) 0%, rgba(100, 116, 139, 0.2) 50%, rgba(100, 116, 139, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(100, 116, 139, 0.4)',
                        boxShadow: '0 8px 32px rgba(100, 116, 139, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg"
                           style={{
                             background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                             boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)'
                           }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">Dashboard</h4>
                        <p className="text-xs text-gray-300">Mission overview</p>
                      </div>
                    </div>
                  </button>

                  {/* Stats - Grid Layout for Mobile, Vertical for Desktop */}
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    <button 
                      onClick={() => updateCurrentView('all-orders')}
                      className={`block p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden ${
                        currentView === 'all-orders' ? 'rounded-2xl' : 'container-style'
                      }`}
                      style={currentView === 'all-orders' ? {
                        background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.3) 0%, rgba(75, 85, 99, 0.2) 50%, rgba(75, 85, 99, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(75, 85, 99, 0.4)',
                        boxShadow: '0 8px 32px rgba(75, 85, 99, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {}}>
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #10b981, #34d399)',
                               boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                             }}>
                          <svg className="w-4 lg:w-5 h-4 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Orders</h4>
                          <p className="text-xs text-gray-300">{orders.length} completed</p>
                        </div>
                      </div>
                    </button>



                    <button 
                      onClick={() => updateCurrentView('financial')}
                      className={`block p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden ${
                        currentView === 'financial' ? 'rounded-2xl' : 'container-style'
                      }`}
                      style={currentView === 'financial' ? {
                        background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.3) 0%, rgba(71, 85, 105, 0.2) 50%, rgba(71, 85, 105, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(71, 85, 105, 0.4)',
                        boxShadow: '0 8px 32px rgba(71, 85, 105, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {}}>
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                               boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
                             }}>
                          <svg className="w-4 lg:w-5 h-4 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Finances</h4>
                          <p className="text-xs text-gray-300">${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)} invested</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => updateCurrentView('design-vault')}
                      className="block rounded-2xl p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden"
                      style={{
                        background: currentView === 'design-vault' 
                          ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.3) 0%, rgba(107, 114, 128, 0.2) 50%, rgba(107, 114, 128, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: currentView === 'design-vault' ? 'blur(25px) saturate(180%)' : 'blur(12px)',
                        border: currentView === 'design-vault' 
                          ? '1px solid rgba(107, 114, 128, 0.4)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: currentView === 'design-vault'
                          ? '0 8px 32px rgba(107, 114, 128, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                          : '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                               boxShadow: '0 4px 12px rgba(236, 72, 153, 0.15)'
                             }}>
                          <svg className="w-4 lg:w-5 h-4 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Designs</h4>
                          <p className="text-xs text-gray-300">Manage designs</p>
                        </div>
                      </div>
                    </button>

                    {/* Mobile Proof Review Button */}
                    <button 
                      onClick={() => updateCurrentView('proofs')}
                      className={`lg:hidden block p-3 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden ${currentView === 'proofs' ? 'rounded-2xl' : 'container-style'}`}
                      style={currentView === 'proofs' ? {
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.25) 50%, rgba(249, 115, 22, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(249, 115, 22, 0.4)',
                        boxShadow: '0 8px 32px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #f97316, #fb923c)',
                               boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)'
                             }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs truncate">Proof Review</h4>
                          <p className="text-xs text-gray-300">
                            {orders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length} pending
                          </p>
                        </div>
                      </div>
                      {orders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length > 0 && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  </div>

                  {/* Secondary Actions - Hidden on mobile, shown at bottom */}
                  <div className="hidden lg:block space-y-3">


                    <button 
                      onClick={() => updateCurrentView('proofs')}
                      className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden ${currentView === 'proofs' ? 'rounded-2xl' : 'container-style'}`}
                      style={currentView === 'proofs' ? {
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.25) 50%, rgba(249, 115, 22, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(249, 115, 22, 0.4)',
                        boxShadow: '0 8px 32px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #f97316, #fb923c)',
                               boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)'
                             }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">Proofs</h4>
                          <p className="text-xs text-gray-300">Review designs</p>
                        </div>
                      </div>
                      {orders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length > 0 && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </button>

                    {/* Two-column layout for Get Support and Settings */}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={handleGetSupport}
                        className="container-style block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg"
                               style={{
                                 background: 'linear-gradient(135deg, #ef4444, #f87171)',
                                 boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                               }}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">Get Support</h4>
                            <p className="text-xs text-gray-300">Contact ground crew</p>
                          </div>
                        </div>
                      </button>

                      <Link 
                        href="/account/settings"
                        className="container-style block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg"
                               style={{
                                 background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                 boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                               }}>
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">Settings</h4>
                            <p className="text-xs text-gray-300">Account preferences</p>
                          </div>
                        </div>
                      </Link>
                    </div>



                    {/* Logout Button */}
                    <button 
                      onClick={handleLogout}
                      className="container-style block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left mt-4 border-t border-white/10 pt-6 opacity-75 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #6b7280, #9ca3af)',
                               boxShadow: '0 4px 12px rgba(107, 114, 128, 0.15)'
                             }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">Log Out</h4>
                          <p className="text-xs text-gray-300">End session</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">
                  {renderMainContent()}
                </div>

                {/* Mobile Action Buttons - Bottom of page */}
                <div className="lg:hidden mt-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setCurrentView('design-vault')}
                      className={`block p-3 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden ${currentView === 'design-vault' ? 'rounded-2xl' : 'container-style'}`}
                      style={currentView === 'design-vault' ? {
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.4) 0%, rgba(236, 72, 153, 0.25) 50%, rgba(236, 72, 153, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(236, 72, 153, 0.4)',
                        boxShadow: '0 8px 32px rgba(236, 72, 153, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                               boxShadow: '0 4px 12px rgba(236, 72, 153, 0.15)'
                             }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs whitespace-nowrap">Designs</h4>
                          <p className="text-xs text-gray-300 truncate">Manage designs</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={handleGetSupport}
                      className="container-style block p-3 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #ef4444, #f87171)',
                               boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                             }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs whitespace-nowrap">Get Support</h4>
                          <p className="text-xs text-gray-300 truncate">Contact ground crew</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <button 
                    onClick={handleRaiseConcern}
                    className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg"
                           style={{
                             background: 'linear-gradient(135deg, #ef4444, #f87171)',
                             boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                           }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">⚠️ Raise a Concern</h4>
                        <p className="text-xs text-gray-300">Report an issue</p>
                      </div>
                    </div>
                  </button>

                  {/* Mobile Logout Button */}
                  <button 
                    onClick={handleLogout}
                    className="block rounded-2xl p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left mt-4 border-t border-white/10 pt-6 opacity-75 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.02) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg"
                           style={{
                             background: 'linear-gradient(135deg, #6b7280, #9ca3af)',
                             boxShadow: '0 4px 16px rgba(107, 114, 128, 0.3)'
                           }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <div>
                                                  <h4 className="font-semibold text-white text-sm">Log Out</h4>
                        <p className="text-xs text-gray-300">End session</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
               style={{
                 backgroundColor: 'rgba(3, 1, 64, 0.95)',
                 backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(255, 255, 255, 0.15)'
               }}>
            {contactSubmitted ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-2xl font-bold text-white mb-4">Message Sent!</h2>
                <p className="text-gray-300 mb-6">
                  Thanks for reaching out! Our ground crew will get back to you within 24 hours.
                </p>
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-gray-300">Closing automatically...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-2xl font-bold text-white">🛟 Ground Control Support</h2>
                  <button
                    onClick={() => setShowContactForm(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Close contact form"
                  >
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleContactSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={contactFormData.name}
                        onChange={handleContactChange}
                        required
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={contactFormData.email}
                        onChange={handleContactChange}
                        required
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={contactFormData.subject}
                      onChange={handleContactChange}
                      required
                      className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    >
                      <option value="" style={{ backgroundColor: '#030140', color: 'white' }}>Select a topic</option>
                      <option value="concern" style={{ backgroundColor: '#030140', color: 'white' }}>Raise a Concern</option>
                      <option value="order-issue" style={{ backgroundColor: '#030140', color: 'white' }}>Order Issue</option>
                      <option value="design-help" style={{ backgroundColor: '#030140', color: 'white' }}>Design Help</option>
                      <option value="shipping" style={{ backgroundColor: '#030140', color: 'white' }}>Shipping Question</option>
                      <option value="billing" style={{ backgroundColor: '#030140', color: 'white' }}>Billing Question</option>
                      <option value="technical" style={{ backgroundColor: '#030140', color: 'white' }}>Technical Support</option>
                      <option value="other" style={{ backgroundColor: '#030140', color: 'white' }}>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Related Order (Optional)
                    </label>
                    <div className="relative order-dropdown">
                      <button
                        type="button"
                        onClick={() => setShowOrderDropdown(!showOrderDropdown)}
                        className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <span className="text-left">
                          {contactFormData.relatedOrder ? 
                            (() => {
                              const selectedOrder = orders.find(order => order.id === contactFormData.relatedOrder);
                              return selectedOrder ? `Mission ${getOrderDisplayNumber(selectedOrder)} - ${new Date(selectedOrder.date).toLocaleDateString()} - $${selectedOrder.total}` : 'Select an order (optional)';
                            })() : 
                            'Select an order (optional)'
                          }
                        </span>
                        <svg className={`w-5 h-5 transition-transform ${showOrderDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showOrderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto"
                             style={{
                               backgroundColor: 'rgba(3, 1, 64, 0.95)',
                               backdropFilter: 'blur(20px)',
                               border: '1px solid rgba(255, 255, 255, 0.15)'
                             }}>
                          <div className="p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setContactFormData(prev => ({ ...prev, relatedOrder: '' }));
                                setShowOrderDropdown(false);
                              }}
                              className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors"
                            >
                              <span className="text-gray-300">No specific order</span>
                            </button>
                            
                            {orders.map((order) => (
                              <button
                                key={order.id}
                                type="button"
                                onClick={() => {
                                  setContactFormData(prev => ({ ...prev, relatedOrder: order.id }));
                                  setShowOrderDropdown(false);
                                }}
                                className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/10 p-1 flex items-center justify-center">
                                      <img 
                                        src={order.items[0].image} 
                                        alt={order.items[0].name}
                                        className="max-w-full max-h-full object-contain rounded"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-semibold text-white text-sm truncate">Mission {getOrderDisplayNumber(order)}</h4>
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                                        <span className="text-xs text-gray-300">{getStatusDisplayText(order.status)}</span>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-300 mb-1">
                                      {new Date(order.date).toLocaleDateString()} • ${order.total}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                      {order.items[0].name}
                                      {order.items.length > 1 && ` +${order.items.length - 1} more`}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={contactFormData.message}
                      onChange={handleContactChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                      placeholder="Tell us how we can help..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{
                        background: isSubmittingContact ? '#666' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        color: 'white'
                      }}
                    >
                      {isSubmittingContact ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          🚀 Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reorder Confirmation Popup */}
      {showReorderPopup && reorderOrderData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-xl p-6 max-w-md w-full shadow-xl relative"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowReorderPopup(false);
                setReorderOrderData(null);
                setRemovedRushItems(new Set());
                setRemovedItems(new Set());
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
              title="Close"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Reorder Confirmation</h3>
              <p className="text-gray-300 mb-4">
                Do you want to change anything about your order?
              </p>
              
                             {/* Order Summary */}
               <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                 <h4 className="font-semibold text-white mb-3">Order Summary:</h4>
                 <div className="space-y-4">
                   {reorderOrderData.items.map((item: any, index: number) => {
                     // Skip removed items
                     if (removedItems.has(index)) return null;
                     
                     // Get full item data if available
                     const itemData = reorderOrderData._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                     
                     return (
                       <div key={index} className="border border-white/10 rounded-lg p-3 relative">
                         {/* Remove Item Button */}
                         <button
                           onClick={() => handleRemoveItem(index)}
                           className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors duration-200 z-10"
                           title="Remove item from order"
                         >
                           <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                           </svg>
                         </button>
                         
                         <div className="flex items-start gap-3 mb-3">
                           <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                             {item.image || itemData.customFiles?.[0] ? (
                               <img 
                                 src={item.image || itemData.customFiles?.[0]} 
                                 alt={item.name || itemData.productName} 
                                 className="w-full h-full object-cover rounded" 
                               />
                             ) : (
                               <span className="text-xs">📄</span>
                             )}
                           </div>
                           <div className="flex-1">
                             <div className="text-white font-medium mb-1">
                               {itemData.productName || item.name}
                             </div>
                             <div className="text-gray-400 text-sm">
                               Qty: {itemData.quantity || item.quantity}
                             </div>
                             <div className="text-green-400 text-sm font-semibold">
                               ${(() => {
                                 const totalPrice = item.totalPrice || ((item.unitPrice || 0) * (item.quantity || 1));
                                 return isNaN(totalPrice) ? '0.00' : totalPrice.toFixed(2);
                               })()}
                             </div>
                           </div>
                         </div>
                         
                         {/* Item Details */}
                         <div className="grid grid-cols-2 gap-2 text-xs">
                           {(() => {
                             const selections = itemData.calculatorSelections || {};
                             const details = [];
                             
                             // Add size
                             if (selections.sizePreset?.displayValue || selections.size?.displayValue || item.size) {
                               details.push({
                                 label: 'Size',
                                 value: selections.sizePreset?.displayValue || selections.size?.displayValue || item.size,
                                 color: 'text-yellow-300'
                               });
                             }
                             
                             // Add cut/shape
                             if (selections.cut?.displayValue || selections.shape?.displayValue) {
                               details.push({
                                 label: 'Cut',
                                 value: selections.cut?.displayValue || selections.shape?.displayValue,
                                 color: 'text-green-300'
                               });
                             }
                             
                             // Add material
                             if (selections.material?.displayValue || item.material) {
                               details.push({
                                 label: 'Material',
                                 value: selections.material?.displayValue || item.material,
                                 color: 'text-purple-300'
                               });
                             }
                             
                             // Add white base option
                             if (selections.whiteOption?.displayValue || selections.whiteBase?.displayValue) {
                               let whiteBaseValue = selections.whiteOption?.displayValue || selections.whiteBase?.displayValue;
                               // Fix partial-white display
                               if (whiteBaseValue === 'partial-white') {
                                 whiteBaseValue = 'Partial White';
                               }
                               details.push({
                                 label: 'White Base',
                                 value: whiteBaseValue,
                                 color: 'text-gray-300'
                               });
                             }
                             
                             // Add proof option
                             if (selections.sendProof?.displayValue || selections.proof?.displayValue) {
                               details.push({
                                 label: 'Proof',
                                 value: selections.sendProof?.displayValue || selections.proof?.displayValue,
                                 color: 'text-blue-300'
                               });
                             }
                             
                             // Add rush order (only if not removed)
                             if (!removedRushItems.has(index) && (selections.rushOrder?.displayValue || selections.rush?.displayValue)) {
                               const rushValue = selections.rushOrder?.displayValue || selections.rush?.displayValue;
                               if (rushValue === 'Rush Order' || rushValue === 'rush' || rushValue === true) {
                                 details.push({
                                   label: 'Rush',
                                   value: 'Rush Order',
                                   color: 'text-orange-300',
                                   removable: true,
                                   itemIndex: index
                                 });
                               }
                             }
                             
                             return details.map((detail, idx) => (
                               <div key={idx} className="flex justify-between items-center">
                                 <span className="text-gray-400">{detail.label}:</span>
                                 <div className="flex items-center gap-2">
                                   <span className={detail.color}>{detail.value}</span>
                                   {detail.removable && (
                                     <button
                                       onClick={() => handleRemoveRushOrder(detail.itemIndex)}
                                       className="w-4 h-4 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors duration-200"
                                       title="Remove Rush Order"
                                     >
                                       <svg className="w-2.5 h-2.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                         <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                       </svg>
                                     </button>
                                   )}
                                 </div>
                               </div>
                             ));
                           })()}
                           
                           {/* Customer Notes */}
                           {(itemData.customerNotes || item.notes) && (
                             <div className="col-span-2 mt-2 pt-2 border-t border-white/10">
                               <div className="text-gray-400 text-xs mb-1">Notes:</div>
                               <div className="text-gray-300 text-xs italic">
                                 {itemData.customerNotes || item.notes}
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                   
                   {/* Show message if all items are removed */}
                   {reorderOrderData.items.every((_: any, index: number) => removedItems.has(index)) && (
                     <div className="text-sm text-gray-400 text-center py-4 border border-white/10 rounded-lg">
                       All items have been removed from this order
                     </div>
                   )}
                 </div>
                 
                 <div className="border-t border-white/10 mt-4 pt-3">
                   <div className="flex justify-between text-white font-semibold">
                     <span>Total:</span>
                     <span>${(() => {
                       const total = reorderOrderData.total || 0;
                       return isNaN(total) ? '0.00' : total.toFixed(2);
                     })()}</span>
                   </div>
                 </div>
               </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Keep Same - Tab Style Button */}
              <button
                onClick={() => handleReorderConfirm(false)}
                disabled={reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))}
                className="container-style w-full p-4 font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: reorderOrderData.items.every((_: any, index: number) => removedItems.has(index)) 
                    ? 'rgba(255, 255, 255, 0.02)' 
                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.4))',
                  borderColor: reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(34, 197, 94, 0.5)'
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                No, keep it the same
              </button>

              {/* Make Changes - Tab Style Button */}
              <button
                onClick={() => handleReorderConfirm(true)}
                disabled={reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))}
                className="container-style w-full p-4 font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2))',
                  borderColor: reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(245, 158, 11, 0.3)'
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Wait! Let me make changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Templates Popup */}
      {showBannerTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="max-w-4xl w-full max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{
              backgroundColor: 'rgba(3, 1, 64, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Choose Banner Template</h3>
                <button
                  onClick={() => setShowBannerTemplates(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
                  title="Close"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bannerTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="relative cursor-pointer group"
                    onClick={() => handleSelectBannerTemplate(template)}
                  >
                    {/* Template Preview */}
                    <div 
                      className="w-full h-24 rounded-lg border-2 border-white/20 hover:border-white/40 transition-all duration-200 transform hover:scale-105 relative overflow-hidden"
                      style={template.style}
                    >
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Template Name */}
                    <div className="mt-2 text-center">
                      <p className="text-white text-sm font-medium">{template.name}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowBannerTemplates(false)}
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

            </ErrorBoundary>
    </Layout>

    </>
      );
  }
  
  // Disable static generation for this page to prevent build-time GraphQL errors
  export async function getServerSideProps() {
    return {
      props: {}
    };
  }
  
  export default Dashboard;
