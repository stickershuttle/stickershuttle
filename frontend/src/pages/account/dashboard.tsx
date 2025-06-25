import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { getSupabase } from '../../lib/supabase';
import { useDashboardData } from '../../hooks/useDashboardData';
import OrderInvoice from '../../components/OrderInvoice';
import { useLazyQuery, useMutation, gql, useApolloClient } from '@apollo/client';
import { GET_ORDER_BY_ID } from '../../lib/order-mutations';
import { 
  GET_USER_CREDIT_BALANCE, 
  GET_UNREAD_CREDIT_NOTIFICATIONS,
  MARK_CREDIT_NOTIFICATIONS_READ,
  GET_USER_EARNED_CREDITS_BY_ORDER
} from '../../lib/credit-mutations';
import { UPDATE_USER_PROFILE_PHOTO, UPDATE_USER_PROFILE_BANNER } from '../../lib/profile-mutations';


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
import { useCart } from '../../components/CartContext';
import AnimatedCreditCounter from '../../components/AnimatedCreditCounter';
import { generateCartItemId } from '../../types/product';
import { 
  calculateRealPrice, 
  loadRealPricingData, 
  BasePriceRow, 
  QuantityDiscountRow 
} from '../../utils/real-pricing';

// Using real order data only - no more sample/demo data

type DashboardView = 'default' | 'all-orders' | 'financial' | 'items-analysis' | 'design-vault' | 'proofs' | 'order-details' | 'settings' | 'support';

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
  trackingCompany?: string | null;
  trackingUrl?: string | null;
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
  // Order status fields
  orderStatus?: string;
  orderCreatedAt?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
}

