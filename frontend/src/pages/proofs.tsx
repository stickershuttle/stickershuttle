import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../lib/supabase';
import { uploadToCloudinary } from '../utils/cloudinary';

// GraphQL query to get user orders with proofs
const GET_USER_ORDERS_WITH_PROOFS = gql`
  query GetUserOrdersWithProofs($userId: ID!) {
    getUserOrders(userId: $userId) {
      id
      orderNumber
      orderStatus
      totalPrice
      orderCreatedAt
      proofs {
        id
        proofUrl
        proofTitle
        uploadedAt
        status
        customerNotes
        adminNotes
      }
      items {
        id
        productName
        quantity
      }
    }
  }
`;

// GraphQL query to get a specific order
const GET_ORDER_BY_ID = gql`
  query GetOrderById($orderId: ID!) {
    getOrderById(id: $orderId) {
      id
      orderNumber
      orderStatus
      totalPrice
      orderCreatedAt
      customerFirstName
      customerLastName
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        status
        customerNotes
        adminNotes
      }
      items {
        id
        productName
        quantity
        totalPrice
        calculatorSelections
      }
    }
  }
`;

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

interface Proof {
  id: string;
  proofUrl: string;
  proofTitle: string;
  uploadedAt: string;
  status: string;
  customerNotes?: string;
  adminNotes?: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  orderStatus: string;
  totalPrice: number;
  orderCreatedAt: string;
  customerFirstName?: string;
  customerLastName?: string;
  proofs: Proof[];
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    totalPrice?: number;
    calculatorSelections?: any;
  }>;
}

