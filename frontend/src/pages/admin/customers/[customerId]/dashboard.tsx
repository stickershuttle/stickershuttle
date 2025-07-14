import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, gql } from '@apollo/client';
import { getSupabase } from '../../../../lib/supabase';

// Import dashboard components
import DefaultView from '../../../../components/dashboard/tabs/DefaultView';
import AllOrdersView from '../../../../components/dashboard/tabs/AllOrdersView';
import FinancialView from '../../../../components/dashboard/tabs/FinancialView';
import ItemsAnalysisView from '../../../../components/dashboard/tabs/ItemsAnalysisView';
import DesignVaultView from '../../../../components/dashboard/tabs/DesignVaultView';
import ProofsView from '../../../../components/dashboard/tabs/ProofsView';
import OrderDetailsView from '../../../../components/dashboard/tabs/OrderDetailsView';
import OrderDetailsPopupView from '../../../../components/dashboard/tabs/OrderDetailsPopupView';

import { GET_USER_ORDERS } from '../../../../lib/order-mutations';
import { GET_USER_PROFILE } from '../../../../lib/profile-mutations';
import { GET_USER_CREDIT_BALANCE } from '../../../../lib/credit-mutations';
import { useReorderHandler } from '../../../../hooks/useReorderHandler';

// Admin emails
const ADMIN_EMAILS = ['justin@stickershuttle.com'];

// GraphQL query to get customer by email
const GET_CUSTOMER_BY_EMAIL = gql`
  query GetCustomerByEmail($email: String!) {
    getAllCustomers {
      id
      email
      firstName
      lastName
      totalOrders
      totalSpent
      averageOrderValue
      lastOrderDate
      firstOrderDate
    }
  }
`;

type DashboardView = 'default' | 'all-orders' | 'financial' | 'items-analysis' | 'design-vault' | 'proofs' | 'order-details' | 'order-details-popup';

