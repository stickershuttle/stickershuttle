import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, gql } from '@apollo/client';
import AdminLayout from '../../components/AdminLayout';
import EditableBusinessCard from '../../components/admin/EditableBusinessCard';

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

export default function CirclePendingReview() {
  const { data, loading, refetch } = useQuery(GET_PENDING_BUSINESSES);
  const [approveBusiness] = useMutation(APPROVE_BUSINESS);
  const [rejectBusiness] = useMutation(REJECT_BUSINESS);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filter only pending businesses
  const pendingBusinesses = data?.getAllCircleBusinesses?.filter(
    (business: any) => business.status === 'pending'
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
          <div className="mb-8">
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
      </AdminLayout>
    </>
  );
}

