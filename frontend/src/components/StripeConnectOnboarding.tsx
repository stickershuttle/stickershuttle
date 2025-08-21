import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { 
  CREATE_STRIPE_CONNECT_ACCOUNT, 
  COMPLETE_STRIPE_CONNECT_ONBOARDING,
  REFRESH_STRIPE_CONNECT_ACCOUNT 
} from '@/lib/stripe-connect-mutations';
import { GET_CREATOR_BY_USER_ID } from '@/lib/profile-mutations';
import { CreditCard, ExternalLink, RefreshCw, CheckCircle, AlertCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';

interface StripeConnectOnboardingProps {
  userId: string;
}

const StripeConnectOnboarding: React.FC<StripeConnectOnboardingProps> = ({ userId }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Get creator data
  const { data: creatorData, loading: creatorLoading, refetch: refetchCreator } = useQuery(GET_CREATOR_BY_USER_ID, {
    variables: { userId },
    skip: !userId
  });

  // Mutations
  const [createStripeAccount] = useMutation(CREATE_STRIPE_CONNECT_ACCOUNT);
  const [completeOnboarding] = useMutation(COMPLETE_STRIPE_CONNECT_ONBOARDING);
  const [refreshAccount] = useMutation(REFRESH_STRIPE_CONNECT_ACCOUNT);

  const creator = creatorData?.getCreatorByUserId;

  // Handle URL parameters for Stripe Connect returns
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get('stripe_success');
    const stripeRefresh = urlParams.get('stripe_refresh');

    if (stripeSuccess && creator?.id) {
      // If we have success but no stripeAccountId yet, refresh the creator data first
      if (!creator?.stripeAccountId) {
        console.log('🔄 Refreshing creator data after Stripe onboarding...');
        setStatusMessage('Welcome back! Updating your account status...');
        refetchCreator().then(() => {
          // After refetch, the creator data should have the stripeAccountId
          // The useEffect will run again with updated data
        });
      } else {
        handleOnboardingReturn();
      }
    } else if (stripeRefresh) {
      setStatusMessage('Please complete your Stripe Connect setup to receive payments.');
    }

    // Clean up URL parameters
    if (stripeSuccess || stripeRefresh) {
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, [creator]);

  const handleCreateAccount = async () => {
    if (!creator?.id) return;

    setIsProcessing(true);
    setStatusMessage('');

    try {
      const result = await createStripeAccount({
        variables: { creatorId: creator.id }
      });

      if (result.data.createStripeConnectAccount.success) {
        const onboardingUrl = result.data.createStripeConnectAccount.onboardingUrl;
        if (onboardingUrl) {
          // Redirect to Stripe onboarding
          window.location.href = onboardingUrl;
        } else {
          setStatusMessage('Account created but no onboarding URL received. Please refresh and try again.');
        }
      } else {
        setStatusMessage(result.data.createStripeConnectAccount.error || 'Failed to create Stripe account');
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      setStatusMessage('An error occurred while creating your Stripe account. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnboardingReturn = async () => {
    if (!creator?.id) return;

    setIsProcessing(true);
    setStatusMessage('Completing your setup...');

    try {
      // If we don't have a stripeAccountId yet, try refreshing the account first
      if (!creator?.stripeAccountId) {
        console.log('🔄 No stripeAccountId found, trying refresh first...');
        const refreshResult = await refreshAccount({
          variables: { creatorId: creator.id }
        });

        if (refreshResult.data.refreshStripeConnectAccount.success) {
          setStatusMessage('Your Stripe Connect account has been set up successfully! You can now receive payments.');
          await refetchCreator();
          return;
        }
      }

      // If we have the account ID, complete the onboarding
      if (creator?.stripeAccountId) {
        const result = await completeOnboarding({
          variables: { 
            creatorId: creator.id,
            accountId: creator.stripeAccountId
          }
        });

        if (result.data.completeStripeConnectOnboarding.success) {
          setStatusMessage('Your Stripe Connect account has been set up successfully! You can now receive payments.');
          await refetchCreator();
        } else {
          setStatusMessage(result.data.completeStripeConnectOnboarding.error || 'Failed to complete onboarding');
        }
      } else {
        setStatusMessage('Unable to find your Stripe account. Please try refreshing the page or contact support.');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setStatusMessage('An error occurred while completing setup. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefreshAccount = async () => {
    if (!creator?.id) return;

    setIsProcessing(true);
    setStatusMessage('Refreshing account status...');

    try {
      const result = await refreshAccount({
        variables: { creatorId: creator.id }
      });

      if (result.data.refreshStripeConnectAccount.success) {
        setStatusMessage('Account status refreshed successfully!');
        await refetchCreator();
      } else {
        setStatusMessage(result.data.refreshStripeConnectAccount.error || 'Failed to refresh account');
      }
    } catch (error) {
      console.error('Error refreshing account:', error);
      setStatusMessage('An error occurred while refreshing your account status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openStripeDashboard = () => {
    if (creator?.stripeDashboardUrl) {
      window.open(creator.stripeDashboardUrl, '_blank');
    }
  };

  if (creatorLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertCircle size={20} />
          <span>Creator account not found. Please contact support.</span>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (creator.stripeAccountStatus) {
      case 'active':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'pending':
      case 'restricted':
        return <Clock className="text-yellow-500" size={24} />;
      default:
        return <AlertCircle className="text-gray-400" size={24} />;
    }
  };

  const getStatusMessage = () => {
    switch (creator.stripeAccountStatus) {
      case 'active':
        return 'Your Stripe Connect account is active and ready to receive payments!';
      case 'pending':
        return 'Your Stripe Connect account setup is in progress. Please complete any remaining requirements.';
      case 'restricted':
        return 'Your Stripe Connect account has some restrictions. Please complete the required information.';
      case 'deauthorized':
        return 'Your Stripe Connect account has been disconnected. You can reconnect it below.';
      default:
        return 'Connect your Stripe account to start receiving payments for your marketplace products.';
    }
  };

  return (
    <div className="w-full">
      <div 
        className="p-8 rounded-xl border"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        {creator?.stripeAccountStatus === 'active' && (
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-green-400 font-medium">Connected</span>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div 
          className="p-6 rounded-xl mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-center space-x-3 mb-4">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-white">Account Status</h3>
              <p className="text-sm text-gray-400 capitalize">
                {creator?.stripeAccountStatus || 'Not Connected'}
              </p>
            </div>
          </div>
          
          <p className="text-gray-300 mb-4">{getStatusMessage()}</p>
          
          {creator?.stripeAccountStatus === 'active' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-900/20 border border-green-500/20">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-sm font-medium text-green-300">Charges</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  creator.stripeChargesEnabled 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {creator.stripeChargesEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-900/20 border border-green-500/20">
                <div className="flex items-center space-x-2">
                  <DollarSign size={16} className="text-green-400" />
                  <span className="text-sm font-medium text-green-300">Payouts</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  creator.stripePayoutsEnabled 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {creator.stripePayoutsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          )}

          {(creator.stripeRequirementsCurrentlyDue?.length > 0 || 
            creator.stripeRequirementsPastDue?.length > 0) && (
            <div className="mt-4 p-4 rounded-lg border" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}>
              <h4 className="text-yellow-400 font-semibold text-sm mb-3 flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>Required Information</span>
              </h4>
              <ul className="text-sm text-yellow-300 space-y-2">
                {creator.stripeRequirementsPastDue?.map((req: string, index: number) => (
                  <li key={index} className="text-red-300 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span>{req} (Past Due)</span>
                  </li>
                ))}
                {creator.stripeRequirementsCurrentlyDue?.map((req: string, index: number) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="mb-6 p-3 bg-blue-900/20 rounded border border-blue-500/30">
            <p className="text-blue-300 text-sm">{statusMessage}</p>
          </div>
        )}



        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!creator.stripeAccountId && (
            <button
              onClick={handleCreateAccount}
              disabled={isProcessing}
              className="flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  <span>Connect Stripe</span>
                </>
              )}
            </button>
          )}

          {creator.stripeAccountId && creator.stripeAccountStatus !== 'active' && creator.stripeOnboardingUrl && (
            <button
              onClick={() => window.location.href = creator.stripeOnboardingUrl}
              disabled={isProcessing}
              className="flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all  text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <ExternalLink size={20} />
              <span>Complete Setup</span>
            </button>
          )}

          {/* Always show refresh button if account is not fully active or if we think there might be an account */}
          {(creator.stripeAccountId || creator.stripeAccountStatus !== 'active') && (
            <button
              onClick={handleRefreshAccount}
              disabled={isProcessing}
              className="flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all  text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <RefreshCw size={20} className={isProcessing ? 'animate-spin' : ''} />
              <span>Refresh Status</span>
            </button>
          )}

          {creator.stripeAccountStatus === 'active' && creator.stripeDashboardUrl && (
            <button
              onClick={openStripeDashboard}
              className="flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all  text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <ExternalLink size={20} />
              <span>Open Dashboard</span>
            </button>
          )}
        </div>

        {creator.stripeAccountStatus === 'active' && (
          <div className="mt-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-900/20 border border-green-500/30">
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-400" size={20} />
                <div>
                  <p className="text-green-300 font-medium">Payment Setup Complete</p>
                  <p className="text-xs text-gray-400">Manage payouts, tax settings, and banking details on Stripe</p>
                </div>
              </div>
              
              <button
                onClick={openStripeDashboard}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all text-white"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
                <span>Edit on Stripe</span>
              </button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default StripeConnectOnboarding;
