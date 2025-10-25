import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '@/utils/cloudinary';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import AIFileImage from '../../AIFileImage';
import { GET_USER_ORDERS } from '@/lib/order-mutations';

// GraphQL mutations for Pro design management
const UPDATE_PRO_MEMBER_DESIGN = gql`
  mutation UpdateProMemberDesign($userId: ID!, $designFile: String!) {
    updateProMemberDesign(userId: $userId, designFile: $designFile) {
      success
      message
      userProfile {
        proCurrentDesignFile
        proDesignApproved
        proDesignLocked
      }
      error
    }
  }
`;


interface ProMembershipViewProps {
  profile: any;
  user: any;
}

export default function ProMembershipView({ profile, user }: ProMembershipViewProps) {
  // Fetch user's orders to display Pro order history
  const { data: ordersData } = useQuery(GET_USER_ORDERS, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSwappingDesign, setIsSwappingDesign] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Countdown state for next order
  const [daysUntilNextOrder, setDaysUntilNextOrder] = useState<number | null>(null);
  const [daysUntilLock, setDaysUntilLock] = useState<number | null>(null);

  // Subscription management state
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // GraphQL mutations
  const [updateProMemberDesign] = useMutation(UPDATE_PRO_MEMBER_DESIGN);

  // Calculate countdown timers
  useEffect(() => {
    if (!profile?.pro_current_period_end) return;

    const calculateCountdown = () => {
      const now = new Date();
      const periodEnd = new Date(profile.pro_current_period_end);
      
      // Next order is 5 days before period end (25 days into 30-day cycle)
      const nextOrderDate = new Date(periodEnd);
      nextOrderDate.setDate(periodEnd.getDate() - 5);
      
      const daysUntilOrder = Math.ceil((nextOrderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setDaysUntilNextOrder(daysUntilOrder > 0 ? daysUntilOrder : 0);

      // Design locks 5 days before next order (10 days before period end)
      const lockDate = new Date(nextOrderDate);
      lockDate.setDate(nextOrderDate.getDate() - 5);
      
      const daysUntilLockDate = Math.ceil((lockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setDaysUntilLock(daysUntilLockDate > 0 ? daysUntilLockDate : 0);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [profile?.pro_current_period_end]);

  // Get Pro orders from user's order history (all SS- orders)
  const proOrders = React.useMemo(() => {
    if (!ordersData?.getUserOrders) return [];
    
    console.log('📦 Total orders from query:', ordersData.getUserOrders.length);
    console.log('📦 All orders:', ordersData.getUserOrders);
    
    // Filter for Pro orders - look for SS- prefix orders
    const filtered = ordersData.getUserOrders
      .filter((order: any) => {
        const isSSOrder = order.orderNumber?.startsWith('SS-');
        console.log(`📦 Checking order ${order.orderNumber}:`, { 
          isSSOrder, 
          orderNumber: order.orderNumber,
          userId: order.userId,
          currentUserId: user?.id 
        });
        return isSSOrder;
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3); // Last 3 Pro orders
    
    console.log('📦 Filtered Pro orders (SS-):', filtered.length, filtered);
    return filtered;
  }, [ordersData, user?.id]);

  // Get the current month's Pro order (most recent)
  const currentMonthProOrder = React.useMemo(() => {
    if (!ordersData?.getUserOrders) {
      console.log('📦 No orders data available yet for current month');
      return null;
    }
    
    console.log('📦 Getting current month order from proOrders:', proOrders);
    
    // Get the most recent SS- order
    const proOrdersList = ordersData.getUserOrders
      .filter((order: any) => order.orderNumber?.startsWith('SS-'))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('📦 Pro orders for current month:', proOrdersList.length);
    if (proOrdersList.length > 0) {
      console.log('📦 Current month order:', proOrdersList[0]);
      console.log('📦 Order proof status:', proOrdersList[0].proof_status);
      console.log('📦 Order items:', proOrdersList[0].items);
      console.log('📦 Order custom files:', proOrdersList[0].items?.[0]?.customFiles);
    }
    
    return proOrdersList.length > 0 ? proOrdersList[0] : null;
  }, [ordersData, proOrders, user?.id]);

  // Get status message based on proof_status
  const getProofStatusMessage = (proofStatus: string | null | undefined) => {
    switch (proofStatus) {
      case 'building_proof':
        return "We're working on your proof";
      case 'awaiting_approval':
        return "Your proof is awaiting approval";
      case 'approved':
      case 'printing':
        return "We're printing this!";
      case 'label_printed':
        return "Label printed - ready to ship!";
      case 'shipped':
        return "Your order has shipped!";
      case 'delivered':
        return "Your order has been delivered!";
      case 'changes_requested':
        return "Changes requested on your proof";
      default:
        return "We're working on your proof";
    }
  };

  // Get the uploaded image from the current month's order
  const getCurrentMonthImage = () => {
    if (!currentMonthProOrder?.items || currentMonthProOrder.items.length === 0) {
      return null;
    }
    
    // Find the first item with custom files
    const itemWithFile = currentMonthProOrder.items.find((item: any) => 
      item.customFiles && item.customFiles.length > 0
    );
    
    return itemWithFile?.customFiles?.[0] || null;
  };

  // Check if design is locked (within 5-day production window)
  const isDesignLocked = () => {
    if (!profile?.pro_design_locked || !profile?.pro_design_locked_at) return false;
    
    const lockedAt = new Date(profile.pro_design_locked_at);
    const now = new Date();
    const daysSinceLocked = (now.getTime() - lockedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceLocked < 5;
  };

  // Check if user can swap design (after label printed and before 5-day window)
  const canSwapDesign = () => {
    console.log('🔄 Checking if can swap design...');
    console.log('🔄 proOrders:', proOrders);
    
    // Must have at least one Pro order
    if (!proOrders || proOrders.length === 0) {
      console.log('🔄 No Pro orders found');
      return false;
    }
    
    // Most recent order must have label printed (ready to ship or shipped)
    const latestOrder = proOrders[0]; // Most recent order
    console.log('🔄 Latest order:', latestOrder);
    console.log('🔄 Latest order proof_status:', latestOrder?.proof_status);
    console.log('🔄 Latest order trackingNumber:', latestOrder?.trackingNumber);
    console.log('🔄 Latest order fulfillmentStatus:', latestOrder?.fulfillmentStatus);
    
    const isLabelPrinted = latestOrder?.proof_status === 'label_printed' || 
                          latestOrder?.proof_status === 'shipped' || 
                          latestOrder?.proof_status === 'delivered' ||
                          latestOrder?.trackingNumber; // Has tracking number means label was created
    
    console.log('🔄 Is label printed?:', isLabelPrinted);
    
    if (!isLabelPrinted) {
      console.log('🔄 Label not printed yet');
      return false;
    }
    
    // Check if we're within 5-day lock window
    if (!profile?.pro_current_period_end) {
      console.log('🔄 No period end date, allowing swap');
      return true;
    }
    
    const periodEnd = new Date(profile.pro_current_period_end);
    const lockDate = new Date(periodEnd);
    lockDate.setDate(periodEnd.getDate() - 5);
    
    const now = new Date();
    const canSwap = now < lockDate;
    
    console.log('🔄 Period end:', periodEnd);
    console.log('🔄 Lock date:', lockDate);
    console.log('🔄 Now:', now);
    console.log('🔄 Can swap?:', canSwap);
    
    return canSwap; // Can swap if we're before the lock date
  };

  // Get days until design swap window closes
  const getDaysUntilSwapLockout = () => {
    if (!profile?.pro_current_period_end) return null;
    
    const periodEnd = new Date(profile.pro_current_period_end);
    const lockDate = new Date(periodEnd);
    lockDate.setDate(periodEnd.getDate() - 5);
    
    const now = new Date();
    const daysUntil = Math.ceil((lockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntil > 0 ? daysUntil : 0;
  };

  // Handle design swap
  const handleSwapDesign = async () => {
    if (!uploadedFile || !user?.id) return;

    try {
      setIsSwappingDesign(true);
      setSwapError(null);
      setSwapSuccess(null);

      // First, update the user's design file
      const { data } = await updateProMemberDesign({
        variables: {
          userId: user.id,
          designFile: uploadedFile.secure_url
        }
      });

      if (data?.updateProMemberDesign?.success) {
        setSwapSuccess(data.updateProMemberDesign.message);

        // Clear the uploaded file since it's now saved
        setUploadedFile(null);
        // Refresh the page to show updated profile data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSwapError(data?.updateProMemberDesign?.error || 'Failed to update design');
      }
    } catch (error) {
      console.error('Error swapping design:', error);
      setSwapError('Failed to update design. Please try again.');
    } finally {
      setIsSwappingDesign(false);
    }
  };


  // Open Stripe Customer Portal for subscription management
  const handleManageSubscription = async () => {
    console.log('🔍 Debug - Profile data:', profile);
    
    // Check both snake_case and camelCase
    const stripeCustomerId = profile?.pro_stripe_customer_id || profile?.proStripeCustomerId;
    console.log('🔍 Debug - Stripe Customer ID:', stripeCustomerId);
    console.log('🔍 Debug - Profile keys:', Object.keys(profile || {}));
    
    if (!stripeCustomerId) {
      console.error('❌ No Stripe customer ID found in profile');
      console.error('❌ Profile:', profile);
      alert('Unable to manage subscription: No Stripe customer ID found. Please contact support.');
      return;
    }

    try {
      setIsLoadingPortal(true);

      // Use same URL logic as Apollo Client
      const getApiUrl = () => {
        if (process.env.NEXT_PUBLIC_API_URL) {
          return process.env.NEXT_PUBLIC_API_URL;
        }
        if (process.env.NODE_ENV === 'development') {
          return 'http://localhost:4000';
        }
        return 'https://ss-beyond.up.railway.app';
      };
      
      const backendUrl = getApiUrl();
      console.log('🔍 Debug - Backend URL:', backendUrl);
      console.log('🔍 Debug - Sending customer ID:', stripeCustomerId);
      
      const response = await fetch(`${backendUrl}/api/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: stripeCustomerId,
          returnUrl: `${window.location.origin}/account/dashboard?view=pro-membership`
        }),
      });

      console.log('🔍 Debug - Response status:', response.status);
      const data = await response.json();
      console.log('🔍 Debug - Response data:', data);

      if (data.success && data.url) {
        // Open Stripe portal in new tab
        window.open(data.url, '_blank');
      } else {
        console.error('Failed to create portal session:', data.error);
        alert(`Unable to open subscription management: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error opening Stripe portal:', error);
      alert('Unable to open subscription management. Please try again later.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // Calculate next print date (30 days from subscription start)
  const getNextPrintDate = () => {
    if (!profile?.pro_current_period_start) {
      return null;
    }

    const periodStart = new Date(profile.pro_current_period_start);
    const nextPrintDate = new Date(periodStart);
    nextPrintDate.setDate(nextPrintDate.getDate() + 30);
    
    return nextPrintDate;
  };

  // Check if we're within 5 days of the next print
  const isWithinNotificationWindow = () => {
    const nextPrint = getNextPrintDate();
    if (!nextPrint) return false;

    const today = new Date();
    const daysUntilPrint = Math.ceil((nextPrint.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilPrint <= 5 && daysUntilPrint >= 0;
  };

  // Get days until next print
  const getDaysUntilNextPrint = () => {
    const nextPrint = getNextPrintDate();
    if (!nextPrint) return null;

    const today = new Date();
    const daysUntil = Math.ceil((nextPrint.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntil;
  };

  const nextPrintDate = getNextPrintDate();
  const daysUntil = getDaysUntilNextPrint();
  const withinWindow = isWithinNotificationWindow();

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get next business day (skip weekends)
  const getNextBusinessDay = (date: Date): Date => {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    
    // If Saturday (6), add 2 days to get to Monday
    if (dayOfWeek === 6) {
      result.setDate(result.getDate() + 2);
    }
    // If Sunday (0), add 1 day to get to Monday
    else if (dayOfWeek === 0) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  };

  // Upload functions
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await uploadFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await uploadFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const uploadFile = async (file: File) => {
    try {
      setUploadError(null);
      setIsUploading(true);
      setUploadProgress({ percentage: 0, loaded: 0, total: file.size });

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        setIsUploading(false);
        return;
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        file,
        undefined,
        (progress) => {
          setUploadProgress(progress);
        },
        'pro-uploads'
      );

      setUploadedFile(result);
      setIsUploading(false);
      setUploadProgress(null);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-6">
    

      {/* Alert Banners */}
      {daysUntilLock !== null && daysUntilLock <= 3 && daysUntilLock > 0 && !profile?.pro_design_locked && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
          <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-cyan-300 mb-1">Design Lock Warning</h3>
            <p className="text-sm text-cyan-200/80">
              Your design will be locked in {daysUntilLock} day{daysUntilLock !== 1 ? 's' : ''} for production.  Make any changes now!
            </p>
          </div>
        </div>
      )}

      {/* Membership Status Card */}
      <div 
        className="px-6 pt-6 pb-4 rounded-2xl relative overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        {/* Animated gradient background */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)',
            backgroundSize: '300% 300%',
            animation: 'gradient-move 3s ease-in-out infinite',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Pro Badge" 
                className="h-12 w-auto"
              />
              <div>
                <h2 className="text-xl font-bold text-white">Active Member</h2>
                <p className="text-sm text-cyan-400">
                  {profile?.pro_plan === 'monthly' ? 'Monthly Plan' : 
                   profile?.pro_plan === 'annual' ? 'Annual Plan' : 'Pro Plan'}
                </p>
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="text-xs text-cyan-300 hover:text-cyan-200 underline mt-1 transition-colors disabled:opacity-50"
                >
                  {isLoadingPortal ? 'Opening...' : 'Manage Subscription'}
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-400">Active</span>
              </div>
            </div>
          </div>

          {/* Membership Period */}
          {profile?.pro_current_period_start && profile?.pro_current_period_end && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Current Billing Period</p>
              <p className="text-sm text-white mb-3">
                {new Date(profile.pro_current_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' → '}
                {new Date(profile.pro_current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="w-full px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(61, 209, 249, 0.2), rgba(43, 184, 217, 0.2))',
                  border: '1px solid rgba(61, 209, 249, 0.3)',
                  color: '#3dd1f9'
                }}
              >
                {isLoadingPortal ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Opening...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Subscription
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Next Monthly Stickers */}
      {nextPrintDate && (
        <div 
          className="p-6 rounded-2xl"
          style={{
            background: withinWindow 
              ? 'linear-gradient(135deg, rgba(61, 209, 249, 0.1), rgba(43, 184, 217, 0.1))'
              : 'rgba(255, 255, 255, 0.05)',
            border: withinWindow 
              ? '1px solid rgba(61, 209, 249, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: withinWindow 
              ? 'rgba(61, 209, 249, 0.2) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
              : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/20 flex-shrink-0">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {withinWindow ? '🎉 Your Monthly Stickers Are Being Prepared!' : 'Next Monthly Sticker Batch'}
              </h3>
              
              {daysUntil !== null && (
                <div className="mb-3">
                  {daysUntil > 0 ? (
                    <p className="text-cyan-400 font-medium">
                      {withinWindow ? 'Printing in' : 'Prints in'} {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                    </p>
                  ) : daysUntil === 0 ? (
                    <p className="text-cyan-400 font-medium">Printing today! 🚀</p>
                  ) : (
                    <p className="text-gray-400">Check your orders for tracking</p>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-300 mb-4">
                <strong className="text-white">Print Date:</strong> {formatDate(nextPrintDate)}
              </p>

              {withinWindow && (
                <div 
                  className="p-4 rounded-lg mb-4"
                  style={{
                    background: 'rgba(61, 209, 249, 0.1)',
                    border: '1px solid rgba(61, 209, 249, 0.2)',
                  }}
                >
                  <p className="text-sm text-cyan-300">
                    <strong>✨ What's Next:</strong> We'll send you a proof for approval before printing. 
                    Once approved, your 100 custom stickers will ship with FREE 2-Day Air delivery!
                  </p>
                </div>
              )}

              {/* Design Upload Section */}
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  {withinWindow 
                    ? 'Make sure your design is uploaded for this month\'s batch!'
                    : 'Upload or update your design for next month\'s batch'}
                </p>
                
                <Link href="/pro/upload">
                  <button 
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)',
                      backgroundSize: '300% 300%',
                      animation: 'gradient-move 3s ease-in-out infinite',
                      border: '1px solid rgba(61, 209, 249, 0.4)',
                      boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                    }}
                  >
                    {withinWindow ? 'View/Update Design' : 'Upload Design'}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Month's Sticker Design */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {currentMonthProOrder && (
              currentMonthProOrder.proof_status === 'shipped' || 
              currentMonthProOrder.proof_status === 'delivered' ||
              currentMonthProOrder.trackingNumber
            )
              ? "Here's what we're printing next month:"
              : currentMonthProOrder 
              ? "Here's what we're printing this month:" 
              : "Upload your design to get started"}
          </h3>
          {currentMonthProOrder && (
            <Link 
              href={`/account/dashboard?view=orders&orderId=${currentMonthProOrder.id}`}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2"
            >
              <span>Order #{currentMonthProOrder.orderNumber}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Preview */}
          <div className="space-y-4">
            {(() => {
              // Check both snake_case and camelCase versions
              const profileDesignFile = profile?.pro_current_design_file || profile?.proCurrentDesignFile;
              const showNextMonth = profileDesignFile && currentMonthProOrder && canSwapDesign();
              
              console.log('🖼️ Design display check:', {
                profileDesignFile,
                currentMonthProOrder: !!currentMonthProOrder,
                canSwap: canSwapDesign(),
                showNextMonth,
                profile
              });
              
              return showNextMonth;
            })() ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-purple-400/30 bg-white/5 backdrop-blur-md">
                  <AIFileImage
                    src={profile?.pro_current_design_file || profile?.proCurrentDesignFile}
                    filename="Next Month Design"
                    alt="Next month's sticker design"
                    className="w-full h-64 object-contain p-4"
                    size="preview"
                    showFileType={false}
                  />
                </div>
                
                {/* Status message for next month's design */}
                <div 
                  className="p-4 rounded-xl"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      {profile?.pro_design_approved ? (
                        <>
                          <p className="font-medium mb-1 text-green-300">
                            This design has already been approved and will be automatically printed if the design is not changed
                          </p>
                          {(profile?.pro_current_period_end || profile?.proCurrentPeriodEnd) && (
                            <p className="text-xs text-cyan-400 mt-2">
                              Prints on {(() => {
                                const periodEnd = new Date(profile?.pro_current_period_end || profile?.proCurrentPeriodEnd);
                                return getNextBusinessDay(periodEnd).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                });
                              })()}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium mb-1 text-purple-300">
                            This design will be sent for proofing 5 days before your next billing cycle.
                          </p>
                          {(profile?.pro_current_period_end || profile?.proCurrentPeriodEnd) && (
                            <p className="text-xs text-cyan-400 mt-1">
                              This proof will be sent on {(() => {
                                const periodEnd = new Date(profile?.pro_current_period_end || profile?.proCurrentPeriodEnd);
                                const proofDate = new Date(periodEnd);
                                proofDate.setDate(periodEnd.getDate() - 5);
                                return getNextBusinessDay(proofDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                });
                              })()}
                            </p>
                          )}
                          {(profile?.pro_design_updated_at || profile?.proDesignUpdatedAt) && (
                            <p className="text-xs text-gray-500 mt-2">
                              Design swapped: {new Date(profile?.pro_design_updated_at || profile?.proDesignUpdatedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : currentMonthProOrder && getCurrentMonthImage() ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-cyan-400/30 bg-white/5 backdrop-blur-md">
                  <AIFileImage
                    src={getCurrentMonthImage()}
                    filename="Current Month Design"
                    alt="Current month's sticker design"
                    className="w-full h-64 object-contain p-4"
                    size="preview"
                    showFileType={false}
                  />
                </div>
                
                {/* Status message based on proof_status */}
                <div 
                  className="p-4 rounded-xl"
                  style={{
                    background: currentMonthProOrder.proof_status === 'printing' || currentMonthProOrder.proof_status === 'approved'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : currentMonthProOrder.proof_status === 'awaiting_approval'
                      ? 'rgba(251, 191, 36, 0.1)'
                      : 'rgba(59, 130, 246, 0.1)',
                    border: currentMonthProOrder.proof_status === 'printing' || currentMonthProOrder.proof_status === 'approved'
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : currentMonthProOrder.proof_status === 'awaiting_approval'
                      ? '1px solid rgba(251, 191, 36, 0.3)'
                      : '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <svg 
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        currentMonthProOrder.proof_status === 'printing' || currentMonthProOrder.proof_status === 'approved'
                          ? 'text-green-400'
                          : currentMonthProOrder.proof_status === 'awaiting_approval'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className={`font-medium mb-1 ${
                        currentMonthProOrder.proof_status === 'printing' || currentMonthProOrder.proof_status === 'approved'
                          ? 'text-green-300'
                          : currentMonthProOrder.proof_status === 'awaiting_approval'
                          ? 'text-yellow-300'
                          : 'text-blue-300'
                      }`}>
                        {getProofStatusMessage(currentMonthProOrder.proof_status)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Order #{currentMonthProOrder.orderNumber}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Note about requesting changes after proof */}
                {(currentMonthProOrder.proof_status === 'awaiting_approval' || 
                  currentMonthProOrder.proof_status === 'building_proof') && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-blue-300">
                      <strong>Need changes?</strong> Once we send you the proof, you can request revisions by responding to the proof email or contacting support.
                    </p>
                  </div>
                )}
              </div>
            ) : uploadedFile && !canSwapDesign() ? (
              <div className="rounded-xl p-4 bg-green-500/20 backdrop-blur-md border border-green-400/30">
                <div className="flex gap-4 items-start">
                  {/* Image Preview */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-green-400/30 bg-white/5 backdrop-blur-md p-2 flex items-center justify-center flex-shrink-0">
                    <AIFileImage
                      src={uploadedFile.secure_url}
                      filename={uploadedFile.original_filename}
                      alt={uploadedFile.original_filename}
                      className="w-full h-full object-contain"
                      size="preview"
                      showFileType={false}
                    />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="text-green-400 text-lg">📎</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-green-200 font-medium break-words text-sm">{uploadedFile.original_filename}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => document.getElementById('pro-file-input')?.click()}
                          className="text-blue-300 hover:text-blue-200 p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Replace file"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => setUploadedFile(null)}
                          className="text-red-300 hover:text-red-200 p-1.5 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* File Details */}
                    <div className="flex flex-wrap items-center gap-3 text-green-300/80 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="text-green-400">📏</span>
                        {(uploadedFile.bytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-green-400">🎨</span>
                        {uploadedFile.format.toUpperCase()}
                      </span>
                      {uploadedFile.width && uploadedFile.height && (
                        <span className="flex items-center gap-1">
                          <span className="text-green-400">📐</span>
                          {uploadedFile.width}x{uploadedFile.height}px
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-green-300 text-xs">
                      ✅ Design uploaded successfully!
                    </div>
                  </div>
                </div>

                {/* Send/Swap Design Button */}
                <div className="mt-4">
                  <button
                    onClick={handleSwapDesign}
                    disabled={isSwappingDesign || isDesignLocked()}
                    className="w-full px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      background: isDesignLocked() 
                        ? 'rgba(156, 163, 175, 0.3)'
                        : 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)',
                      backgroundSize: '300% 300%',
                      animation: isDesignLocked() ? 'none' : 'gradient-move 3s ease-in-out infinite',
                      border: `1px solid ${isDesignLocked() ? 'rgba(156, 163, 175, 0.4)' : 'rgba(61, 209, 249, 0.4)'}`,
                      boxShadow: isDesignLocked() 
                        ? 'none'
                        : 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    {isSwappingDesign ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Updating Design...
                      </div>
                    ) : isDesignLocked() ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Design Locked
                      </div>
                    ) : (
                      'Swap Design'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 rounded-xl overflow-hidden border border-white/20 bg-white/5 flex items-center justify-center">
                <div 
                  className="w-full h-full border-2 border-dashed border-gray-400/30 rounded-xl p-4 text-center hover:border-gray-400/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('pro-file-input')?.click()}
                >
                  {isUploading ? (
                    <div className="mb-2">
                      <div className="text-2xl mb-2">⏳</div>
                      <p className="text-white font-medium text-base mb-2">Uploading...</p>
                      {uploadProgress && (
                        <>
                          <div className="w-full max-w-xs mx-auto bg-white/20 rounded-full h-2 mb-1">
                            <div 
                              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.percentage}%` }}
                            ></div>
                          </div>
                          <p className="text-white/80 text-sm">{uploadProgress.percentage}% complete</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex justify-center">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                          alt="Upload file" 
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                      <p className="text-white font-medium text-base mb-2">
                        Drag or click to upload
                      </p>
                      <p className="text-gray-400 text-xs mb-2">
                        AI, EPS, SVG, PSD, PNG, JPG, PDF up to 50MB
                      </p>
                      <div className="text-xs text-gray-500">
                        <p>• Vector files preferred</p>
                        <p>• High-res raster files accepted</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Hidden file input */}
            <input
              id="pro-file-input"
              type="file"
              accept=".ai,.eps,.svg,.psd,.pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload design file"
            />

            {/* Upload error */}
            {uploadError && !uploadedFile && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-300 text-sm">{uploadError}</p>
              </div>
            )}
          </div>

          {/* Timeline Info */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Print Date</p>
                  <p className="text-sm text-cyan-400">
                    {currentMonthProOrder && (currentMonthProOrder.proof_status === 'printing' || currentMonthProOrder.proof_status === 'approved') && currentMonthProOrder.proof_status !== 'delivered' && currentMonthProOrder.proof_status !== 'shipped'
                      ? formatDate(getNextBusinessDay(new Date(currentMonthProOrder.createdAt)))
                      : (profile?.pro_current_period_end || profile?.proCurrentPeriodEnd)
                      ? formatDate(getNextBusinessDay(new Date(profile?.pro_current_period_end || profile?.proCurrentPeriodEnd)))
                      : nextPrintDate 
                      ? formatDate(getNextBusinessDay(nextPrintDate)) 
                      : 'TBD'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Estimated Delivery</p>
                  <p className="text-sm text-green-400">
                    {(() => {
                      let deliveryDate: Date;
                      if (currentMonthProOrder && (currentMonthProOrder.proof_status === 'printing' || currentMonthProOrder.proof_status === 'approved') && currentMonthProOrder.proof_status !== 'delivered' && currentMonthProOrder.proof_status !== 'shipped') {
                        deliveryDate = new Date(currentMonthProOrder.createdAt);
                        deliveryDate.setDate(deliveryDate.getDate() + 5);
                      } else if (profile?.pro_current_period_end || profile?.proCurrentPeriodEnd) {
                        deliveryDate = new Date(profile?.pro_current_period_end || profile?.proCurrentPeriodEnd);
                        deliveryDate.setDate(deliveryDate.getDate() + 5);
                      } else if (nextPrintDate) {
                        deliveryDate = new Date(nextPrintDate);
                        deliveryDate.setDate(deliveryDate.getDate() + 5);
                      } else {
                        return 'TBD';
                      }
                      return formatDate(getNextBusinessDay(deliveryDate));
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Quantity</p>
                  <p className="text-sm text-purple-400">100 custom stickers</p>
                </div>
              </div>
            </div>

            {/* Design Swap Section - Show when order is delivered/shipped */}
            {canSwapDesign() && (
              <div className="mt-4 p-4 rounded-xl" style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}>
                <div className="flex items-start gap-3 mb-3">
                  <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1">Swap Design for Next Month</h4>
                    <p className="text-xs text-gray-300">
                      Upload a new design for your next monthly order.
                      {profile?.pro_current_period_end && (
                        <span className="block mt-1 text-cyan-400">
                          Next print: {new Date(profile.pro_current_period_end).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      )}
                    </p>
                    {getDaysUntilSwapLockout() !== null && getDaysUntilSwapLockout()! <= 7 && getDaysUntilSwapLockout()! > 0 && (
                      <p className="text-xs text-yellow-300 mt-2">
                        ⏰ Swap window closes in {getDaysUntilSwapLockout()} day{getDaysUntilSwapLockout() !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload interface */}
                {uploadedFile ? (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center p-2 rounded-lg bg-purple-500/20 border border-purple-400/30">
                      <div className="w-12 h-12 rounded overflow-hidden border border-purple-400/30 bg-white/5 flex-shrink-0">
                        <AIFileImage
                          src={uploadedFile.secure_url}
                          filename={uploadedFile.original_filename}
                          alt={uploadedFile.original_filename}
                          className="w-full h-full object-contain p-1"
                          size="thumbnail"
                          showFileType={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{uploadedFile.original_filename}</p>
                        <p className="text-xs text-gray-400">
                          {(uploadedFile.bytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-red-300 hover:text-red-200 p-1.5 hover:bg-red-500/20 rounded transition-colors"
                        title="Remove file"
                        aria-label="Remove file"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={handleSwapDesign}
                      disabled={isSwappingDesign}
                      className="w-full px-3 py-2 rounded-lg font-medium text-sm text-white transition-all hover:scale-105 disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.25) 50%, rgba(139, 92, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        boxShadow: 'rgba(139, 92, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                    >
                      {isSwappingDesign ? 'Updating...' : 'Confirm Design Swap'}
                    </button>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-purple-400/30 rounded-lg p-4 text-center hover:border-purple-400/50 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('pro-file-input')?.click()}
                  >
                    <svg className="w-8 h-8 mx-auto text-purple-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-white font-medium text-sm">Upload New Design</p>
                    <p className="text-xs text-gray-400 mt-1">
                      AI, EPS, SVG, PSD, PNG, JPG, PDF
                    </p>
                  </div>
                )}

                {/* Success/Error messages */}
                {swapSuccess && (
                  <div className="mt-2 p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <p className="text-xs text-green-300">{swapSuccess}</p>
                  </div>
                )}
                {swapError && (
                  <div className="mt-2 p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                    <p className="text-xs text-red-300">{swapError}</p>
                  </div>
                )}
              </div>
            )}

            {withinWindow && (
              <div 
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(61, 209, 249, 0.1)',
                  border: '1px solid rgba(61, 209, 249, 0.2)',
                }}
              >
                <p className="text-sm text-cyan-300">
                  <strong>📋 Next Steps:</strong> We'll send you a proof for approval before printing. 
                  Once approved, your stickers will be printed and shipped with FREE 2-Day Air delivery!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order History */}
      {proOrders.length > 0 && (
        <div 
          className="p-6 rounded-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Recent Pro Orders</h3>
          </div>
          <div className="space-y-3">
            {proOrders.map((order: any) => {
              // Get the order's design image
              const orderDesignImage = order.items?.[0]?.customFiles?.[0];
              
              return (
                <div 
                  key={order.id}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {orderDesignImage ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-cyan-400/30 bg-white/5 flex-shrink-0">
                          <AIFileImage
                            src={orderDesignImage}
                            filename="Order Design"
                            alt="Order design"
                            className="w-full h-full object-contain p-1"
                            size="thumbnail"
                            showFileType={false}
                          />
                        </div>
                      ) : (
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                          alt="Pro" 
                          className="w-6 h-6"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {order.orderNumber || order.id.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      order.fulfillmentStatus === 'fulfilled' 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : order.fulfillmentStatus === 'unfulfilled'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                    }`}>
                      {order.fulfillmentStatus === 'fulfilled' && '✓ Delivered'}
                      {order.fulfillmentStatus === 'unfulfilled' && '⏳ Processing'}
                      {order.fulfillmentStatus === 'partial' && '📦 Partial'}
                      {!order.fulfillmentStatus && 'Pending'}
                    </div>
                  </div>

                  {/* Timeline Row */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className={`p-2 rounded-lg border ${
                      order.trackingNumber 
                        ? 'bg-cyan-500/10 border-cyan-500/20' 
                        : 'bg-gray-500/5 border-gray-500/10'
                    }`}>
                      <p className="text-xs text-gray-400 mb-1">Shipped</p>
                      <p className={`text-xs font-medium ${
                        order.trackingNumber ? 'text-cyan-300' : 'text-gray-500'
                      }`}>
                        {order.trackingNumber 
                          ? new Date(order.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Pending'
                        }
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg border ${
                      order.fulfillmentStatus === 'fulfilled'
                        ? 'bg-green-500/10 border-green-500/20' 
                        : 'bg-gray-500/5 border-gray-500/10'
                    }`}>
                      <p className="text-xs text-gray-400 mb-1">Delivered</p>
                      <p className={`text-xs font-medium ${
                        order.fulfillmentStatus === 'fulfilled' ? 'text-green-300' : 'text-gray-500'
                      }`}>
                        {order.fulfillmentStatus === 'fulfilled'
                          ? new Date(order.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Pending'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Order Countdown */}
      {daysUntilNextOrder !== null && (
        <div 
          className="p-6 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.1))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: 'rgba(168, 85, 247, 0.2) 0px 8px 32px',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Next Order Generation</h3>
              <p className="text-sm text-gray-400">Automated monthly sticker batch</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Order Creation</p>
              <p className="text-2xl font-bold text-purple-400">
                {daysUntilNextOrder === 0 ? 'Today!' : `${daysUntilNextOrder} day${daysUntilNextOrder !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Design Lock</p>
              <p className="text-2xl font-bold text-cyan-400">
                {daysUntilLock === 0 ? 'Locked' : daysUntilLock === null || daysUntilLock < 0 ? 'Locked' : `${daysUntilLock} day${daysUntilLock !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pro Benefits */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Your Pro Benefits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">100 Monthly Stickers</p>
              <p className="text-sm text-gray-400">Custom design every month</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">FREE 2-Day Air Shipping</p>
              <p className="text-sm text-gray-400">On all orders</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Priority Printing</p>
              <p className="text-sm text-gray-400">Your orders print first</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Exclusive Discounts</p>
              <p className="text-sm text-gray-400">Bigger savings on bulk orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Need Help */}
      <div 
        className="p-4 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <p className="text-sm text-gray-400 text-center">
          Questions about your Pro membership?{' '}
          <Link href="/account/dashboard?view=support" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Contact Support
          </Link>
        </p>
      </div>

      <style jsx global>{`
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
      `}</style>
    </div>
  );
}

