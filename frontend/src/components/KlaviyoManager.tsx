import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  UPDATE_CUSTOMER_SUBSCRIPTION,
  SYNC_ALL_CUSTOMERS_TO_KLAVIYO,
  GET_KLAVIYO_LISTS,
  GET_KLAVIYO_CONFIGURED_LISTS,
  TRACK_KLAVIYO_EVENT
} from '../lib/klaviyo-mutations';

interface KlaviyoManagerProps {
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    marketingOptIn: boolean;
  };
  onSubscriptionUpdate?: (email: string, subscribed: boolean) => void;
}

const KlaviyoManager: React.FC<KlaviyoManagerProps> = ({ 
  customer, 
  onSubscriptionUpdate 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showBulkSync, setShowBulkSync] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ success: number; failed: number; total: number } | null>(null);

  // GraphQL mutations
  const [updateSubscription] = useMutation(UPDATE_CUSTOMER_SUBSCRIPTION);
  const [syncAllCustomers] = useMutation(SYNC_ALL_CUSTOMERS_TO_KLAVIYO);
  const [trackEvent] = useMutation(TRACK_KLAVIYO_EVENT);

  // Get Klaviyo lists
  const { data: listsData, loading: listsLoading } = useQuery(GET_KLAVIYO_LISTS);
  const { data: configuredListsData, loading: configuredListsLoading } = useQuery(GET_KLAVIYO_CONFIGURED_LISTS);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubscriptionToggle = async (email: string, subscribed: boolean) => {
    setIsLoading(true);
    try {
      const { data } = await updateSubscription({
        variables: { email, subscribed }
      });

      if (data.updateCustomerSubscription.success) {
        showMessage('success', `Customer ${subscribed ? 'subscribed to' : 'unsubscribed from'} Klaviyo successfully`);
        onSubscriptionUpdate?.(email, subscribed);
        
        // Track the event
        await trackEvent({
          variables: {
            email,
            eventName: subscribed ? 'Subscribed to Marketing' : 'Unsubscribed from Marketing',
            properties: {
              source: 'Admin Panel',
              timestamp: new Date().toISOString()
            }
          }
        });
      } else {
        showMessage('error', data.updateCustomerSubscription.message || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      showMessage('error', 'Failed to update subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSync = async () => {
    setIsLoading(true);
    setSyncProgress(null);
    
    try {
      const { data } = await syncAllCustomers();
      
      if (data.syncAllCustomersToKlaviyo) {
        const result = data.syncAllCustomersToKlaviyo;
        setSyncProgress({
          success: result.success,
          failed: result.failed,
          total: result.total
        });
        
        if (result.success > 0) {
          showMessage('success', `Successfully synced ${result.success} customers to Klaviyo`);
        }
        
        if (result.failed > 0) {
          showMessage('error', `Failed to sync ${result.failed} customers. Check console for details.`);
          console.error('Sync errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Error syncing customers:', error);
      showMessage('error', 'Failed to sync customers to Klaviyo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750291437/e2672593-d403-4b51-b028-d913fd20cde2.png"
          alt="Klaviyo"
          className="w-8 h-8"
        />
        <h2 className="text-xl font-bold text-white">Klaviyo Integration</h2>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Customer Subscription Management */}
      {customer && (
        <div 
          className="p-6 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Customer Subscription</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{customer.firstName} {customer.lastName}</p>
              <p className="text-gray-400 text-sm">{customer.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Status: {customer.marketingOptIn ? (
                  <span className="text-green-400">Subscribed</span>
                ) : (
                  <span className="text-gray-400">Not Subscribed</span>
                )}
              </p>
            </div>
            
            <button
              onClick={() => handleSubscriptionToggle(customer.email, !customer.marketingOptIn)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: customer.marketingOptIn
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: customer.marketingOptIn
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid rgba(34, 197, 94, 0.4)',
                boxShadow: customer.marketingOptIn
                  ? 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  : 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              {isLoading ? 'Updating...' : customer.marketingOptIn ? 'Unsubscribe' : 'Subscribe'}
            </button>
          </div>
        </div>
      )}

      {/* Configured Lists */}
      <div 
        className="p-6 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          📋 Configured Lists
          <span className="text-sm font-normal text-gray-400 ml-2">
            (Auto-managed by Klaviyo)
          </span>
        </h3>
        
        {configuredListsLoading ? (
          <div className="text-gray-400">Loading configured lists...</div>
        ) : configuredListsData?.getKlaviyoConfiguredLists?.success && configuredListsData.getKlaviyoConfiguredLists.lists.length > 0 ? (
          <div className="space-y-2">
            {configuredListsData.getKlaviyoConfiguredLists.lists.map((list: any) => (
              <div key={list.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <p className="text-white font-medium">
                    {list.name} List
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                      {list.type}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">ID: {list.id}</p>
                </div>
                <div className="text-xs text-green-400 font-medium">
                  ✅ Configured
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">
            {configuredListsData?.getKlaviyoConfiguredLists?.error 
              ? `Error: ${configuredListsData.getKlaviyoConfiguredLists.error}`
              : 'No configured lists found'
            }
          </div>
        )}
      </div>

      {/* All Klaviyo Lists */}
      <div 
        className="p-6 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          📊 All Klaviyo Lists
          <span className="text-sm font-normal text-gray-400 ml-2">
            (From Klaviyo API)
          </span>
        </h3>
        
        {listsLoading ? (
          <div className="text-gray-400">Loading lists...</div>
        ) : listsData?.getKlaviyoLists?.length > 0 ? (
          <div className="space-y-2">
            {listsData.getKlaviyoLists.map((list: any) => (
              <div key={list.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <p className="text-white font-medium">{list.name}</p>
                  <p className="text-xs text-gray-500">ID: {list.id}</p>
                </div>
                <div className="text-xs text-gray-400">
                  Created: {list.created ? new Date(list.created).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No lists found or Klaviyo not configured</div>
        )}
      </div>

      {/* Bulk Operations */}
      <div 
        className="p-6 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Bulk Operations</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Sync All Customers</p>
              <p className="text-sm text-gray-400">
                Sync all customers from your database to Klaviyo with their subscription status
              </p>
            </div>
            <button
              onClick={() => setShowBulkSync(true)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              {isLoading ? 'Syncing...' : 'Sync All'}
            </button>
          </div>

          {/* Sync Progress */}
          {syncProgress && (
            <div className="p-4 rounded-lg bg-white/5">
              <h4 className="text-white font-medium mb-2">Sync Results</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">{syncProgress.success}</div>
                  <div className="text-xs text-gray-400">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{syncProgress.failed}</div>
                  <div className="text-xs text-gray-400">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{syncProgress.total}</div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Sync Confirmation Modal */}
      {showBulkSync && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="p-6 rounded-xl max-w-md w-full mx-4"
            style={{
              background: 'rgba(3, 1, 64, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Bulk Sync</h3>
            <p className="text-gray-300 mb-6">
              This will sync all customers from your database to Klaviyo. This may take a few minutes for large customer lists.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkSync(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-gray-600/20 border border-gray-600/40 hover:bg-gray-600/30 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBulkSync(false);
                  handleBulkSync();
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Start Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KlaviyoManager; 