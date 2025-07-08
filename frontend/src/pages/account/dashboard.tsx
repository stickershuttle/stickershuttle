import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { getSupabase } from '../../lib/supabase';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useLazyQuery, useMutation, useQuery, useApolloClient } from '@apollo/client';
import { GET_ORDER_BY_ID } from '../../lib/order-mutations';

import { SYNC_CUSTOMER_TO_KLAVIYO } from '../../lib/klaviyo-mutations';
import { UPDATE_USER_PROFILE_PHOTO, UPDATE_USER_PROFILE_BANNER, GET_USER_PROFILE } from '../../lib/profile-mutations';
import { GET_WHOLESALE_CLIENTS, GET_CLIENT_ORDERS, CREATE_WHOLESALE_CLIENT, UPDATE_WHOLESALE_CLIENT, DELETE_WHOLESALE_CLIENT, ASSIGN_ORDER_TO_CLIENT, UNASSIGN_ORDER_FROM_CLIENT } from '../../lib/wholesale-client-mutations';
import { GET_USER_CREDIT_BALANCE, GET_UNREAD_CREDIT_NOTIFICATIONS, MARK_CREDIT_NOTIFICATIONS_READ } from '../../lib/credit-mutations';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useCart } from '../../components/CartContext';
import { generateCartItemId, CartItem } from '../../types/product';
import { 
  calculateRealPrice, 
  loadRealPricingData
} from '../../utils/real-pricing';
import OrderProgressTracker from '../../components/OrderProgressTracker';
import { useReorderHandler } from '../../hooks/useReorderHandler';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import AIFileImage from '../../components/AIFileImage';

// Dashboard Tab Components
import DefaultView from '../../components/dashboard/tabs/DefaultView';
import AllOrdersView from '../../components/dashboard/tabs/AllOrdersView';
import FinancialView from '../../components/dashboard/tabs/FinancialView';
import ItemsAnalysisView from '../../components/dashboard/tabs/ItemsAnalysisView';
import DesignVaultView from '../../components/dashboard/tabs/DesignVaultView';
import ClientsView from '../../components/dashboard/tabs/ClientsView';
import ProofsView from '../../components/dashboard/tabs/ProofsView';
import SettingsView from '../../components/dashboard/tabs/SettingsView';
import SupportView from '../../components/dashboard/tabs/SupportView';
import OrderDetailsView from '../../components/dashboard/tabs/OrderDetailsView';
import OrderDetailsPopupView from '../../components/dashboard/tabs/OrderDetailsPopupView';
import ProofReviewInterface from '../../components/dashboard/ProofReviewInterface';

// Mutation to update proof status
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

// Mutation to update proof file by customer
const UPDATE_PROOF_FILE_BY_CUSTOMER = gql`
  mutation UpdateProofFileByCustomer($orderId: ID!, $proofId: ID!, $newFileUrl: String!, $originalFileName: String!) {
    updateProofFileByCustomer(orderId: $orderId, proofId: $proofId, newFileUrl: $newFileUrl, originalFileName: $originalFileName) {
      id
      proof_status
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        status
        customerNotes
        adminNotes
        replaced
        replacedAt
        originalFileName
      }
    }
  }
`;

import useInvoiceGenerator, { InvoiceData } from '../../components/InvoiceGenerator';
import gql from 'graphql-tag';

type DashboardView = 'default' | 'all-orders' | 'financial' | 'items-analysis' | 'design-vault' | 'clients' | 'proofs' | 'order-details' | 'order-details-popup' | 'settings' | 'support';

