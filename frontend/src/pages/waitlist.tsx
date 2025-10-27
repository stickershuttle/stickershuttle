import React, { useState } from 'react';
import Head from 'next/head';
import { useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/router';
import UniversalHeader from '../components/UniversalHeader';

const SUBSCRIBE_TO_WAITLIST = gql`
  mutation SubscribeToWaitlist($email: String!, $listId: String) {
    subscribeToKlaviyo(email: $email, listId: $listId) {
      success
      message
      error
    }
  }
`;

const SYNC_CUSTOMER = gql`
  mutation SyncCustomer($customerData: KlaviyoCustomerInput!) {
    syncCustomerToKlaviyo(customerData: $customerData) {
      success
      message
      error
    }
  }
`;

export default function Waitlist() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [subscribeToWaitlist] = useMutation(SUBSCRIBE_TO_WAITLIST);
  const [syncCustomer] = useMutation(SYNC_CUSTOMER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !email) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      // First, subscribe to the list
      const listId = process.env.NEXT_PUBLIC_KLAVIYO_WAITLIST_LIST_ID || null;
      console.log('📋 Subscribing with listId:', listId);
      
      const result = await subscribeToWaitlist({
        variables: {
          email,
          listId
        }
      });
      
      // Then, sync customer data with first and last name
      await syncCustomer({
        variables: {
          customerData: {
            email,
            firstName,
            lastName,
            marketingOptIn: true
          }
        }
      });
      
      console.log('📧 Subscription result:', result.data);
      
      if (result.data?.subscribeToKlaviyo?.success) {
        setSubmitted(true);
      } else {
        const errorMsg = result.data?.subscribeToKlaviyo?.error || result.data?.subscribeToKlaviyo?.message || 'Failed to join waitlist';
        console.error('❌ Subscription failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ Error subscribing to waitlist:', err);
      setError(err.message || 'Failed to join waitlist. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Pro Waitlist - Sticker Shuttle</title>
        <meta name="description" content="Join the waitlist for Sticker Shuttle Pro launching this Black Friday" />
      </Head>

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
        
        @keyframes pulse-subtle {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.95;
          }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
        
        .button-gradient {
          background: linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9);
          background-size: 300% 300%;
          animation: gradient-move 3s ease-in-out infinite;
          font-family: 'Rubik', sans-serif;
          font-weight: bold;
        }
      `}</style>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-32 pb-16">
          <div className="text-center">
            {/* Pro Logo */}
            <div className="mb-6 flex justify-center mt-8 md:mt-12 lg:mt-16">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Sticker Shuttle Pro" 
                className="h-20 md:h-24 lg:h-28 w-auto object-contain"
              />
            </div>

            {/* Coming Nov 28th Text */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-0.5" style={{ fontFamily: 'Rubik, sans-serif' }}>
              COMING NOV.28TH
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mb-6 uppercase tracking-wider">
              (TO THE PUBLIC)
            </p>
            <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-2xl mx-auto pb-4">
            Early Access members will get access on November 21st.
            </p>


            {/* Success Message */}
            {submitted && (
              <>
                <div className="mb-8 p-6 rounded-2xl text-center max-w-md mx-auto" style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}>
                  <p className="text-blue-400 font-medium text-lg">
                    You're on the list! We'll send you updates and give you a head start when Pro launches.
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <button
                    onClick={() => router.push('/deals')}
                    className="w-full px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    Shop Deals
                  </button>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-8 p-6 rounded-2xl text-center max-w-md mx-auto" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                <p className="text-red-300 font-medium text-lg">{error}</p>
              </div>
            )}

            {/* Waitlist Form */}
            {!submitted && (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>

                <div className="mb-6">
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>

                 <button
                   type="submit"
                   className="button-gradient w-full px-6 py-4 rounded-xl text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:translate-y-[-2px] animate-pulse-subtle"
                   style={{
                     backdropFilter: 'blur(25px) saturate(180%)',
                     border: '1px solid rgba(61, 209, 249, 0.4)',
                     boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                   }}
                 >
                   Get Early Access
                 </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
