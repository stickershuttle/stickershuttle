import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import UniversalHeader from '../components/UniversalHeader';
import SEOHead from '../components/SEOHead';
import { getSupabase } from '../lib/supabase';
import { GetServerSideProps } from 'next';

interface WaitlistProps {
  seoData?: any;
}

export default function Waitlist({ seoData }: WaitlistProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            setUser(session.user);
            
            // Fetch profile data
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, email')
              .eq('id', session.user.id)
              .single();
            
            if (!profileError && profileData) {
              setProfile(profileData);
              
              // Pre-fill form with user data
              setEmail(session.user.email || '');
              
              const firstName = profileData?.first_name || (session.user as any)?.user_metadata?.first_name || '';
              const lastName = profileData?.last_name || (session.user as any)?.user_metadata?.last_name || '';
              
              setFirstName(firstName);
              setLastName(lastName);
            } else {
              // Fallback to user_metadata if profile doesn't exist
              setEmail(session.user.email || '');
              setFirstName((session.user as any)?.user_metadata?.first_name || '');
              setLastName((session.user as any)?.user_metadata?.last_name || '');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Countdown timer
  useEffect(() => {
    const targetDate = new Date('2025-11-21T00:00:00').getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    // Initial update
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!firstName || !lastName || !email) {
      setError('Please fill in all fields');
      setSubmitting(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setSubmitting(false);
      return;
    }

    try {
      // Use direct fetch instead of Apollo Client to avoid auth issues for logged-out users
      const getApiUrl = () => {
        if (process.env.NEXT_PUBLIC_API_URL) {
          return process.env.NEXT_PUBLIC_API_URL;
        }
        if (process.env.NODE_ENV === 'development') {
          return 'http://localhost:4000';
        }
        return 'https://ss-beyond.up.railway.app';
      };
      
      const backendUrl = getApiUrl();
      const listId = process.env.NEXT_PUBLIC_KLAVIYO_WAITLIST_LIST_ID || null;
      
      console.log('📋 Backend URL:', backendUrl);
      console.log('📋 Subscribing with listId:', listId);
      console.log('📋 Profile data:', { email, firstName, lastName });
      
      // Subscribe to waitlist
      const response = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation SubscribeToWaitlist($email: String!, $listId: String, $firstName: String, $lastName: String) {
              subscribeToKlaviyo(email: $email, listId: $listId, firstName: $firstName, lastName: $lastName) {
                success
                message
                error
              }
            }
          `,
          variables: {
            email,
            listId,
            firstName,
            lastName
          }
        })
      });

      console.log('📧 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`Server error (${response.status}). Please try again or contact support if this persists.`);
      }

      const result = await response.json();
      console.log('📧 Full subscription result:', JSON.stringify(result, null, 2));
      
      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const graphqlError = result.errors[0].message;
        console.error('❌ GraphQL error:', graphqlError);
        throw new Error(`Error: ${graphqlError}`);
      }
      
      if (result.data?.subscribeToKlaviyo?.success) {
        // Success! subscribeToKlaviyo already created/updated the profile and subscribed them
        console.log('✅ Successfully subscribed to waitlist!');
        setSubmitted(true);
        setSubmitting(false);
      } else {
        const errorMsg = result.data?.subscribeToKlaviyo?.error || result.data?.subscribeToKlaviyo?.message || 'Failed to join waitlist. Please try again.';
        console.error('❌ Subscription failed:', errorMsg);
        setError(errorMsg);
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error('❌ Error subscribing to waitlist:', err);
      setError(err.message || 'Failed to join waitlist. Please try again or contact support.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title={seoData?.title}
        description={seoData?.description}
        keywords={seoData?.keywords}
        robots={seoData?.robots}
        ogTitle={seoData?.ogTitle}
        ogDescription={seoData?.ogDescription}
        ogImage={seoData?.ogImage}
        ogType={seoData?.ogType}
        ogUrl={seoData?.ogUrl}
        twitterCard={seoData?.twitterCard}
        canonical={seoData?.canonicalUrl}
      />

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
              COMING NOV.28TH, 2025
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mb-6 uppercase tracking-wider">
              (TO THE PUBLIC)
            </p>
            <p className="text-lg md:text-xl mb-4 max-w-2xl mx-auto pb-4 button-gradient animate-pulse-subtle" style={{ 
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'Rubik, sans-serif',
              fontWeight: 'bold'
            }}>
            Early Access members will get access on November 21st, 2025.
            </p>

            {/* Logged in message */}
            {!loading && user && (
              <div className="mb-6 p-4 rounded-xl text-center max-w-md mx-auto" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                <p className="text-green-400 font-medium text-sm flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Logged in as {user.email}
                </p>
              </div>
            )}


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
                   disabled={submitting}
                   className="button-gradient w-full px-6 py-4 rounded-xl text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:translate-y-[-2px] animate-pulse-subtle disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                   style={{
                     backdropFilter: 'blur(25px) saturate(180%)',
                     border: '1px solid rgba(61, 209, 249, 0.4)',
                     boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                   }}
                 >
                   {submitting ? (
                     <span className="flex items-center justify-center gap-2">
                       <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       Subscribing...
                     </span>
                   ) : (
                     'Get Early Access'
                   )}
                 </button>

                 {/* Countdown Timer */}
                 <div className="mt-6 grid grid-cols-4 gap-3 max-w-md mx-auto">
                   <div className="p-4 rounded-xl text-center" style={{
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                     backdropFilter: 'blur(12px)'
                   }}>
                     <div className="text-3xl font-bold text-cyan-400">{timeLeft.days}</div>
                     <div className="text-xs text-gray-400 uppercase mt-1">Days</div>
                   </div>
                   <div className="p-4 rounded-xl text-center" style={{
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                     backdropFilter: 'blur(12px)'
                   }}>
                     <div className="text-3xl font-bold text-cyan-400">{timeLeft.hours}</div>
                     <div className="text-xs text-gray-400 uppercase mt-1">Hours</div>
                   </div>
                   <div className="p-4 rounded-xl text-center" style={{
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                     backdropFilter: 'blur(12px)'
                   }}>
                     <div className="text-3xl font-bold text-cyan-400">{timeLeft.minutes}</div>
                     <div className="text-xs text-gray-400 uppercase mt-1">Minutes</div>
                   </div>
                   <div className="p-4 rounded-xl text-center" style={{
                     background: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                     backdropFilter: 'blur(12px)'
                   }}>
                     <div className="text-3xl font-bold text-cyan-400">{timeLeft.seconds}</div>
                     <div className="text-xs text-gray-400 uppercase mt-1">Seconds</div>
                   </div>
                 </div>

                 {/* Founding Members Bonus */}
                 <p className="text-center text-gray-300 text-sm mt-6 px-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
                   🎁 The first <span className="font-bold text-yellow-400">Founding 100</span> Pro members will receive <span className="font-bold text-cyan-400">5+ exclusive bonuses</span> and <span className="font-bold text-cyan-400">free stickers!</span>
                 </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    // Fetch SEO data from the backend API
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:4000';
      }
      return 'https://ss-beyond.up.railway.app';
    };
    
    const backendUrl = getApiUrl();
    
    const response = await fetch(`${backendUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetPageSEOByPath($pagePath: String!) {
            getPageSEOByPath(pagePath: $pagePath) {
              id
              pagePath
              pageName
              title
              description
              keywords
              robots
              ogTitle
              ogDescription
              ogImage
              ogType
              ogUrl
              twitterCard
              twitterTitle
              twitterDescription
              twitterImage
              canonicalUrl
              structuredData
            }
          }
        `,
        variables: {
          pagePath: '/waitlist'
        }
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors fetching SEO:', result.errors);
      return { props: { seoData: null } };
    }

    return {
      props: {
        seoData: result.data?.getPageSEOByPath || null
      }
    };
  } catch (error) {
    console.error('Error fetching SEO data:', error);
    return { props: { seoData: null } };
  }
};
