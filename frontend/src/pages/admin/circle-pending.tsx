import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, gql } from '@apollo/client';
import AdminLayout from '../../components/AdminLayout';
import EditableBusinessCard from '../../components/admin/EditableBusinessCard';
import { X } from 'lucide-react';

const GET_PENDING_BUSINESSES = gql`
  query GetPendingBusinesses {
    getAllCircleBusinesses {
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
      createdAt
    }
  }
`;

const APPROVE_BUSINESS = gql`
  mutation ApproveBusiness($businessId: ID!) {
    updateBusinessStatus(businessId: $businessId, status: "approved") {
      success
      message
    }
  }
`;

const REJECT_BUSINESS = gql`
  mutation RejectBusiness($businessId: ID!) {
    updateBusinessStatus(businessId: $businessId, status: "rejected") {
      success
      message
    }
  }
`;

const DELETE_BUSINESS = gql`
  mutation DeleteBusiness($businessId: ID!) {
    deleteCircleBusiness(businessId: $businessId) {
      success
      message
    }
  }
`;

export default function CirclePendingReview() {
  const { data, loading, refetch } = useQuery(GET_PENDING_BUSINESSES);
  const [approveBusiness] = useMutation(APPROVE_BUSINESS);
  const [rejectBusiness] = useMutation(REJECT_BUSINESS);
  const [deleteBusiness] = useMutation(DELETE_BUSINESS);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filter businesses by status
  const pendingBusinesses = data?.getAllCircleBusinesses?.filter(
    (business: any) => business.status === 'pending'
  ) || [];

  const activeBusinesses = data?.getAllCircleBusinesses?.filter(
    (business: any) => business.status === 'approved'
  ) || [];

  const handleApprove = async (businessId: string) => {
    setProcessing(businessId);
    try {
      await approveBusiness({ variables: { businessId } });
      refetch();
      alert('Business approved successfully!');
    } catch (error) {
      console.error('Error approving business:', error);
      alert('Failed to approve business');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (businessId: string) => {
    if (!confirm('Are you sure you want to reject this business?')) {
      return;
    }
    setProcessing(businessId);
    try {
      await rejectBusiness({ variables: { businessId } });
      refetch();
      alert('Business rejected');
    } catch (error) {
      console.error('Error rejecting business:', error);
      alert('Failed to reject business');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (businessId: string, businessName: string) => {
    if (!confirm(`Are you sure you want to delete "${businessName}"? This action cannot be undone.`)) {
      return;
    }
    setProcessing(businessId);
    try {
      const result = await deleteBusiness({ 
        variables: { businessId },
        update: (cache, { data }) => {
          if (data?.deleteCircleBusiness?.success) {
            // Update the cache by removing the deleted business
            const existingData: any = cache.readQuery({ query: GET_PENDING_BUSINESSES });
            if (existingData?.getAllCircleBusinesses) {
              const updatedBusinesses = existingData.getAllCircleBusinesses.filter(
                (b: any) => b.id !== businessId
              );
              cache.writeQuery({
                query: GET_PENDING_BUSINESSES,
                data: {
                  getAllCircleBusinesses: updatedBusinesses
                }
              });
            }
          }
        }
      });
      
      console.log('Delete result:', result);
      
      if (result.data?.deleteCircleBusiness?.success) {
        alert('Business deleted successfully');
      } else {
        const errorMsg = result.data?.deleteCircleBusiness?.message || 'Unknown error';
        console.error('Delete failed:', errorMsg);
        alert(`Failed to delete business: ${errorMsg}`);
        // Force refetch if cache update failed
        refetch();
      }
    } catch (error: any) {
      console.error('Error deleting business:', error);
      const errorMessage = error.message || error.graphQLErrors?.[0]?.message || 'Failed to delete business';
      alert(`Error: ${errorMessage}`);
      // Force refetch on error
      refetch();
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Pending Circle Businesses - Admin</title>
        </Head>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-300 text-lg">Loading...</p>
            </div>
          </div>
        </AdminLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Pending Circle Businesses - Admin</title>
      </Head>

      <AdminLayout title="Pending Circle Businesses - Admin">
        <div className="px-4 py-8">
          {/* Pending Section */}
          <div className="mb-12">
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">Pending Circle Review</h1>
              <p className="text-gray-300">
                Review and approve businesses submitted to Pro Circle ({pendingBusinesses.length} pending)
              </p>
            </div>

            {pendingBusinesses.length === 0 ? (
              <div
                className="p-8 rounded-2xl text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <p className="text-gray-400 text-lg">No pending businesses to review!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingBusinesses.map((business: any) => (
                  <EditableBusinessCard
                    key={business.id}
                    business={business}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    processing={processing}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Active Businesses Section */}
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">Active Businesses</h2>
              <p className="text-gray-300">
                Manage approved Circle businesses ({activeBusinesses.length} active)
              </p>
            </div>

            {activeBusinesses.length === 0 ? (
              <div
                className="p-8 rounded-2xl text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <p className="text-gray-400 text-lg">No active businesses yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeBusinesses.map((business: any) => (
                  <div
                    key={business.id}
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(business.id, business.companyName)}
                      disabled={processing === business.id}
                      className="absolute top-3 right-3 z-20 p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors cursor-pointer"
                      title="Delete business"
                    >
                      <X className="w-5 h-5 text-red-400" />
                    </button>

                    {/* Business Card Preview */}
                    <div className="w-full h-48 flex items-center justify-center p-8" style={{ backgroundColor: business.logoBackgroundColor || '#9ca3af' }}>
                      <img src={business.logoUrl} alt={`${business.companyName} logo`} className="max-w-[80%] max-h-[120px] object-contain" />
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-2">{business.companyName}</h3>
                      <div className="mb-3">
                        <span className="text-xs text-gray-400 capitalize">{business.category}</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{business.bio}</p>
                      <div className="text-xs text-gray-500">
                        Approved • {new Date(business.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