export default function ProofsPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentProofId, setCurrentProofId] = useState<string | null>(null);

  // Query for all user orders
  const { data, loading: ordersLoading, refetch } = useQuery(GET_USER_ORDERS_WITH_PROOFS, {
    variables: { userId: user?.id },
    skip: !user?.id || !!orderId // Skip if we have a specific orderId
  });

  // Query for specific order if orderId is provided
  const { data: orderData, loading: orderLoading, refetch: refetchOrder } = useQuery(GET_ORDER_BY_ID, {
    variables: { orderId },
    skip: !orderId,
    onCompleted: (data) => {
      if (data?.getOrderById) {
        setSelectedOrder(data.getOrderById);
      }
    }
  });

  const [updateProofStatus] = useMutation(UPDATE_PROOF_STATUS);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      console.log('🔐 Checking authentication...');
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('👤 Session:', session);
        
        if (!session?.user) {
          console.log('❌ No session found, redirecting to login');
          router.push('/login?message=Please login to view proofs');
          return;
        }
        
        console.log('✅ User authenticated:', session.user.email);
        setUser(session.user);
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  // Log query results
  useEffect(() => {
    if (orderId) {
      console.log('📋 Order ID from URL:', orderId);
    }
    
    if (orderData) {
      console.log('📦 Order data received:', orderData);
    }
    
    if (orderLoading) {
      console.log('⏳ Loading order data...');
    }
    
    if (data) {
      console.log('📊 User orders data:', data);
    }
  }, [orderId, orderData, orderLoading, data]);

  const handleProofAction = async (action: 'approve' | 'request_changes', proofId: string) => {
    if (!selectedOrder) return;

    try {
      await updateProofStatus({
        variables: {
          orderId: selectedOrder.id,
          proofId,
          status: action === 'approve' ? 'approved' : 'changes_requested',
          customerNotes: customerNotes || null
        }
      });

      setCustomerNotes('');
      refetch();
      
      // Show success message
      alert(action === 'approve' ? 'Proof approved!' : 'Change request submitted!');
    } catch (error) {
      console.error('Error updating proof:', error);
      alert('Failed to update proof status');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedOrder || !currentProofId) return;

    setUploadingFile(true);
    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        file,
        {
          selectedCut: 'customer_revision',
          selectedMaterial: 'customer_file',
          timestamp: new Date().toISOString()
        },
        undefined,
        'customer-files'
      );

      // Here you would typically call a mutation to save the customer's revised file
      // For now, we'll just show success
      alert('File uploaded successfully! We\'ll review your changes.');
      setShowFileUpload(false);
      setUploadingFile(false);
      setCurrentProofId(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      setUploadingFile(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      default:
        return 'Pending Review';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </Layout>
    );
  }

  // Show loading spinner while fetching order data
  if (orderId && orderLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your proof...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle error state for specific order
  if (orderId && !orderLoading && !selectedOrder) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-1">Order not found</h3>
            <p className="text-sm text-gray-400">The order you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const ordersWithProofs = data?.getUserOrders?.filter((order: Order) => order.proofs.length > 0) || [];

  // If we have a specific orderId or selectedOrder, show the proof view
  if (selectedOrder) {
    // Handle case where order has no proofs yet
    if (!selectedOrder.proofs || selectedOrder.proofs.length === 0) {
      return (
        <Layout title="Order Proofs - Sticker Shuttle">
          <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
            <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 py-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Order {selectedOrder.orderNumber || `#${selectedOrder.id.split('-')[0].toUpperCase()}`}
                </h1>
                <p className="text-gray-400">{formatDate(selectedOrder.orderCreatedAt)}</p>
              </div>

              <div className="text-center py-12">
                <div className="text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-1">No proofs uploaded yet</h3>
                  <p className="text-sm">We're working on your design proofs. Check back soon!</p>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout title="Review Proof - Sticker Shuttle">
        <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
          <style jsx>{`
            .container-style {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(12px);
              border-radius: 16px;
            }
            
            .button-interactive {
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
            }
            
            .button-interactive:hover {
              transform: translateY(-1px);
            }
            
            .button-interactive:active {
              transform: translateY(0) scale(0.98);
            }
            
            .animate-glow-green {
              box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 0 25px rgba(34, 197, 94, 0.2);
            }
            
            .animate-glow-orange {
              box-shadow: 0 0 15px rgba(249, 115, 22, 0.4), 0 0 25px rgba(249, 115, 22, 0.2);
            }
            
            .animate-glow-blue {
              box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), 0 0 25px rgba(59, 130, 246, 0.2);
            }
          `}</style>
          
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
              {!orderId && (
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                  }}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 button-interactive"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to orders
                </button>
              )}
              
              <h1 className="text-3xl font-bold text-white mb-2">
                Order {selectedOrder.orderNumber || `#${selectedOrder.id.split('-')[0].toUpperCase()}`}
              </h1>
              <p className="text-gray-400">{formatDate(selectedOrder.orderCreatedAt)}</p>
            </div>

            {/* Side-by-Side Proofs Layout */}
            <div className="space-y-8">
              {selectedOrder.proofs.map((proof: Proof, index: number) => (
                <div key={proof.id} className="container-style p-6">
                  {/* Proof Header - Hide filename, add green check */}
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

                  {/* Side-by-Side Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Side - Proof Image */}
                    <div className="space-y-4">
                      <div 
                        className="rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                        onClick={() => window.open(proof.proofUrl, '_blank')}
                      >
                        <img
                          src={proof.proofUrl}
                          alt={proof.proofTitle}
                          className="w-full h-auto p-4"
                          style={{ maxHeight: '60vh', objectFit: 'contain' }}
                        />
                      </div>
                      
                      {/* Cut-line Options - Show only selected option */}
                      {(() => {
                        // Get cut line selection from the first item's calculator selections
                        const firstItem = selectedOrder.items[0];
                        const cutSelection = firstItem?.calculatorSelections?.cut;
                        
                        if (!cutSelection?.displayValue) return null;
                        
                        const isGreenCut = cutSelection.displayValue.toLowerCase().includes('kiss') || 
                                          cutSelection.displayValue.toLowerCase().includes('cut through backing') ||
                                          !cutSelection.displayValue.toLowerCase().includes('through');
                        
                        return (
                          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>

                            
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded border-2 flex-shrink-0" 
                                style={{ 
                                  borderColor: isGreenCut ? '#91c848' : '#6b7280', 
                                  backgroundColor: 'transparent' 
                                }}
                              ></div>
                              <span 
                                className="text-sm font-medium" 
                                style={{ color: isGreenCut ? '#91c848' : '#6b7280' }}
                              >
                                {isGreenCut ? 'Green' : 'Grey'} cut-line indicates where the sticker will be cut - {cutSelection.displayValue}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Replace File Button */}
                      {(proof.status === 'pending' || proof.status === 'sent') && (
                        <div
                          className="relative group cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.05)',
                            borderColor: 'rgba(59, 130, 246, 0.3)',
                            padding: '16px'
                          }}
                          onClick={() => {
                            setCurrentProofId(proof.id);
                            setShowFileUpload(true);
                          }}
                        >
                          <div className="flex flex-col items-center text-center">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                              style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                            >
                              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                            <h3 className="text-white font-semibold mb-1">Replace File</h3>
                            <p className="text-blue-300 text-sm">Click to upload a new design file</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side - Order Details & Actions */}
                    <div className="space-y-6">
                      {/* Order Details */}
                      <div className="container-style p-4">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <span className="text-purple-400">📋</span>
                          Order Details
                        </h4>
                        
                        {/* Product Items with Full Calculator Details */}
                        <div className="space-y-4">
                          {selectedOrder.items.map((item) => {
                            const selections = item.calculatorSelections || {};
                            const size = selections.size || selections.sizePreset || {};
                            
                            return (
                              <div
                                key={item.id}
                                className="p-4 rounded-lg space-y-3"
                                style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)' }}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-white font-medium">{item.productName}</p>
                                    <p className="text-purple-300 text-sm">Quantity: {item.quantity}</p>
                                  </div>
                                  {item.totalPrice && (
                                    <p className="text-green-400 font-semibold">{formatCurrency(item.totalPrice)}</p>
                                  )}
                                </div>
                                
                                {/* Calculator Specifications Grid */}
                                <div className="grid grid-cols-1 gap-2">
                                  {selections.cut?.displayValue && (
                                    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                      <span className="text-xs text-gray-400 uppercase tracking-wider">Cut Style</span>
                                      <span className="text-blue-300 text-sm font-medium">{selections.cut.displayValue}</span>
                                    </div>
                                  )}
                                  {selections.material?.displayValue && (
                                    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                                      <span className="text-xs text-gray-400 uppercase tracking-wider">Material</span>
                                      <span className="text-green-300 text-sm font-medium">{selections.material.displayValue}</span>
                                    </div>
                                  )}
                                  {((size.width && size.height) || size.displayValue) && (
                                    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)' }}>
                                      <span className="text-xs text-gray-400 uppercase tracking-wider">Size</span>
                                      <span className="text-orange-300 text-sm font-medium">
                                        {size.width && size.height ? `${size.width}" × ${size.height}"` : size.displayValue}
                                      </span>
                                    </div>
                                  )}
                                  {selections.finish?.displayValue && (
                                    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                                      <span className="text-xs text-gray-400 uppercase tracking-wider">Finish</span>
                                      <span className="text-purple-300 text-sm font-medium">{selections.finish.displayValue}</span>
                                    </div>
                                  )}
                                  {selections.lamination?.displayValue && (
                                    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                                      <span className="text-xs text-gray-400 uppercase tracking-wider">Lamination</span>
                                      <span className="text-pink-300 text-sm font-medium">{selections.lamination.displayValue}</span>
                                    </div>
                                  )}
                                  {selections.rush && (
                                    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                      <span className="text-xs text-gray-400 uppercase tracking-wider">Rush Order</span>
                                      <span className="text-red-300 text-sm font-medium">Yes</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Total Price */}
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-medium">Total:</span>
                            <span className="text-green-400 font-bold text-lg">{formatCurrency(selectedOrder.totalPrice)}</span>
                          </div>
                        </div>

                        {/* Production Info */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                          <div className="flex items-center gap-3">
                            <img 
                              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750314056/cmyk_nypyrn.png" 
                              alt="CMYK" 
                              className="w-5 h-5"
                            />
                            <span className="text-white text-sm font-medium">Converted to CMYK</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-white text-sm font-medium">Printed Within 48-Hours of Approval</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      {proof.adminNotes && (
                        <div className="container-style p-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                          <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Notes from our team
                          </h4>
                          <p className="text-sm text-gray-300">{proof.adminNotes}</p>
                        </div>
                      )}

                      {/* Customer Notes */}
                      {proof.customerNotes && (
                        <div className="container-style p-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                          <h4 className="text-sm font-medium text-green-300 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Your feedback
                          </h4>
                          <p className="text-sm text-gray-300">{proof.customerNotes}</p>
                        </div>
                      )}

                      {/* Action Section (if pending or sent to customer) */}
                      {(proof.status === 'pending' || proof.status === 'sent') && (
                        <div className="container-style p-4 space-y-4">
                          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="text-yellow-400">⚡</span>
                            Review & Respond
                          </h4>
                          
                          {/* Notes Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Add feedback or notes (optional)
                            </label>
                            <textarea
                              value={customerNotes}
                              onChange={(e) => setCustomerNotes(e.target.value)}
                              className="w-full px-6 md:px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all backdrop-blur-md"
                              style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                              placeholder="Share any feedback about this proof..."
                              rows={4}
                            />
                          </div>

                          {/* Action Buttons - Calculator Style */}
                          <div className="space-y-3">
                            <div
                              className="relative group cursor-pointer rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                              style={{
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                borderColor: 'rgba(34, 197, 94, 0.3)',
                                padding: '16px'
                              }}
                              onClick={() => handleProofAction('approve', proof.id)}
                            >
                              <div className="flex items-center gap-4">
                                <div 
                                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
                                >
                                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-white font-semibold mb-1">Approve This Proof</h3>
                                  <p className="text-green-300 text-sm">This design looks perfect, proceed with production</p>
                                </div>
                              </div>
                            </div>

                            <div
                              className="relative group cursor-pointer rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                              style={{
                                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                                borderColor: 'rgba(251, 146, 60, 0.3)',
                                padding: '16px'
                              }}
                              onClick={() => handleProofAction('request_changes', proof.id)}
                            >
                              <div className="flex items-center gap-4">
                                <div 
                                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                                  style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)' }}
                                >
                                  <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-white font-semibold mb-1">Request Changes</h3>
                                  <p className="text-orange-300 text-sm">I'd like some modifications to this design</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status Messages for non-pending proofs */}
                      {proof.status === 'approved' && (
                        <div className="container-style p-6 text-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                          <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h4 className="text-lg font-medium text-green-300 mb-1">Proof Approved!</h4>
                          <p className="text-sm text-gray-400">We'll proceed with production using this design.</p>
                        </div>
                      )}

                      {proof.status === 'changes_requested' && (
                        <div className="container-style p-6 text-center" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)' }}>
                          <svg className="w-12 h-12 text-orange-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h4 className="text-lg font-medium text-orange-300 mb-1">Changes Requested</h4>
                          <p className="text-sm text-gray-400">Our team is working on your requested changes.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* File Upload Modal */}
          {showFileUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 container-style">
                <h3 className="text-lg font-semibold text-white mb-4">Upload New File</h3>
                
                <div className="mb-4">
                  <input
                    type="file"
                    accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
                    aria-label="Select replacement file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg text-white backdrop-blur-md"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                    disabled={uploadingFile}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Supports: .ai, .svg, .eps, .png, .jpg, .psd (max 10MB)
                  </p>
                </div>

                {uploadingFile && (
                  <div className="mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
                    <p className="text-sm text-gray-400 text-center mt-2">Uploading...</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFileUpload(false);
                      setCurrentProofId(null);
                    }}
                    className="flex-1 px-6 md:px-4 py-2 rounded-lg text-gray-300 hover:text-white transition-colors button-interactive"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    disabled={uploadingFile}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Your Proofs - Sticker Shuttle">
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 py-8">
          {/* Orders List */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Your Proofs</h1>
            <p className="text-gray-400">Review and approve your design proofs</p>
          </div>

          {ordersWithProofs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-1">No proofs available</h3>
                <p className="text-sm">We'll notify you when your design proofs are ready for review</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {ordersWithProofs.map((order: Order) => (
                <div
                  key={order.id}
                  className="rounded-lg p-6 cursor-pointer transition-all hover:bg-opacity-80"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Order {order.orderNumber || `#${order.id.split('-')[0].toUpperCase()}`}
                      </h3>
                      <p className="text-sm text-gray-400">{formatDate(order.orderCreatedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-400">{formatCurrency(order.totalPrice)}</p>
                      <p className="text-sm text-gray-400">{order.proofs.length} proof{order.proofs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-purple-300"
                        style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)' }}
                      >
                        {item.productName} × {item.quantity}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">Proof Status:</span>
                    <div className="flex gap-2">
                      {order.proofs.map((proof: Proof) => (
                        <span
                          key={proof.id}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(proof.status)}`}
                        >
                          {getStatusText(proof.status)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 



