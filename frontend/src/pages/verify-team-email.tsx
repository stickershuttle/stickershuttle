import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { VERIFY_TEAM_EMAIL } from '../lib/team-email-mutations';
import Layout from '../components/Layout';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

function VerifyTeamEmail() {
  const router = useRouter();
  const { token } = router.query;
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  const { data, loading, error } = useQuery(VERIFY_TEAM_EMAIL, {
    variables: { token },
    skip: !token,
    onCompleted: (data) => {
      if (data?.verifyTeamEmail?.success) {
        setVerificationStatus('success');
        setMessage(data.verifyTeamEmail.message || 'Your team email has been verified successfully!');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/account/dashboard?view=settings');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setMessage(data?.verifyTeamEmail?.message || 'Verification failed. The link may be invalid or expired.');
      }
    },
    onError: (error) => {
      setVerificationStatus('error');
      setMessage('An error occurred during verification. Please try again.');
    }
  });

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div 
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            {verificationStatus === 'verifying' && (
              <>
                <FiLoader className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold text-white mb-2">Verifying Email</h1>
                <p className="text-gray-300">Please wait while we verify your team email...</p>
              </>
            )}

            {verificationStatus === 'success' && (
              <>
                <FiCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
                <p className="text-gray-300 mb-4">{message}</p>
                <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <FiXCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
                <p className="text-gray-300 mb-6">{message}</p>
                <button
                  onClick={() => router.push('/account/dashboard?view=settings')}
                  className="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  Go to Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default VerifyTeamEmail; 