export default function CustomerDashboard() {
  const router = useRouter();
  const { customerId } = router.query;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('default');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  const [selectedOrderForPopup, setSelectedOrderForPopup] = useState<any>(null);
  const [selectedDesignImage, setSelectedDesignImage] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const { handleReorder: reorderHandler } = useReorderHandler();

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }

        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
          router.push('/account/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router]);

  // Extract customer email from URL
  useEffect(() => {
    if (customerId && typeof customerId === 'string') {
      const email = decodeURIComponent(customerId);
      setCustomerEmail(email);
    }
  }, [customerId]);

  // Get customer info
  const { data: customerData } = useQuery(GET_CUSTOMER_BY_EMAIL, {
    variables: { email: customerEmail || '' },
    skip: !customerEmail,
    onCompleted: (data) => {
      const customer = data.getAllCustomers?.find((c: any) => c.email.toLowerCase() === customerEmail?.toLowerCase());
      if (customer) {
        setCustomerInfo(customer);
      }
    }
  });

  // Get customer orders
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_USER_ORDERS, {
    variables: { userId: customerInfo?.id || '' },
    skip: !customerInfo?.id,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  // Get customer profile
  const { data: profileData } = useQuery(GET_USER_PROFILE, {
    variables: { userId: customerInfo?.id || '' },
    skip: !customerInfo?.id
  });

  // Get customer credit balance
  const { data: creditData } = useQuery(GET_USER_CREDIT_BALANCE, {
    variables: { userId: customerInfo?.id || '' },
    skip: !customerInfo?.id
  });

  const orders = ordersData?.getUserOrders || [];
  const profile = profileData?.getUserProfile || null;
  const creditBalance = creditData?.getUserCreditBalance?.balance || 0;

  // Dashboard helper functions
  const getOrderDisplayNumber = (order: any) => {
    return order.orderNumber || order.id?.substring(0, 8) || 'N/A';
  };

  const getProductImage = (item: any, itemData?: any) => {
    const data = itemData || item;
    if (data.customFiles && data.customFiles.length > 0) {
      return data.customFiles[0];
    }
    return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1747860831/samples/sticker-default.png';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'text-green-400';
      case 'Shipped': return 'text-blue-400';
      case 'Printing': return 'text-yellow-400';
      case 'Building Proof': return 'text-purple-400';
      case 'Proof Review Needed': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusDisplayText = (status: string) => {
    return status || 'Processing';
  };

  const isOrderShippedWithTracking = (order: any) => {
    return order.orderStatus === 'Shipped' && order.trackingNumber;
  };

  const handleViewOrderDetails = (order: any) => {
    setSelectedOrderForInvoice(order);
    setCurrentView('order-details');
  };

  const handleTrackOrder = (order: any) => {
    if (order.trackingUrl) {
      window.open(order.trackingUrl, '_blank');
    }
  };

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      await reorderHandler(orderId, orders);
    } catch (error) {
      console.error('Error reordering:', error);
    } finally {
      setReorderingId(null);
    }
  };

  const refreshOrders = () => {
    refetchOrders();
  };

  const setCurrentViewString = (view: string) => {
    setCurrentView(view as DashboardView);
  };

  const renderMainContent = () => {
    const commonProps = {
      orders,
      handleReorder,
      handleViewOrderDetails,
      handleTrackOrder,
      getOrderDisplayNumber,
      getProductImage,
      getStatusColor,
      getStatusDisplayText,
      isOrderShippedWithTracking,
      refreshOrders,
      setCurrentView: setCurrentViewString,
      reorderingId,
      selectedDesignImage,
      setSelectedDesignImage
    };

    switch (currentView) {
      case 'all-orders':
        return (
          <AllOrdersView
            {...commonProps}
            currentView={currentView}
            wholesaleClients={[]}
          />
        );
      case 'financial':
        return (
          <FinancialView
            {...commonProps}
            creditBalance={creditBalance}
            sellingPrices={{}}
            setSellingPrices={() => {}}
            user={customerInfo}
          />
        );
              case 'items-analysis':
          return <ItemsAnalysisView />;
      case 'design-vault':
        return <DesignVaultView {...commonProps} />;
      case 'proofs':
        return (
          <ProofsView
            {...commonProps}
            replacementSent={{}}
            renderProofReviewInterface={() => <div>No proof review interface</div>}
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
            handleViewOrderDetails={handleViewOrderDetails}
            handleCloseOrderDetails={() => setCurrentView('default')}
            getOrderDisplayNumber={getOrderDisplayNumber}
            getProductImage={getProductImage}
            user={customerInfo}
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
            generatePrintPDF={() => {}}
            generateDownloadPDF={() => {}}
            getProductImage={getProductImage}
          />
        );
      default:
        return (
          <DefaultView
            {...commonProps}
            creditBalance={creditBalance}
            profile={profile}
            setProfile={() => {}}
            showOrderCompleteMessage={false}
            setShowOrderCompleteMessage={() => {}}
            showAnimatedCounter={false}
            creditNotifications={[]}
            previousCreditBalance={0}
            handleAnimatedCounterComplete={() => {}}
            showCreditNotification={false}
            handleDismissCreditNotification={() => {}}
            renderOrderProgressTracker={() => <div>No progress tracker</div>}
            currentView={currentView}
          />
        );
    }
  };

  if (loading || !isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!customerEmail) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="text-center">
            <h3 className="text-lg font-medium text-white mb-2">Invalid Customer</h3>
            <p className="text-sm text-gray-400">Customer email not found</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Customer Dashboard
                </h1>
                <p className="text-gray-400">
                  Viewing dashboard for: {customerInfo?.firstName || customerInfo?.lastName 
                    ? `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim()
                    : customerEmail}
                </p>
                <p className="text-sm text-gray-500">{customerEmail}</p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 rounded-lg text-white transition-all duration-200 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                ← Back to Customers
              </button>
            </div>
          </div>

          {/* Customer Stats */}
          {customerInfo && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="p-4 rounded-lg" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Total Orders</h3>
                <p className="text-2xl font-bold text-white">{customerInfo.totalOrders}</p>
              </div>
              <div className="p-4 rounded-lg" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Total Spent</h3>
                <p className="text-2xl font-bold text-green-400">${customerInfo.totalSpent.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-lg" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Average Order</h3>
                <p className="text-2xl font-bold text-blue-400">${customerInfo.averageOrderValue.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-lg" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Credit Balance</h3>
                <p className="text-2xl font-bold text-purple-400">${creditBalance.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'default', label: 'Overview' },
                { key: 'all-orders', label: 'All Orders' },
                { key: 'financial', label: 'Financial' },
                { key: 'items-analysis', label: 'Items Analysis' },
                { key: 'design-vault', label: 'Design Vault' },
                { key: 'proofs', label: 'Proofs' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setCurrentView(tab.key as DashboardView)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentView === tab.key
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    background: currentView === tab.key 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: currentView === tab.key 
                      ? '1px solid rgba(59, 130, 246, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: currentView === tab.key 
                      ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="relative">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
              </div>
            ) : (
              renderMainContent()
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 