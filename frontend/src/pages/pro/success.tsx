import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import UniversalHeader from '../../components/UniversalHeader';
import UniversalFooter from '../../components/UniversalFooter';

const ProSuccessPage = () => {
  const router = useRouter();
  const { session_id } = router.query;

  useEffect(() => {
    // Track successful Pro membership purchase
    if (typeof window !== 'undefined' && window.fbq && session_id) {
      try {
        window.fbq('track', 'Purchase', {
          content_name: 'Sticker Shuttle Pro Membership',
          content_type: 'product',
          value: 39.00,
          currency: 'USD'
        });
        console.log('📊 Facebook Pixel: Purchase tracked for Pro membership');
      } catch (fbError) {
        console.error('📊 Facebook Pixel tracking error:', fbError);
      }
    }

    // Force refresh the page after 3 seconds to ensure Pro status is updated
    // This gives the webhook time to update the database
    // Only refresh once using sessionStorage flag
    if (session_id && typeof window !== 'undefined') {
      const hasRefreshed = sessionStorage.getItem(`pro_refresh_${session_id}`);
      
      if (!hasRefreshed) {
        console.log('⏳ Scheduling profile refresh to update Pro logo in 3 seconds...');
        sessionStorage.setItem(`pro_refresh_${session_id}`, 'true');
        
        const refreshTimer = setTimeout(() => {
          console.log('🔄 Refreshing page to update Pro status...');
          window.location.reload();
        }, 3000);

        return () => clearTimeout(refreshTimer);
      } else {
        console.log('✅ Pro status refresh already completed');
      }
    }
  }, [session_id]);

  return (
    <>
      <Head>
        <title>Welcome to Pro! - Sticker Shuttle</title>
        <meta name="description" content="Thank you for joining Sticker Shuttle Pro!" />
        <link rel="canonical" href="https://stickershuttle.com/pro/success" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20">
          <div className="text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Sticker Shuttle Pro Logo" 
                className="h-24 lg:h-32 w-auto object-contain animate-bounce-slow"
              />
            </div>

            {/* Success Message */}
            <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
              Welcome to <span className="pro-gradient">Pro</span>!
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Thank you for joining Sticker Shuttle Pro. Your membership is now active!
            </p>

            {/* Benefits Card */}
            <div 
              className="p-6 lg:p-8 rounded-2xl lg:rounded-3xl mb-8 max-w-2xl mx-auto"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6">What happens next?</h2>
              
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">📧</div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-semibold text-white mb-1">Check your email</h3>
                    <p className="text-gray-300">You'll receive a confirmation email with your membership details and next steps.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">📦</div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-semibold text-white mb-1">Your first order</h3>
                    <p className="text-gray-300">Your 100 custom stickers will be shipped within the next few days, but first you'll get a proof for approval.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">🎉</div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-semibold text-white mb-1">Start saving immediately</h3>
                    <p className="text-gray-300">All your Pro benefits are now active! Enjoy FREE 2-Day Air shipping, priority printing, and bigger discounts on your orders.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/products">
                <button 
                  className="px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  style={{
                    background: 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)',
                    backgroundSize: '300% 300%',
                    animation: 'gradient-move 3s ease-in-out infinite',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(61, 209, 249, 0.4)',
                    boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                    fontFamily: 'Rubik, sans-serif'
                  }}
                >
                  Start Shopping
                </button>
              </Link>

              <Link href="/account/dashboard">
                <button 
                  className="px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    fontFamily: 'Rubik, sans-serif'
                  }}
                >
                  Go to Dashboard
                </button>
              </Link>
            </div>


          </div>
        </div>

        <div className="hidden md:block">
          <UniversalFooter />
        </div>
      </div>

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

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }

        .pro-gradient {
          background: linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9);
          background-size: 300% 300%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-move 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default ProSuccessPage;

