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
  proofs: Proof[];
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
  }>;
}

export default function ProofsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data, loading: ordersLoading, refetch } = useQuery(GET_USER_ORDERS_WITH_PROOFS, {
    variables: { userId: user?.id },
    skip: !user?.id
  });

  const [updateProofStatus] = useMutation(UPDATE_PROOF_STATUS);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push('/login?message=Please login to view proofs');
          return;
        }
        
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
    if (!selectedOrder || !selectedProof) return;

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

  const ordersWithProofs = data?.getUserOrders?.filter((order: Order) => order.proofs.length > 0) || [];

  return (
    <Layout title="Your Proofs - Sticker Shuttle">
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4 py-8">
          {!selectedOrder ? (
            // Orders List
            <>
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
                          {order.proofs.map((proof) => (
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
            </>
          ) : (
            // Order Details with Proofs
            <div>
              <div className="mb-6">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to orders
                </button>
                
                <h1 className="text-3xl font-bold text-white mb-2">
                  Order {selectedOrder.orderNumber || `#${selectedOrder.id.split('-')[0].toUpperCase()}`}
                </h1>
                <p className="text-gray-400">{formatDate(selectedOrder.orderCreatedAt)}</p>
              </div>

              <div className="grid gap-6">
                {selectedOrder.proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-lg p-6"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{proof.proofTitle}</h3>
                        <p className="text-sm text-gray-400">{formatDate(proof.uploadedAt)}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proof.status)}`}>
                        {getStatusText(proof.status)}
                      </span>
                    </div>

                    {/* Proof Image */}
                    <div className="mb-6">
                      <img
                        src={proof.proofUrl}
                        alt={proof.proofTitle}
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '500px' }}
                      />
                    </div>

                    {/* Admin Notes */}
                    {proof.adminNotes && (
                      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                        <h4 className="text-sm font-medium text-blue-300 mb-1">Notes from our team:</h4>
                        <p className="text-sm text-gray-300">{proof.adminNotes}</p>
                      </div>
                    )}

                    {/* Customer Notes */}
                    {proof.customerNotes && (
                      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        <h4 className="text-sm font-medium text-green-300 mb-1">Your feedback:</h4>
                        <p className="text-sm text-gray-300">{proof.customerNotes}</p>
                      </div>
                    )}

                    {/* Action Buttons (only if pending) */}
                    {proof.status === 'pending' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Add feedback or notes (optional):
                          </label>
                          <textarea
                            value={customerNotes}
                            onChange={(e) => setCustomerNotes(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                            placeholder="Share your thoughts on this proof..."
                            rows={3}
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleProofAction('approve', proof.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:bg-opacity-80"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve Proof
                          </button>

                          <button
                            onClick={() => handleProofAction('request_changes', proof.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:bg-opacity-80"
                            style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)', border: '1px solid rgba(251, 146, 60, 0.4)' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Request Changes
                          </button>

                          <button
                            onClick={() => {
                              setSelectedProof(proof);
                              setShowFileUpload(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:bg-opacity-80"
                            style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.4)' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload New File
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* File Upload Modal */}
        {showFileUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Upload New File</h3>
              
              <div className="mb-4">
                <input
                  type="file"
                  accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg text-white"
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
                  onClick={() => setShowFileUpload(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-gray-300 hover:text-white transition-colors"
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