function Dashboard() {
  const router = useRouter();
  const { addToCart } = useCart();
  const client = useApolloClient();
  const { handleReorder: reorderHandler } = useReorderHandler();
  
  // Create a debounced version of refreshOrders to prevent rapid API calls
  const debouncedRefreshOrders = useDebouncedCallback(() => {
    console.log('🔄 Debounced refresh triggered');
    refreshOrders();
  }, 3000); // 3 second debounce delay
  const [profile, setProfile] = useState<any>(null);
  const [cachedProfilePhoto, setCachedProfilePhoto] = useState<string | null>(null);
  const [profilePhotoLoading, setProfilePhotoLoading] = useState(true);
  const lastProfileActionTime = useRef<number>(0);
  
  // Terminal loader state
  const [showTerminalLoader, setShowTerminalLoader] = useState(false);
  const [terminalLoadingDots, setTerminalLoadingDots] = useState('');
  const [isTerminalTyping, setIsTerminalTyping] = useState(false);
  const [terminalOrderText, setTerminalOrderText] = useState('');
  
  // Use real dashboard data
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

  // Lazy query for fetching full order details
  const [getFullOrderDetails, { loading: orderDetailsLoading }] = useLazyQuery(GET_ORDER_BY_ID, {
    onCompleted: (data) => {
      if (data?.getOrderById) {
        console.log('📋 Full order details loaded:', data.getOrderById);
        setSelectedOrderForInvoice(data.getOrderById);
      }
    },
    onError: (error) => {
      console.error('❌ Error fetching order details:', error);
    }
  });

  // Add proof update mutations
  const [updateProofStatus] = useMutation(UPDATE_PROOF_STATUS, {
    onCompleted: () => {
      console.log('✅ Proof status updated, refreshing orders data...');
      // Use debounced refresh to prevent rapid API calls
      debouncedRefreshOrders();
    },
    onError: (error) => {
      console.error('Error updating proof status:', error);
      // Handle rate limiting
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        console.warn('🚦 Proof update rate limited');
        setActionNotification({
          message: 'Too many requests - please wait before trying again',
          type: 'warning'
        });
      }
    }
  });

  const [updateProofFileByCustomer] = useMutation(UPDATE_PROOF_FILE_BY_CUSTOMER, {
    onCompleted: () => {
      console.log('✅ Proof file updated by customer');
    },
    onError: (error) => {
      console.error('Error updating proof file:', error);
    }
  });
  
  // Credit queries and mutations  
  const [creditLoading, setCreditLoading] = useState(false);
  const [animatedCreditBalance, setAnimatedCreditBalance] = useState<number | null>(null);
  
  // Credit queries
  const { data: creditBalanceData, refetch: refetchCreditBalance } = useQuery(GET_USER_CREDIT_BALANCE, {
    variables: { userId: (user as any)?.id },
    skip: !(user as any)?.id,
    onCompleted: (data) => {
      if (data?.getUserCreditBalance) {
        setCreditBalance(data.getUserCreditBalance.balance || 0);
      }
    }
  });
  
  const { data: creditNotificationsData, refetch: refetchCreditNotifications } = useQuery(GET_UNREAD_CREDIT_NOTIFICATIONS, {
    variables: { userId: (user as any)?.id },
    skip: !(user as any)?.id,
    pollInterval: 30000, // Check every 30 seconds
    onCompleted: (data) => {
      if (data?.getUnreadCreditNotifications) {
        setCreditNotifications(data.getUnreadCreditNotifications);
        if (data.getUnreadCreditNotifications.length > 0) {
          setShowCreditNotification(true);
        }
      }
    }
  });
  
  const [markCreditNotificationAsRead] = useMutation(MARK_CREDIT_NOTIFICATIONS_READ);
  
  // Klaviyo integration
  const [syncToKlaviyo] = useMutation(SYNC_CUSTOMER_TO_KLAVIYO);

  // Wholesale client management queries and mutations
  const [getWholesaleClients] = useLazyQuery(GET_WHOLESALE_CLIENTS, {
    onCompleted: (data) => {
      setWholesaleClients(data.getWholesaleClients || []);
      setClientsLoading(false);
    },
    onError: (error) => {
      console.error('Error fetching wholesale clients:', error);
      setClientsLoading(false);
    }
  });

  const [getClientOrders] = useLazyQuery(GET_CLIENT_ORDERS, {
    onCompleted: (data) => {
      if (data.getClientOrders && expandedClient) {
        setClientOrders((prev: {[clientId: string]: any[]}) => ({
          ...prev,
          [expandedClient]: data.getClientOrders
        }));
      }
    },
    onError: (error) => {
      console.error('Error fetching client orders:', error);
    }
  });

  const [createWholesaleClient] = useMutation(CREATE_WHOLESALE_CLIENT, {
    onCompleted: (data) => {
      if (data.createWholesaleClient.success) {
        setWholesaleClients((prev: any[]) => [...prev, data.createWholesaleClient.client]);
        setShowCreateClientForm(false);
        setNewClientData({
          clientName: '',
          clientEmail: '',
          clientPhone: '',
          clientCompany: '',
          clientAddress: '',
          notes: ''
        });
        setActionNotification({
          message: 'Client created successfully!',
          type: 'success'
        });
      }
      setCreatingClient(false);
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      setCreatingClient(false);
      setActionNotification({
        message: 'Failed to create client',
        type: 'error'
      });
    }
  });

  const [updateWholesaleClient] = useMutation(UPDATE_WHOLESALE_CLIENT);
  const [deleteWholesaleClient] = useMutation(DELETE_WHOLESALE_CLIENT);
  
  // Order assignment mutations
  const [assignOrderToClient] = useMutation(ASSIGN_ORDER_TO_CLIENT, {
    onCompleted: (data) => {
      if (data.assignOrderToClient.success) {
        setActionNotification({
          message: `Order assigned successfully!`,
          type: 'success'
        });
        // Use debounced refresh
        debouncedRefreshOrders();
        if (expandedClient) {
          // Delay client orders fetch slightly to avoid concurrent requests
          setTimeout(() => {
            getClientOrders({ variables: { clientId: expandedClient } });
          }, 1000);
        }
      }
    },
    onError: (error) => {
      console.error('Error assigning order:', error);
      // Handle rate limiting
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        setActionNotification({
          message: 'Too many requests - please wait before trying again',
          type: 'error'
        });
      } else {
        setActionNotification({
          message: 'Failed to assign order',
          type: 'error'
        });
      }
    }
  });
  
  const [unassignOrderFromClient] = useMutation(UNASSIGN_ORDER_FROM_CLIENT, {
    onCompleted: (data) => {
      if (data.unassignOrderFromClient.success) {
        setActionNotification({
          message: `Order unassigned successfully!`,
          type: 'success'
        });
        // Use debounced refresh
        debouncedRefreshOrders();
        if (expandedClient) {
          // Delay client orders fetch slightly to avoid concurrent requests
          setTimeout(() => {
            getClientOrders({ variables: { clientId: expandedClient } });
          }, 1000);
        }
      }
    },
    onError: (error) => {
      console.error('Error unassigning order:', error);
      // Handle rate limiting
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        setActionNotification({
          message: 'Too many requests - please wait before trying again',
          type: 'error'
        });
      } else {
        setActionNotification({
          message: 'Failed to unassign order',
          type: 'error'
        });
      }
    }
  });

  // Fetch user profile to check wholesale status
  const { data: profileData, refetch: refetchProfile } = useQuery(GET_USER_PROFILE, {
    variables: { userId: (user as any)?.id },
    skip: !(user as any)?.id,
    fetchPolicy: 'cache-first', // Use cache to reduce API calls
    nextFetchPolicy: 'cache-first', // Keep using cache after initial load
    errorPolicy: 'all',
    pollInterval: 0, // Disable polling
    onCompleted: (data: any) => {
      if (data?.getUserProfile) {
        setProfile(data.getUserProfile);
        if (data.getUserProfile.profile_photo_url) {
          setCachedProfilePhoto(data.getUserProfile.profile_photo_url);
          localStorage.setItem('userProfilePhoto', data.getUserProfile.profile_photo_url);
        }
        setProfilePhotoLoading(false);
      }
    },
    onError: (error) => {
      console.error('❌ Profile query error:', error);
      setProfilePhotoLoading(false);
      
      // Handle rate limiting gracefully
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        console.warn('🚦 Profile query rate limited - using cached data');
        
        // Try to use cached profile photo if available
        const cachedPhoto = localStorage.getItem('userProfilePhoto');
        if (cachedPhoto) {
          setCachedProfilePhoto(cachedPhoto);
          console.log('✅ Using cached profile photo during rate limit');
        }
        
        // Set a basic profile object to maintain functionality
        if (!profile) {
          setProfile({
            profile_photo_url: cachedPhoto,
            firstName: (user as any)?.user_metadata?.first_name || '',
            lastName: (user as any)?.user_metadata?.last_name || '',
            email: (user as any)?.email || ''
          });
        }
      } else {
        console.error('❌ Profile query failed with non-rate-limit error:', error);
        
        // Still try to maintain basic functionality
        const cachedPhoto = localStorage.getItem('userProfilePhoto');
        if (cachedPhoto) {
          setCachedProfilePhoto(cachedPhoto);
        }
      }
    }
  });

  // State management
  const [uploadingFile, setUploadingFile] = useState(false);
  const [stagedFile, setStagedFile] = useState<{
    file: File;
    preview: string;
    cloudinaryUrl?: string;
    orderId: string;
    proofId: string;
    cutContourInfo?: any;
    uploadedFile?: any;
  } | null>(null);
  const [replacementSent, setReplacementSent] = useState<{[key: string]: boolean}>({});
  const [uploadProgress, setUploadProgress] = useState<{ percentage: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const orders: any[] = realOrders || [];
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
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, boolean>>({});
  const [actionNotification, setActionNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  const [recordingMode, setRecordingMode] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  const [selectedOrderForPopup, setSelectedOrderForPopup] = useState<any>(null);
  const [sellingPrices, setSellingPrices] = useState<{[orderId: string]: number}>({});
  const [showOrderCompleteMessage, setShowOrderCompleteMessage] = useState(false);
  const [selectedDesignImage, setSelectedDesignImage] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<any>(null);
  const [expandedPillButton, setExpandedPillButton] = useState<string | null>(null);

  // Settings view state
  const [settingsData, setSettingsData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [settingsNotification, setSettingsNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showBannerTemplates, setShowBannerTemplates] = useState(false);
  
  // Banner templates data
  const bannerTemplates = [
    // New Perfect Default Template - Galactic Vista
    {
      id: 1,
      name: 'Galactic Vista (Default)',
      category: 'cosmic',
      isDefault: true,
      style: {
        backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750883615/261355a9-3a2b-48d8-ad79-08ce1407d61b.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        animation: 'none'
      }
    },

    // Stellar Void - Second Option
    {
      id: 2,
      name: 'Stellar Void',
      category: 'cosmic',
      isDefault: false,
      style: {
        background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4a 25%, #2d1b6b 50%, #4c1d95 75%, #7c3aed 100%)',
        backgroundImage: `
          radial-gradient(ellipse at 25% 30%, rgba(139, 92, 246, 0.5) 0%, transparent 60%),
          radial-gradient(ellipse at 75% 70%, rgba(124, 58, 237, 0.4) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
          radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.18) 1px, transparent 1px)
        `,
        backgroundSize: '200% 200%, 200% 200%, 200% 200%, 100px 100px, 150px 150px, 80px 80px',
        animation: 'stellar-drift 8s ease-in-out infinite',
        backgroundPosition: '0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%'
      }
    },

    // Space/NASA Templates
    {
      id: 12,
      name: 'ISS Space Station View',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://images-assets.nasa.gov/image/iss073e0204297/iss073e0204297~orig.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    },
    {
      id: 13,
      name: 'Earth from Space',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://images-assets.nasa.gov/image/a-sky-view-of-earth-from-suomi-npp_16611703184_o/a-sky-view-of-earth-from-suomi-npp_16611703184_o~orig.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    },
    {
      id: 14,
      name: 'Orbital Station',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://images-assets.nasa.gov/image/iss040e080833/iss040e080833~orig.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    },
    {
      id: 15,
      name: 'Cosmic Nebula',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001863/GSFC_20171208_Archive_e001863~orig.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    },
    {
      id: 16,
      name: 'Deep Space Field',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001283/GSFC_20171208_Archive_e001283~orig.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    },
    {
      id: 17,
      name: 'Stellar Portal',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750882296/14ed8220-f009-4393-95c4-30d05aabb2ef.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        animation: 'none'
      }
    },
    {
      id: 18,
      name: 'Home Sweet Home',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750047799/ffa6f149-a6c6-4656-b721-3384d1f5b61a.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        animation: 'none'
      }
    },
    {
      id: 19,
      name: 'Cosmic Horizon',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750883812/23405df7-ea7d-47b6-81b2-c16dbb950f31.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        animation: 'none'
      }
    },
    {
      id: 20,
      name: 'Space Mission 51A',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://images-assets.nasa.gov/image/51A-90014/51A-90014~medium.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 10%',
        backgroundRepeat: 'no-repeat'
      }
    },
    {
      id: 21,
      name: 'Spacewalk EVA',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://www.nasa.gov/wp-content/uploads/2025/05/54491190142-00f171b6dd-o.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    },
    {
      id: 22,
      name: 'Cosmic Archive',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001983/GSFC_20171208_Archive_e001983~medium.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    }
  ];
  
  // Credit system state - COMMENTED OUT FOR REBUILD
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [previousCreditBalance, setPreviousCreditBalance] = useState<number>(0);
  const [creditNotifications, setCreditNotifications] = useState<any[]>([]);
  const [lifetimeCredits, setLifetimeCredits] = useState<number>(0);
  const [showCreditNotification, setShowCreditNotification] = useState(false);
  const [showAnimatedCounter, setShowAnimatedCounter] = useState(false);

  // Fetch credit data function
  const fetchCreditData = async () => {
    if (creditBalanceData) {
      refetchCreditBalance();
    }
    if (creditNotificationsData) {
      refetchCreditNotifications();
    }
  };

  // Wholesale client management state
  const [wholesaleClients, setWholesaleClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientOrders, setClientOrders] = useState<{[clientId: string]: any[]}>({});
  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientCompany: '',
    clientAddress: '',
    notes: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);
  
  // Order assignment state
  const [selectedClientForOrders, setSelectedClientForOrders] = useState<string | null>(null);
  const [selectedOrdersForAssignment, setSelectedOrdersForAssignment] = useState<Set<string>>(new Set());
  const [assigningOrders, setAssigningOrders] = useState(false);

  // Add invoice data state and hook at top level
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  
  // Call the hook at the top level with a default value
  const { generatePrintPDF, generateDownloadPDF } = useInvoiceGenerator(invoiceData || {
    orderNumber: '',
    orderDate: new Date().toISOString(),
    orderStatus: '',
    totalPrice: 0,
    currency: 'USD',
    subtotal: 0,
    tax: 0,
    shipping: 0,
    items: []
  });

  // Load cached profile photo on mount
  useEffect(() => {
    const cachedPhoto = localStorage.getItem('userProfilePhoto');
    if (cachedPhoto) {
      setCachedProfilePhoto(cachedPhoto);
    }
    setProfilePhotoLoading(false);
  }, []);

  // Enhanced avatar assignment function that works even with rate limiting
  const handleAssignRandomAvatar = async () => {
    if (!user || !confirm('Are you sure you want to reset your profile photo to a different random avatar?')) return;
    
    setUploadingProfilePhoto(true);
    try {
      // Get a random default avatar
      const { getRandomAvatar } = await import('../../utils/avatars');
      const randomAvatar = getRandomAvatar();
      console.log('🎭 Assigning new random avatar:', randomAvatar);

      const supabase = await getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .update({
          profile_photo_url: randomAvatar,
          profile_photo_public_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', (user as any).id);

      if (error) {
        console.error('❌ Database update failed:', error);
        throw error;
      }

      // Update local state immediately
      setProfile((prev: any) => ({
        ...prev,
        profile_photo_url: randomAvatar,
        profile_photo_public_id: null
      }));
      
      // Update cached photo
      setCachedProfilePhoto(randomAvatar);
      localStorage.setItem('userProfilePhoto', randomAvatar);

      // Broadcast profile update to other components (like UniversalHeader)
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: {
          profile_photo_url: randomAvatar,
          profile_photo_public_id: null
        }
      }));
      
      setSettingsNotification({
        message: 'Profile photo updated with new random avatar',
        type: 'success'
      });
      setTimeout(() => setSettingsNotification(null), 3000);
      
      console.log('✅ Random avatar assigned successfully');
    } catch (error) {
      console.error('❌ Error assigning random avatar:', error);
      setSettingsNotification({
        message: 'Failed to update profile photo. Please try again.',
        type: 'error'
      });
      setTimeout(() => setSettingsNotification(null), 3000);
    } finally {
      setUploadingProfilePhoto(false);
    }
  };

  // Enhanced avatar assignment for first-time users
  const handleAssignInitialAvatar = async () => {
    if (!user) return;
    
    try {
      // Get a random default avatar
      const { getRandomAvatar } = await import('../../utils/avatars');
      const randomAvatar = getRandomAvatar();
      console.log('🎭 Assigning initial random avatar:', randomAvatar);

      const supabase = await getSupabase();
      
      // First ensure user profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', (user as any).id)
        .single();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: (user as any).id,
            profile_photo_url: randomAvatar,
            profile_photo_public_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Failed to create profile:', insertError);
          throw insertError;
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            profile_photo_url: randomAvatar,
            profile_photo_public_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', (user as any).id);

        if (updateError) {
          console.error('❌ Failed to update profile:', updateError);
          throw updateError;
        }
      }

      // Update local state
      setProfile((prev: any) => ({
        ...prev,
        profile_photo_url: randomAvatar,
        profile_photo_public_id: null
      }));
      
      // Update cached photo
      setCachedProfilePhoto(randomAvatar);
      localStorage.setItem('userProfilePhoto', randomAvatar);

      console.log('✅ Initial avatar assigned successfully');
    } catch (error) {
      console.error('❌ Error assigning initial avatar:', error);
      
      // Still cache the avatar locally even if database fails
      const { getRandomAvatar } = await import('../../utils/avatars');
      const randomAvatar = getRandomAvatar();
      setCachedProfilePhoto(randomAvatar);
      localStorage.setItem('userProfilePhoto', randomAvatar);
    }
  };

  // Auto-assign avatar if user doesn't have one
  useEffect(() => {
    if (user && !profilePhotoLoading && !cachedProfilePhoto && !profile?.profile_photo_url) {
      // Small delay to avoid rapid calls
      const timer = setTimeout(() => {
        handleAssignInitialAvatar();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, profilePhotoLoading, cachedProfilePhoto, profile?.profile_photo_url]);

  // Check for order completion on mount
  useEffect(() => {
    const orderComplete = router.query.orderComplete === 'true';
    if (orderComplete) {
      setShowOrderCompleteMessage(true);
      // Clean up the URL
      const { orderComplete, ...restQuery } = router.query;
      router.replace({
        pathname: router.pathname,
        query: restQuery
      }, undefined, { shallow: true });
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setShowOrderCompleteMessage(false);
      }, 10000);
    }
  }, [router.query.orderComplete]);

  // Fetch credit data when user is available
  useEffect(() => {
    // Add a small delay to prevent multiple rapid calls
    const timeoutId = setTimeout(() => {
      if ((user as any)?.id) {
        fetchCreditData();
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [(user as any)?.id]);

  // Terminal loader effect with complete text system
  useEffect(() => {
    // Reset terminal state completely
    setShowTerminalLoader(false);
    setIsTerminalTyping(false);
    setTerminalOrderText('');
    setTerminalLoadingDots('');

    // Clear any existing intervals/timeouts more comprehensively
    const clearAllTimers = () => {
      if ((window as any).launchInterval) {
        clearInterval((window as any).launchInterval);
        delete (window as any).launchInterval;
      }
      if ((window as any).adjustInterval) {
        clearInterval((window as any).adjustInterval);
        delete (window as any).adjustInterval;
      }
      if ((window as any).adjustTimeout) {
        clearTimeout((window as any).adjustTimeout);
        delete (window as any).adjustTimeout;
      }
      if ((window as any).launchTimeout) {
        clearTimeout((window as any).launchTimeout);
        delete (window as any).launchTimeout;
      }
      if ((window as any).financialTimeout) {
        clearTimeout((window as any).financialTimeout);
        delete (window as any).financialTimeout;
      }
      if ((window as any).designTimeout) {
        clearTimeout((window as any).designTimeout);
        delete (window as any).designTimeout;
      }
      if ((window as any).ordersTimeout) {
        clearTimeout((window as any).ordersTimeout);
        delete (window as any).ordersTimeout;
      }
      if ((window as any).mainTypeInterval) {
        clearInterval((window as any).mainTypeInterval);
        delete (window as any).mainTypeInterval;
      }
      if ((window as any).dotsInterval) {
        clearInterval((window as any).dotsInterval);
        delete (window as any).dotsInterval;
      }
    };

    clearAllTimers();
    
    // Small delay to ensure clean state
    setTimeout(() => {
      setShowTerminalLoader(true);
    }, 50);
    
    // Loading dots animation
    const dotsInterval = setInterval(() => {
      setTerminalLoadingDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    // Store the interval for cleanup
    (window as any).dotsInterval = dotsInterval;
    
    // After initial delay, start typing effect with specific messages per view
    const typingTimeout = setTimeout(() => {
      setIsTerminalTyping(true);
      clearInterval(dotsInterval);
      if ((window as any).dotsInterval) {
        clearInterval((window as any).dotsInterval);
        delete (window as any).dotsInterval;
      }
      
      let orderText = '';
      
      // Helper function to type out text character by character
      const typeText = (text: string, startingText: string = '') => {
        setTerminalOrderText(startingText);
        let charIndex = 0;
        let currentText = startingText;
        
        const typeInterval = setInterval(() => {
          if (charIndex < text.length) {
            const currentChar = text[charIndex];
            if (currentChar !== undefined) {
              currentText += currentChar;
              setTerminalOrderText(currentText);
            }
            charIndex++;
          } else {
            clearInterval(typeInterval);
            if ((window as any).mainTypeInterval) {
              delete (window as any).mainTypeInterval;
            }
          }
        }, 30);
        
        // Store the interval for cleanup
        (window as any).mainTypeInterval = typeInterval;
        return typeInterval;
      };
      
      // Determine message based on current view
      switch (currentView) {
        case 'default':
          if (orders.length > 0) {
            const lastOrder = orders[0];
            const orderNum = lastOrder.orderNumber || lastOrder.id || 'N/A';
            const displayStatus = getStatusDisplayText(lastOrder.status).toUpperCase();
            const trackingStatus = lastOrder.trackingNumber ? 'TRACKED' : 'PENDING';
            
            orderText = `> ORDER #${orderNum}\n> STATUS: ${displayStatus}\n> TRACKING: ${trackingStatus}`;
          } else {
            orderText = '> NO MISSIONS DETECTED\n> CLICK THE START NEW MISSION BUTTON BELOW';
          }
          break;
          
        case 'all-orders':
          orderText = '> LOADING ORDERS...';
          // After typing LOADING ORDERS..., show order list with typing effect
          const ordersTimeout = setTimeout(() => {
            let ordersDisplay = '';
            if (orders.length > 0) {
              // Show last 3 orders
              const recentOrders = orders.slice(0, 3);
              recentOrders.forEach((order) => {
                const orderNum = order.orderNumber || order.id || 'N/A';
                ordersDisplay += `\n> ORDER #${orderNum}`;
              });
              
              // Show +X more if there are more than 3
              if (orders.length > 3) {
                ordersDisplay += `\n> +${orders.length - 3} MORE`;
              }
            } else {
              ordersDisplay = '\n> NO ORDERS FOUND';
            }
            typeText(ordersDisplay, '> LOADING ORDERS...');
          }, 400);
          
          (window as any).ordersTimeout = ordersTimeout;
          break;
          
        case 'financial':
          orderText = '> LOADING FINANCES...';
          // After typing LOADING FINANCES..., show financial info with typing effect
          const financialTimeout = setTimeout(() => {
            // Calculate total stickers from all orders
            let totalStickers = 0;
            let totalInvested = 0;
            orders.forEach(order => {
              order.items?.forEach((item: any) => {
                totalStickers += item.quantity || 0;
              });
              totalInvested += order.total || 0;
            });
            
            const financialDisplay = `\n> $${creditBalance.toFixed(2)} STORE CREDIT\n> $${totalInvested.toFixed(2)} TOTAL INVESTED\n> ${totalStickers} STICKERS PRINTED`;
            typeText(financialDisplay, '> LOADING FINANCES...');
          }, 400);
          
          (window as any).financialTimeout = financialTimeout;
          break;
          
        case 'design-vault':
          orderText = '> DESIGNS LOADING...';
          // After typing DESIGNS LOADING..., show design count with typing effect
          const designTimeout = setTimeout(() => {
            // Count unique designs from orders
            const uniqueDesigns = new Set();
            orders.forEach(order => {
              order.items?.forEach((item: any) => {
                if (item.name && item.image) {
                  uniqueDesigns.add(item.name);
                }
              });
            });
            
            const designCount = uniqueDesigns.size;
            const designWord = designCount === 1 ? 'DESIGN' : 'DESIGNS';
            const designDisplay = `\n> ${designCount} ${designWord} IN THE CLOUD`;
            typeText(designDisplay, '> DESIGNS LOADING...');
          }, 400);
          
          (window as any).designTimeout = designTimeout;
          break;
          
        case 'proofs':
          // Check if there are proofs to review
          const proofsToReview = orders.filter((order: any) => 
            (order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes') &&
            order.proof_status !== 'changes_requested'
          );
          
          if (proofsToReview.length > 0) {
            orderText = '> MISSION ALERT: YOU HAVE PROOF(S) TO APPROVE. ACT NOW!';
          } else {
            // Check if all proofs are approved
            const hasApprovedProofs = orders.some((order: any) => 
              order.status === 'Proof Approved' || order.proof_status === 'approved'
            );
            
            if (hasApprovedProofs) {
              orderText = '> VINNY: ALL SYSTEMS CLEAR, READY TO LAUNCH.\n> COMMAND: LAUNCHING';
              // Add cycling dots for LAUNCHING after typing
              const launchTimeout = setTimeout(() => {
                let dots = '';
                const launchInterval = setInterval(() => {
                  dots = dots.length >= 3 ? '.' : dots + '.';
                  setTerminalOrderText(`> VINNY: ALL SYSTEMS CLEAR, READY TO LAUNCH.\n> COMMAND: LAUNCHING${dots}`);
                }, 500);
                
                (window as any).launchInterval = launchInterval;
              }, 3000);
              
              (window as any).launchTimeout = launchTimeout;
            } else {
              orderText = '> NO MISSIONS AVAILABLE.';
            }
          }
          break;
          
        case 'support':
          orderText = '> COMMAND: HELP! REQUESTING BACKUP!\n> VINNY: WE\'RE COMING IN, COMMAND, HANG TIGHT.';
          break;
          
        case 'settings':
          orderText = '> ADJUSTING PANELS';
          // Add cycling dots and second message after typing
          const adjustTimeout = setTimeout(() => {
            let dots = '';
            const adjustInterval = setInterval(() => {
              dots = dots.length >= 3 ? '.' : dots + '.';
              setTerminalOrderText(`> ADJUSTING PANELS${dots}\n> TWEAKING FLIGHT PATTERNS...`);
            }, 500);
            
            (window as any).adjustInterval = adjustInterval;
          }, 500);
          
          (window as any).adjustTimeout = adjustTimeout;
          break;
          
        default:
          orderText = '> SYSTEM READY';
      }
      
      // Type out the initial message character by character
      const mainTypeInterval = typeText(orderText);
      
      // Terminal stays visible - no auto-hide behavior
      
      return () => clearInterval(mainTypeInterval);
    }, 300);
    
    return () => {
      clearInterval(dotsInterval);
      clearTimeout(typingTimeout);
      // Clear all timers comprehensively
      clearAllTimers();
    };
  }, [currentView, orders, creditBalance]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login?redirect=/account/dashboard');
    }
  }, [loading, isLoggedIn, router]);

  // Handle current view changes
  const setCurrentViewString = (view: string) => {
    setCurrentView(view as DashboardView);
  };

  // Handle URL query parameters for view navigation - respond to URL changes
  useEffect(() => {
    // Run when router is ready or when query changes
    if (router.isReady) {
      const requestedView = router.query.view as string;
      const orderNumber = router.query.orderNumber as string;
      
      if (requestedView) {
        const validViews: DashboardView[] = ['default', 'all-orders', 'financial', 'items-analysis', 'design-vault', 'clients', 'proofs', 'order-details', 'order-details-popup', 'settings', 'support'];
        
        if (validViews.includes(requestedView as DashboardView)) {
          // Only update if the view is actually different
          if (currentView !== requestedView) {
            setCurrentView(requestedView as DashboardView);
          }
        }
      } else {
        // If no view query parameter, default to 'default'
        if (currentView !== 'default') {
          setCurrentView('default');
        }
      }
    }
  }, [router.isReady, router.query.view, router.query.orderNumber]); // Listen for URL changes

  // Separate effect to handle order selection based on current view
  useEffect(() => {
    // Clear selected order if not on order-details view
    if (currentView !== 'order-details' && currentView !== 'order-details-popup' && selectedOrderForInvoice) {
      setSelectedOrderForInvoice(null);
    }
  }, [currentView, selectedOrderForInvoice]);

  // Helper function to update view and URL
  const updateCurrentView = (view: DashboardView) => {
    // If already on the same view, do nothing
    if (currentView === view) return;
    
    // Update URL first, then let the router effect handle the state update
    if (typeof window !== 'undefined') {
      let url = '/account/dashboard';
      const params = new URLSearchParams();
      
      if (view !== 'default') {
        params.set('view', view);
      }
      
      // Preserve orderNumber if we're on order-details view
      if (view === 'order-details' && selectedOrderForInvoice) {
        params.set('orderNumber', selectedOrderForInvoice.orderNumber || selectedOrderForInvoice.id);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      // Use router.push for proper Next.js navigation
      router.push(url, undefined, { shallow: true });
    }
  };

  // Load wholesale clients when user is a wholesale customer (with rate limiting protection)
  React.useEffect(() => {
    if (!loading && profile && (user as any)?.id && wholesaleClients.length === 0 && !clientsLoading) {
      const isWholesaleApproved = profile.wholesale_status === 'approved' || 
                                profile.wholesaleStatus === 'approved' || 
                                profile.isWholesaleCustomer;
      
      if (isWholesaleApproved) {
        setClientsLoading(true);
        
        // Add delay to prevent rate limiting
        const timeoutId = setTimeout(() => {
          getWholesaleClients({ 
            variables: { userId: (user as any).id },
            errorPolicy: 'all',
            fetchPolicy: 'cache-first' // Use cache to reduce API calls
          }).then(() => {
            setClientsLoading(false);
          }).catch((error: any) => {
            console.warn('Wholesale clients fetch failed:', error);
            setClientsLoading(false);
            
            // Don't retry on rate limit errors - let user manually refresh if needed
            if (error?.message?.includes('429') || error?.message?.includes('rate')) {
              console.warn('🚦 Wholesale clients rate limited - will not retry');
            }
          });
        }, 2000); // 2 second delay to spread out initial requests
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [loading, profile, (user as any)?.id, clientsLoading]);

  // Handler functions
  const handleReorder = async (orderId: string) => {
    // Find the order data
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      alert('Order not found');
      return;
    }
    
    setReorderingId(orderId);
    
    try {
      // Add each item to cart directly
      order._fullOrderData?.items?.forEach((fullItem: any, index: number) => {
        const selections = fullItem.calculatorSelections || {};
        const quantity = fullItem.quantity || 1;
        const unitPrice = fullItem.unitPrice || fullItem.unit_price || 0;
        const totalPrice = fullItem.totalPrice || fullItem.total_price || 0;
          
        // Create cart item
        const cartItem = {
          id: generateCartItemId(),
          product: {
            id: fullItem.productCategory || 'vinyl-stickers',
            sku: `REORDER-${orderId}-${index}`,
            name: fullItem.productName || fullItem.product_name || 'Custom Stickers',
            description: `Reordered ${fullItem.productName || fullItem.product_name || 'Custom Stickers'}`,
            shortDescription: 'Reordered item',
            category: (fullItem.productCategory || 'vinyl-stickers') as any,
            basePrice: unitPrice,
            images: fullItem.customFiles || ['https://res.cloudinary.com/dxcnvqk6b/image/upload/v1747860831/samples/sticker-default.png'],
            defaultImage: fullItem.customFiles?.[0] || 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1747860831/samples/sticker-default.png',
            features: ['Custom Design', 'High Quality'],
            customizable: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          customization: {
            productId: fullItem.productCategory || 'vinyl-stickers',
            selections: {
              size: {
                type: 'size-preset' as const,
                value: selections.size?.value || selections.sizePreset?.value || 'Medium (3")',
                displayValue: selections.size?.displayValue || selections.sizePreset?.displayValue || 'Medium (3")',
                priceImpact: 0
              },
              material: {
                type: 'finish' as const,
                value: selections.material?.value || 'Matte',
                displayValue: selections.material?.displayValue || 'Matte',
                priceImpact: 0
              },
              cut: {
                type: 'shape' as const,
                value: selections.cut?.value || selections.shape?.value || 'Custom Shape',
                displayValue: selections.cut?.displayValue || selections.shape?.displayValue || 'Custom Shape',
                priceImpact: 0
              },
              proof: {
                type: 'finish' as const,
                value: true,
                displayValue: 'Send Proof',
                priceImpact: 0
              },
              rush: {
                type: 'finish' as const,
                value: selections.rush?.value || false,
                displayValue: selections.rush?.value ? 'Rush Order' : 'Standard',
                priceImpact: 0
              },
              ...(selections.whiteOption && {
                whiteOption: {
                  type: 'white-base' as const,
                  value: selections.whiteOption.value,
                  displayValue: selections.whiteOption.displayValue,
                  priceImpact: 0
                }
              }),
              ...(selections.kissCut && {
                kissCut: {
                  type: 'finish' as const,
                  value: selections.kissCut.value,
                  displayValue: selections.kissCut.displayValue,
                  priceImpact: 0
                }
              })
            },
            totalPrice: totalPrice,
            customFiles: fullItem.customFiles || fullItem.custom_files || [],
            notes: fullItem.customerNotes || fullItem.customer_notes || '',
            isReorder: true
          },
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          addedAt: new Date().toISOString()
        };
        
        addToCart(cartItem);
      });
      
      // Reset reorder state
      setReorderingId(null);
      
      // Redirect to cart for checkout
      router.push('/cart');
      
    } catch (error) {
      console.error('Error adding reorder to cart:', error);
      setReorderingId(null);
      alert('Error adding items to cart. Please try again.');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...contactFormData,
          userId: (user as any)?.id,
          userEmail: (user as any)?.email
        }),
      });

      if (response.ok) {
        setContactSubmitted(true);
        setTimeout(() => {
          setShowContactForm(false);
          setContactSubmitted(false);
          setContactFormData({
            name: '',
            email: '',
            subject: '',
            message: '',
            relatedOrder: ''
          });
        }, 3000);
      } else {
        // Get more specific error information
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || 'Failed to send message. Please try again.';
        
        // Show error notification to user
        setActionNotification({
          message: errorMessage,
          type: 'error'
        });
        setTimeout(() => setActionNotification(null), 5000);
        
        console.error('Contact form submission failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Unable to reach our servers. Please check your internet connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      setActionNotification({
        message: errorMessage,
        type: 'error'
      });
      setTimeout(() => setActionNotification(null), 5000);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleViewOrderDetails = (order: any) => {
    // Log for debugging
    console.log('View Details clicked for order:', order);
    
    // Set the selected order for the details view
    setSelectedOrderForInvoice(order);
    
    // Set invoice data for PDF generation
    if (order) {
      const userEmail = (user as any)?.email || '';
      const userName = profile?.full_name || profile?.name || userEmail.split('@')[0] || 'Customer';
      
      setInvoiceData({
        orderNumber: order.orderNumber || order.id,
        id: order.id,
        orderDate: order.orderCreatedAt || order.created_at || order.date || new Date().toISOString(),
        orderStatus: order.orderStatus || order.status || 'Pending',
        totalPrice: parseFloat(order.totalPrice || order.total || '0'),
        currency: order.currency || 'USD',
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          productName: item.productName || item.name || 'Unknown Product',
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.price || '0') / (item.quantity || 1),
          totalPrice: parseFloat(item.price || '0'),
          customFiles: item.customFiles || [],
          calculatorSelections: item.calculatorSelections || {},
          customerNotes: item.customerNotes || ''
        })),
        trackingNumber: order.tracking_number || order.trackingNumber,
        trackingCompany: order.tracking_company || order.trackingCompany,
        subtotal: parseFloat(order.subtotal || order.totalPrice || '0'),
        tax: parseFloat(order.tax || '0'),
        shipping: parseFloat(order.shipping || '0'),
        customerEmail: userEmail,
        customerInfo: {
          name: userName,
          email: userEmail,
          phone: profile?.phone || '',
          address: {
            line1: profile?.address?.line1 || '',
            line2: profile?.address?.line2 || '',
            city: profile?.address?.city || '',
            state: profile?.address?.state || '',
            zip: profile?.address?.zip || '',
            country: profile?.address?.country || 'USA'
          }
        }
      });
    }
    
    // Change to order-details view (not popup)
    setCurrentView('order-details');
    
    // Update view through the parent method as well
    updateCurrentView('order-details');
  };

  const handleTrackOrder = (order: any) => {
    if (order.trackingUrl) {
      window.open(order.trackingUrl, '_blank');
    }
  };

  const handleDismissCreditNotification = async () => {
    // COMMENTED OUT FOR CREDIT REBUILD
    setShowCreditNotification(false);
  };

  const handleAnimatedCounterComplete = async () => {
    // COMMENTED OUT FOR CREDIT REBUILD
    setShowAnimatedCounter(false);
  };

  const handleCreateClient = () => {
    if (!newClientData.clientName.trim()) {
      setActionNotification({
        message: 'Client name is required',
        type: 'error'
      });
      return;
    }

    setCreatingClient(true);
    try {
      createWholesaleClient({
        variables: {
          input: newClientData
        }
      });
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleToggleClientOrders = (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      if (!clientOrders[clientId]) {
        getClientOrders({ variables: { clientId } });
      }
    }
  };

  const handleSelectBannerTemplate = async (template: any) => {
    if (!user) return;
    
    // Rate limiting
    const now = Date.now();
    if (now - lastProfileActionTime.current < 3000) {
      alert('⏰ Please wait a moment between banner changes.');
      return;
    }
    
    if (uploadingBanner) return;
    
    if (profile?.banner_template_id === template.id) {
      setShowBannerTemplates(false);
      return;
    }
    
    lastProfileActionTime.current = now;
    setUploadingBanner(true);
    setShowBannerTemplates(false);
    
    try {
      const templateCSS = JSON.stringify(template.style);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { data, errors } = await client.mutate({
        mutation: UPDATE_USER_PROFILE_BANNER,
        variables: {
          userId: (user as any).id,
          bannerUrl: null,
          bannerPublicId: null,
          bannerTemplate: templateCSS,
          bannerTemplateId: template.id
        }
      });

      if (errors || !data?.updateUserProfileBanner?.success) {
        console.error('Error updating banner template:', errors);
        const errorMessage = errors?.[0]?.message || 'Failed to apply template';
        alert(errorMessage);
        return;
      }
      
      const updatedProfile = data.updateUserProfileBanner.userProfile;
      setProfile((prev: any) => ({
        ...prev,
        banner_image_url: updatedProfile.bannerImageUrl,
        banner_image_public_id: updatedProfile.bannerImagePublicId,
        banner_template: updatedProfile.bannerTemplate,
        banner_template_id: updatedProfile.bannerTemplateId
      }));
      
    } catch (error) {
      console.error('Banner template application failed:', error);
      alert('Failed to apply template. Please try again.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleProfilePictureClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const fileInput = document.getElementById('profile-photo-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  // Helper functions
  const getUserDisplayName = () => {
    if (profile?.firstName) {
      return profile.firstName;
    }
    if ((user as any)?.user_metadata?.first_name) {
      return (user as any).user_metadata.first_name;
    }
    return (user as any)?.email?.split('@')[0] || 'User';
  };

  const getProductImage = (item: any, itemData?: any) => {
    if (item.image) return item.image;
    
    const customFiles = itemData?.customFiles || item.customFiles;
    if (customFiles && customFiles.length > 0) {
      const imageFile = customFiles.find((file: string) => 
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
      );
      return imageFile || customFiles[0];
    }
    
    const productImages: { [key: string]: string } = {
      'vinyl-stickers': '/product-images/vinyl-stickers.jpg',
      'holographic-stickers': '/product-images/holographic-stickers.jpg',
      'glitter-stickers': '/product-images/glitter-stickers.jpg',
      'chrome-stickers': '/product-images/chrome-stickers.jpg',
      'clear-stickers': '/product-images/clear-stickers.jpg',
      'sticker-sheets': '/product-images/sticker-sheets.jpg',
      'vinyl-banners': '/product-images/vinyl-banners.jpg'
    };
    
    const productType = item.product || itemData?.product || itemData?.productType;
    return productImages[productType] || '/product-images/default.jpg';
  };

  const getOrderDisplayNumber = (order: any) => {
    // Handle both camelCase and snake_case field names from different queries
    const orderNum = order.order_number || order.orderNumber;
    const orderId = order.order_id || order.id;
    
    if (orderNum) {
      return orderNum;
    } else if (orderId) {
      // Use last 6 characters of ID if no order number
      return orderId.slice(-6).toUpperCase();
    }
    return 'UNKNOWN';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Paid': 'bg-green-500',
      'Processing': 'bg-blue-500',
      'Shipped': 'bg-purple-500',
      'Delivered': 'bg-gray-500',
      'Pending': 'bg-yellow-500',
      'Cancelled': 'bg-red-500',
      'proof_pending': 'bg-orange-500',
      'proof_sent': 'bg-blue-500',
      'proof_approved': 'bg-green-500',
      'proof_rejected': 'bg-red-500',
      'proof_revision_requested': 'bg-yellow-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusDisplayText = (status: string) => {
    const displayText: { [key: string]: string } = {
      'Paid': 'Payment Received',
      'Processing': 'In Production',
      'Shipped': 'On The Way',
      'Delivered': 'Delivered',
      'Pending': 'Awaiting Payment',
      'Cancelled': 'Cancelled',
      'proof_pending': 'Proof Pending',
      'proof_sent': 'Proof Sent',
      'proof_approved': 'Proof Approved',
      'proof_rejected': 'Proof Rejected',
      'proof_revision_requested': 'Revision Requested'
    };
    return displayText[status] || status;
  };

  const isOrderShippedWithTracking = (order: any) => {
    return order.status === 'Shipped' && order.trackingNumber && order.trackingUrl;
  };

  const renderOrderProgressTracker = (order: any) => {
    return (
      <OrderProgressTracker 
        order={order}
      />
    );
  };

  const handleCancelReplacement = () => {
    removeUploadedFile();
    setProofComments('');
  };

  const handleProofAction = async (action: 'approve' | 'request_changes', orderId: string, proofId: string) => {
    if (!orderId || !proofId) return;

    console.log(`🔄 Processing proof action: ${action} for order ${orderId}, proof ${proofId}`);

    // Validation for request_changes - require either comments or uploaded file
    if (action === 'request_changes') {
      const hasComments = proofComments.trim().length > 0;
      const proofKey = `${orderId}-${proofId}`;
      const hasUploadedFile = uploadedFiles[proofKey];
      
      if (!hasComments && !hasUploadedFile) {
        setActionNotification({ 
          message: 'Please either add comments describing the changes needed or upload a revised file before requesting changes.', 
          type: 'error' 
        });
        setTimeout(() => setActionNotification(null), 4000);
        return;
      }
    }

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

    // Validate file size (25MB max to match vinyl calculator)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size must be less than 25MB');
      setActionNotification({ 
        message: 'File size must be less than 25MB', 
        type: 'error' 
      });
      setTimeout(() => setActionNotification(null), 4000);
      return;
    }

    setUploadingFile(true);
    setUploadError(null);
    setUploadProgress({ percentage: 0 });
    
    try {
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      
      // Upload to Cloudinary with progress tracking
      const result = await uploadToCloudinary(
        file,
        {
          selectedCut: 'customer_revision',
          selectedMaterial: 'customer_file',
          timestamp: new Date().toISOString()
        },
        (progress) => {
          setUploadProgress({ percentage: progress.percentage });
        },
        'customer-files'
      );

      // Create preview for images
      let preview = '';
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      
      // Store the staged file with uploaded data
      setStagedFile({
        file,
        preview,
        orderId,
        proofId,
        cutContourInfo: null,
        uploadedFile: result
      });
      
      // Clear progress after brief delay
      setTimeout(() => {
        setUploadProgress(null);
      }, 500);
      
      console.log('✅ File uploaded successfully:', result);
      
      // Clear the file input to allow selecting the same file again
      const input = document.getElementById(`proof-file-input-${proofId}`) as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    } catch (error: any) {
      console.error('❌ File upload failed:', error);
      setUploadError('Failed to upload file. Please try again.');
      setUploadProgress(null);
      setActionNotification({ 
        message: `Failed to upload file: ${error?.message || 'Unknown error'}`, 
        type: 'error' 
      });
      setTimeout(() => setActionNotification(null), 4000);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, orderId: string, proofId: string) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    
    if (files.length === 0) return;
    
    console.log(`📦 Customer Dashboard: Processing ${files.length} files for proof ${proofId}`);
    
    // Process all files, not just the first one
    for (const file of files) {
      await handleFileSelect(file, orderId, proofId);
      // Add a small delay between uploads to prevent overwhelming the server
      if (files.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeUploadedFile = () => {
    if (stagedFile?.preview) {
      URL.revokeObjectURL(stagedFile.preview);
    }
    setStagedFile(null);
    setUploadError(null);
  };

  const getFileTypeIcon = (format: string): string | null => {
    const formatLower = format.toLowerCase();
    if (formatLower === 'ai') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1734130723/ai-icon_jxr2qr.png';
    } else if (formatLower === 'svg') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1734130753/svg-icon_bkrvgp.png';
    } else if (formatLower === 'eps') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1734130744/eps-icon_e9vmek.png';
    } else if (formatLower === 'psd') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1734130759/psd-icon_yidukx.png';
    } else if (formatLower === 'pdf') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749414147/PDF_hvqhxf.png';
    }
    return null;
  };

  const handleSendReplacement = async () => {
    if (!stagedFile || !stagedFile.uploadedFile) return;

    console.log('📤 Sending replacement file:', stagedFile);
    setUploadingFile(true);
    
    try {
      // NEW WORKFLOW: When customer uploads replacement file:
      // 1. Update proof with customer's replacement file (stores in database)
      // 2. Set proof status to "changes_requested" (triggers admin review)
      // 3. Admin can see and download the replacement file in admin panel
      const orderId = stagedFile.orderId;
      const proofId = stagedFile.proofId;
      
      // Step 1: Update the proof with the customer's replacement file
      console.log('📁 Updating proof file in database...');
      console.log('🔍 Mutation variables:', {
        orderId: orderId,
        proofId: proofId,
        newFileUrl: stagedFile.uploadedFile.secure_url,
        originalFileName: stagedFile.file.name
      });
      
      try {
        const result = await updateProofFileByCustomer({
          variables: {
            orderId: orderId,
            proofId: proofId,
            newFileUrl: stagedFile.uploadedFile.secure_url,
            originalFileName: stagedFile.file.name
          }
        });
        console.log('✅ Proof file updated successfully:', result);
      } catch (mutationError: any) {
        console.error('❌ updateProofFileByCustomer mutation error:', mutationError);
        console.error('Error details:', {
          message: mutationError.message,
          networkError: mutationError.networkError,
          graphQLErrors: mutationError.graphQLErrors
        });
        throw mutationError;
      }
      
      // Step 2: Update the proof status to "changes_requested"  
      console.log('🔄 Setting proof status to changes_requested...');
      await updateProofStatus({
        variables: {
          orderId: orderId,
          proofId: proofId,
          status: 'changes_requested',
          customerNotes: proofComments || 'Customer uploaded a replacement file'
        }
      });
      
      // Store replacement info in localStorage for additional reference
      const replacementKey = `replacement_${stagedFile.orderId}_${stagedFile.proofId}`;
      const replacementData = {
        orderId: stagedFile.orderId,
        proofId: stagedFile.proofId,
        originalFileName: stagedFile.file.name,
        replacementFileUrl: stagedFile.uploadedFile.secure_url,
        uploadedAt: new Date().toISOString(),
        customerEmail: (user as any)?.email || 'current-user-email'
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
      
      // Track that a file has been uploaded for this proof
      setUploadedFiles(prev => ({ ...prev, [proofKey]: true }));

      // Clean up
      removeUploadedFile();
      setProofComments('');
      
      setActionNotification({ 
        message: '✅ Replacement file sent! Proof status changed to "changes requested". Our team will review your changes.', 
        type: 'success' 
      });
      setTimeout(() => setActionNotification(null), 5000);
      
      // Refresh orders to show the updated data
      refreshOrders();
      
    } catch (error: any) {
      console.error('❌ Failed to send replacement:', error);
      setActionNotification({ 
        message: 'Failed to send replacement file. Please try again.', 
        type: 'error' 
      });
      setTimeout(() => setActionNotification(null), 4000);
    } finally {
      setUploadingFile(false);
    }
  };

  const renderProofReviewInterface = (order: any) => {
    return (
      <ProofReviewInterface
        order={order}
        proofComments={proofComments}
        setProofComments={setProofComments}
        proofAction={proofAction}
        setProofAction={setProofAction}
        showApprovalConfirm={showApprovalConfirm}
        setShowApprovalConfirm={setShowApprovalConfirm}
        highlightComments={highlightComments}
        setHighlightComments={setHighlightComments}
        handleProofAction={handleProofAction}
        uploadedFiles={uploadedFiles}
        stagedFile={stagedFile}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        replacementSent={replacementSent}
        handleFileSelect={handleFileSelect}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        removeUploadedFile={removeUploadedFile}
        handleSendReplacement={handleSendReplacement}
        handleCancelReplacement={handleCancelReplacement}
        getFileTypeIcon={getFileTypeIcon}
        isOrderShippedWithTracking={isOrderShippedWithTracking}
        handleTrackOrder={handleTrackOrder}
      />
    );
  };

  // Render main content based on current view
  const renderMainContent = () => {
    switch (currentView) {
      case 'all-orders':
        return (
          <AllOrdersView
            orders={orders}
            currentView={currentView}
            setCurrentView={setCurrentViewString}
            selectedDesignImage={selectedDesignImage}
            setSelectedDesignImage={setSelectedDesignImage}
            wholesaleClients={wholesaleClients}
            refreshOrders={refreshOrders}
            handleViewOrderDetails={handleViewOrderDetails}
            handleReorder={handleReorder}
            handleTrackOrder={handleTrackOrder}
            getOrderDisplayNumber={getOrderDisplayNumber}
            getProductImage={getProductImage}
            isOrderShippedWithTracking={isOrderShippedWithTracking}
          />
        );
      case 'financial':
        return (
          <FinancialView
            orders={orders}
            creditBalance={creditBalance}
            sellingPrices={sellingPrices}
            setSellingPrices={setSellingPrices}
            reorderingId={reorderingId}
            user={user}
            setCurrentView={setCurrentViewString}
            handleReorder={handleReorder}
            getOrderDisplayNumber={getOrderDisplayNumber}
            refreshOrders={refreshOrders}
          />
        );
      case 'items-analysis':
        return (
          <ItemsAnalysisView
            orders={orders}
            reorderingId={reorderingId}
            setCurrentView={setCurrentViewString}
            handleReorder={handleReorder}
            getOrderDisplayNumber={getOrderDisplayNumber}
          />
        );
      case 'design-vault':
        return (
          <DesignVaultView
            orders={orders}
            selectedDesignImage={selectedDesignImage}
            reorderingId={reorderingId}
            setCurrentView={setCurrentViewString}
            handleReorder={handleReorder}
            getProductImage={getProductImage}
          />
        );
      case 'clients':
        return (
          <ClientsView
            orders={orders}
            wholesaleClients={wholesaleClients}
            clientsLoading={clientsLoading}
            showCreateClientForm={showCreateClientForm}
            setShowCreateClientForm={setShowCreateClientForm}
            newClientData={newClientData}
            setNewClientData={setNewClientData}
            creatingClient={creatingClient}
            selectedClientForOrders={selectedClientForOrders}
            setSelectedClientForOrders={setSelectedClientForOrders}
            selectedOrdersForAssignment={selectedOrdersForAssignment}
            setSelectedOrdersForAssignment={setSelectedOrdersForAssignment}
            assigningOrders={assigningOrders}
            setAssigningOrders={setAssigningOrders}
            expandedClient={expandedClient}
            setExpandedClient={setExpandedClient}
            clientOrders={clientOrders}
            setActionNotification={(notification: { message: string; type: string }) => 
              setActionNotification({
                message: notification.message,
                type: notification.type as "success" | "error" | "info" | "warning"
              })
            }
            onCreateClient={handleCreateClient}
            getClientOrders={getClientOrders}
            assignOrderToClient={assignOrderToClient}
            unassignOrderFromClient={unassignOrderFromClient}
            handleViewOrderDetails={handleViewOrderDetails}
            user={user}
            setCurrentView={setCurrentViewString}
          />
        );
      case 'proofs':
        return (
          <ProofsView
            orders={orders}
            selectedDesignImage={selectedDesignImage}
            setSelectedDesignImage={setSelectedDesignImage}
            replacementSent={replacementSent}
            setCurrentView={setCurrentViewString}
            renderProofReviewInterface={renderProofReviewInterface}
            getOrderDisplayNumber={getOrderDisplayNumber}
            refreshOrders={refreshOrders}
            getProductImage={getProductImage}
            isOrderShippedWithTracking={isOrderShippedWithTracking}
            handleTrackOrder={handleTrackOrder}
          />
        );
      case 'order-details':
        return (
          <OrderDetailsView
            selectedOrderForInvoice={selectedOrderForInvoice}
            setSelectedOrderForInvoice={setSelectedOrderForInvoice}
            setCurrentView={setCurrentViewString}
            handleReorder={handleReorder}
            handleTrackOrder={handleTrackOrder}
            getOrderDisplayNumber={getOrderDisplayNumber}
            getProductImage={getProductImage}
            user={user}
            profile={profile}
            refreshOrders={refreshOrders}
            orders={orders}
          />
        );
      case 'order-details-popup':
        return (
          <OrderDetailsPopupView
            selectedOrderForDetails={selectedOrderForPopup}
            setSelectedOrderForDetails={setSelectedOrderForPopup}
            handleReorder={handleReorder}
            isOrderShippedWithTracking={isOrderShippedWithTracking}
            handleTrackOrder={handleTrackOrder}
            generatePrintPDF={generatePrintPDF}
            generateDownloadPDF={generateDownloadPDF}
            getProductImage={getProductImage}
          />
        );
      case 'support':
        return (
          <SupportView
            orders={orders}
            contactFormData={contactFormData}
            setContactFormData={setContactFormData}
            contactSubmitted={contactSubmitted}
            isSubmittingContact={isSubmittingContact}
            showOrderDropdown={showOrderDropdown}
            setShowOrderDropdown={setShowOrderDropdown}
            handleContactChange={handleContactChange}
            handleContactSubmit={handleContactSubmit}
            getOrderDisplayNumber={getOrderDisplayNumber}
            getProductImage={getProductImage}
            user={user}
            profile={profile}
          />
        );
      case 'settings':
        return (
          <SettingsView
            user={user}
            profile={profile}
            setProfile={setProfile}
            settingsData={settingsData}
            setSettingsData={setSettingsData}
            settingsNotification={settingsNotification}
            setSettingsNotification={setSettingsNotification}
            isUpdatingProfile={isUpdatingProfile}
            setIsUpdatingProfile={setIsUpdatingProfile}
            isUpdatingPassword={isUpdatingPassword}
            setIsUpdatingPassword={setIsUpdatingPassword}
            uploadingProfilePhoto={uploadingProfilePhoto}
            setUploadingProfilePhoto={setUploadingProfilePhoto}
            cachedProfilePhoto={cachedProfilePhoto}
            setCachedProfilePhoto={setCachedProfilePhoto}
            setCurrentView={setCurrentViewString}
            getUserDisplayName={getUserDisplayName}
            getSupabase={getSupabase}
            handleProfilePictureClick={handleProfilePictureClick}
          />
        );
      default:
        return (
          <DefaultView
            orders={orders}
            currentView={currentView}
            creditBalance={creditBalance}
            reorderingId={reorderingId}
            selectedDesignImage={selectedDesignImage}
            setSelectedDesignImage={setSelectedDesignImage}
            showOrderCompleteMessage={showOrderCompleteMessage}
            setShowOrderCompleteMessage={setShowOrderCompleteMessage}
            profile={profile}
            setProfile={setProfile}
            showAnimatedCounter={false}
            creditNotifications={creditNotifications}
            previousCreditBalance={previousCreditBalance}
            handleAnimatedCounterComplete={handleAnimatedCounterComplete}
            showCreditNotification={false}
            handleDismissCreditNotification={handleDismissCreditNotification}
            setCurrentView={setCurrentViewString}
            handleReorder={handleReorder}
            getOrderDisplayNumber={getOrderDisplayNumber}
            refreshOrders={refreshOrders}
            getProductImage={getProductImage}
            getStatusColor={getStatusColor}
            getStatusDisplayText={getStatusDisplayText}
            isOrderShippedWithTracking={isOrderShippedWithTracking}
            renderOrderProgressTracker={renderOrderProgressTracker}
            handleViewOrderDetails={handleViewOrderDetails}
            handleTrackOrder={handleTrackOrder}
          />
        );
    }
  };

  if (loading || ordersLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap');
          
          .banner-gradient {
            background: linear-gradient(135deg, #0a0a2e 0%, #1a1a4a 25%, #2d1b6b 50%, #4c1d95 75%, #7c3aed 100%);
          }
          
          .stellar-void-animation {
            background-image: 
              radial-gradient(ellipse at 25% 30%, rgba(139, 92, 246, 0.5) 0%, transparent 60%),
              radial-gradient(ellipse at 75% 70%, rgba(124, 58, 237, 0.4) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
              radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.18) 1px, transparent 1px);
            background-size: 200% 200%, 200% 200%, 200% 200%, 100px 100px, 150px 150px, 80px 80px;
            background-position: 0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%;
          }
          
          @keyframes stellar-drift {
            0%, 100% { background-position: 0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%; }
            25% { background-position: 50% 50%, 70% 70%, 90% 10%, 10% 90%, 30% 30%, 60% 80%; }
            50% { background-position: 100% 100%, 120% 120%, 140% 70%, 70% 140%, 80% 80%, 110% 130%; }
            75% { background-position: 50% 50%, 70% 70%, 90% 10%, 10% 90%, 30% 30%, 60% 80%; }
          }
          
          @keyframes star-twinkle {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          
          @keyframes float-1 {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(5deg); }
            66% { transform: translateY(5px) rotate(-5deg); }
          }
          
          @keyframes float-2 {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            33% { transform: translateX(-10px) rotate(-5deg); }
            66% { transform: translateX(10px) rotate(5deg); }
          }
          
          @keyframes float-3 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(-5px, -5px) rotate(5deg); }
            50% { transform: translate(5px, -5px) rotate(-5deg); }
            75% { transform: translate(0, 5px) rotate(3deg); }
          }
          
          .holographic-v3-container {
            /* Static pill background styles */
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 
                        inset 0 0 20px rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.1);
            display: inline-block;
          }

          .holographic-v3-text {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: inline-block;
            animation: holographic 3s ease-in-out infinite;
          }
          
          @keyframes holographic {
            0%, 100% { 
              filter: hue-rotate(0deg) brightness(1);
            }
            25% {
              filter: hue-rotate(90deg) brightness(1.2);
            }
            50% { 
              filter: hue-rotate(180deg) brightness(1.1);
            }
            75% {
              filter: hue-rotate(270deg) brightness(1.3);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }

          .container-style {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
            border-radius: 0.75rem;
          }
        `}</style>
        
        <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
          
          {/* Action Notification */}
          {actionNotification && (
            <div className="fixed top-4 right-4 z-50 animate-fadeIn">
              <div 
                className={`px-6 py-4 rounded-xl shadow-xl border backdrop-blur-md ${
                  actionNotification.type === 'success' 
                    ? 'bg-green-500/20 border-green-400/50 text-green-300' 
                    : 'bg-red-500/20 border-red-400/50 text-red-300'
                }`}
                style={{
                  boxShadow: actionNotification.type === 'success' 
                    ? '0 8px 32px rgba(34, 197, 94, 0.2)' 
                    : '0 8px 32px rgba(239, 68, 68, 0.2)'
                }}
              >
                <div className="flex items-center gap-3">
                  {actionNotification.type === 'success' ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <p className="text-sm font-medium">{actionNotification.message}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Header Section */}
          <div className="pt-6 pb-2">
            <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-2 md:px-4">
              {/* Banner with Profile */}
              <div 
                className={`relative rounded-2xl p-4 md:p-6 shadow-xl mb-3 overflow-hidden cursor-pointer group ${
                  (profile?.banner_template_id === 2 || !profile?.banner_template) ? 'banner-gradient stellar-void-animation' : ''
                }`}
                style={{
                  aspectRatio: '5.2/1',
                  minHeight: '207px',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  ...(profile?.banner_template
                      ? {
                          ...JSON.parse(profile.banner_template),
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          animation: profile?.banner_template_id === 2 
                            ? 'stellar-drift 8s ease-in-out infinite'
                            : 'none'
                        }
                      : {
                          backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750883615/261355a9-3a2b-48d8-ad79-08ce1407d61b.png)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          animation: 'none'
                        })
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBannerTemplates(!showBannerTemplates);
                }}
                title="Click to choose banner template"
              >
                {/* Grain texture overlay for Stellar Void template */}
                {profile?.banner_template_id === 2 && (
                  <div 
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='17' cy='17' r='1'/%3E%3Ccircle cx='37' cy='17' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='17' cy='37' r='1'/%3E%3Ccircle cx='37' cy='37' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundSize: '60px 60px'
                    }}
                  />
                )}
                
                {/* Additional animated stars for Stellar Void */}
                {profile?.banner_template_id === 2 && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute w-1 h-1 bg-white rounded-full opacity-50" style={{ left: '10%', top: '20%', animation: 'star-twinkle 9s ease-in-out infinite' }} />
                    <div className="absolute w-1 h-1 bg-white rounded-full opacity-40" style={{ left: '30%', top: '60%', animation: 'star-twinkle 9s ease-in-out infinite', animationDelay: '3s' }} />
                    <div className="absolute w-1.5 h-1.5 bg-purple-300 rounded-full opacity-60" style={{ left: '70%', top: '30%', animation: 'star-twinkle 9s ease-in-out infinite', animationDelay: '6s' }} />
                    <div className="absolute w-1 h-1 bg-white rounded-full opacity-50" style={{ left: '85%', top: '70%', animation: 'star-twinkle 9s ease-in-out infinite', animationDelay: '1.5s' }} />
                    <div className="absolute w-1 h-1 bg-purple-200 rounded-full opacity-40" style={{ left: '50%', top: '80%', animation: 'star-twinkle 9s ease-in-out infinite', animationDelay: '4.5s' }} />
                  </div>
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
                
                {/* Hover overlay with template selection */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 pointer-events-none">
                  <div className="flex gap-4">
                    <div 
                      className="p-3 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 hover:bg-purple-500/30 transition-all duration-200 cursor-pointer pointer-events-auto relative" 
                      title="Choose Banner Template"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBannerTemplates(!showBannerTemplates);
                      }}
                    >
                      <svg className="w-6 h-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    
                    {profile?.banner_template_id && profile?.banner_template_id !== 1 && (
                      <div 
                        className="p-3 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 hover:bg-blue-500/30 transition-all duration-200 cursor-pointer pointer-events-auto" 
                        title="Reset to Default Banner"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Reset to default Galactic Vista banner?')) {
                            handleSelectBannerTemplate(bannerTemplates[0]);
                          }
                        }}
                      >
                        <svg className="w-6 h-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Profile and Greeting Content */}
                <div className="relative z-30 pointer-events-none">
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Profile Picture Circle */}
                    <div 
                      className="w-12 h-12 md:w-16 md:h-16 aspect-square rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 flex items-center justify-center relative pointer-events-auto flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        marginTop: '2px'
                      }}
                      onClick={(e) => handleProfilePictureClick(e)}
                      title="Click to change profile photo"
                    >
                      {uploadingProfilePhoto ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1"></div>
                          <span className="text-xs text-white">Uploading...</span>
                        </div>
                      ) : (profile?.profile_photo_url || cachedProfilePhoto) ? (
                        <>
                          <img 
                            src={profile?.profile_photo_url || cachedProfilePhoto} 
                            alt="Profile" 
                            className="w-full h-full rounded-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </>
                      ) : !profilePhotoLoading ? (
                        <div className="w-full h-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold rounded-full">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-full h-full aspect-square bg-gradient-to-br from-gray-600 to-gray-700 animate-pulse rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Greeting Section */}
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white"
                            style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                          Greetings, {getUserDisplayName()}
                        </h1>
                        {/* Small Random Avatar Button */}
                        <button
                          onClick={handleAssignRandomAvatar}
                          className="ml-2 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 transform hover:scale-105 pointer-events-auto"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: 'rgba(59, 130, 246, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                            color: 'white'
                          }}
                          disabled={uploadingProfilePhoto}
                          title="Get a new random avatar"
                        >
                          {uploadingProfilePhoto ? '...' : '🎲'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <p className="text-xs md:text-sm text-gray-200">
                          Mission Control Dashboard
                        </p>
                        <span className="hidden lg:inline-block holographic-v3-container text-sm px-3 py-1 rounded-full">
                          <span className="holographic-v3-text">v3.0</span>
                        </span>
                      </div>
                      
                      {/* Terminal Section */}
                      {showTerminalLoader && (
                        <div className="text-sm md:text-xs text-green-400 mt-2 md:mt-1 ml-0 md:ml-0"
                             style={{
                               fontFamily: '"VT323", monospace',
                               fontSize: '16px',
                               textShadow: '0 0 5px rgba(0, 255, 0, 0.8)',
                               letterSpacing: '0.05em',
                               lineHeight: '1.3',
                               marginLeft: '0px'
                             }}>
                          {!isTerminalTyping ? (
                            <div>
                              <span className="opacity-70">&gt; </span>
                              {currentView === 'all-orders' ? 'LOADING ORDERS' : 
                               currentView === 'financial' ? 'LOADING FINANCES' :
                               currentView === 'design-vault' ? 'DESIGNS LOADING' :
                               currentView === 'proofs' ? 'LOADING PROOFS' :
                               currentView === 'support' ? 'HELP! REQUESTING BACK UP!' :
                               currentView === 'settings' ? 'ADJUSTING PANELS' :
                               'Loading Mainframe'}{terminalLoadingDots}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{terminalOrderText}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert Banners */}
              {orders.filter(order => 
                (order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes') && 
                order.proof_status !== 'changes_requested'
              ).length > 0 && (
                <div 
                  className="rounded-2xl p-4 shadow-xl mb-3 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(249, 115, 22, 0.3)',
                    boxShadow: '0 0 12px rgba(249, 115, 22, 0.1)'
                  }}
                  onClick={() => updateCurrentView('proofs')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      <div>
                        <h3 className="text-orange-300 font-semibold text-sm">
                          ⚠️ Alert! You have {orders.filter(order => 
                            (order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes') && 
                            order.proof_status !== 'changes_requested'
                          ).length} proof(s) to approve
                        </h3>
                        <p className="text-orange-200 text-xs">
                          Click here to approve or request changes
                        </p>
                      </div>
                    </div>
                    <div className="text-orange-300 text-xl">→</div>
                  </div>
                </div>
              )}

              {/* Replacement Files Alert */}
              {(() => {
                const ordersWithReplacements = orders.filter(order => {
                  // Check if order has replacement files from customer
                  const hasReplacementProofs = order.proofs && order.proofs.some((proof: any) => proof.replaced && proof.proofUrl);
                  const hasReplacementItems = order.items && order.items.some((item: any) => {
                    const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                    return itemData.customerReplacementFile;
                  });
                  
                  return hasReplacementProofs || hasReplacementItems;
                });

                return ordersWithReplacements.length > 0 ? (
                  <div 
                    className="rounded-2xl p-4 shadow-xl mb-3 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '2px solid rgba(168, 85, 247, 0.3)',
                      boxShadow: '0 0 12px rgba(168, 85, 247, 0.1)'
                    }}
                    onClick={() => updateCurrentView('all-orders')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                        <div>
                          <h3 className="text-purple-300 font-semibold text-sm">
                            🔄 Alert! You have {ordersWithReplacements.length} replacement file(s) sent
                          </h3>
                          <p className="text-purple-200 text-xs">
                            Click "View Details" on your orders to see your new files
                          </p>
                        </div>
                      </div>
                      <div className="text-purple-300 text-xl">→</div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* File Upload Alert */}
              {(() => {
                const ordersNeedingFiles = orders.filter(order => {
                  // Only show for orders that are not cancelled/delivered
                  if (order.status === 'Cancelled' || order.status === 'Delivered') {
                    return false;
                  }
                  
                  // Check if any items in the order need file uploads
                  return order.items && order.items.some((item: any) => {
                    const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                    const productImage = getProductImage(item, itemData);
                    // If there's no product image, it means files need to be uploaded
                    return !productImage || productImage.trim() === '';
                  });
                });

                return ordersNeedingFiles.length > 0 ? (
                  <div 
                    className="rounded-2xl p-4 shadow-xl mb-3 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '2px solid rgba(59, 130, 246, 0.3)',
                      boxShadow: '0 0 12px rgba(59, 130, 246, 0.1)'
                    }}
                    onClick={() => updateCurrentView('all-orders')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div>
                          <h3 className="text-blue-300 font-semibold text-sm">
                            📁 Alert! You have {ordersNeedingFiles.length} order(s) missing files
                          </h3>
                          <p className="text-blue-200 text-xs">
                            Click here to view orders and upload your design files
                          </p>
                        </div>
                      </div>
                      <div className="text-blue-300 text-xl">→</div>
                    </div>
                  </div>
                ) : null;
              })()}

              {profile && (profile.wholesale_status === 'pending' || profile.wholesaleStatus === 'pending') && (
                <div 
                  className="rounded-2xl p-4 shadow-xl mb-3 transition-all duration-300"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(59, 130, 246, 0.3)',
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.1)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <div>
                      <h3 className="text-blue-300 font-semibold text-sm">
                        📋 Your application for a wholesale account is in review.
                      </h3>
                      <p className="text-blue-200 text-xs">
                        Expect an approval or rejection in your account within 6-8 hours.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {orders.filter(order => 
                (order.status !== 'Delivered' && order.status !== 'Cancelled') &&
                (order._fullOrderData?.is_express_shipping || order._fullOrderData?.is_rush_order)
              ).length > 0 && (
                <div 
                  className="rounded-2xl p-4 shadow-xl mb-3 transition-all duration-300"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(239, 68, 68, 0.3)',
                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.1)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <div>
                      <h3 className="text-red-300 font-semibold text-sm">
                        🚀 Express Processing Alert!
                      </h3>
                      <p className="text-red-200 text-xs">
                        We're aware you've paid for expedited shipping and are processing your order with urgency.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full">
            <div className="lg:grid lg:grid-cols-4 lg:gap-6 w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-2 md:px-4">
              {/* Sidebar - Desktop Only */}
              <div className="hidden lg:block lg:col-span-1 space-y-3">
                {/* Primary Action - Start New Mission */}
                <Link 
                  href="/products"
                  className="block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden container-style rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                    boxShadow: '0 4px 16px rgba(30, 58, 138, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '1rem' // Override container-style to match rounded-2xl
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-transparent">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                           style={{ color: '#ffffff', filter: 'drop-shadow(0 4px 12px rgba(255, 255, 255, 0.15))' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">Start New Mission</h4>
                      <p className="text-xs text-white/80">Create custom stickers</p>
                    </div>
                  </div>
                </Link>
                
                {/* Dashboard Button */}
                <button 
                  onClick={() => updateCurrentView('default')}
                  className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden rounded-2xl ${
                    currentView === 'default' ? '' : ''
                  }`}
                  style={currentView === 'default' ? {
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.25) 50%, rgba(139, 92, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  } : {
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-transparent">
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"
                           style={{ color: '#8b5cf6', filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.15))' }}>
                        <rect x="3" y="3" width="8" height="5" rx="2"/>
                        <rect x="13" y="3" width="8" height="11" rx="2"/>
                        <rect x="3" y="10" width="8" height="11" rx="2"/>
                        <rect x="13" y="16" width="8" height="5" rx="2"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">Dashboard</h4>
                      <p className="text-xs text-gray-300">Mission overview</p>
                    </div>
                  </div>
                </button>

                {/* Stats - Grid Layout */}
                <div className="grid grid-cols-1 gap-3">

                  <button 
                    onClick={() => updateCurrentView('all-orders')}
                    className={`block p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden rounded-2xl ${
                      currentView === 'all-orders' ? '' : ''
                    }`}
                    style={currentView === 'all-orders' ? {
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.25) 50%, rgba(16, 185, 129, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="p-1.5 lg:p-2 rounded-lg bg-transparent">
                        <svg className="w-5 lg:w-7 h-5 lg:h-7" fill="currentColor" viewBox="0 0 24 24"
                             style={{ color: '#10b981', filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.15))' }}>
                          <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Orders</h4>
                        <p className="text-xs text-gray-300">{orders.length} active orders</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => updateCurrentView('financial')}
                    className={`block p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden rounded-2xl ${
                      currentView === 'financial' ? '' : ''
                    }`}
                    style={currentView === 'financial' ? {
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: '0 4px 16px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="p-1.5 lg:p-2 rounded-lg bg-transparent">
                        <svg className="w-5 lg:w-7 h-5 lg:h-7" fill="currentColor" viewBox="0 0 24 24"
                             style={{ color: '#3b82f6', filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.15))' }}>
                          <rect x="3" y="12" width="4" height="9" rx="2"/>
                          <rect x="10" y="6" width="4" height="15" rx="2"/>
                          <rect x="17" y="9" width="4" height="12" rx="2"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Finances</h4>
                        <p className="text-xs text-gray-300">$0.00 invested</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => updateCurrentView('design-vault')}
                    className={`block p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden rounded-2xl ${
                      currentView === 'design-vault' ? '' : ''
                    }`}
                    style={currentView === 'design-vault' ? {
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.4) 0%, rgba(236, 72, 153, 0.25) 50%, rgba(236, 72, 153, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(236, 72, 153, 0.4)',
                      boxShadow: '0 4px 16px rgba(236, 72, 153, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="p-1.5 lg:p-2 rounded-lg bg-transparent">
                        <svg className="w-5 lg:w-7 h-5 lg:h-7" fill="currentColor" viewBox="0 0 24 24"
                             style={{ color: '#ec4899', filter: 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.15))' }}>
                          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Designs</h4>
                        <p className="text-xs text-gray-300">Manage designs</p>
                      </div>
                    </div>
                  </button>

                  {/* Clients - Only show for wholesale customers */}
                  {(profile?.wholesaleStatus === 'approved' || profile?.wholesale_status === 'approved' || profile?.isWholesaleCustomer) && (
                    <button 
                      onClick={() => updateCurrentView('clients')}
                      className={`block p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden rounded-2xl ${
                        currentView === 'clients' ? '' : ''
                      }`}
                      style={currentView === 'clients' ? {
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        boxShadow: '0 4px 16px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg bg-transparent">
                          <svg className="w-5 lg:w-7 h-5 lg:h-7" fill="currentColor" viewBox="0 0 24 24"
                               style={{ color: '#fbbf24', filter: 'drop-shadow(0 4px 12px rgba(251, 191, 36, 0.15))' }}>
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Clients</h4>
                          <p className="text-xs text-gray-300">0 clients</p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Secondary Actions - Hidden on mobile, shown at bottom */}
                <div className="hidden lg:block space-y-3">
                                    <button 
                    onClick={() => updateCurrentView('proofs')}
                    className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden rounded-2xl ${
                      currentView === 'proofs' ? '' : ''
                    }`}
                    style={currentView === 'proofs' ? {
                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.25) 50%, rgba(249, 115, 22, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(249, 115, 22, 0.4)',
                      boxShadow: '0 4px 16px rgba(249, 115, 22, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-transparent">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"
                             style={{ color: '#f97316', filter: 'drop-shadow(0 4px 12px rgba(249, 115, 22, 0.15))' }}>
                          <path d="M12 4.5C7.5 4.5 3.73 7.61 2.46 12c1.27 4.39 5.04 7.5 9.54 7.5s8.27-3.11 9.54-7.5c-1.27-4.39-5.04-7.5-9.54-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">Proofs</h4>
                        <p className="text-xs text-gray-300">Review designs</p>
                      </div>
                    </div>
                  </button>

                  {/* Get Support and Settings layout */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => updateCurrentView('support')}
                      className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden rounded-2xl ${
                        currentView === 'support' ? '' : ''
                      }`}
                      style={currentView === 'support' ? {
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-transparent">
                          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"
                               style={{ color: '#ef4444', filter: 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.15))' }}>
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l6 4v-18c0-1.1-.9-2-2-2z"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">Support</h4>
                          <p className="text-xs text-gray-300">Contact ground crew</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => updateCurrentView('settings')}
                      className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden rounded-2xl ${
                        currentView === 'settings' ? '' : ''
                      }`}
                      style={currentView === 'settings' ? {
                        background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.4) 0%, rgba(156, 163, 175, 0.25) 50%, rgba(156, 163, 175, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(156, 163, 175, 0.4)',
                        boxShadow: '0 4px 16px rgba(156, 163, 175, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-transparent">
                          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"
                               style={{ color: '#9ca3af', filter: 'drop-shadow(0 4px 12px rgba(156, 163, 175, 0.15))' }}>
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6S13.98,15.6,12,15.6z"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">Settings</h4>
                          <p className="text-xs text-gray-300">Manage account</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="rounded-2xl block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left opacity-75 relative overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-transparent">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                             style={{ color: '#6b7280', filter: 'drop-shadow(0 4px 12px rgba(107, 114, 128, 0.15))' }}>
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
              <div className="col-span-1 lg:col-span-3 space-y-6">
                <div className="w-full">
                  {renderMainContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>

      {/* Banner Templates Popup */}
      {showBannerTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div 
            className="max-w-4xl w-full max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md p-6 border-b border-gray-700 z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">Choose Banner Template</h3>
                <button
                  onClick={() => setShowBannerTemplates(false)}
                  className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  title="Close banner template selection"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Template Categories */}
              <div className="space-y-8">
                {/* Cosmic Templates */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-purple-400">🌌</span>
                    Cosmic Templates
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {bannerTemplates.filter(template => template.category === 'cosmic').map((template) => (
                    <div
                      key={template.id}
                      className={`relative rounded-lg overflow-hidden transform transition-all duration-200 border border-white/10 ${
                        uploadingBanner 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer hover:scale-105 hover:border-purple-400/50'
                      } ${profile?.banner_template_id === template.id ? 'ring-2 ring-purple-500' : ''}`}
                      onClick={() => {
                        if (!uploadingBanner) {
                          handleSelectBannerTemplate(template);
                        }
                      }}
                    >
                      <div 
                        className="w-full relative"
                        style={{
                          ...template.style,
                          aspectRatio: '5.2/1', // Match the actual banner ratio
                          minHeight: '60px', // Minimum height for readability
                          animation: template.id === 2 ? 'stellar-drift 8s ease-in-out infinite' : 'none'
                        }}
                      >
                        {template.isDefault && (
                          <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded-full">
                            Default
                          </div>
                        )}
                        {template.id === 2 && (
                          <div 
                            className="absolute inset-0 opacity-40"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='17' cy='17' r='1'/%3E%3Ccircle cx='37' cy='17' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='17' cy='37' r='1'/%3E%3Ccircle cx='37' cy='37' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                              backgroundSize: '60px 60px'
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/20"></div>
                        {profile?.banner_template_id === template.id && (
                          <div className="absolute bottom-2 left-2">
                            <p className="text-purple-300 text-xs bg-purple-500/20 px-2 py-1 rounded">Currently Active</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowBannerTemplates(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Dashboard Navigation Pill */}
      <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div 
          className="rounded-full px-2 py-2 flex items-center gap-1"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Mobile navigation buttons */}
          <button
            onClick={() => {
              updateCurrentView('default');
              setExpandedPillButton(expandedPillButton === 'default' ? null : 'default');
            }}
            className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
              currentView === 'default' 
                ? 'text-purple-300' 
                : 'text-white hover:text-gray-200'
            } ${expandedPillButton === 'default' ? 'gap-2 pr-5' : ''}`}
          >
            {currentView === 'default' && (
              <div className="absolute inset-px rounded-full" style={{
                background: 'rgba(139, 92, 246, 0.2)',
                boxShadow: '0 0 12px rgba(139, 92, 246, 0.5)'
              }}></div>
            )}
            <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="8" height="5" rx="2"/>
              <rect x="13" y="3" width="8" height="11" rx="2"/>
              <rect x="3" y="10" width="8" height="11" rx="2"/>
              <rect x="13" y="16" width="8" height="5" rx="2"/>
            </svg>
            {expandedPillButton === 'default' && (
              <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
                Dashboard
              </span>
            )}
          </button>

          <button
            onClick={() => {
              updateCurrentView('all-orders');
              setExpandedPillButton(expandedPillButton === 'all-orders' ? null : 'all-orders');
            }}
            className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
              currentView === 'all-orders' 
                ? 'text-green-300' 
                : 'text-white hover:text-gray-200'
            } ${expandedPillButton === 'all-orders' ? 'gap-2 pr-5' : ''}`}
          >
            {currentView === 'all-orders' && (
              <div className="absolute inset-px rounded-full" style={{
                background: 'rgba(16, 185, 129, 0.2)',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)'
              }}></div>
            )}
            <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
            </svg>
            {expandedPillButton === 'all-orders' && (
              <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
                All Orders
              </span>
            )}
          </button>

          <button
            onClick={() => {
              updateCurrentView('proofs');
              setExpandedPillButton(expandedPillButton === 'proofs' ? null : 'proofs');
            }}
            className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
              currentView === 'proofs' 
                ? 'text-cyan-300' 
                : 'text-white hover:text-gray-200'
            } ${expandedPillButton === 'proofs' ? 'gap-2 pr-5' : ''}`}
          >
            {currentView === 'proofs' && (
              <div className="absolute inset-px rounded-full" style={{
                background: 'rgba(6, 182, 212, 0.2)',
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.5)'
              }}></div>
            )}
            <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V19z"/>
            </svg>
            {expandedPillButton === 'proofs' && (
              <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
                Proofs
              </span>
            )}
          </button>

          <button
            onClick={() => {
              updateCurrentView('support');
              setExpandedPillButton(expandedPillButton === 'support' ? null : 'support');
            }}
            className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
              currentView === 'support' 
                ? 'text-pink-300' 
                : 'text-white hover:text-gray-200'
            } ${expandedPillButton === 'support' ? 'gap-2 pr-5' : ''}`}
          >
            {currentView === 'support' && (
              <div className="absolute inset-px rounded-full" style={{
                background: 'rgba(236, 72, 153, 0.2)',
                boxShadow: '0 0 12px rgba(236, 72, 153, 0.5)'
              }}></div>
            )}
            <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
            {expandedPillButton === 'support' && (
              <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
                Support
              </span>
            )}
          </button>

          <button
            onClick={() => {
              updateCurrentView('settings');
              setExpandedPillButton(expandedPillButton === 'settings' ? null : 'settings');
            }}
            className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
              currentView === 'settings' 
                ? 'text-gray-300' 
                : 'text-white hover:text-gray-200'
            } ${expandedPillButton === 'settings' ? 'gap-2 pr-5' : ''}`}
          >
            {currentView === 'settings' && (
              <div className="absolute inset-px rounded-full" style={{
                background: 'rgba(156, 163, 175, 0.2)',
                boxShadow: '0 0 12px rgba(156, 163, 175, 0.5)'
              }}></div>
            )}
            <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            {expandedPillButton === 'settings' && (
              <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
                Settings
              </span>
            )}
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}

export default Dashboard; 