function Dashboard() {
  const router = useRouter();
  const { addToCart } = useCart();
  const client = useApolloClient();
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
  
  // Credit queries and mutations
  const [markCreditNotificationsRead] = useMutation(MARK_CREDIT_NOTIFICATIONS_READ);

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
  const [updatedQuantities, setUpdatedQuantities] = useState<{ [index: number]: number }>({});
  const [updatedPrices, setUpdatedPrices] = useState<{ [index: number]: { total: number; perSticker: number } }>({});
  const [pricingData, setPricingData] = useState<any>(null);
  // Terminal loading animation state
  const [showTerminalLoader, setShowTerminalLoader] = useState(true);
  const [terminalLoadingDots, setTerminalLoadingDots] = useState('');
  const [terminalOrderText, setTerminalOrderText] = useState('');
  const [isTerminalTyping, setIsTerminalTyping] = useState(false);
  // Calculate rush savings using useMemo to avoid infinite re-renders
  const rushSavingsAmount = useMemo(() => {
    if (!reorderOrderData || !showReorderPopup) return 0;
    
    let totalRushSavings = 0;
    
    reorderOrderData.items.forEach((item: any, index: number) => {
      // Skip removed items
      if (removedItems.has(index)) return;
      
      const itemData = reorderOrderData._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
      const hadRushOrder = itemData.calculatorSelections?.rush?.value === true;
      const rushOrderRemoved = removedRushItems.has(index);
      
      if (hadRushOrder && rushOrderRemoved) {
        if (updatedPrices[index]) {
          // Calculate actual rush savings by applying 40% difference directly
          const pricingWithoutRush = updatedPrices[index].total;
          // Rush order adds 40%, so removing it saves 28.57% (1/1.4 = 0.714, so savings = 1 - 0.714 = 0.286)
          const pricingWithRush = pricingWithoutRush / 0.714; // Reverse the 40% reduction
          const savings = pricingWithRush - pricingWithoutRush;
          totalRushSavings += savings;
          
          console.log(`💰 Rush savings calculation for item ${index}:`, {
            pricingWithoutRush,
            pricingWithRush,
            savings,
            expectedSavingsPercent: ((savings / pricingWithRush) * 100).toFixed(1) + '%'
          });
        } else {
          // Calculate based on original price difference
          const originalQty = item.quantity || 1;
          const currentQty = updatedQuantities[index] ?? originalQty;
          const originalUnitPrice = item.unitPrice || item.totalPrice / originalQty || 0;
          const originalTotal = originalUnitPrice * currentQty;
          
          // Apply the same 40% savings calculation
          const pricingWithRush = originalTotal;
          const pricingWithoutRush = originalTotal / 1.4; // Remove 40% rush fee
          const savings = pricingWithRush - pricingWithoutRush;
          totalRushSavings += savings;
        }
      }
    });
    
    return totalRushSavings;
  }, [reorderOrderData, removedItems, removedRushItems, updatedPrices, updatedQuantities, showReorderPopup]);

  // Settings view state (moved to top level to avoid hooks error)
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
  
  // Credit system state
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [previousCreditBalance, setPreviousCreditBalance] = useState<number>(0);
  const [creditNotifications, setCreditNotifications] = useState<any[]>([]);
  const [lifetimeCredits, setLifetimeCredits] = useState<number>(0);
  const [showCreditNotification, setShowCreditNotification] = useState(false);
  const [showAnimatedCounter, setShowAnimatedCounter] = useState(false);
  const [expandedPillButton, setExpandedPillButton] = useState<string | null>(null);

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

  // Add custom styles for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes liquid-flow {
        0% {
          background-position: 0% 50%;
        }
        25% {
          background-position: 100% 50%;
        }
        50% {
          background-position: 100% 100%;
        }
        75% {
          background-position: 0% 100%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      @keyframes stellar-drift {
        0% {
          background-position: 0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%;
        }
        20% {
          background-position: 30% 40%, 50% 10%, 70% 60%, 90% 80%, 20% 100%, 40% 50%;
        }
        40% {
          background-position: 60% 70%, 80% 50%, 90% 30%, 20% 90%, 40% 20%, 70% 10%;
        }
        60% {
          background-position: 80% 100%, 100% 80%, 30% 40%, 50% 60%, 70% 50%, 90% 70%;
        }
        80% {
          background-position: 100% 50%, 30% 70%, 50% 100%, 70% 30%, 90% 90%, 60% 60%;
        }
        100% {
          background-position: 0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%;
        }
      }
      
      @keyframes nebula-pulse {
        0%, 100% {
          opacity: 0.3;
        }
        50% {
          opacity: 0.6;
        }
      }
      
      @keyframes star-twinkle {
        0%, 100% {
          opacity: 0.1;
        }
        50% {
          opacity: 0.3;
        }
      }
      
      .animate-liquid-flow {
        background-size: 400% 400%;
        animation: liquid-flow 8s ease-in-out infinite;
      }
      
      .stellar-void-animation {
        position: relative;
        overflow: hidden;
      }
      
      .stellar-void-animation::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 25% 30%, rgba(139, 92, 246, 0.4) 0%, transparent 60%);
        animation: nebula-pulse 4s ease-in-out infinite;
      }
      
      .stellar-void-animation::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 75% 70%, rgba(124, 58, 237, 0.3) 0%, transparent 50%);
        animation: nebula-pulse 4s ease-in-out infinite 2s;
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
      
      @keyframes float-1 {
        0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
        33% { transform: translateY(-10px) rotate(15deg) scale(1.05); }
        66% { transform: translateY(-5px) rotate(-10deg) scale(0.95); }
      }
      
      @keyframes float-2 {
        0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
        25% { transform: translateY(-8px) translateX(4px) rotate(10deg); }
        50% { transform: translateY(-12px) translateX(-2px) rotate(20deg); }
        75% { transform: translateY(-8px) translateX(6px) rotate(15deg); }
      }
      
      @keyframes float-3 {
        0%, 100% { transform: translateY(0) translateZ(0) rotate(0deg); }
        50% { transform: translateY(-8px) translateZ(20px) rotate(25deg); }
      }
      
      @keyframes depth-blur {
        0%, 100% { filter: blur(2px); opacity: 0.4; }
        50% { filter: blur(0px); opacity: 0.8; }
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
    
    // Fetch credit data when user is available
    if (user && (user as any)?.id) {
      (async () => {
        await fetchCreditData();
      })();
    }

    // Load pricing data
    if (!pricingData) {
      loadPricing();
    }
  }, [user, userLoading, profile, router, pricingData]);

  // Initialize settings form data when profile loads
  useEffect(() => {
    if (profile || user) {
      setSettingsData(prev => ({
        ...prev,
        firstName: profile?.first_name || (user as any)?.user_metadata?.first_name || '',
        lastName: profile?.last_name || (user as any)?.user_metadata?.last_name || '',
        companyName: profile?.company_name || '',
        email: (user as any)?.email || ''
      }));
    }
  }, [profile, user]);

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

  // Terminal loading animation
  useEffect(() => {
    // Show terminal for all views
    if (showTerminalLoader) {
      // Reset terminal text when view changes
      setTerminalLoadingDots('');
      setTerminalOrderText('');
      setIsTerminalTyping(false);
      
      // Animate dots
      const dotsInterval = setInterval(() => {
        setTerminalLoadingDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);

      // After 2 seconds, start typing the appropriate message
      const typingTimeout = setTimeout(() => {
        clearInterval(dotsInterval);
        setIsTerminalTyping(true);
        
        let orderText = '';
        
        // Dynamic messages based on currentView
        switch (currentView) {
          case 'default':
            // Get most recent order for default view
            const mostRecentOrder = orders.length > 0 ? orders[0] : null;
            
            if (mostRecentOrder && mostRecentOrder.status) {
              // Map status to display text
              const statusMap: { [key: string]: string } = {
                'paid': 'PAYMENT RECEIVED',
                'unpaid': 'AWAITING PAYMENT',
                'pending': 'PROCESSING',
                'processing': 'IN PRODUCTION',
                'shipped': 'SHIPPED',
                'delivered': 'DELIVERED',
                'cancelled': 'CANCELLED',
                'refunded': 'REFUNDED',
                'on_hold': 'ON HOLD',
                'failed': 'FAILED',
                'Proof Review Needed': 'PROOF REVIEW NEEDED',
                'Reviewing Changes': 'REVIEWING CHANGES',
                'Proof Approved': 'PROOF APPROVED',
                'Pre-production': 'PRE-PRODUCTION',
                'Ready to Ship': 'READY TO SHIP',
                'Out for Delivery': 'OUT FOR DELIVERY'
              };
              
              const displayStatus = statusMap[mostRecentOrder.status] || (mostRecentOrder.status ? mostRecentOrder.status.toUpperCase() : 'UNKNOWN');
              
              const orderNum = mostRecentOrder.orderNumber || mostRecentOrder.id || 'N/A';
              const trackingStatus = mostRecentOrder.trackingNumber ? 'AVAILABLE' : 'PENDING';
              
              // Ensure no undefined values in the string - extra safety
              const safeOrderNum = orderNum === undefined || orderNum === null ? 'N/A' : String(orderNum);
              const safeDisplayStatus = displayStatus === undefined || displayStatus === null ? 'UNKNOWN' : String(displayStatus);
              const safeTrackingStatus = trackingStatus === undefined || trackingStatus === null ? 'PENDING' : String(trackingStatus);
              
              orderText = `> ORDER #${safeOrderNum}\n> STATUS: ${safeDisplayStatus}\n> TRACKING: ${safeTrackingStatus}`;
            } else {
              orderText = '> NO MISSIONS DETECTED\n> CLICK THE START NEW MISSION BUTTON BELOW';
            }
            break;
            
          case 'all-orders':
            orderText = '> LOADING ORDERS...';
            // After typing LOADING ORDERS..., show order list with typing effect
            setTimeout(() => {
              let ordersDisplay = '';
              if (orders.length > 0) {
                // Show last 3 orders
                const recentOrders = orders.slice(0, 3);
                recentOrders.forEach((order, index) => {
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
            }, 1500);
            break;
            
          case 'financial':
            orderText = '> LOADING FINANCES...';
            // After typing LOADING FINANCES..., show financial info with typing effect
            setTimeout(() => {
              // Calculate total stickers from all orders
              let totalStickers = 0;
              let totalInvested = 0;
              orders.forEach(order => {
                order.items?.forEach(item => {
                  totalStickers += item.quantity || 0;
                });
                totalInvested += order.total || 0;
              });
              
              const financialDisplay = `\n> $${creditBalance.toFixed(2)} STORE CREDIT\n> $${totalInvested.toFixed(2)} TOTAL INVESTED\n> ${totalStickers} STICKERS PRINTED`;
              typeText(financialDisplay, '> LOADING FINANCES...');
            }, 1500);
            break;
            
          case 'design-vault':
            orderText = '> DESIGNS LOADING...';
            // After typing DESIGNS LOADING..., show design count with typing effect
            setTimeout(() => {
              // Count unique designs from orders (same logic as design vault view)
              const uniqueDesigns = new Set();
              orders.forEach(order => {
                order.items?.forEach(item => {
                  if (item.name && item.image) {
                    uniqueDesigns.add(item.name);
                  }
                });
              });
              
              const designCount = uniqueDesigns.size;
              const designWord = designCount === 1 ? 'DESIGN' : 'DESIGNS';
              const designDisplay = `\n> ${designCount} ${designWord} IN THE CLOUD`;
              typeText(designDisplay, '> DESIGNS LOADING...');
            }, 1500);
            break;
            
          case 'proofs':
            // Check if there are proofs to review
            const proofsToReview = orders.filter(order => 
              order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes'
            );
            
            if (proofsToReview.length > 0) {
              orderText = '> MISSION ALERT: YOU HAVE PROOF(S) TO APPROVE. ACT NOW!';
            } else {
              // Check if all proofs are approved
              const hasApprovedProofs = orders.some(order => 
                order.status === 'Proof Approved' || order.proof_status === 'approved'
              );
              
              if (hasApprovedProofs) {
                orderText = '> VINNY: ALL SYSTEMS CLEAR, READY TO LAUNCH.\n> COMMAND: LAUNCHING';
                // Add cycling dots for LAUNCHING after typing
                setTimeout(() => {
                  let dots = '';
                  const launchInterval = setInterval(() => {
                    dots = dots.length >= 3 ? '.' : dots + '.';
                    setTerminalOrderText(`> VINNY: ALL SYSTEMS CLEAR, READY TO LAUNCH.\n> COMMAND: LAUNCHING${dots}`);
                  }, 500);
                  
                  // Store interval to clear later
                  (window as any).launchInterval = launchInterval;
                }, 3000); // Give time for typing to complete
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
            setTimeout(() => {
              let dots = '';
              const adjustInterval = setInterval(() => {
                dots = dots.length >= 3 ? '.' : dots + '.';
                setTerminalOrderText(`> ADJUSTING PANELS${dots}\n> TWEAKING FLIGHT PATTERNS...`);
              }, 500);
              
              // Store interval to clear later
              (window as any).adjustInterval = adjustInterval;
            }, 2000); // Give time for typing to complete
            break;
            
          default:
            orderText = '> SYSTEM READY';
        }
        
        // Helper function to type out text character by character
        const typeText = (text: string, startingText: string = '') => {
          setTerminalOrderText(startingText);
          let charIndex = 0;
          const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
              const currentChar = text[charIndex];
              if (currentChar !== undefined) {
                setTerminalOrderText(prev => prev + currentChar);
              }
              charIndex++;
            } else {
              clearInterval(typeInterval);
            }
          }, 30);
          return typeInterval;
        };

        // Type out the initial message character by character
        const mainTypeInterval = typeText(orderText);

        return () => clearInterval(mainTypeInterval);
      }, currentView === 'default' ? 2000 : 500); // Faster for non-default views

      return () => {
        clearInterval(dotsInterval);
        clearTimeout(typingTimeout);
        // Clear any running intervals
        if ((window as any).launchInterval) {
          clearInterval((window as any).launchInterval);
          delete (window as any).launchInterval;
        }
        if ((window as any).adjustInterval) {
          clearInterval((window as any).adjustInterval);
          delete (window as any).adjustInterval;
        }
      };
    }
  }, [currentView, orders, creditBalance, lifetimeCredits]);

  // Handle URL query parameters for view navigation
  useEffect(() => {
    // Get the requested view from URL
    const requestedView = router.query.view as string;
    
    // If no view in URL, set to default
    if (!requestedView && currentView !== 'default') {
      setCurrentView('default');
      return;
    }
    
    // If view in URL is different from current, update
    if (requestedView && requestedView !== currentView) {
      const validViews: DashboardView[] = ['default', 'all-orders', 'financial', 'items-analysis', 'design-vault', 'proofs', 'order-details', 'settings', 'support'];
      
      if (validViews.includes(requestedView as DashboardView)) {
        setCurrentView(requestedView as DashboardView);
      }
    }
  }, [router.query.view]);

  // Helper function to update view and URL
  const updateCurrentView = (view: DashboardView) => {
    // If already on the same view, do nothing
    if (currentView === view) return;
    
    // Use a transition state to prevent flashing
    const prevView = currentView;
    
    // Update state immediately
    setCurrentView(view);
    
    // Update URL to reflect the current view
    const url = view === 'default' ? '/account/dashboard' : `/account/dashboard?view=${view}`;
    router.push(url, undefined, { shallow: true });
    
    // Force re-render if moving to/from default view
    if (view === 'default' || prevView === 'default') {
      // Small timeout to ensure smooth transition
      setTimeout(() => {
        setCurrentView(view);
      }, 10);
    }
    
    // Load saved support form draft when switching to support view
    if (view === 'support') {
      const savedDraft = localStorage.getItem('supportFormDraft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setContactFormData(prev => ({ ...prev, ...draft }));
        } catch (e) {
          console.error('Error loading draft:', e);
        }
      }
    }
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

  const loadPricing = async () => {
    try {
      const pricingData = await loadRealPricingData();
      setPricingData(pricingData);
    } catch (error) {
      console.warn('Failed to load pricing data, using fallback pricing:', error);
    }
  };
  
  const fetchCreditData = async () => {
    if (!user || !(user as any)?.id) return;
    
    try {
      // Get Apollo Client instance from the hook
      const apolloClient = client;
      
      // Fetch credit balance
      const { data: balanceData } = await apolloClient.query({
        query: GET_USER_CREDIT_BALANCE,
        variables: { userId: (user as any).id }
      });
      
      if (balanceData?.getUserCreditBalance) {
        const newBalance = balanceData.getUserCreditBalance.balance || 0;
        
        // Check if balance increased and we have notifications
        if (newBalance > creditBalance && creditBalance > 0) {
          setPreviousCreditBalance(creditBalance);
          setCreditBalance(newBalance);
        } else {
          setCreditBalance(newBalance);
        }
      }
      
      // Fetch unread credit notifications
      const { data: notificationData } = await apolloClient.query({
        query: GET_UNREAD_CREDIT_NOTIFICATIONS,
        variables: { userId: (user as any).id }
      });
      
      if (notificationData?.getUnreadCreditNotifications && notificationData.getUnreadCreditNotifications.length > 0) {
        setCreditNotifications(notificationData.getUnreadCreditNotifications);
        // If balance increased, show animated counter instead of static notification
        const newBalance = balanceData?.getUserCreditBalance?.balance || 0;
        if (newBalance > creditBalance && creditBalance > 0) {
          setShowAnimatedCounter(true);
          setShowCreditNotification(false);
        } else {
          setShowCreditNotification(true);
          setShowAnimatedCounter(false);
        }
      }

      // Fetch credit history for points earned display
      const { data: creditHistoryData } = await apolloClient.query({
        query: GET_USER_EARNED_CREDITS_BY_ORDER,
        variables: { userId: (user as any).id }
      });
      
      if (creditHistoryData?.getUserCreditHistory) {
        // Store credit history on user object for access in financial view
        (user as any).creditHistory = creditHistoryData.getUserCreditHistory;
        
        // Calculate lifetime credits earned - ensure it's an array first
        if (Array.isArray(creditHistoryData.getUserCreditHistory)) {
          const lifetimeTotal = creditHistoryData.getUserCreditHistory.reduce((sum: number, credit: any) => {
            if (credit.transaction_type === 'earned') {
              return sum + Math.abs(credit.amount);
            }
            return sum;
          }, 0);
          setLifetimeCredits(lifetimeTotal);
        } else {
          setLifetimeCredits(0);
        }
      }
    } catch (error: any) {
      console.error('Error fetching credit data:', error);
      // Don't show error to user - credit system might not be set up yet
      // Just set default values
      setCreditBalance(0);
      setCreditNotifications([]);
      
      // Log a helpful message for developers
      if (error?.message?.includes('get_user_credit_balance')) {
        console.warn('Credit system not set up. Please run the SQL scripts in Supabase:');
        console.warn('1. docs/CREATE_CREDITS_SYSTEM.sql');
        console.warn('2. docs/ADD_CREDITS_APPLIED_COLUMN.sql');
      }
    }
  };
  
  const handleDismissCreditNotification = async () => {
    if (!user || !(user as any)?.id) return;
    
    try {
      await markCreditNotificationsRead({
        variables: { userId: (user as any).id }
      });
      setShowCreditNotification(false);
      setCreditNotifications([]);
    } catch (error) {
      console.error('Error marking credit notifications as read:', error);
    }
  };

  const handleAnimatedCounterComplete = async () => {
    setShowAnimatedCounter(false);
    setPreviousCreditBalance(0);
    
    // Mark notifications as read
    if (user && (user as any)?.id) {
      try {
        await markCreditNotificationsRead({
          variables: { userId: (user as any).id }
        });
        setCreditNotifications([]);
      } catch (error) {
        console.error('Error marking credit notifications as read:', error);
      }
    }
  };

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
        first_name: profileData?.first_name || (user as any)?.user_metadata?.first_name || '',
        last_name: profileData?.last_name || (user as any)?.user_metadata?.last_name || '',
        phone: (user as any).user_metadata?.phone || '',
        created_at: (user as any).created_at,
        // Profile data from user_profiles table
        profile_photo_url: profileData?.profile_photo_url || null,
        banner_image_url: profileData?.banner_image_url || null,
        profile_photo_public_id: profileData?.profile_photo_public_id || null,
        banner_image_public_id: profileData?.banner_image_public_id || null,
        display_name: profileData?.display_name || null,
        bio: profileData?.bio || null,
        company_name: profileData?.company_name || null,
        // Banner template data
        banner_template: profileData?.banner_template || null,
        banner_template_id: profileData?.banner_template_id || null
      };
      
      console.log('✅ Profile data loaded:', combinedProfile);
      console.log('🎨 Banner template data:', {
        banner_template: combinedProfile.banner_template,
        banner_template_id: combinedProfile.banner_template_id
      });
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


  const handleProfilePictureClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent click from bubbling to banner
    }
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

      // Update profile using GraphQL mutation
      const { data, errors } = await client.mutate({
        mutation: UPDATE_USER_PROFILE_PHOTO,
        variables: {
          userId: (user as any).id,
          photoUrl: result.secure_url,
          photoPublicId: result.public_id
        }
      });

      if (errors || !data?.updateUserProfilePhoto?.success) {
        console.error('GraphQL error updating profile photo:', errors);
        alert(data?.updateUserProfilePhoto?.message || 'Failed to update profile photo');
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

      // Update profile using GraphQL mutation
      const { data, errors } = await client.mutate({
        mutation: UPDATE_USER_PROFILE_BANNER,
        variables: {
          userId: (user as any).id,
          bannerUrl: result.secure_url,
          bannerPublicId: result.public_id,
          bannerTemplate: null, // Clear template when uploading custom image
          bannerTemplateId: null
        }
      });

      if (errors || !data?.updateUserProfileBanner?.success) {
        console.error('GraphQL error updating banner:', errors);
        alert(data?.updateUserProfileBanner?.message || 'Failed to update banner image');
        return;
      }

      // Update local profile state with the response data
      const updatedProfile = data.updateUserProfileBanner.userProfile;
      setProfile((prev: any) => ({
        ...prev,
        banner_image_url: updatedProfile.bannerImageUrl,
        banner_image_public_id: updatedProfile.bannerImagePublicId,
        banner_template: updatedProfile.bannerTemplate,
        banner_template_id: updatedProfile.bannerTemplateId
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
    
    try {
      setUploadingBanner(true);
      
      // Use GraphQL mutation to remove banner
      const { data, errors } = await client.mutate({
        mutation: UPDATE_USER_PROFILE_BANNER,
        variables: {
          userId: (user as any).id,
          bannerUrl: null,
          bannerPublicId: null,
          bannerTemplate: null,
          bannerTemplateId: null
        }
      });

      if (errors || !data?.updateUserProfileBanner?.success) {
        console.error('GraphQL error removing banner:', errors);
        alert(data?.updateUserProfileBanner?.message || 'Failed to remove banner');
        return;
      }

      // Update local profile state with the response data
      const updatedProfile = data.updateUserProfileBanner.userProfile;
      setProfile((prev: any) => ({
        ...prev,
        banner_image_url: updatedProfile.bannerImageUrl,
        banner_image_public_id: updatedProfile.bannerImagePublicId,
        banner_template: updatedProfile.bannerTemplate,
        banner_template_id: updatedProfile.bannerTemplateId
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
    // New Perfect Default Template
    {
      id: 1,
      name: 'Stellar Void (Default)',
      category: 'cosmic',
      isDefault: true,
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

    // Business Themed Templates with Emojis
    {
      id: 2,
      name: 'Bakery Vibes',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fecaca 100%)'
      },
      emojis: ['🧁', '🍰', '🥖', '🥐', '🍪', '🎂']
    },
    {
      id: 3,
      name: 'Barber Shop',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%)'
      },
      emojis: ['✂️', '💈', '🪒', '👨‍🦲', '💇‍♂️', '🧔']
    },
    {
      id: 4,
      name: 'Fashion Store',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #ec4899 0%, #be185d 50%, #9d174d 100%)'
      },
      emojis: ['👗', '👔', '👠', '👜', '💄', '👑']
    },
    {
      id: 5,
      name: 'Candle Shop',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'
      },
      emojis: ['🕯️', '🔥', '✨', '🌙', '💫', '🌟']
    },
    {
      id: 6,
      name: 'Flower Shop',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #fda4af 0%, #fb7185 50%, #f43f5e 100%)'
      },
      emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '💐']
    },
    {
      id: 7,
      name: 'Coffee Shop',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)'
      },
      emojis: ['☕', '🧁', '🥐', '📚', '💻', '🎵']
    },
    {
      id: 8,
      name: 'Gym & Fitness',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)'
      },
      emojis: ['💪', '🏋️‍♀️', '🏃‍♂️', '⚡', '🔥', '🏆']
    },
    {
      id: 9,
      name: 'Pet Care',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)'
      },
      emojis: ['🐕', '🐈', '🐾', '❤️', '🦴', '🎾']
    },
    {
      id: 10,
      name: 'Tech Startup',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)'
      },
      emojis: ['💻', '📱', '⚡', '🚀', '💡', '🔧']
    },



    // Space/NASA Templates
    {
      id: 11,
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
      id: 12,
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
      id: 13,
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
      id: 18,
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
      id: 19,
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
      id: 28,
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
      id: 27,
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
      id: 29,
      name: 'Galactic Vista',
      category: 'cosmic',
      style: {
        backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750883615/261355a9-3a2b-48d8-ad79-08ce1407d61b.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        animation: 'none'
      }
    },
    {
      id: 30,
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

    // Additional Business Templates  
    {
      id: 14,
      name: 'Music Studio',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)'
      },
      emojis: ['🎵', '🎤', '🎸', '🥁', '🎹', '🎧']
    },
    {
      id: 15,
      name: 'Restaurant',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)'
      },
      emojis: ['🍕', '🍔', '🍜', '🥗', '🍷', '👨‍🍳']
    },
    {
      id: 16,
      name: 'Spa & Wellness',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)'
      },
      emojis: ['🧘‍♀️', '💆‍♀️', '🌿', '🕯️', '🛁', '✨']
    },
    {
      id: 17,
      name: 'Auto Repair',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #374151 0%, #4b5563 50%, #6b7280 100%)'
      },
      emojis: ['🔧', '🚗', '⚙️', '🛠️', '🔩', '🚙']
    },
    {
      id: 15,
      name: 'Photography',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #581c87 0%, #7c2d12 50%, #a21caf 100%)'
      },
      emojis: ['📸', '📷', '🌅', '💡', '🎭', '✨']
    },
    {
      id: 16,
      name: 'Real Estate',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)'
      },
      emojis: ['🏠', '🏢', '🔑', '📋', '💼', '🏘️']
    },
    {
      id: 17,
      name: 'Education',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)'
      },
      emojis: ['📚', '🎓', '✏️', '📝', '🍎', '🧑‍🏫']
    },
    {
      id: 18,
      name: 'Travel Agency',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)'
      },
      emojis: ['✈️', '🌍', '🗺️', '🏖️', '🎒', '📍']
    },
    {
      id: 19,
      name: 'Legal Services',
      category: 'business',
      style: {
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)'
      },
      emojis: ['⚖️', '📋', '🏛️', '📜', '✍️', '💼']
    },

    // Neon Cyber Effects
    {
      id: 20,
      name: 'Neon Grid',
      category: 'cyber',
      style: {
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        boxShadow: 'inset 0 0 50px rgba(0, 255, 255, 0.1)'
      }
    },
    {
      id: 21,
      name: 'Deep Space',
      category: 'cyber',
      style: {
        background: 'linear-gradient(135deg, #000000 0%, #050514 25%, #0a0a1f 50%, #0f0f2a 75%, #141435 100%)',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
          radial-gradient(circle at 60% 20%, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
          radial-gradient(circle at 80% 60%, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
          radial-gradient(circle at 30% 80%, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
          radial-gradient(circle at 90% 40%, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
        `,
        backgroundSize: '200px 200px, 300px 300px, 250px 250px, 180px 180px, 320px 320px',
        animation: 'twinkling-stars 12s ease-in-out infinite'
      }
    },
    {
      id: 22,
      name: 'Nebula Cloud',
      category: 'cyber',
      style: {
        background: 'linear-gradient(135deg, #1a0d2e 0%, #2d1b4e 25%, #4a2c6b 50%, #6b3d88 75%, #8b4ea5 100%)',
        backgroundImage: `
          radial-gradient(ellipse at 20% 70%, rgba(138, 43, 226, 0.4) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 30%, rgba(75, 0, 130, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 40% 40%, rgba(199, 21, 133, 0.3) 0%, transparent 40%),
          radial-gradient(ellipse at 60% 80%, rgba(138, 43, 226, 0.2) 0%, transparent 50%)
        `
      }
    },

    {
      id: 24,
      name: 'Galactic Dust',
      category: 'cyber',
      style: {
        background: 'linear-gradient(135deg, #050210 0%, #0a0515 25%, #150a25 50%, #200f35 75%, #2a1445 100%)',
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          radial-gradient(circle at 30% 40%, rgba(138, 43, 226, 0.2) 2px, transparent 2px),
          radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
          radial-gradient(circle at 50% 70%, rgba(75, 0, 130, 0.15) 1px, transparent 1px),
          radial-gradient(circle at 85% 80%, rgba(255, 255, 255, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '100px 100px, 150px 150px, 80px 80px, 120px 120px, 90px 90px',
        animation: 'cosmic-dust 18s ease-in-out infinite'
      }
    },
    {
      id: 25,
      name: 'Cosmic Galaxy',
      category: 'cyber',
      style: {
        background: 'radial-gradient(circle at 20% 80%, #120078 0%, #9d0191 30%, #1a0033 70%, #000 100%)',
        backgroundImage: `
          radial-gradient(circle at 70% 70%, rgba(138, 43, 226, 0.4) 0%, transparent 50%),
          radial-gradient(circle at 20% 80%, rgba(75, 0, 130, 0.3) 0%, transparent 40%),
          radial-gradient(circle at 40% 20%, rgba(255,255,255,0.1) 0%, transparent 20%)
        `,
        backgroundSize: '100% 100%, 300px 300px, 200px 200px, 150px 150px',
        animation: 'gradient-shift 15s ease-in-out infinite'
      }
    },

  ];



  const handleSelectBannerTemplate = async (template: any) => {
    if (!user) return;
    
    setUploadingBanner(true);
    setShowBannerTemplates(false);
    
    try {
      // Create a CSS string for the template
      const templateCSS = JSON.stringify(template.style);
      
      // Update profile using GraphQL mutation
      const { data, errors } = await client.mutate({
        mutation: UPDATE_USER_PROFILE_BANNER,
        variables: {
          userId: (user as any).id,
          bannerUrl: null, // Clear custom image for template
          bannerPublicId: null,
          bannerTemplate: templateCSS,
          bannerTemplateId: template.id
        }
      });

      if (errors || !data?.updateUserProfileBanner?.success) {
        console.error('GraphQL error updating banner template:', errors);
        alert(data?.updateUserProfileBanner?.message || 'Failed to apply template');
        return;
      }
      
      // Update local profile state with the response data
      const updatedProfile = data.updateUserProfileBanner.userProfile;
      setProfile((prev: any) => ({
        ...prev,
        banner_image_url: updatedProfile.bannerImageUrl,
        banner_image_public_id: updatedProfile.bannerImagePublicId,
        banner_template: updatedProfile.bannerTemplate,
        banner_template_id: updatedProfile.bannerTemplateId
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
      id: order.id
    });
    
    // Only show the order_number from supabase column
    // If no order number exists, show the order ID as fallback
    const displayNumber = order.orderNumber || order.order_number || order.id.split('-')[0].toUpperCase();
    console.log(`✅ Display number: ${displayNumber}`);
    return displayNumber;
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
      // Add items to cart and redirect to checkout
      try {
        // Add each item to cart
        reorderOrderData.items.forEach((item: any, index: number) => {
          // Skip removed items
          if (removedItems.has(index)) return;
          
          const itemData = reorderOrderData._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
          const selections = itemData.calculatorSelections || {};
          const currentQty = updatedQuantities[index] ?? (itemData.quantity || item.quantity || 1);
          const currentPrice = updatedPrices[index] || { total: item.totalPrice || 0, perSticker: item.unitPrice || 0 };
          
                     // Create cart item
           const cartItem = {
             id: generateCartItemId(),
             product: {
               id: itemData.productCategory || 'vinyl-stickers',
               sku: `REORDER-${reorderOrderData.id}-${index}`,
               name: itemData.productName || item.name || 'Custom Stickers',
               description: `Reordered ${itemData.productName || item.name || 'Custom Stickers'}`,
               shortDescription: 'Reordered item',
               category: (itemData.productCategory || 'vinyl-stickers') as any,
               basePrice: currentPrice.perSticker,
               images: itemData.customFiles || [item.image] || ['https://res.cloudinary.com/dxcnvqk6b/image/upload/v1747860831/samples/sticker-default.png'],
               defaultImage: itemData.customFiles?.[0] || item.image || 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1747860831/samples/sticker-default.png',
               features: ['Custom Design', 'High Quality'],
               customizable: true,
               isActive: true,
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString()
             },
            customization: {
              productId: itemData.productCategory || 'vinyl-stickers',
              selections: {
                size: {
                  type: 'size-preset' as const,
                  value: selections.size?.value || selections.sizePreset?.value || item.size || 'Medium (3")',
                  displayValue: selections.size?.displayValue || selections.sizePreset?.displayValue || item.size || 'Medium (3")',
                  priceImpact: 0
                },
                material: {
                  type: 'finish' as const,
                  value: selections.material?.value || item.material || 'Matte',
                  displayValue: selections.material?.displayValue || item.material || 'Matte',
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
              totalPrice: currentPrice.total,
              customFiles: itemData.customFiles || item.customFiles || [],
              notes: itemData.customerNotes || item.notes || '',
              isReorder: true
            },
            quantity: currentQty,
            unitPrice: currentPrice.perSticker,
            totalPrice: currentPrice.total,
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
    }
    
    setReorderingId(null);
    setRemovedItems(new Set());
    setRemovedRushItems(new Set());
  };

  const handleRemoveRushOrder = (itemIndex: number) => {
    // Add to removed rush items
    setRemovedRushItems(prev => new Set([...prev, itemIndex]));
    
    // Force a pricing update for this item to trigger total recalculation
    const item = reorderOrderData.items[itemIndex];
    const currentQty = updatedQuantities[itemIndex] ?? (item.quantity || 1);
    
    // Calculate the reduced price (remove 40% rush fee)
    const originalUnitPrice = item.unitPrice || item.totalPrice / (item.quantity || 1) || 0;
    const originalTotalForQty = originalUnitPrice * currentQty;
    const priceWithoutRush = originalTotalForQty / 1.4; // Remove 40% rush fee
    const pricePerStickerWithoutRush = priceWithoutRush / currentQty;
    
    // Set the updated price to trigger the total recalculation
    setUpdatedPrices(prev => ({ 
      ...prev, 
      [itemIndex]: {
        total: priceWithoutRush,
        perSticker: pricePerStickerWithoutRush
      }
    }));
    
    console.log(`🔄 Rush order removed for item ${itemIndex}:`, {
      originalTotal: originalTotalForQty,
      newTotal: priceWithoutRush,
      savings: originalTotalForQty - priceWithoutRush,
      savingsPercent: ((originalTotalForQty - priceWithoutRush) / originalTotalForQty * 100).toFixed(1) + '%'
    });
  };

  // Helper function to calculate area from size
  const calculateAreaFromSize = (sizeDisplay: string, customWidth?: string, customHeight?: string) => {
    if (customWidth && customHeight) {
      return parseFloat(customWidth) * parseFloat(customHeight);
    }
    
    // Parse common size formats
    if (sizeDisplay.includes('x')) {
      const [width, height] = sizeDisplay.split('x').map(s => parseFloat(s.replace(/[^0-9.]/g, '')));
      return width * height;
    }
    
    // For circular sizes like "3 inch" or "Medium (3\")"
    const match = sizeDisplay.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const diameter = parseFloat(match[1]);
      return diameter * diameter; // For simplicity, using square area
    }
    
    return 9; // Default to 3x3 inches
  };

  // Helper function to calculate pricing based on product type and selections
  const calculateItemPricing = (item: any, quantity: number, itemIndex?: number) => {
    const itemData = reorderOrderData._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
    const selections = itemData.calculatorSelections || {};
    
    // Calculate area
    const area = calculateAreaFromSize(
      selections.size?.displayValue || selections.sizePreset?.displayValue || item.size || "Medium (3\")",
      selections.customWidth?.value,
      selections.customHeight?.value
    );
    
    // Check for rush order - consider if it's been removed
    const originalRushOrder = selections.rush?.value === true;
    const rushOrderRemoved = itemIndex !== undefined && itemIndex >= 0 && removedRushItems.has(itemIndex);
    const forceRush = (item as any)._forceRushCalculation === true || itemIndex === -1;
    const rushOrder = forceRush ? originalRushOrder : (originalRushOrder && !rushOrderRemoved);
    
    // Get white option modifier (for holographic, chrome, clear, glitter)
    const whiteOptionModifiers = {
      'color-only': 1.0,
      'partial-white': 1.05,
      'full-white': 1.1
    };
    const whiteOptionValue = selections.whiteOption?.value || 'color-only';
    const whiteOptionMultiplier = whiteOptionModifiers[whiteOptionValue as keyof typeof whiteOptionModifiers] || 1.0;

    // Use real pricing data if available, otherwise fallback
    if (pricingData && pricingData.basePricing && pricingData.quantityDiscounts) {
      const realResult = calculateRealPrice(
        pricingData.basePricing,
        pricingData.quantityDiscounts,
        area,
        quantity,
        rushOrder
      );
      
      // Apply white option modifier
      const adjustedTotal = realResult.totalPrice * whiteOptionMultiplier;
      const adjustedPerSticker = realResult.finalPricePerSticker * whiteOptionMultiplier;
      
      return {
        total: adjustedTotal,
        perSticker: adjustedPerSticker
      };
    }

    // Fallback pricing calculation (same as cart fallback)
    const basePrice = 1.36;
    const baseArea = 9;
    const scaledBasePrice = basePrice * (area / baseArea);
    
    const discountMap: { [key: number]: number } = {
      50: 1.0,
      100: 0.647,
      200: 0.463,
      300: 0.39,
      500: 0.324,
      750: 0.324,
      1000: 0.257,
      2500: 0.213,
    };
    
    // Find closest quantity tier
    const quantities = Object.keys(discountMap).map(Number).sort((a, b) => a - b);
    let applicableQuantity = quantities[0];
    for (const qty of quantities) {
      if (quantity >= qty) {
        applicableQuantity = qty;
      } else {
        break;
      }
    }
    
    const discountMultiplier = discountMap[applicableQuantity] || 1.0;
    let pricePerSticker = scaledBasePrice * discountMultiplier * whiteOptionMultiplier;
    let totalPrice = pricePerSticker * quantity;
    
    if (rushOrder) {
      totalPrice *= 1.4;
      pricePerSticker *= 1.4;
    }
    
    return {
      total: totalPrice,
      perSticker: pricePerSticker
    };
  };

  // Handle quantity updates
  const handleQuantityUpdate = (itemIndex: number, newQuantity: number) => {
    const minQuantity = 50;
    const finalQuantity = Math.max(minQuantity, newQuantity);
    
    // Update quantity
    setUpdatedQuantities(prev => ({ ...prev, [itemIndex]: finalQuantity }));
    
    // Recalculate pricing
    const item = reorderOrderData.items[itemIndex];
    const newPricing = calculateItemPricing(item, finalQuantity, itemIndex);
    setUpdatedPrices(prev => ({ ...prev, [itemIndex]: newPricing }));
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
    updateCurrentView('support');
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
    
    // Set the selected order and switch to order details view
    setSelectedOrderForInvoice(order);
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

  // Function to get tracking URL based on carrier and tracking number
  const getTrackingUrl = (trackingNumber: string, carrier?: string) => {
    if (!trackingNumber) return null;
    
    // Extract carrier from tracking number format if not provided
    const carrierGuess = carrier || guessCarrierFromTrackingNumber(trackingNumber);
    
    switch (carrierGuess?.toUpperCase()) {
      case 'UPS':
      case 'UPSDAP':
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      case 'FEDEX':
      case 'FEDEXDEFAULT':
        return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      case 'USPS':
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
      default:
        // Default to UPS if carrier unknown
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    }
  };

  // Helper function to guess carrier from tracking number format
  const guessCarrierFromTrackingNumber = (trackingNumber: string) => {
    if (!trackingNumber) return null;
    
    const cleanTracking = trackingNumber.replace(/\s/g, '').toUpperCase();
    
    // UPS tracking patterns
    if (/^1Z[0-9A-Z]{16}$/.test(cleanTracking) || 
        /^[0-9]{18}$/.test(cleanTracking) ||
        /^T[0-9A-Z]{10}$/.test(cleanTracking)) {
      return 'UPS';
    }
    
    // FedEx tracking patterns
    if (/^[0-9]{12}$/.test(cleanTracking) ||
        /^[0-9]{14}$/.test(cleanTracking) ||
        /^[0-9]{15}$/.test(cleanTracking) ||
        /^[0-9]{20}$/.test(cleanTracking)) {
      return 'FEDEX';
    }
    
    // USPS tracking patterns
    if (/^[0-9]{20}$/.test(cleanTracking) ||
        /^[0-9]{13}$/.test(cleanTracking) ||
        /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(cleanTracking) ||
        /^[0-9A-Z]{13}$/.test(cleanTracking)) {
      return 'USPS';
    }
    
    return null;
  };

  // Function to handle track order click
  const handleTrackOrder = (order: Order) => {
    // Try multiple tracking number fields
    const trackingNumber = order.trackingNumber || 
                          order._fullOrderData?.tracking_number || 
                          order._fullOrderData?.tracking_code;
    
    if (!trackingNumber) {
      console.log('⚠️ No tracking number found in any field');
      return;
    }
    
    console.log('🚚 Found tracking number:', trackingNumber);
    
    // Check if this is a test tracking number (EasyPost test numbers often start with EZ)
    if (trackingNumber.startsWith('EZ') || trackingNumber.includes('test')) {
      console.log('🧪 Test tracking number detected, opening UPS demo for testing');
      // For test tracking numbers, open UPS demo
      window.open('https://www.ups.com/track?tracknum=1Z12345E0291980793', '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Get the tracking URL from order data or generate it
    let trackingUrl = null;
    
    // Try to get carrier info from full order data
    const carrier = order._fullOrderData?.carrier || order._fullOrderData?.selected_rate?.carrier;
    
    trackingUrl = getTrackingUrl(trackingNumber, carrier);
    
    if (trackingUrl) {
      // Open tracking page in new tab
      window.open(trackingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Function to check if order is shipped and has tracking
  const isOrderShippedWithTracking = (order: Order) => {
    const shippedStatuses = ['Shipped', 'Out for Delivery', 'Delivered'];
    const hasTracking = order.trackingNumber;
    
    // Enhanced debug logging for test mode tracking
    console.log('🚚 Tracking Debug:', {
      orderId: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
      isShippedStatus: shippedStatuses.includes(order.status),
      hasTracking: !!hasTracking,
      shouldShowButton: shippedStatuses.includes(order.status) && hasTracking,
      // Check all possible tracking fields
      allTrackingFields: {
        trackingNumber: order.trackingNumber,
        tracking_number: order._fullOrderData?.tracking_number,
        trackingCode: order._fullOrderData?.tracking_code,
        trackingCompany: order._fullOrderData?.trackingCompany,
        trackingUrl: order._fullOrderData?.trackingUrl,
        // Check if any tracking exists anywhere
        hasAnyTracking: !!(order.trackingNumber || 
                          order._fullOrderData?.tracking_number || 
                          order._fullOrderData?.tracking_code)
      }
    });
    
    // For test purposes, let's check multiple possible tracking fields
    const hasAnyTracking = !!(order.trackingNumber || 
                             order._fullOrderData?.tracking_number || 
                             order._fullOrderData?.tracking_code);
    
    return shippedStatuses.includes(order.status) && hasAnyTracking;
  };

  // Order rating handlers






    // Helper function to check if order contains sample packs
  const isSamplePackOrder = (order: any) => {
    return order.items?.some((item: any) => 
      item.productId === 'sample-pack' || 
      item.sku === 'SP-001' ||
      item.name?.toLowerCase().includes('sample pack') ||
      item.product?.id === 'sample-pack'
    ) || order._fullOrderData?.items?.some((item: any) => 
      item.productId === 'sample-pack' || 
      item.sku === 'SP-001' ||
      item.name?.toLowerCase().includes('sample pack') ||
      item.product?.id === 'sample-pack'
    );
  };

  // Helper function to check if an item is a sample pack
  const isSamplePackItem = (item: any, itemData?: any) => {
    const data = itemData || item;
    return data.productId === 'sample-pack' || 
           data.sku === 'SP-001' ||
           data.name?.toLowerCase().includes('sample pack') ||
           data.product?.id === 'sample-pack' ||
           data.product?.name?.toLowerCase().includes('sample pack');
  };

  // Helper function to get product image with sample pack support
  const getProductImage = (item: any, itemData?: any) => {
    const data = itemData || item;
    
    // Check if this is a sample pack first
    if (isSamplePackItem(item, data)) {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750890354/Sample-Pack_jsy2yf.png';
    }
    
    // Try to get product image from various sources
    if (data.customFiles?.[0]) {
      return data.customFiles[0];
    } else if (data.image) {
      return data.image;
    } else if (item.customFiles?.[0]) {
      return item.customFiles[0];
    } else if (item.image) {
      return item.image;
    }
    
    return null;
  };

  // Order progress tracker function
  const getOrderProgress = (status: string, order?: any) => {
    const isSamplePack = order ? isSamplePackOrder(order) : false;
    
    const steps = isSamplePack ? [
      { 
        id: 'printing', 
        label: 'Printing', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
        ),
        statuses: ['Processing', 'Order Received', 'In Production', 'Printing']
      },
      { 
        id: 'packaging', 
        label: 'Packaging', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        statuses: ['Packaging', 'Ready to Ship']
      },
      { 
        id: 'shipped', 
        label: 'Shipped', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        statuses: ['Shipped', 'In Transit', 'Assume Delivered']
      }
    ] : [
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        statuses: ['Proof Sent', 'Awaiting Approval']
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
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
    steps.forEach((step: any, index: number) => {
      if (step.statuses.includes(status)) {
        currentStepIndex = index;
      }
    });

    return { steps, currentStepIndex };
  };

  const renderOrderProgressTracker = (order: any) => {
    const { steps, currentStepIndex } = getOrderProgress(order.status, order);
    
    // Check if this is a reorder
    const isReorder = order.items?.some((item: any) => 
      item._fullOrderData?.calculatorSelections?.isReorder === true ||
      item._fullOrderData?.isReorder === true
    ) || order._fullOrderData?.items?.some((item: any) => 
      item.calculatorSelections?.isReorder === true ||
      item.isReorder === true
    );
    
    return (
      <div className="px-6 pt-6 pb-4" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.03)', 
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px'
      }}>
        <div className="relative" style={{ height: '80px', width: '100%' }}>
          {/* Progress line background - spans full width */}
          <div 
            className="absolute h-0.5 bg-gray-600 z-0" 
            style={{ 
              top: '16px',
              left: '8%', /* Start from left edge aligned with image preview */
              right: '8%' /* End at right edge aligned with action buttons */
            }}
          ></div>
          
          {/* Active progress line with gradient */}
          <div 
            className="absolute h-0.5 transition-all duration-700 ease-in-out z-0"
            style={{ 
              top: '16px',
              left: '8%',
              width: currentStepIndex === 0 ? '0px' : 
                `calc(${(currentStepIndex / (steps.length - 1)) * 84}%)`, /* Scale to 84% to match the background line */
              background: 'linear-gradient(90deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
              boxShadow: '0 0 8px rgba(249, 115, 22, 0.4), 0 0 16px rgba(249, 115, 22, 0.2)'
            }}
          ></div>
          
          {steps.map((step: any, index: number) => {
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center absolute z-10"
                style={{
                  left: `${8 + (index * (84 / (steps.length - 1)))}%`, /* Distribute evenly across the 84% width */
                  transform: 'translateX(-50%)',
                  top: '0px'
                }}
              >
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
        
        {/* Reorder Message */}
        {isReorder && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 text-amber-300 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">This is a re-order and proofs are skipped and sent straight to production.</span>
            </div>
          </div>
        )}
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
      case 'support':
        return renderSupportView();
      case 'settings':
        return renderSettingsView();
      default:
        return renderDefaultView();
    }
  };

  const renderAllOrdersView = () => {
    // Show all orders in My Orders view
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
            </svg>
            Orders
          </h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
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
        
        {/* Orders List - Matching Active Orders Layout */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          {/* Table Header - Desktop Only */}
          <div className="hidden md:block px-6 py-3 border-b border-white/10 bg-white/5">
            <div className="grid grid-cols-16 gap-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <div className="col-span-3">Preview</div>
              <div className="col-span-2">ORDER #</div>
              <div className="col-span-4">Items</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-3">Actions</div>
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
                    {/* Desktop Row Layout */}
                    <div className="hidden md:grid grid-cols-16 gap-4 items-center">
                      
                      {/* Preview Column - Side by Side Images */}
                      <div className="col-span-3">
                        <div className="flex gap-2">
                          {order.items.slice(0, 2).map((item, index) => {
                            // Get the full item data with images
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            
                            // Get product image with sample pack support
                            const productImage = getProductImage(item, itemData);
                            
                            const name = itemData.name || item.name || 'Custom Sticker';
                            
                            return (
                              <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                                {productImage ? (
                                  <div 
                                    className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105 relative"
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
                                    {/* Re-Order Pill */}
                                    {itemData.isReorder && (
                                      <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1 py-0.5 rounded-full text-[8px] font-bold leading-none">
                                        RE
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center text-gray-400 border border-white/20 text-lg relative">
                                    📄
                                    {/* Re-Order Pill */}
                                    {itemData.isReorder && (
                                      <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1 py-0.5 rounded-full text-[8px] font-bold leading-none">
                                        RE
                                      </div>
                                    )}
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
                      
                      {/* Order Column */}
                      <div className="col-span-2">
                        <div className="font-semibold text-white text-sm">
                          {getOrderDisplayNumber(order)}
                        </div>
                      </div>

                      {/* Items Column - Product Types with Quantities */}
                      <div className="col-span-4">
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
                      <div className="col-span-3">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
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
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
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
                        {isOrderShippedWithTracking(order) && (
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 010 2h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                            Track Order
                          </button>
                        )}
                        </div>
                      </div>
                      
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-white text-base">
                            {getOrderDisplayNumber(order)}
                          </div>
                          <div className="text-sm font-semibold text-white">
                            ${order.total}
                          </div>
                        </div>

                        {/* Preview Images */}
                        <div className="flex gap-2">
                          {order.items.slice(0, 3).map((item, index) => {
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
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

                            return (
                              <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                {productImage ? (
                                  <img 
                                    src={productImage} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">📄</div>
                                )}
                              </div>
                            );
                          })}
                          {order.items.length > 3 && (
                            <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-xs font-medium">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Items and Date Row - Removed Status */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Items</div>
                            <div className="space-y-1">
                              {(() => {
                                const productTypes: { [key: string]: number } = {};
                                
                                order.items.forEach(item => {
                                  const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                                  const quantity = itemData.quantity || item.quantity || 0;
                                  const name = itemData.name || item.name || 'Custom Sticker';
                                  
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
                                
                                return Object.entries(productTypes).slice(0, 2).map(([type, quantity]: [string, number]) => (
                                  <div key={type} className="text-xs text-white">
                                    {quantity} {type}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Date</div>
                            <div className="text-xs text-white">
                              {new Date(order.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="text-xs text-gray-400">
                          {new Date(order.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
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
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Reorder
                          </button>
                          {isOrderShippedWithTracking(order) && (
                            <button
                              onClick={() => handleTrackOrder(order)}
                              className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(34, 197, 94, 0.4)',
                                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                color: 'white'
                              }}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 010 2h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              Track Order
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
          <h2 className="text-2xl md:text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="12" width="4" height="9" rx="2"/>
              <rect x="10" y="6" width="4" height="15" rx="2"/>
              <rect x="17" y="9" width="4" height="12" rx="2"/>
            </svg>
            Finances
          </h2>
          <button
            onClick={() => setCurrentView('default')}
            className="hidden md:block text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 text-center"
               style={{
                 background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
                 backdropFilter: 'blur(25px) saturate(200%)',
                 border: '1px solid rgba(255, 215, 0, 0.6)',
                 boxShadow: 'rgba(250, 204, 21, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset',
                 borderRadius: '16px'
               }}>
            <h3 className="text-yellow-300 text-sm font-medium flex items-center justify-center gap-2">
              <span>🎉</span>
              <span>Store Credit</span>
            </h3>
            <p className="text-white text-2xl font-bold">${creditBalance.toFixed(2)}</p>
          </div>
          <div className="p-4 text-center"
               style={{
                 background: 'rgba(255, 255, 255, 0.05)',
                 border: '1px solid rgba(255, 255, 255, 0.1)',
                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                 backdropFilter: 'blur(12px)',
                 borderRadius: '16px'
               }}>
            <h3 className="text-blue-300 text-sm font-medium">Invested</h3>
            <p className="text-white text-2xl font-bold">${totalSpent.toFixed(2)}</p>
          </div>
          <div className="p-4 text-center"
               style={{
                 background: 'rgba(255, 255, 255, 0.05)',
                 border: '1px solid rgba(255, 255, 255, 0.1)',
                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                 backdropFilter: 'blur(12px)',
                 borderRadius: '16px'
               }}>
            <h3 className="text-green-300 text-sm font-medium">Average Order</h3>
            <p className="text-white text-2xl font-bold">${avgOrderValue.toFixed(2)}</p>
          </div>
          <div className="p-4 text-center"
               style={{
                 background: 'rgba(255, 255, 255, 0.05)',
                 border: '1px solid rgba(255, 255, 255, 0.1)',
                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                 backdropFilter: 'blur(12px)',
                 borderRadius: '16px'
               }}>
            <h3 className="text-purple-300 text-sm font-medium">Total Orders</h3>
            <p className="text-white text-2xl font-bold">{orders.length}</p>
          </div>
        </div>

        {/* Monthly Spending Bar Chart */}
        <div className="container-style p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <i className="fas fa-chart-bar text-blue-400"></i>
            Monthly Spending (12 Months)
          </h3>
          
          {last12Months.some((d: any) => d.total > 0) ? (
            <div className="relative" style={{ height: '320px' }}>
              {/* Bar Chart Container */}
              <div className="h-full relative">
                {/* Y-axis grid lines and labels */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[100, 75, 50, 25, 0].map((percent) => (
                    <div key={percent} className="flex items-center">
                      <span className="text-xs text-gray-400 w-12 text-right pr-2">
                        ${((maxSpending * percent) / 100).toFixed(0)}
                      </span>
                      <div className="flex-1 border-t border-white/5"></div>
                    </div>
                  ))}
                </div>
                
                {/* Bars */}
                <div className="h-full flex items-end justify-between px-14 pb-8 pt-4">
                  {last12Months.map((month, index) => {
                    const heightPercent = maxSpending > 0 ? (month.total / maxSpending) * 100 : 0;
                    return (
                      <div key={month.key} className="flex-1 flex flex-col items-center justify-end mx-1 group">
                        <div className="relative w-full">
                          {/* Hover tooltip */}
                          {month.total > 0 && (
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                ${month.total.toFixed(2)}
                              </div>
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1">
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}
                          
                          {/* Bar */}
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
                            style={{ 
                              height: `${Math.max(heightPercent * 2.5, month.total > 0 ? 8 : 0)}px`,
                              boxShadow: month.total > 0 ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                            }}
                          ></div>
                        </div>
                        
                        {/* Month label */}
                        <span className="text-xs text-gray-400 mt-2">{month.month}</span>
                      </div>
                    );
                  })}
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
              {/* Get most recent order for calculator */}
              {(() => {
                const recentOrder = orders[0]; // Most recent order
                if (!recentOrder) return null;
                
                // Calculate metrics for recent order
                const totalQuantity = recentOrder.items.reduce((sum, item) => sum + item.quantity, 0);
                const costPerUnit = recentOrder.total / totalQuantity;
                const suggestedSellingPrice = costPerUnit * 3; // 3x markup
                
                // Calculate actual ROI if selling price is provided
                const actualSellingPrice = sellingPrices[recentOrder.id] || 0;
                const actualRevenue = actualSellingPrice * totalQuantity;
                const actualProfit = actualRevenue - recentOrder.total;
                const actualROI = recentOrder.total > 0 ? ((actualProfit / recentOrder.total) * 100) : 0;
                
                // Get the first item with an image
                let firstImage = null;
                let firstName = '';
                for (const item of recentOrder.items) {
                  const itemData = recentOrder._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                  if (itemData.customFiles?.[0] || itemData.image || item.customFiles?.[0] || item.image) {
                    firstImage = itemData.customFiles?.[0] || itemData.image || item.customFiles?.[0] || item.image;
                    firstName = itemData.name || item.name || 'Custom Sticker';
                    break;
                  }
                }

                return (
                  <div>
                    {/* Recent Order Display */}
                    <div className="rounded-2xl mb-6"
                         style={{
                           background: 'rgba(255, 255, 255, 0.05)',
                           border: '1px solid rgba(255, 255, 255, 0.1)',
                           boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                           backdropFilter: 'blur(12px)'
                         }}>
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Preview Image */}
                          <div className="flex-shrink-0">
                            {firstImage ? (
                              <div className="w-20 h-20 rounded-lg bg-white/10 border border-white/20 p-2 flex items-center justify-center">
                                <img 
                                  src={firstImage} 
                                  alt={firstName}
                                  className="max-w-full max-h-full object-contain rounded"
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-gray-600 flex items-center justify-center text-gray-400 border border-white/20 text-2xl">
                                📄
                              </div>
                            )}
                          </div>
                          
                          {/* Order Details */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-white text-lg">
                                Mission {getOrderDisplayNumber(recentOrder)}
                              </h4>
                              <span className="text-xs text-gray-400">
                                {new Date(recentOrder.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Items</p>
                                <p className="text-white font-medium">{recentOrder.items.length} {recentOrder.items.length === 1 ? 'style' : 'styles'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Quantity</p>
                                <p className="text-white font-medium">{totalQuantity} stickers</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Cost per unit</p>
                                <p className="text-white font-medium">${costPerUnit.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Total cost</p>
                                <p className="text-white font-medium">${recentOrder.total.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Selling Price Input */}
                        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <label className="block text-sm font-medium text-blue-300 mb-3">
                            What are you selling each sticker for?
                          </label>
                          <div className="flex items-center gap-3">
                            <span className="text-white text-lg">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={suggestedSellingPrice.toFixed(2)}
                              value={sellingPrices[recentOrder.id] || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setSellingPrices(prev => ({
                                  ...prev,
                                  [recentOrder.id]: value
                                }));
                              }}
                              className="flex-1 px-6 md:px-4 py-3 rounded-lg border bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none text-lg"
                            />
                            <span className="text-gray-400">per sticker</span>
                          </div>
                          
                          {/* Real-time calculations */}
                          {actualSellingPrice > 0 && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-green-300 mb-1">Revenue</p>
                                <p className="text-white font-bold text-lg">${actualRevenue.toFixed(2)}</p>
                              </div>
                              <div className={`text-center p-3 rounded-lg ${actualProfit >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                                <p className={`text-xs mb-1 ${actualProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>Profit</p>
                                <p className={`font-bold text-lg ${actualProfit >= 0 ? 'text-white' : 'text-red-300'}`}>
                                  {actualProfit >= 0 ? '+' : ''}${actualProfit.toFixed(2)}
                                </p>
                              </div>
                              <div className={`text-center p-3 rounded-lg ${actualROI >= 0 ? 'bg-purple-500/10 border-purple-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                                <p className={`text-xs mb-1 ${actualROI >= 0 ? 'text-purple-300' : 'text-red-300'}`}>ROI</p>
                                <p className={`font-bold text-lg ${actualROI >= 0 ? 'text-white' : 'text-red-300'}`}>
                                  {actualROI.toFixed(0)}%
                                </p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-blue-300 mb-1">Margin</p>
                                <p className="text-white font-bold text-lg">
                                  {actualRevenue > 0 ? ((actualProfit / actualRevenue) * 100).toFixed(0) : 0}%
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Quick Price Suggestions */}
                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-3">Quick pricing options:</p>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              onClick={() => setSellingPrices(prev => ({ ...prev, [recentOrder.id]: 1 }))}
                              className="p-3 rounded-lg border transition-all hover:scale-105"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderColor: sellingPrices[recentOrder.id] === 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              <p className="text-xs text-gray-400 mb-1">Conservative</p>
                              <p className="text-white font-bold">$1.00</p>
                              <p className="text-xs text-gray-500">{costPerUnit > 1 ? 'Loss' : `+${((1 - costPerUnit) / costPerUnit * 100).toFixed(0)}%`}</p>
                            </button>
                            <button
                              onClick={() => setSellingPrices(prev => ({ ...prev, [recentOrder.id]: 3 }))}
                              className="p-3 rounded-lg border transition-all hover:scale-105"
                              style={{
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                borderColor: sellingPrices[recentOrder.id] === 3 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.3)'
                              }}
                            >
                              <p className="text-xs text-green-300 mb-1 flex items-center gap-1">
                                <i className="fas fa-check"></i> Default
                              </p>
                              <p className="text-white font-bold">$3.00</p>
                              <p className="text-xs text-green-400">+{((3 - costPerUnit) / costPerUnit * 100).toFixed(0)}%</p>
                            </button>
                            <button
                              onClick={() => setSellingPrices(prev => ({ ...prev, [recentOrder.id]: 5 }))}
                              className="p-3 rounded-lg border transition-all hover:scale-105"
                              style={{
                                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                borderColor: sellingPrices[recentOrder.id] === 5 ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.3)'
                              }}
                            >
                              <p className="text-xs text-purple-300 mb-1">Aggressive</p>
                              <p className="text-white font-bold">$5.00</p>
                              <p className="text-xs text-purple-400">+{((5 - costPerUnit) / costPerUnit * 100).toFixed(0)}%</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>


                  </div>
                );
              })()}


            </div>
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-calculator text-gray-500 text-4xl mb-4"></i>
              <p className="text-gray-400">No orders available for ROI analysis</p>
              <p className="text-gray-500 text-sm">Place your first order to see profitability insights</p>
            </div>
          )}
        </div>

        {/* Points Earned Per Order */}
        <div className="container-style p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <i className="fas fa-coins text-yellow-400"></i>
            Points Earned
          </h3>
          
          {(() => {
            // Filter earned credits from transactions (those with 'add' type and order-related reasons)
            const earnedCredits = (user as any)?.creditHistory?.transactions?.filter((transaction: any) => 
              transaction.transactionType === 'add' && 
              transaction.reason?.includes('earned from your recent order')
            ) || [];

            if (earnedCredits.length > 0) {
              // Group by order and calculate totals
              const earnedByOrder = earnedCredits.reduce((acc: any, transaction: any) => {
                const orderId = transaction.orderId || 'no-order-id';
                console.log('🔍 Processing transaction for grouping:', {
                  transaction,
                  orderId,
                  hasOrderId: !!transaction.orderId
                });
                
                if (!acc[orderId]) {
                  acc[orderId] = {
                    orderId,
                    orderNumber: transaction.orderNumber,
                    totalEarned: 0,
                    transactions: [],
                    latestDate: transaction.createdAt
                  };
                }
                acc[orderId].totalEarned += transaction.amount;
                acc[orderId].transactions.push(transaction);
                return acc;
              }, {});

              const sortedOrders = Object.values(earnedByOrder).sort((a: any, b: any) => 
                new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
              );

              const totalEarned = earnedCredits.reduce((sum: number, transaction: any) => sum + transaction.amount, 0);

              return (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-xs text-yellow-300 mb-1">Total Earned</p>
                      <p className="text-white font-bold text-2xl">${totalEarned.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-300 mb-1">Orders with Points</p>
                      <p className="text-white font-bold text-2xl">{sortedOrders.length}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-300 mb-1">Avg Per Order</p>
                      <p className="text-white font-bold text-2xl">${(totalEarned / sortedOrders.length).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Individual Orders */}
                  <div className="space-y-3">
                    {sortedOrders.slice(0, 10).map((orderData: any) => (
                      <div key={orderData.orderId} 
                           className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                            <span className="text-white font-medium">
                              {(() => {
                                // Handle case where order ID is missing
                                if (orderData.orderId === 'no-order-id' || orderData.orderId === 'unknown') {
                                  return 'Recent Order';
                                }
                                
                                // Try to match with actual orders to get order number
                                if (orderData.orderNumber) {
                                  return `Order ${orderData.orderNumber}`;
                                }
                                
                                // Try to find matching order from orders list
                                const matchingOrder = orders.find(order => order.id === orderData.orderId);
                                if (matchingOrder?.orderNumber) {
                                  return `Order ${matchingOrder.orderNumber}`;
                                }
                                
                                // Use the mission number format from dashboard's getOrderDisplayNumber
                                if (matchingOrder) {
                                  const orderIndex = orders.findIndex(order => order.id === orderData.orderId);
                                  if (orderIndex !== -1) {
                                    return `Mission ${orders.length - orderIndex}`;
                                  }
                                }
                                
                                // Last resort fallback
                                return `Order #${orderData.orderId.slice(-6)}`;
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400 font-bold text-lg">
                              +${orderData.totalEarned.toFixed(2)}
                            </span>
                            <i className="fas fa-coins text-yellow-400"></i>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Earned on {new Date(orderData.latestDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {sortedOrders.length > 10 && (
                    <div className="text-center pt-4">
                      <p className="text-gray-400 text-sm">
                        Showing 10 of {sortedOrders.length} orders with earned points
                      </p>
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div className="text-center py-8">
                  <i className="fas fa-coins text-gray-500 text-4xl mb-4"></i>
                  <p className="text-gray-400">No points earned yet</p>
                  <p className="text-gray-500 text-sm">Start earning 5% cashback on every order!</p>
                </div>
              );
            }
          })()}
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
                  className="px-6 md:px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              count + o.items.filter(i => i.name === item.name).reduce((sum, i) => sum + i.quantity, 0), 0),
            lastOrderId: order.id
          });
        }
      });
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
            Designs
          </h2>
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
                    <button className="py-2 px-3 rounded-lg text-xs font-medium text-white transition-all duration-300 hover:scale-105 backdrop-blur-md"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              backdropFilter: 'blur(10px)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
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
                  className="rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-200 hover:shadow-lg relative bg-white"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    aspectRatio: '1'
                  }}
                  onClick={() => window.open(proof.proofUrl, '_blank')}
                >
                  <img
                    src={proof.proofUrl}
                    alt={proof.proofTitle}
                    className="w-full h-full object-contain p-4 transition-all duration-200 bg-white"
                  />
                  {/* Size Overlay - PDF Cut Contour Dimensions */}
                  {(() => {
                    // Get PDF dimensions from proof adminNotes if available
                    const getPDFDimensions = () => {
                      if (proof.adminNotes && proof.adminNotes.includes('PDF_DIMENSIONS:')) {
                        const dimensionMatch = proof.adminNotes.match(/PDF_DIMENSIONS:([0-9.]+)x([0-9.]+)/);
                        if (dimensionMatch) {
                          const width = parseFloat(dimensionMatch[1]);
                          const height = parseFloat(dimensionMatch[2]);
                          
                          // Round down to nearest whole number if decimal is 0.03 or less
                          const formatDimension = (value: number) => {
                            const decimal = value % 1;
                            if (decimal <= 0.03) {
                              return Math.floor(value).toFixed(2);
                            }
                            return value.toFixed(2);
                          };
                          
                          return `${formatDimension(width)}" × ${formatDimension(height)}"`;
                        }
                      }
                      return null;
                    };
                    
                    const pdfDimensions = getPDFDimensions();
                    
                    return pdfDimensions ? (
                      <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md border border-white/20">
                        {pdfDimensions}
                      </div>
                    ) : null;
                  })()}
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
                        <span className="text-xs font-medium text-white md:whitespace-nowrap">
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
                    {(() => {
                      const firstItem = order.items[0];
                      const selections = firstItem?._fullOrderData?.calculatorSelections || {};
                      const size = selections.size || selections.sizePreset || {};
                      
                      // Enhanced size detection
                      const getSizeDisplay = () => {
                        if (size.width && size.height) return `${size.width}" × ${size.height}"`;
                        if (size.displayValue) return size.displayValue;
                        if (selections.width && selections.height) return `${selections.width}" × ${selections.height}"`;
                        if (firstItem?.size) return firstItem.size;
                        return null;
                      };
                      
                      // Enhanced material detection
                      const getMaterialDisplay = () => {
                        if (selections.material?.displayValue) return selections.material.displayValue;
                        if (selections.material?.label) return selections.material.label;
                        if (selections.material?.value) return selections.material.value;
                        if (firstItem?.material) return firstItem.material;
                        return null;
                      };
                      
                      const sizeDisplay = getSizeDisplay();
                      const materialDisplay = getMaterialDisplay();
                      
                      return (
                        <>
                          {materialDisplay && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Material:</span>
                              <span className="text-white">{materialDisplay}</span>
                            </div>
                          )}
                          {sizeDisplay && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Size:</span>
                              <span className="text-white">{sizeDisplay}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Quantity:</span>
                      <span className="text-white">{order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
                    </div>
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
                      <span className="text-white text-xs">
                        Printed within {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0) <= 2000 ? '24' : '48'}-hrs of Approval
                      </span>
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
                          className="w-full py-3 px-6 md:px-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] text-sm font-medium backdrop-blur-md"
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
                          className="w-full py-3 px-6 md:px-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] text-sm font-medium backdrop-blur-md"
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
                                className="flex-1 py-2 px-6 md:px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {uploadingFile ? 'Sending...' : 'Send Replacement'}
                              </button>
                              <button
                                onClick={handleCancelReplacement}
                                disabled={uploadingFile}
                                className="px-6 md:px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
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
                      {isOrderShippedWithTracking(order) ? (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <p className="text-gray-400 text-sm">Your order was printed and shipped!</p>
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="px-2 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              backgroundColor: 'rgba(34, 197, 94, 0.2)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                            Track
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Your order is now in production</p>
                      )}
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
                    {proof.adminNotes && (() => {
                      // Remove PDF dimensions from customer display - only show custom notes
                      const customNotes = proof.adminNotes.replace(/\nPDF_DIMENSIONS:[0-9.]+x[0-9.]+/, '').replace(/^PDF_DIMENSIONS:[0-9.]+x[0-9.]+/, '').trim();
                      return customNotes ? (
                        <div>
                          <h5 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Notes from our team
                          </h5>
                          <p className="text-sm text-gray-300 bg-blue-500/10 p-3 rounded-lg">{customNotes}</p>
                        </div>
                      ) : null;
                    })()}

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
      
      // Check individual proof statuses within the proofs array
      if (order.proofs && order.proofs.length > 0) {
        // Only exclude order if there are NO proofs that need review (pending/sent)
        const hasPendingProofs = order.proofs.some(proof => 
          proof.status === 'pending' || proof.status === 'sent'
        );
        // If no proofs need review, exclude this order
        if (!hasPendingProofs) {
          return false;
        }
      }
      
      // Exclude orders that are already approved or have changes requested at order level
      if (order.proof_status === 'approved' || order.proof_status === 'changes_requested') {
        return false;
      }
      
      // Include orders with these statuses or proof statuses (more inclusive)
      return (
        order.status === 'Printing' ||
        order.proof_status === 'approved' ||
        order.proof_status === 'sent' ||
        (hasProofs && order.proof_sent_at && order.proof_status !== 'approved') ||
        // Include orders with pending proofs that need customer action
        (hasProofs && (order.proof_status === 'pending' || !order.proof_status))
      );
    });
    
    const printingOrders = orders.filter(order => {
      return (
        (order.status === 'Printing' || order.proof_status === 'approved') && 
        order.status !== 'Shipped' && 
        order.status !== 'Delivered' &&
        order.orderStatus !== 'Shipped' &&
        order.orderStatus !== 'Delivered'
      );
    });
    
    const shippedOrders = orders.filter(order => {
      const hasProofs = (order.proofs && order.proofs.length > 0) || order.proofUrl;
      return hasProofs && (
        order.status === 'Shipped' || 
        order.orderStatus === 'Shipped' ||
        order.fulfillmentStatus === 'shipped' ||
        (order.trackingNumber && order.orderStatus !== 'Delivered')
      );
    });
    
    const deliveredOrders = orders.filter(order => {
      const hasProofs = (order.proofs && order.proofs.length > 0) || order.proofUrl;
      return hasProofs && (
        order.status === 'Delivered' || 
        order.orderStatus === 'Delivered' ||
        order.fulfillmentStatus === 'fulfilled'
      );
    });
    
    const requestChanges = orders.filter(order => 
      (order.status === 'request-changes' || order.proof_status === 'changes_requested') && 
      ((order.proofs && order.proofs.length > 0) || order.proofUrl)
    );

    return (
      <div className="space-y-6">
                {/* Current Proofs Needing Review - Only show if there are proofs to review */}
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
                      {new Date(order.date).toLocaleDateString()} • ${order.total}
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
        {printingOrders.length > 0 && (
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Printing
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                  {printingOrders.length} printing
                </span>
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {printingOrders.map((order) => (
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
                    
                    <div className="rounded-lg overflow-hidden mb-3 bg-white p-2 relative" style={{ aspectRatio: '7/5' }}>
                      {/* Show grid of all proofs if multiple designs, otherwise single image */}
                      {(order.proofs && order.proofs.length > 1) ? (
                        <div className={`w-full h-full grid gap-1 ${
                          order.proofs.length === 2 ? 'grid-cols-2' :
                          order.proofs.length === 3 ? 'grid-cols-3' :
                          order.proofs.length === 4 ? 'grid-cols-2 grid-rows-2' :
                          order.proofs.length <= 6 ? 'grid-cols-3 grid-rows-2' :
                          'grid-cols-3 grid-rows-3'
                        }`}>
                          {order.proofs.slice(0, 9).map((proof: any, index: number) => (
                            <div key={index} className="relative bg-gray-100 rounded overflow-hidden">
                              <img 
                                src={proof.proofUrl} 
                                alt={`Design ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                              {/* Design number badge */}
                              <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center leading-none">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                          {/* Show "+X more" if there are more than 9 proofs */}
                          {order.proofs.length > 9 && (
                            <div className="bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-600 text-xs font-bold">
                                +{order.proofs.length - 9}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <img 
                          src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : order.proofUrl} 
                          alt="Approved Proof"
                          className="w-full h-full object-contain"
                        />
                      )}
                      {/* Reorder Badge */}
                      {(() => {
                        const isReorder = order.items?.some((item: any) => 
                          item._fullOrderData?.calculatorSelections?.isReorder === true ||
                          item._fullOrderData?.isReorder === true
                        ) || order._fullOrderData?.items?.some((item: any) => 
                          item.calculatorSelections?.isReorder === true ||
                          item.isReorder === true
                        );
                        return isReorder ? (
                          <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold leading-none z-10">
                            RE-ORDER
                          </div>
                        ) : null;
                      })()}
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
          </div>
        )}

        {/* Shipped Orders */}
        {shippedOrders.length > 0 && (
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Shipped
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                  {shippedOrders.length} shipped
                </span>
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shippedOrders.map((order) => (
                  <div key={order.id} 
                       className="rounded-xl p-4 shadow-xl border border-green-400/30"
                       style={{
                         backgroundColor: 'rgba(34, 197, 94, 0.08)',
                         backdropFilter: 'blur(20px)',
                         boxShadow: '0 0 8px rgba(34, 197, 94, 0.1)'
                       }}>
                    
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-green-300">Shipped</span>
                      </div>
                    </div>
                    
                    <div className="rounded-lg overflow-hidden mb-3 bg-white p-2 relative" style={{ aspectRatio: '7/5' }}>
                      {/* Show grid of all proofs if multiple designs, otherwise single image */}
                      {(order.proofs && order.proofs.length > 1) ? (
                        <div className={`w-full h-full grid gap-1 ${
                          order.proofs.length === 2 ? 'grid-cols-2' :
                          order.proofs.length === 3 ? 'grid-cols-3' :
                          order.proofs.length === 4 ? 'grid-cols-2 grid-rows-2' :
                          order.proofs.length <= 6 ? 'grid-cols-3 grid-rows-2' :
                          'grid-cols-3 grid-rows-3'
                        }`}>
                          {order.proofs.slice(0, 9).map((proof: any, index: number) => (
                            <div key={index} className="relative bg-gray-100 rounded overflow-hidden">
                              <img 
                                src={proof.proofUrl} 
                                alt={`Design ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                              {/* Design number badge */}
                              <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center leading-none">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                          {/* Show "+X more" if there are more than 9 proofs */}
                          {order.proofs.length > 9 && (
                            <div className="bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-600 text-xs font-bold">
                                +{order.proofs.length - 9}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <img 
                          src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : order.proofUrl} 
                          alt="Approved Proof"
                          className="w-full h-full object-contain"
                        />
                      )}
                      {/* Reorder Badge */}
                      {(() => {
                        const isReorder = order.items?.some((item: any) => 
                          item._fullOrderData?.calculatorSelections?.isReorder === true ||
                          item._fullOrderData?.isReorder === true
                        ) || order._fullOrderData?.items?.some((item: any) => 
                          item.calculatorSelections?.isReorder === true ||
                          item.isReorder === true
                        );
                        return isReorder ? (
                          <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold leading-none z-10">
                            RE-ORDER
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-3">
                      {new Date(order.date).toLocaleDateString()} • ${order.total}
                    </p>
                    
                    <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3 mb-3">
                      <p className="text-green-300 text-xs font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="white" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                        Shipped
                      </p>
                      <p className="text-green-200 text-xs">Your stickers have been shipped!</p>
                    </div>
                    
                    <p className="text-xs text-gray-300 text-center">
                      There's nothing you need to do right now
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Delivered Orders */}
        {deliveredOrders.length > 0 && (
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-white" fill="white" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Delivered
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                  {deliveredOrders.length} delivered
                </span>
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveredOrders.map((order) => (
                  <div key={order.id} 
                       className="rounded-xl p-4 shadow-xl border border-purple-400/30"
                       style={{
                         backgroundColor: 'rgba(168, 85, 247, 0.08)',
                         backdropFilter: 'blur(20px)',
                         boxShadow: '0 0 8px rgba(168, 85, 247, 0.1)'
                       }}>
                    
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">Mission {getOrderDisplayNumber(order)}</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                        <span className="text-xs text-purple-300">Delivered</span>
                      </div>
                    </div>
                    
                    <div className="rounded-lg overflow-hidden mb-3 bg-white p-2 relative" style={{ aspectRatio: '7/5' }}>
                      {/* Show grid of all proofs if multiple designs, otherwise single image */}
                      {(order.proofs && order.proofs.length > 1) ? (
                        <div className={`w-full h-full grid gap-1 ${
                          order.proofs.length === 2 ? 'grid-cols-2' :
                          order.proofs.length === 3 ? 'grid-cols-3' :
                          order.proofs.length === 4 ? 'grid-cols-2 grid-rows-2' :
                          order.proofs.length <= 6 ? 'grid-cols-3 grid-rows-2' :
                          'grid-cols-3 grid-rows-3'
                        }`}>
                          {order.proofs.slice(0, 9).map((proof: any, index: number) => (
                            <div key={index} className="relative bg-gray-100 rounded overflow-hidden">
                              <img 
                                src={proof.proofUrl} 
                                alt={`Design ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                              {/* Design number badge */}
                              <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center leading-none">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                          {/* Show "+X more" if there are more than 9 proofs */}
                          {order.proofs.length > 9 && (
                            <div className="bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-600 text-xs font-bold">
                                +{order.proofs.length - 9}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <img 
                          src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : order.proofUrl} 
                          alt="Approved Proof"
                          className="w-full h-full object-contain"
                        />
                      )}
                      {/* Reorder Badge */}
                      {(() => {
                        const isReorder = order.items?.some((item: any) => 
                          item._fullOrderData?.calculatorSelections?.isReorder === true ||
                          item._fullOrderData?.isReorder === true
                        ) || order._fullOrderData?.items?.some((item: any) => 
                          item.calculatorSelections?.isReorder === true ||
                          item.isReorder === true
                        );
                        return isReorder ? (
                          <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold leading-none z-10">
                            RE-ORDER
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-3">
                      {new Date(order.date).toLocaleDateString()} • ${order.total}
                    </p>
                    
                    <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 mb-3">
                      <p className="text-purple-300 text-xs font-medium">
                        <svg className="w-4 h-4 inline mr-1" fill="white" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Delivered
                      </p>
                      <p className="text-purple-200 text-xs">Your stickers have been delivered!</p>
                    </div>
                    
                    <p className="text-xs text-gray-300 text-center">
                      There's nothing you need to do right now
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Request Changes Orders */}
        {requestChanges.length > 0 && (
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                🔄 Changes Being Reviewed
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                  {requestChanges.length} pending
                </span>
              </h3>
            </div>
            
            <div className="p-6">
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
                    
                    <div className="rounded-lg overflow-hidden mb-3 bg-white p-2" style={{ aspectRatio: '7/5' }}>
                      <img 
                        src={(order.proofs && order.proofs.length > 0) ? order.proofs[0].proofUrl : order.proofUrl} 
                        alt="Original Proof"
                        className="w-full h-full object-contain"
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
          </div>
        )}

        {/* Empty State */}
        {proofsToReview.length === 0 && printingOrders.length === 0 && shippedOrders.length === 0 && deliveredOrders.length === 0 && requestChanges.length === 0 && (
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No Proofs Available</h3>
              <p className="text-gray-400 mb-6">
                When you place an order, design proofs will appear here for your review.
              </p>
              <Link 
                href="/products"
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Start New Mission
              </Link>
            </div>
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

    // Enhanced status display functions
    const getEnhancedStatusIcon = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'delivered':
          return (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          );
        case 'shipped':
        case 'out for delivery':
        case 'out_for_delivery':
        case 'in_transit':
          return (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          );
        case 'processing':
        case 'in production':
          return (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          );
        case 'proof review needed':
          return (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          );
        default:
          return (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
      }
    };

    // Prepare invoice data
    const invoiceData: InvoiceData = {
      orderNumber: selectedOrderForInvoice.orderNumber || selectedOrderForInvoice.id,
      orderDate: selectedOrderForInvoice.orderCreatedAt || selectedOrderForInvoice.date,
      orderStatus: selectedOrderForInvoice.orderStatus || selectedOrderForInvoice.status,
      totalPrice: selectedOrderForInvoice.totalPrice || selectedOrderForInvoice.total,
      currency: selectedOrderForInvoice.currency || 'USD',
      subtotal: selectedOrderForInvoice.subtotal || selectedOrderForInvoice.totalPrice || selectedOrderForInvoice.total,
      tax: selectedOrderForInvoice.tax || 0,
      shipping: selectedOrderForInvoice.shipping || 0,
      items: selectedOrderForInvoice.items.map((item: any) => ({
        id: item.id,
        productName: item.productName || item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || (item.price / item.quantity),
        totalPrice: item.totalPrice || item.price,
        customFiles: item.customFiles,
        calculatorSelections: item.calculatorSelections || item._fullOrderData,
        customerNotes: item.customerNotes
      })),
      trackingNumber: selectedOrderForInvoice.trackingNumber,
      trackingCompany: selectedOrderForInvoice.trackingCompany,
      customerEmail: selectedOrderForInvoice.customerEmail || (user as any)?.email,
      // Use billing address if available
      billingAddress: selectedOrderForInvoice.billingAddress || selectedOrderForInvoice.billing_address || selectedOrderForInvoice.shippingAddress,
      customerInfo: {
        name: (user as any)?.user_metadata?.full_name || (user as any)?.email?.split('@')[0] || 'Customer',
        email: (user as any)?.email,
      }
    };

    // Only set invoice data when generating PDFs, not on every render
    // setInvoiceData(invoiceData); // Removed to prevent infinite loop

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Order Details
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setInvoiceData(invoiceData);
                setTimeout(generatePrintPDF, 100); // Small delay to ensure state is updated
              }}
              className="px-6 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
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
              onClick={() => {
                setInvoiceData(invoiceData);
                setTimeout(generateDownloadPDF, 100); // Small delay to ensure state is updated
              }}
              className="px-6 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
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
          {/* Shipping Address if available */}
          {selectedOrderForInvoice.shippingAddress && (
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Shipping Address
              </h4>
              <div className="text-white">
                <p>{selectedOrderForInvoice.shippingAddress.name}</p>
                <p className="text-gray-300">
                  {selectedOrderForInvoice.shippingAddress.street1}
                  {selectedOrderForInvoice.shippingAddress.street2 && <>, {selectedOrderForInvoice.shippingAddress.street2}</>}
                </p>
                <p className="text-gray-300">
                  {selectedOrderForInvoice.shippingAddress.city}, {selectedOrderForInvoice.shippingAddress.state} {selectedOrderForInvoice.shippingAddress.zip}
                </p>
                {selectedOrderForInvoice.shippingAddress.country && (
                  <p className="text-gray-300">{selectedOrderForInvoice.shippingAddress.country}</p>
                )}
              </div>
            </div>
          )}

          {/* Order Items - Enhanced Version */}
          <div className="space-y-6">
            
            {selectedOrderForInvoice.items.map((item: any, index: number) => {
              // Get calculator selections from the correct location
              const itemData = item._fullItemData || item;
              const calculatorSelections = itemData.calculatorSelections || itemData.calculator_selections || item._fullOrderData;
              const customFiles = itemData.customFiles || itemData.custom_files || item.customFiles;
              const firstImage = Array.isArray(customFiles) && customFiles.length > 0 ? customFiles[0] : null;
              
              console.log('Order item debug:', {
                itemId: item.id,
                hasFullItemData: !!item._fullItemData,
                calculatorSelections,
                customFiles,
                firstImage
              });
              
              return (
                <div 
                  key={item.id || index} 
                  className="bg-white/5 rounded-lg p-6 border border-white/10"
                >
                  <div className="flex items-start gap-6">
                    {/* Product Image */}
                    {firstImage && (
                      <div className="flex-shrink-0">
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/20 bg-black/20">
                          <img 
                            src={firstImage} 
                            alt={item.productName || item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {customFiles && customFiles.length > 1 && (
                          <p className="text-xs text-gray-400 mt-1 text-center">
                            +{customFiles.length - 1} more file{customFiles.length > 2 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-white">{item.productName || item.name}</h4>
                            <p className="text-gray-400 text-sm ml-4">
                              Placed on {new Date(selectedOrderForInvoice.orderCreatedAt || selectedOrderForInvoice.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <p className="text-gray-400 text-sm mb-1">
                            Order #{selectedOrderForInvoice.orderNumber || selectedOrderForInvoice.id}
                          </p>
                          <p className="text-gray-300">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">${(item.totalPrice || item.price).toFixed(2)}</p>
                          <p className="text-gray-400 text-sm">${(item.unitPrice || (item.price / item.quantity)).toFixed(2)} each</p>
                        </div>
                      </div>
                      {/* Calculator Selections - Detailed View */}
                      {calculatorSelections && (
                        <div className="bg-black/20 rounded-lg p-4 border border-white/5 mb-4">
                          <h5 className="text-sm font-semibold text-purple-400 mb-3">Product Specifications</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(calculatorSelections).map(([key, value]: [string, any]) => {
                              if (!value || key === 'total' || key === 'quantity' || key === 'uploadedFiles' || key === 'designFiles') return null;
                              
                              const formatKey = (key: string) => {
                                const keyMap: { [key: string]: string } = {
                                  'size': 'Size',
                                  'material': 'Material',
                                  'finish': 'Finish',
                                  'turnaround': 'Turnaround Time',
                                  'proofOption': 'Proof Option',
                                  'cutToShape': 'Cut to Shape',
                                  'weatherproofLaminate': 'Weatherproof Laminate',
                                  'grommets': 'Grommets',
                                  'poleHem': 'Pole Hem'
                                };
                                return keyMap[key] || key.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
                              };

                              const formatValue = (value: any) => {
                                if (typeof value === 'object' && value !== null) {
                                  if (value.displayValue) return value.displayValue;
                                  if (value.label) return value.label;
                                  if (value.width && value.height) return `${value.width}" × ${value.height}"`;
                                  if (value.value) return value.value;
                                }
                                if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                                return String(value);
                              };

                              return (
                                <div key={key} className="border-l-2 border-purple-400/30 pl-3">
                                  <p className="text-xs text-gray-400 uppercase tracking-wide">{formatKey(key)}</p>
                                  <p className="text-white font-medium">{formatValue(value)}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Customer Notes */}
                      {(itemData.customerNotes || selectedOrderForInvoice.customerNotes) && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                          <p className="text-blue-400 text-sm font-medium mb-1">Customer Notes</p>
                          <p className="text-white text-sm">{itemData.customerNotes || selectedOrderForInvoice.customerNotes}</p>
                        </div>
                      )}

                      {/* Tracking Information - Moved inside item */}
                      {selectedOrderForInvoice.trackingNumber && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Tracking Information
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-gray-300 text-sm">Tracking Number</p>
                                <p className="text-white font-mono">{selectedOrderForInvoice.trackingNumber}</p>
                              </div>
                              {selectedOrderForInvoice.trackingCompany && (
                                <div className="text-right">
                                  <p className="text-gray-300 text-sm">Carrier</p>
                                  <p className="text-white">{selectedOrderForInvoice.trackingCompany}</p>
                                </div>
                              )}
                            </div>
                            <div className="pt-3 border-t border-white/10">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleTrackOrder(selectedOrderForInvoice)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                                  style={{
                                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    color: 'white'
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                  </svg>
                                  Track Order
                                </button>
                                <button 
                                  onClick={() => handleReorder(selectedOrderForInvoice.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                                  style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    color: 'white'
                                  }}
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                  </svg>
                                  Reorder
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Order Timeline - Moved inside item */}
                      <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                        <h5 className="text-sm font-semibold text-gray-400 mb-3">Order Timeline</h5>
                        
                        <div className="relative">
                          {/* Timeline Line */}
                          <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-white/10"></div>
                          
                          <div className="space-y-3">
                            {/* Order Placed */}
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                              <div className="flex-1">
                                <p className="text-white font-medium text-sm">Order Placed</p>
                                <p className="text-gray-400 text-xs">
                                  {new Date(selectedOrderForInvoice.orderCreatedAt || selectedOrderForInvoice.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>

                            {/* Proof Activities */}
                            {selectedOrderForInvoice.proofs && selectedOrderForInvoice.proofs.length > 0 && (
                              <>
                                <div className="flex items-start gap-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                  <div className="flex-1">
                                    <p className="text-white font-medium text-sm">Design proofs created</p>
                                    <p className="text-gray-400 text-xs">Your custom design has been prepared for review</p>
                                  </div>
                                </div>
                                
                                {selectedOrderForInvoice.proof_sent_at && (
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                    <div className="flex-1">
                                      <p className="text-white font-medium text-sm">Proofs sent for approval</p>
                                      <p className="text-gray-400 text-xs">
                                        {new Date(selectedOrderForInvoice.proof_sent_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Production Status */}
                            {(selectedOrderForInvoice.orderStatus === 'in production' || selectedOrderForInvoice.orderStatus === 'processing') && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                <div className="flex-1">
                                  <p className="text-white font-medium text-sm">In production</p>
                                  <p className="text-gray-400 text-xs">Your order is being manufactured</p>
                                </div>
                              </div>
                            )}

                            {/* Shipped */}
                            {selectedOrderForInvoice.trackingNumber && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                <div className="flex-1">
                                  <p className="text-white font-medium text-sm">Shipping label created</p>
                                  <p className="text-gray-400 text-xs">Tracking: {selectedOrderForInvoice.trackingNumber}</p>
                                  <p className="text-gray-400 text-xs">Ready for carrier pickup</p>
                                </div>
                              </div>
                            )}

                            {/* In Transit */}
                            {(selectedOrderForInvoice.orderStatus === 'in_transit' || selectedOrderForInvoice.orderStatus === 'shipped') && selectedOrderForInvoice.trackingNumber && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                <div className="flex-1">
                                  <p className="text-white font-medium text-sm">Package in transit</p>
                                  <p className="text-gray-400 text-xs">Your package is on its way to you</p>
                                </div>
                              </div>
                            )}

                            {/* Out for Delivery */}
                            {(selectedOrderForInvoice.orderStatus === 'out_for_delivery' || selectedOrderForInvoice.orderStatus === 'out for delivery') && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse mt-1.5 flex-shrink-0 relative z-10"></div>
                                <div className="flex-1">
                                  <p className="text-white font-medium text-sm">Out for delivery</p>
                                  <p className="text-gray-400 text-xs">Your package will be delivered today</p>
                                </div>
                              </div>
                            )}

                            {/* Delivered */}
                            {selectedOrderForInvoice.orderStatus === 'delivered' && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0 relative z-10"></div>
                                <div className="flex-1">
                                  <p className="text-white font-medium text-sm">Order delivered</p>
                                  <p className="text-gray-400 text-xs">Your order has been successfully delivered</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


        </div>
      </div>
    );
  };

  const renderSupportView = () => {
    const concernReasons = [
      { value: 'order-issue', label: 'Order Issue' },
      { value: 'proof-concerns', label: 'Proof Concerns' },
      { value: 'shipping-delay', label: 'Shipping Delay' },
      { value: 'quality-issue', label: 'Quality Issue' },
      { value: 'refund-request', label: 'Refund Request' },
      { value: 'design-help', label: 'Design Help Needed' },
      { value: 'billing-question', label: 'Billing Question' },
      { value: 'technical-issue', label: 'Technical Issue' },
      { value: 'product-inquiry', label: 'Product Inquiry' },
      { value: 'other', label: 'Other' }
    ];

    return (
      <div className="container-style rounded-2xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l6 4v-18c0-1.1-.9-2-2-2z"/>
          </svg>
          Support
        </h2>
        
        <form onSubmit={handleContactSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="support-name" className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                id="support-name"
                name="name"
                value={contactFormData.name}
                onChange={handleContactChange}
                required
                className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="support-email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="support-email"
                name="email"
                value={contactFormData.email}
                onChange={handleContactChange}
                required
                className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="support-reason" className="block text-sm font-medium text-gray-300 mb-2">
              Reason for Contact
            </label>
            <select
              id="support-reason"
              name="subject"
              value={contactFormData.subject}
              onChange={handleContactChange}
              required
              className="w-full px-6 md:px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <option value="" style={{ backgroundColor: '#030140' }}>Select a reason</option>
              {concernReasons.map(reason => (
                <option key={reason.value} value={reason.value} style={{ backgroundColor: '#030140' }}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Related Order (Optional)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOrderDropdown(!showOrderDropdown)}
                className="w-full px-6 md:px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <span>
                  {contactFormData.relatedOrder ? 
                    (() => {
                      const selectedOrder = orders.find(order => order.id === contactFormData.relatedOrder);
                      return selectedOrder ? (
                        <div className="flex items-center gap-3">
                          <img 
                            src={selectedOrder.items[0]?.image || 'https://via.placeholder.com/40'} 
                            alt="Order preview"
                            className="w-10 h-10 rounded object-cover"
                          />
                          <span>Order #{getOrderDisplayNumber(selectedOrder)} - ${selectedOrder.total.toFixed(2)}</span>
                        </div>
                      ) : 'Select an order';
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
                      className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors text-gray-300"
                    >
                      No specific order
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
                          <img 
                            src={order.items[0]?.image || 'https://via.placeholder.com/40'} 
                            alt={order.items[0]?.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <div className="text-white font-medium">Order #{getOrderDisplayNumber(order)}</div>
                            <div className="text-gray-400 text-sm">{new Date(order.date).toLocaleDateString()} - ${order.total.toFixed(2)}</div>
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
            <label htmlFor="support-message" className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              id="support-message"
              name="message"
              value={contactFormData.message}
              onChange={handleContactChange}
              required
              rows={5}
              className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
              placeholder="Please describe your issue or question..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmittingContact}
              className="flex-1 py-3 px-6 md:px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                color: 'white'
              }}
            >
              {isSubmittingContact ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : 'Submit Request'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                // Save form data to localStorage for later
                localStorage.setItem('supportFormDraft', JSON.stringify(contactFormData));
                setActionNotification({ message: 'Support request saved for later', type: 'info' });
                setTimeout(() => setActionNotification(null), 3000);
              }}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:bg-white/10"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white'
              }}
            >
              Save for Later
            </button>
          </div>
        </form>

        {/* Success Message */}
        {contactSubmitted && (
          <div className="mt-6 p-4 rounded-lg bg-green-500/20 border border-green-400/50">
            <p className="text-green-200 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Support request sent! We'll get back to you within 24 hours.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsView = () => {
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setSettingsData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProfile = async () => {
      if (!user) return;
      
      setIsUpdatingProfile(true);
      try {
        const supabase = await getSupabase();
        
        // Update user_profiles table
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: (user as any).id,
            first_name: settingsData.firstName,
            last_name: settingsData.lastName,
            display_name: `${settingsData.firstName} ${settingsData.lastName}`.trim(),
            company_name: settingsData.companyName,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (profileError) {
          throw profileError;
        }

        // Update user metadata (first name, last name) and email if changed
        const updates: any = {};
        
        // Check if email changed
        if (settingsData.email !== (user as any).email) {
          updates.email = settingsData.email;
        }
        
        // Always update user metadata with names
        updates.data = {
          first_name: settingsData.firstName,
          last_name: settingsData.lastName
        };
        
        // Only call updateUser if there are updates
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase.auth.updateUser(updates);
          
          if (updateError) {
            throw updateError;
          }
        }

        // Update local profile state
        setProfile((prev: any) => ({
          ...prev,
          first_name: settingsData.firstName,
          last_name: settingsData.lastName,
          display_name: `${settingsData.firstName} ${settingsData.lastName}`.trim(),
          company_name: settingsData.companyName
        }));

        setSettingsNotification({
          message: 'Profile updated successfully!',
          type: 'success'
        });
        
      } catch (error: any) {
        console.error('Error updating profile:', error);
        setSettingsNotification({
          message: error.message || 'Failed to update profile',
          type: 'error'
        });
      } finally {
        setIsUpdatingProfile(false);
        setTimeout(() => setSettingsNotification(null), 5000);
      }
    };

    const handleUpdatePassword = async () => {
      // Validate passwords
      if (!settingsData.currentPassword || !settingsData.newPassword) {
        setSettingsNotification({
          message: 'Please fill in all password fields',
          type: 'error'
        });
        setTimeout(() => setSettingsNotification(null), 3000);
        return;
      }

      if (settingsData.newPassword !== settingsData.confirmPassword) {
        setSettingsNotification({
          message: 'New passwords do not match',
          type: 'error'
        });
        setTimeout(() => setSettingsNotification(null), 3000);
        return;
      }

      if (settingsData.newPassword.length < 6) {
        setSettingsNotification({
          message: 'Password must be at least 6 characters',
          type: 'error'
        });
        setTimeout(() => setSettingsNotification(null), 3000);
        return;
      }

      setIsUpdatingPassword(true);
      try {
        const supabase = await getSupabase();
        
        // First verify current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: (user as any).email,
          password: settingsData.currentPassword
        });

        if (signInError) {
          throw new Error('Current password is incorrect');
        }

        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: settingsData.newPassword
        });

        if (updateError) {
          throw updateError;
        }

        // Clear password fields
        setSettingsData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));

        setSettingsNotification({
          message: 'Password updated successfully!',
          type: 'success'
        });
        
      } catch (error: any) {
        console.error('Error updating password:', error);
        setSettingsNotification({
          message: error.message || 'Failed to update password',
          type: 'error'
        });
      } finally {
        setIsUpdatingPassword(false);
        setTimeout(() => setSettingsNotification(null), 5000);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          Settings
        </h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Notification Banner */}
        {settingsNotification && (
          <div 
            className={`p-4 rounded-lg flex items-center justify-between ${
              settingsNotification.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
              settingsNotification.type === 'error' ? 'bg-red-500/20 border border-red-500/30' :
              'bg-blue-500/20 border border-blue-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {settingsNotification.type === 'success' && (
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <span className={`${
                settingsNotification.type === 'success' ? 'text-green-300' :
                settingsNotification.type === 'error' ? 'text-red-300' :
                'text-blue-300'
              }`}>
                {settingsNotification.message}
              </span>
            </div>
            <button
              onClick={() => setSettingsNotification(null)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Close notification"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Profile Settings Section */}
        <div className="container-style p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Settings
          </h3>
        
        <div className="space-y-6">
            {/* Profile Photo */}
          <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Profile Photo</label>
              <div className="flex items-center gap-6">
                <div 
                  className="w-24 h-24 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 flex items-center justify-center relative group"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                  }}
                                  onClick={(e) => handleProfilePictureClick(e)}
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
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="text-white text-2xl font-bold">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    onClick={(e) => handleProfilePictureClick(e)}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    Change Photo
                  </button>
                  {profile?.profile_photo_url && (
                    <button
                      onClick={async () => {
                        if (!user || !confirm('Are you sure you want to remove your profile photo?')) return;
                        
                        setUploadingProfilePhoto(true);
                        try {
                          const supabase = await getSupabase();
                          const { error } = await supabase
                            .from('user_profiles')
                            .update({
                              profile_photo_url: null,
                              profile_photo_public_id: null,
                              updated_at: new Date().toISOString()
                            })
                            .eq('user_id', (user as any).id);

                          if (error) throw error;

                          setProfile((prev: any) => ({
                            ...prev,
                            profile_photo_url: null,
                            profile_photo_public_id: null
                          }));
                          
                          setSettingsNotification({
                            message: 'Profile photo removed',
                            type: 'success'
                          });
                          setTimeout(() => setSettingsNotification(null), 3000);
                        } catch (error) {
                          console.error('Error removing profile photo:', error);
                          setSettingsNotification({
                            message: 'Failed to remove profile photo',
                            type: 'error'
                          });
                          setTimeout(() => setSettingsNotification(null), 3000);
                        } finally {
                          setUploadingProfilePhoto(false);
                        }
                      }}
                      className="ml-2 px-4 py-2 rounded-lg text-red-400 text-sm font-medium transition-all duration-200 transform hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        boxShadow: 'rgba(239, 68, 68, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* First and Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={settingsData.firstName}
                  onChange={handleSettingsChange}
                  placeholder="Enter your first name"
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                />
          </div>
          
          <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={settingsData.lastName}
                  onChange={handleSettingsChange}
                  placeholder="Enter your last name"
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                Company Name (Optional)
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={settingsData.companyName}
                onChange={handleSettingsChange}
                placeholder="Enter your company name"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={settingsData.email}
                onChange={handleSettingsChange}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              />
              <p className="text-xs text-gray-400 mt-1">
                Changing your email will require verification
              </p>
            </div>

            {/* Update Profile Button */}
            <button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                background: isUpdatingProfile 
                  ? 'rgba(102, 102, 102, 0.5)' 
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: isUpdatingProfile 
                  ? 'none' 
                  : 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              {isUpdatingProfile ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Update Profile
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Account Security Section */}
        <div className="container-style p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Account Security
          </h3>
          
          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={settingsData.currentPassword}
                onChange={handleSettingsChange}
                placeholder="Enter current password"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={settingsData.newPassword}
                onChange={handleSettingsChange}
                placeholder="Enter new password"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={settingsData.confirmPassword}
                onChange={handleSettingsChange}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              />
            </div>

            {/* Update Password Button */}
            <button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                background: isUpdatingPassword 
                  ? 'rgba(102, 102, 102, 0.5)' 
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: isUpdatingPassword 
                  ? 'none' 
                  : 'rgba(239, 68, 68, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              {isUpdatingPassword ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Update Password
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Account Management Section */}
        <div className="container-style p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Account Management
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-orange-300 text-sm mb-3">
                Need to delete your account? Contact our support team for assistance.
              </p>
              <button
                onClick={() => setCurrentView('support')}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.25) 50%, rgba(249, 115, 22, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  boxShadow: 'rgba(249, 115, 22, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Contact Support
              </button>
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
      
      {/* Animated Credit Counter */}
      {showAnimatedCounter && creditNotifications.length > 0 && (
        <AnimatedCreditCounter
          previousBalance={previousCreditBalance}
          newBalance={creditBalance}
          amountAdded={creditNotifications.reduce((sum, n) => sum + n.amount, 0)}
          reason={creditNotifications.length === 1 ? creditNotifications[0].reason : undefined}
          onAnimationComplete={handleAnimatedCounterComplete}
        />
      )}
      
      {/* Credit Notification (fallback for when animation isn't triggered) */}
      {showCreditNotification && creditNotifications.length > 0 && (
        <div className="mb-6 p-4 rounded-xl animate-pulse" style={{
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
          backdropFilter: 'blur(25px) saturate(200%)',
          border: '2px solid rgba(255, 215, 0, 0.6)',
          boxShadow: 'rgba(250, 204, 21, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
        }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div className="flex-1">
              <h3 className="text-yellow-300 font-bold text-lg">Store Credit Added!</h3>
              <p className="text-yellow-200 text-sm">
                You've received <span className="font-bold">${creditNotifications.reduce((sum, n) => sum + n.amount, 0).toFixed(2)}</span> in store credit!
              </p>
              {creditNotifications.length === 1 && creditNotifications[0].reason && (
                <p className="text-yellow-200 text-xs mt-1">
                  Reason: {creditNotifications[0].reason}
                </p>
              )}
            </div>
            <button
              onClick={handleDismissCreditNotification}
              className="text-yellow-300 hover:text-yellow-100 transition-colors"
              title="Close notification"
              aria-label="Close credit notification"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Store Credit Display - Compact */}
      {creditBalance > 0 && (
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.6) 0%, rgba(255, 215, 0, 0.4) 25%, rgba(250, 204, 21, 0.25) 50%, rgba(255, 193, 7, 0.15) 75%, rgba(250, 204, 21, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(200%)',
            border: '1px solid rgba(255, 215, 0, 0.5)',
            boxShadow: 'rgba(250, 204, 21, 0.25) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
          }}
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    ${creditBalance.toFixed(2)} Store Credit
                  </h3>
                  <p className="text-yellow-300 text-sm">Available to use</p>
                </div>
              </div>
              
              <button
                onClick={() => window.location.href = '/products'}
                className="px-3 md:px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
                  backdropFilter: 'blur(25px) saturate(200%)',
                  border: '1px solid rgba(255, 215, 0, 0.6)',
                  boxShadow: 'rgba(250, 204, 21, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                }}
              >
                <svg className="w-3 md:w-4 h-3 md:h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span className="text-xs md:text-sm">Use Credits</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Deals - Mobile: Swipeable, Desktop: Grid */}
      <div className="mt-3 lg:mt-0">
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🎯 Current Deals
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                  Limited Time
                </span>
              </h2>
            </div>
          </div>
          <div className="p-6">
          
          {/* Mobile: Horizontal Scroll */}
          <div className="lg:hidden">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {/* Deal 1 - Reorder Discount */}
              <button 
                onClick={() => setCurrentView('all-orders')}
                className="flex-shrink-0 w-64 rounded-lg p-3 border border-yellow-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold px-2 py-1 rounded flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' }}>
                    10% OFF
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ color: '#fbbf24' }}>
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Reorder Special
                    </p>
                    <p className="text-xs text-gray-300">10% off any repeat order</p>
                  </div>
                </div>
              </button>

              {/* Deal 2 - Free Next-Day Shipping */}
              <Link href="/products">
                <div className="flex-shrink-0 w-64 rounded-lg p-3 border border-green-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                     style={{ 
                       background: 'rgba(255, 255, 255, 0.05)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                       backdropFilter: 'blur(12px)'
                     }}>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                      FREE
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#10b981' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                        Next-Day Shipping
                      </p>
                      <p className="text-xs text-gray-300">1,000+ stickers</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Deal 3 - Holographic Discount */}
              <Link href="/products/holographic-stickers">
                <div className="flex-shrink-0 w-64 rounded-lg p-3 border border-purple-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                     style={{ 
                       background: 'rgba(255, 255, 255, 0.05)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                       backdropFilter: 'blur(12px)'
                     }}>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                      20% OFF
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">✨ Holographic</p>
                      <p className="text-xs text-gray-300">All holographic stickers</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {/* Deal 1 - Reorder Discount */}
            <button 
              onClick={() => setCurrentView('all-orders')}
              className="rounded-lg p-3 border border-yellow-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold px-2 py-1 rounded flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' }}>
                  10% OFF
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ color: '#fbbf24' }}>
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Reorder Special
                  </p>
                  <p className="text-xs text-gray-300">10% off any repeat order</p>
                </div>
              </div>
            </button>

            {/* Deal 2 - Free Next-Day Shipping */}
            <Link href="/products">
              <div className="rounded-lg p-3 border border-green-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                     backdropFilter: 'blur(12px)'
                   }}>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                    FREE
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#10b981' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      Next-Day Shipping
                    </p>
                    <p className="text-xs text-gray-300">1,000+ stickers</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Deal 3 - Holographic Discount */}
            <Link href="/products/holographic-stickers">
              <div className="rounded-lg p-3 border border-purple-400/30 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                     backdropFilter: 'blur(12px)'
                   }}>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold px-2 py-1 rounded text-white flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                    20% OFF
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">✨ Holographic</p>
                    <p className="text-xs text-gray-300">All holographic stickers</p>
                  </div>
                </div>
              </div>
            </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reorder - PRIORITY 2 */}
      {(() => {
        const lastDeliveredOrder = orders.filter(order => order.status === 'Delivered')[0];
        return lastDeliveredOrder ? (
          <div 
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ color: '#fbbf24' }}>
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Quick Reorder
                </h2>
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
      {orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length > 0 ? (
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px dashed rgba(249, 115, 22, 0.6)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 20px rgba(249, 115, 22, 0.3), 0 0 40px rgba(249, 115, 22, 0.1), inset 0 0 20px rgba(249, 115, 22, 0.1)',
            backdropFilter: 'blur(12px)'
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
          
          {/* Table Header - Desktop Only */}
          <div className="hidden md:block px-6 py-3 border-b border-white/10 bg-white/5">
            <div className="grid grid-cols-16 gap-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              <div className="col-span-3">Preview</div>
              <div className="col-span-2">ORDER #</div>
              <div className="col-span-4">Items</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-3">Actions</div>
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
                    {/* Desktop Row Layout */}
                    <div className="hidden md:grid grid-cols-16 gap-4 items-center">
                      
                      {/* Preview Column - Side by Side Images */}
                      <div className="col-span-3">
                        <div className="flex gap-2">
                          {order.items.slice(0, 2).map((item, index) => {
                            // Get the full item data with images
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            
                                                      // Get product image with sample pack support
                          const productImage = getProductImage(item, itemData);
                            
                            const name = itemData.name || item.name || 'Custom Sticker';
                            
                            return (
                              <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                                {productImage ? (
                                  <div 
                                    className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400/60 transition-all duration-200 hover:scale-105 relative"
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
                                    {/* Re-Order Pill */}
                                    {itemData.isReorder && (
                                      <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1 py-0.5 rounded-full text-[8px] font-bold leading-none">
                                        RE
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center text-gray-400 border border-white/20 text-lg relative">
                                    📄
                                    {/* Re-Order Pill */}
                                    {itemData.isReorder && (
                                      <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1 py-0.5 rounded-full text-[8px] font-bold leading-none">
                                        RE
                                      </div>
                                    )}
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
                      
                      {/* Order Column */}
                      <div className="col-span-2">
                        <div className="font-semibold text-white text-sm">
                          {getOrderDisplayNumber(order)}
                        </div>
                      </div>

                      {/* Items Column - Product Types with Quantities */}
                      <div className="col-span-4">
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
                    <div className="col-span-3">
                      <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                          className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
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
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Reorder
                          </button>
                        
                        {isOrderShippedWithTracking(order) && (
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 010 2h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                            Track Order
                          </button>
                        )}
                        </div>
                      </div>
                    
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-4">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-white text-base">
                            {getOrderDisplayNumber(order)}
                          </div>
                          <div className="text-sm font-semibold text-white">
                            ${order.total}
                          </div>
                        </div>

                        {/* Preview Images */}
                        <div className="flex gap-2">
                          {order.items.slice(0, 3).map((item, index) => {
                            const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                            const productImage = getProductImage(item, itemData);

                            return (
                              <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                {productImage ? (
                                  <img 
                                    src={productImage} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">📄</div>
                                )}
                              </div>
                            );
                          })}
                          {order.items.length > 3 && (
                            <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-xs font-medium">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Items and Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Items</div>
                            <div className="space-y-1">
                              {(() => {
                                const productTypes: { [key: string]: number } = {};
                                
                                order.items.forEach(item => {
                                  const itemData = order._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                                  const quantity = itemData.quantity || item.quantity || 0;
                                  const name = itemData.name || item.name || 'Custom Sticker';
                                  
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
                                
                                return Object.entries(productTypes).slice(0, 2).map(([type, quantity]: [string, number]) => (
                                  <div key={type} className="text-xs text-white">
                                    {quantity} {type}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Date</div>
                            <div className="text-xs text-white">
                              {new Date(order.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order)}
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
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
                            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Reorder
                          </button>
                        </div>

                        {isOrderShippedWithTracking(order) && (
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="w-full px-3 py-2 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-1"
                            style={{
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                              color: 'white'
                            }}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 010 2h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                            Track Order
                          </button>
                        )}
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
      ) : (
        /* Empty State for No Active Orders */
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🔥 Active Orders
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">
                  0
                </span>
              </h2>
            </div>
          </div>
          
          <div className="px-6 py-8 text-center">
            <h3 className="text-white text-lg font-semibold mb-2">There are no active orders</h3>
            <p className="text-gray-400 text-sm mb-6">Ready to create something amazing? Start your first order!</p>
            <button
              onClick={() => window.location.href = '/products'}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                                  boxShadow: 'rgba(59, 130, 246, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Quick Order Section - Sticker Types */}
      <div className="space-y-6">
                        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">🚀 Quick Order</h2>
          <Link 
            href="/products"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            View All Products →
          </Link>
                          </div>
        
        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Vinyl Stickers */}
          <Link href="/products/vinyl-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                  alt="Vinyl Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(168, 242, 106, 0.3))'
                  }}
                />
                          </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">Vinyl →</h3>
                        </div>
          </Link>

          {/* Holographic Stickers */}
          <Link href="/products/holographic-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                  alt="Holographic Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.3))'
                  }}
                                />
                              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">Holographic →</h3>
            </div>
          </Link>

          {/* Glitter Stickers */}
          <Link href="/products/glitter-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                  alt="Glitter Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Glitter →</h3>
            </div>
          </Link>

          {/* Chrome Stickers */}
          <Link href="/products/chrome-stickers">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                  alt="Chrome Stickers" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(220, 220, 220, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-gray-300 transition-colors">Chrome →</h3>
            </div>
          </Link>

          {/* Sticker Sheets */}
          <Link href="/products/sticker-sheets">
            <div 
              className="text-center group cursor-pointer rounded-2xl p-4 transition-all duration-500 hover:scale-105 hover:shadow-lg transform overflow-hidden"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                  alt="Sticker Sheets" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(196, 181, 253, 0.3))'
                  }}
                />
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">Sheets →</h3>
            </div>
          </Link>
        </div>

        {/* Mobile Scrollable */}
        <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-6 md:px-4">
          <div className="flex space-x-3">
            {/* Vinyl Mobile */}
            <Link href="/products/vinyl-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png" 
                    alt="Vinyl" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Vinyl →</h3>
              </div>
            </Link>

            {/* Holographic Mobile */}
            <Link href="/products/holographic-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png" 
                    alt="Holographic" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Holographic →</h3>
              </div>
            </Link>

            {/* Glitter Mobile */}
            <Link href="/products/glitter-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png" 
                    alt="Glitter" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Glitter →</h3>
              </div>
            </Link>

            {/* Chrome Mobile */}
            <Link href="/products/chrome-stickers">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png" 
                    alt="Chrome" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Chrome →</h3>
              </div>
            </Link>

            {/* Sheets Mobile */}
            <Link href="/products/sticker-sheets">
              <div className="flex-shrink-0 w-32 text-center rounded-2xl p-3" style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}>
                <div className="w-20 h-20 mx-auto mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749847809/StickerShuttle_StickerSheetsIcon_2_g61dty.svg" 
                    alt="Sheets" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-xs font-semibold text-white">Sheets →</h3>
              </div>
            </Link>
          </div>
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
        
        <div className="w-full relative z-10 pb-24 lg:pb-0">
          {/* Recording Mode Indicator */}
          {recordingMode && (
            <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              🔴 RECORDING MODE
                                  </div>
          )}
          {/* Header Section */}
          <div className="pt-6 pb-6">
            <div className="w-[90%] sm:w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto">
              {/* Header - Banner with Profile */}
              <div 
                className={`relative rounded-xl p-4 md:p-6 shadow-xl mb-6 overflow-hidden cursor-pointer group banner-gradient ${
                  profile?.banner_template_id === 1 || !profile?.banner_template ? 'stellar-void-animation' : ''
                }`}
                style={{
                  aspectRatio: '5.2/1', // Increased height by 15% (6/1.15 ≈ 5.2/1)
                  minHeight: '207px', // Increased by 15% (180 * 1.15 = 207)
                  width: '100%', // Ensure banner stays within container
                  maxWidth: '100%', // Prevent overflow
                  boxSizing: 'border-box', // Include padding in width calculation
                  ...(profile?.banner_image_url 
                    ? {
                        backgroundImage: `url(${profile.banner_image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }
                    : profile?.banner_template
                      ? {
                          ...JSON.parse(profile.banner_template),
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          // Only add animation for specific templates (not NASA images or new static templates)
                          ...(profile?.banner_template_id === 1 
                            ? { animation: 'stellar-drift 8s ease-in-out infinite' }
                            : profile?.banner_template_id && ![11, 12, 13, 18, 19, 27, 28, 29, 30, 31].includes(profile.banner_template_id)
                            ? { animation: 'stellar-drift 10s ease-in-out infinite' }
                            : {})
                        }
                      : {
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
                          backgroundPosition: '0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          animation: 'stellar-drift 8s ease-in-out infinite'
                        })
                }}
                onClick={handleBannerClick}
                title="Click to change banner image"
              >
                
                {/* Grain texture overlay for default gradient */}
                {!profile?.banner_image_url && (
                  <div 
                    className={`absolute inset-0 ${profile?.banner_template_id === 1 || !profile?.banner_template ? 'opacity-40 bg-noise' : 'opacity-30'}`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='17' cy='17' r='1'/%3E%3Ccircle cx='37' cy='17' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='17' cy='37' r='1'/%3E%3Ccircle cx='37' cy='37' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundSize: '60px 60px'
                    }}
                  ></div>
                )}
                
                {/* Additional animated stars layer for Stellar Void */}
                {(profile?.banner_template_id === 1 || !profile?.banner_template) && !profile?.banner_image_url && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div 
                      className="absolute w-1 h-1 bg-white rounded-full opacity-50"
                      style={{
                        left: '10%',
                        top: '20%',
                        animation: 'star-twinkle 9s ease-in-out infinite',
                        animationDelay: '0s'
                      }}
                    />
                    <div 
                      className="absolute w-1 h-1 bg-white rounded-full opacity-40"
                      style={{
                        left: '30%',
                        top: '60%',
                        animation: 'star-twinkle 9s ease-in-out infinite',
                        animationDelay: '3s'
                      }}
                    />
                    <div 
                      className="absolute w-1.5 h-1.5 bg-purple-300 rounded-full opacity-60"
                      style={{
                        left: '70%',
                        top: '30%',
                        animation: 'star-twinkle 9s ease-in-out infinite',
                        animationDelay: '6s'
                      }}
                    />
                    <div 
                      className="absolute w-1 h-1 bg-white rounded-full opacity-50"
                      style={{
                        left: '85%',
                        top: '70%',
                        animation: 'star-twinkle 9s ease-in-out infinite',
                        animationDelay: '1.5s'
                      }}
                    />
                    <div 
                      className="absolute w-1 h-1 bg-purple-200 rounded-full opacity-40"
                      style={{
                        left: '50%',
                        top: '80%',
                        animation: 'star-twinkle 9s ease-in-out infinite',
                        animationDelay: '4.5s'
                      }}
                    />
                  </div>
                )}
                
                {/* Floating emojis for business templates */}
                {profile?.banner_template && (() => {
                  try {
                    const templateData = JSON.parse(profile.banner_template);
                    const selectedTemplate = bannerTemplates.find(t => 
                      JSON.stringify(t.style) === JSON.stringify(templateData)
                    );
                    
                    if (selectedTemplate?.emojis) {
                      // Create a shuffled array to avoid duplicates next to each other
                      const shuffleArray = (array: string[]) => {
                        const shuffled = [...array];
                        for (let i = shuffled.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        }
                        return shuffled;
                      };
                      
                      // Create a distributed array ensuring no duplicates are adjacent
                      const createDistributedEmojis = (emojis: string[], count: number) => {
                        const result = [];
                        const emojiPool = [...emojis];
                        
                        for (let i = 0; i < count; i++) {
                          if (emojiPool.length === 0) {
                            emojiPool.push(...emojis);
                          }
                          
                          // Try to pick an emoji that's different from the previous one
                          let selectedIndex = 0;
                          if (result.length > 0) {
                            const lastEmoji = result[result.length - 1];
                            const availableEmojis = emojiPool.filter(e => e !== lastEmoji);
                            if (availableEmojis.length > 0) {
                              const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
                              selectedIndex = emojiPool.indexOf(randomEmoji);
                            } else {
                              selectedIndex = Math.floor(Math.random() * emojiPool.length);
                            }
                          }
                          
                          result.push(emojiPool[selectedIndex]);
                          emojiPool.splice(selectedIndex, 1);
                        }
                        
                        return result;
                      };
                      
                      const rows = 2; // Reduced from 3 to 2
                      const cols = 4; // Reduced from 5 to 4 for 25% fewer emojis
                      const totalPositions = rows * cols;
                      const distributedEmojis = createDistributedEmojis(selectedTemplate.emojis, totalPositions);
                      
                      return (
                        <div className="absolute inset-0 pointer-events-none z-5">
                          {/* Regular floating emojis with better spacing */}
                          {distributedEmojis.map((emoji, index) => {
                            // Calculate grid position with more spacing
                            const row = Math.floor(index / cols);
                            const col = index % cols;
                            
                            // Base position from grid with even more spacing
                            const baseLeft = (col * 25) + 12; // 25% spacing, 12% margin
                            const baseTop = (row * 45) + 20; // 45% spacing, 20% margin
                            
                            // Add larger random offset for more natural distribution
                            const randomOffsetX = (Math.random() - 0.5) * 18; // ±9%
                            const randomOffsetY = (Math.random() - 0.5) * 25; // ±12.5%
                            
                            const left = Math.max(5, Math.min(95, baseLeft + randomOffsetX));
                            const top = Math.max(5, Math.min(85, baseTop + randomOffsetY));
                            
                            const randomSize = 0.9 + Math.random() * 0.8; // 0.9-1.7rem
                            const randomRotation = (Math.random() - 0.5) * 40; // ±20deg
                            const isBlurred = Math.random() > 0.8; // 20% chance of blur
                            const animationDuration = 8 + Math.random() * 6; // 8-14s
                            const animationType = Math.floor(Math.random() * 3) + 1; // 1-3
                            
                            return (
                              <span
                                key={index}
                                className="absolute"
                                style={{
                                  left: `${left}%`,
                                  top: `${top}%`,
                                  fontSize: `${randomSize}rem`,
                                  transform: `rotate(${randomRotation}deg)`,
                                  animation: `float-${animationType} ${animationDuration}s ease-in-out infinite`,
                                  animationDelay: `${Math.random() * 4}s`,
                                  filter: isBlurred ? 'blur(1px)' : 'none',
                                  opacity: isBlurred ? 0.4 : 0.7,
                                  zIndex: isBlurred ? 1 : 2
                                }}
                              >
                                {emoji}
                              </span>
                            );
                          })}
                          
                          {/* Big blurry emoji in bottom left corner */}
                          <span
                            className="absolute"
                            style={{
                              left: '8%',
                              bottom: '10%',
                              fontSize: '3rem',
                              transform: 'rotate(-15deg)',
                              animation: 'float-1 12s ease-in-out infinite',
                              animationDelay: '2s',
                              filter: 'blur(2px)',
                              opacity: 0.3,
                              zIndex: 0
                            }}
                          >
                            {selectedTemplate.emojis[Math.floor(Math.random() * selectedTemplate.emojis.length)]}
                          </span>
                        </div>
                      );
                    }
                  } catch (e) {
                    // If parsing fails, just continue without emojis
                  }
                  return null;
                              })()}
                
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v2" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                {/* Profile and Greeting Content - High Z-Index */}
                <div className="relative z-30 pointer-events-none">
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Profile Picture Circle - Fixed position */}
                    <div 
                      className="w-12 h-12 md:w-16 md:h-16 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 flex items-center justify-center relative pointer-events-auto flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        marginTop: '2px' // Reduced margin for mobile alignment
                      }}
                      onClick={(e) => handleProfilePictureClick(e)}
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
                    
                    <div className="flex-1 min-w-0">
                      {/* Greeting Section */}
                      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1"
                          style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                        Greetings, {getUserDisplayName()}
                      </h1>
                      <p className="text-xs md:text-sm text-gray-200 mb-1 md:mb-2">
                        Mission Control Dashboard
                      </p>
                      
                      {/* Terminal Section - Below greeting, doesn't affect profile pic position */}
                      {showTerminalLoader && (
                        <div className="text-sm md:text-xs text-green-400 mt-2 md:mt-1 ml-0 md:ml-0"
                             style={{
                               fontFamily: '"VT323", monospace',
                               fontSize: '16px', // Larger for mobile visibility
                               textShadow: '0 0 5px rgba(0, 255, 0, 0.8)',
                               letterSpacing: '0.05em',
                               lineHeight: '1.3', // Better line height for mobile
                               marginLeft: '0px' // Align with profile pic left edge on mobile
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
                {/* Sidebar - Stats & Quick Actions - Hidden on Mobile */}
                <div className="hidden lg:block lg:col-span-1 space-y-3">
                  {/* Primary Action - Start New Mission */}
                  <Link 
                    href="/products"
                    className="block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden container-style"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                      boxShadow: '0 4px 16px rgba(30, 58, 138, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      backdropFilter: 'blur(12px)'
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
                    className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden ${
                      currentView === 'default' ? 'rounded-2xl' : 'container-style'
                    }`}
                    style={currentView === 'default' ? {
                      background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.3) 0%, rgba(100, 116, 139, 0.2) 50%, rgba(100, 116, 139, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(25px) saturate(180%)' as any,
                      border: '1px solid rgba(100, 116, 139, 0.4)',
                      boxShadow: '0 4px 16px rgba(100, 116, 139, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)' as any
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

                  {/* Stats - Grid Layout for Mobile, Vertical for Desktop */}
                  <div className="grid grid-cols-1 gap-3">
                                      <button 
                    onClick={() => updateCurrentView('all-orders')}
                    className={`block p-3 lg:p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 text-left w-full relative overflow-hidden ${
                      currentView === 'all-orders' ? 'rounded-2xl' : 'container-style'
                    }`}
                    style={currentView === 'all-orders' ? {
                      background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.3) 0%, rgba(75, 85, 99, 0.2) 50%, rgba(75, 85, 99, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(25px) saturate(180%)' as any,
                      border: '1px solid rgba(75, 85, 99, 0.4)',
                      boxShadow: '0 4px 16px rgba(75, 85, 99, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)' as any
                    }}>
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="p-1.5 lg:p-2 rounded-lg bg-transparent">
                        <svg className="w-5 lg:w-7 h-5 lg:h-7" fill="currentColor" viewBox="0 0 24 24"
                             style={{ color: '#10b981', filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.15))' }}>
                          <path d="M6 2C4.9 2 4 2.9 4 4v16c0 .6.4 1 1 1 .2 0 .5-.1.7-.3L9 18l3.3 2.7c.4.4 1 .4 1.4 0L17 18l3.3 2.7c.2.2.5.3.7.3.6 0 1-.4 1-1V4c0-1.1-.9-2-2-2H6zm2 5h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h8c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1zm0 3h4c.6 0 1 .4 1 1s-.4 1-1 1H8c-.6 0-1-.4-1-1s.4-1 1-1z"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Orders</h4>
                        <p className="text-xs text-gray-300">{orders.filter(order => order.status !== 'Delivered').length} active orders</p>
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
                      WebkitBackdropFilter: 'blur(25px) saturate(180%)' as any,
                      border: '1px solid rgba(71, 85, 105, 0.4)',
                      boxShadow: '0 4px 16px rgba(71, 85, 105, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)' as any
                    }}>
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
                      WebkitBackdropFilter: currentView === 'design-vault' ? 'blur(25px) saturate(180%)' as any : 'blur(12px)' as any,
                      border: currentView === 'design-vault' 
                        ? '1px solid rgba(107, 114, 128, 0.4)' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: currentView === 'design-vault'
                        ? '0 8px 32px rgba(107, 114, 128, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        : '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
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


                          </div>

                  {/* Secondary Actions - Hidden on mobile, shown at bottom */}
                  <div className="hidden lg:block space-y-3">


                    <button 
                      onClick={() => updateCurrentView('proofs')}
                      className={`block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden ${currentView === 'proofs' ? 'rounded-2xl' : 'container-style'}`}
                      style={currentView === 'proofs' ? {
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.25) 50%, rgba(249, 115, 22, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(25px) saturate(180%)' as any,
                        border: '1px solid rgba(249, 115, 22, 0.4)',
                        boxShadow: '0 4px 16px rgba(249, 115, 22, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)' as any
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
                      {orders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length > 0 && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </button>

                    {/* Get Support and Settings layout */}
                    <div className="space-y-3">
                      <button 
                        onClick={handleGetSupport}
                        className="container-style block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden"
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
                        className="container-style block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3">
                                                  <div className="p-2 rounded-lg bg-transparent">
                          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"
                               style={{ color: '#9ca3af', filter: 'drop-shadow(0 4px 12px rgba(156, 163, 175, 0.15))' }}>
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
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
                      className="container-style block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 w-full text-left opacity-75 relative overflow-hidden"
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

                {/* Main Content Area - Full width on mobile */}
                <div className="col-span-1 lg:col-span-3 space-y-6">
                  {renderMainContent()}
                </div>


              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  </Layout>

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
      {/* Dashboard */}
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
      
      {/* Orders */}
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
            Orders
          </span>
        )}
      </button>
      
      {/* Finance */}
      <button
        onClick={() => {
          updateCurrentView('financial');
          setExpandedPillButton(expandedPillButton === 'financial' ? null : 'financial');
        }}
        className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
          currentView === 'financial' 
            ? 'text-blue-300' 
            : 'text-white hover:text-gray-200'
        } ${expandedPillButton === 'financial' ? 'gap-2 pr-5' : ''}`}
      >
        {currentView === 'financial' && (
          <div className="absolute inset-px rounded-full" style={{
            background: 'rgba(59, 130, 246, 0.2)',  
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
          }}></div>
        )}
        <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="12" width="4" height="9" rx="2"/>
          <rect x="10" y="6" width="4" height="15" rx="2"/>
          <rect x="17" y="9" width="4" height="12" rx="2"/>
        </svg>
        {expandedPillButton === 'financial' && (
          <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
            Finance
          </span>
        )}
      </button>
      
      {/* Designs */}
      <button
        onClick={() => {
          updateCurrentView('design-vault');
          setExpandedPillButton(expandedPillButton === 'design-vault' ? null : 'design-vault');
        }}
        className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
          currentView === 'design-vault' 
            ? 'text-pink-300' 
            : 'text-white hover:text-gray-200'
        } ${expandedPillButton === 'design-vault' ? 'gap-2 pr-5' : ''}`}
      >
        {currentView === 'design-vault' && (
          <div className="absolute inset-px rounded-full" style={{
            background: 'rgba(236, 72, 153, 0.2)',
            boxShadow: '0 0 12px rgba(236, 72, 153, 0.5)'
          }}></div>
        )}
        <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
        </svg>
        {expandedPillButton === 'design-vault' && (
          <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
            Designs
          </span>
        )}
      </button>
      
      {/* Proofs */}
      <button
        onClick={() => {
          updateCurrentView('proofs');
          setExpandedPillButton(expandedPillButton === 'proofs' ? null : 'proofs');
        }}
        className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
          currentView === 'proofs' 
            ? 'text-orange-300' 
            : 'text-white hover:text-gray-200'
        } ${expandedPillButton === 'proofs' ? 'gap-2 pr-5' : ''}`}
      >
        {currentView === 'proofs' && (
          <div className="absolute inset-px rounded-full" style={{
            background: 'rgba(249, 115, 22, 0.2)',
            boxShadow: '0 0 12px rgba(249, 115, 22, 0.5)'
          }}></div>
        )}
        <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4.5C7.5 4.5 3.73 7.61 2.46 12c1.27 4.39 5.04 7.5 9.54 7.5s8.27-3.11 9.54-7.5c-1.27-4.39-5.04-7.5-9.54-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        {expandedPillButton === 'proofs' && (
          <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
            Proofs
          </span>
        )}
      </button>
      
             {/* Settings */}
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
             <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
           </svg>
         {expandedPillButton === 'settings' && (
           <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
             Settings
           </span>
         )}
       </button>
      
             {/* Support */}
       <button
         onClick={() => {
           handleGetSupport();
           setExpandedPillButton(expandedPillButton === 'support' ? null : 'support');
         }}
         className={`relative flex items-center p-2.5 rounded-full transition-all duration-300 ${
           currentView === 'support' 
             ? 'text-red-300' 
             : 'text-white hover:text-gray-200'
         } ${expandedPillButton === 'support' ? 'gap-2 pr-5' : ''}`}
       >
         {currentView === 'support' && (
           <div className="absolute inset-px rounded-full" style={{
             background: 'rgba(239, 68, 68, 0.2)',
             boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)'
           }}></div>
         )}
         <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
           <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l6 4v-18c0-1.1-.9-2-2-2z"/>
         </svg>
         {expandedPillButton === 'support' && (
           <span className="text-xs font-medium whitespace-nowrap relative z-10 transition-all duration-300">
             Support
           </span>
         )}
       </button>
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
                        className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-6 md:px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        className="w-full px-6 md:px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between"
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
                      className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
            className="container-style p-6 max-w-lg w-full relative"
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowReorderPopup(false);
                setReorderOrderData(null);
                setRemovedRushItems(new Set());
                setRemovedItems(new Set());
                setUpdatedQuantities({});
                setUpdatedPrices({});
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
              <h3 className="text-xl font-bold text-white mb-2">Reorder with Changes?</h3>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4">
                <p className="text-green-300 text-sm font-medium flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  🎉 10% Off for Reordering!
                </p>
              </div>

            </div>
            
            {/* Order Items */}
            <div className="space-y-4 mb-6">
              {reorderOrderData.items.map((item: any, index: number) => {
                // Skip removed items
                if (removedItems.has(index)) return null;
                
                                  // Get full item data if available
                  const itemData = reorderOrderData._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                  const originalQty = itemData.quantity || item.quantity || 1;
                  const currentQty = updatedQuantities[index] ?? originalQty;
                
                return (
                  <div key={index} className="border border-white/10 bg-white/5 rounded-lg p-3 relative">
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
                          {(() => {
                            const productImage = getProductImage(item, itemData);
                            return productImage ? (
                              <img 
                                src={productImage} 
                                alt={item.name || itemData.productName} 
                                className="w-full h-full object-cover rounded" 
                              />
                            ) : (
                              <span className="text-xs">📄</span>
                            );
                          })()}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium mb-2">
                            {itemData.productName || item.name}
                          </div>
                          
                          {/* Product Specifications - Simplified */}
                          <div className="space-y-2 mb-3">
                            {(() => {
                              const selections = itemData.calculatorSelections || {};
                              const specs = [];
                              
                              // Get size
                              if (selections.sizePreset?.displayValue || selections.size?.displayValue || item.size) {
                                specs.push(`📏 ${selections.sizePreset?.displayValue || selections.size?.displayValue || item.size}`);
                              }
                              
                              // Get material
                              if (selections.material?.displayValue || item.material) {
                                specs.push(`🎨 ${selections.material?.displayValue || item.material}`);
                              }
                              
                              // Get cut/shape
                              if (selections.cut?.displayValue || selections.shape?.displayValue) {
                                specs.push(`✂️ ${selections.cut?.displayValue || selections.shape?.displayValue}`);
                              }
                              
                              // Get proof option
                              if (selections.proof?.value !== false) {
                                specs.push(`✅ Send Proof`);
                              }
                              
                              // Get rush status (only if not removed)
                              if (selections.rush?.value === true && !removedRushItems.has(index)) {
                                specs.push(
                                  <div key="rush" className="flex items-center justify-between">
                                    <span>🚀 Rush Order</span>
                                    <button
                                      onClick={() => handleRemoveRushOrder(index)}
                                      className="ml-2 w-4 h-4 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors duration-200"
                                      title="Remove rush order (-40%)"
                                    >
                                      <svg className="w-2.5 h-2.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              }
                              
                              return specs.map((spec, idx) => (
                                <div key={idx} className="text-xs text-gray-300 bg-white/5 rounded px-2 py-1">
                                  {spec}
                                </div>
                              ));
                            })()}
                            
                            {/* Show rush order removal notice */}
                            {(() => {
                              const selections = itemData.calculatorSelections || {};
                              const hadRushOrder = selections.rush?.value === true;
                              const rushOrderRemoved = removedRushItems.has(index);
                              
                              if (hadRushOrder && rushOrderRemoved) {
                                return (
                                  <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded px-2 py-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Rush order removed (-40% savings)
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* Quantity Controls - Compact */}
                          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2 mb-2">
                            <div className="text-xs text-gray-400">Quantity:</div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newQty = Math.max(50, currentQty - 50);
                                  handleQuantityUpdate(index, newQty);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold transition-all duration-200 transform hover:scale-105"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.4) 0%, rgba(14, 165, 233, 0.25) 50%, rgba(14, 165, 233, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(14, 165, 233, 0.4)',
                                  boxShadow: 'rgba(14, 165, 233, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                }}
                              >
                                −
                              </button>
                              <div 
                                className="min-w-[60px] px-2 py-1 rounded text-center text-white text-sm font-mono"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                                  backdropFilter: 'blur(12px)'
                                }}
                              >
                                {currentQty.toLocaleString()}
                              </div>
                              <button
                                onClick={() => {
                                  const newQty = currentQty + 50;
                                  handleQuantityUpdate(index, newQty);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold transition-all duration-200 transform hover:scale-105"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.4) 0%, rgba(14, 165, 233, 0.25) 50%, rgba(14, 165, 233, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(14, 165, 233, 0.4)',
                                  boxShadow: 'rgba(14, 165, 233, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                              {/* Show message if all items are removed */}
              {reorderOrderData.items.every((_: any, index: number) => removedItems.has(index)) && (
                <div className="text-sm text-gray-400 text-center py-4 border border-white/10 bg-white/5 rounded-lg">
                  All items have been removed from this order
                </div>
              )}
            </div>
            
            {/* Estimated Total */}
            <div className="border-t border-white/10 mt-4 pt-3 mb-6">
                              <div className="flex justify-between text-white font-semibold">
                  <span>Estimated Total:</span>
                  <span>${(() => {
                    // Calculate total with updated quantities and prices
                    let calculatedTotal = 0;
                    
                    reorderOrderData.items.forEach((item: any, index: number) => {
                      // Skip removed items
                      if (removedItems.has(index)) return;
                      
                      // Use updated price if available, otherwise calculate with rush removal consideration
                      if (updatedPrices[index]) {
                        calculatedTotal += updatedPrices[index].total;
                      } else {
                        const originalQty = item.quantity || 1;
                        const currentQty = updatedQuantities[index] ?? originalQty;
                        
                        // Check if rush order was removed and recalculate if needed
                        const itemData = reorderOrderData._fullOrderData?.items?.find((fullItem: any) => fullItem.id === item.id) || item;
                        const hadRushOrder = itemData.calculatorSelections?.rush?.value === true;
                        const rushOrderRemoved = removedRushItems.has(index);
                        
                        if (hadRushOrder && rushOrderRemoved) {
                          // Calculate price without rush order - use direct calculation
                          const originalUnitPrice = item.unitPrice || item.totalPrice / originalQty || 0;
                          const originalTotalForQty = originalUnitPrice * currentQty;
                          // Remove 40% rush fee by dividing by 1.4
                          const priceWithoutRush = originalTotalForQty / 1.4;
                          calculatedTotal += priceWithoutRush;
                        } else {
                          // Use original calculation
                          const unitPrice = item.unitPrice || item.totalPrice / originalQty || 0;
                          calculatedTotal += unitPrice * currentQty;
                        }
                      }
                    });
                    
                    const discountedTotal = calculatedTotal * 0.9; // 10% off
                    const formatTotal = isNaN(discountedTotal) ? '0.00' : discountedTotal.toFixed(2);
                    
                    return formatTotal;
                  })()}</span>
                </div>
              <div className="text-xs text-right space-y-1">
                <div className="text-green-400">
                  (10% reorder discount applied)
                </div>
                {rushSavingsAmount > 0 && (
                  <div className="text-blue-400">
                    (Rush removal saved: ${rushSavingsAmount.toFixed(2)})
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Keep Same - Signup Button Style */}
              <button
                onClick={() => handleReorderConfirm(false)}
                disabled={reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))}
                className="w-full py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: reorderOrderData.items.every((_: any, index: number) => removedItems.has(index)) 
                    ? '#666' 
                    : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                  color: '#030140',
                  border: 'none'
                }}
              >
                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Add to Cart & Checkout
              </button>

              {/* Make Changes - Light Grey Button */}
              <button
                onClick={() => handleReorderConfirm(true)}
                disabled={reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))}
                className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-400/30"
                style={{
                  background: reorderOrderData.items.every((_: any, index: number) => removedItems.has(index))
                    ? '#444'
                    : '#6B7280'
                }}
              >
                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Customize & Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Templates Popup */}
      {showBannerTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="max-w-4xl w-full max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl banner-template-popup"
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
              

              
              {/* Template Categories */}
              <div className="space-y-8">
                {/* Default/Cosmic Templates */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-purple-400">🌌</span>
                    Cosmic Templates
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {bannerTemplates.filter(template => template.category === 'cosmic').map((template) => (
                      <div
                        key={template.id}
                        className="relative rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-200 border border-white/10 hover:border-purple-400/50"
                        onClick={() => handleSelectBannerTemplate(template)}
                      >
                        <div 
                          className="w-full relative"
                          style={{
                            ...template.style,
                            aspectRatio: '5.2/1', // Match the actual banner ratio
                            minHeight: '60px' // Minimum height for readability
                          }}
                        >
                          {template.isDefault && (
                            <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded-full">
                              Default
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20"></div>
                          <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                            {template.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business Templates */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-yellow-400">💼</span>
                    Business Templates
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {bannerTemplates.filter(template => template.category === 'business').map((template) => (
                      <div
                        key={template.id}
                        className="relative rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-200 border border-white/10 hover:border-yellow-400/50"
                        onClick={() => handleSelectBannerTemplate(template)}
                      >
                        <div 
                          className="w-full relative"
                          style={{
                            ...template.style,
                            aspectRatio: '5.2/1', // Match the actual banner ratio
                            minHeight: '60px' // Minimum height for readability
                          }}
                        >
                          {/* Show sample icons for business templates */}
                          {template.emojis && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex gap-2 text-2xl opacity-70 filter drop-shadow-sm">
                                {template.emojis.slice(0, 3).map((emoji, index) => (
                                  <span 
                                    key={index}
                                    className="transform hover:scale-110 transition-transform duration-200"
                                    style={{
                                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                      filter: 'contrast(1.1) saturate(1.2)'
                                    }}
                                  >
                                    {emoji}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20"></div>
                          <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                            {template.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cyber Templates */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-cyan-400">🔮</span>
                    Cyber Templates
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {bannerTemplates.filter(template => template.category === 'cyber').map((template) => (
                      <div
                        key={template.id}
                        className="relative rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-200 border border-white/10 hover:border-cyan-400/50"
                        onClick={() => handleSelectBannerTemplate(template)}
                      >
                        <div 
                          className="w-full relative"
                          style={{
                            ...template.style,
                            aspectRatio: '5.2/1', // Match the actual banner ratio
                            minHeight: '60px' // Minimum height for readability
                          }}
                        >
                          <div className="absolute inset-0 bg-black/20"></div>
                          <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                            {template.name}
                          </div>
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
    </>
  );
};

// Disable static generation for this page to prevent build-time GraphQL errors
export async function getServerSideProps() {
  return {
    props: {}
  };
}

export default Dashboard;
