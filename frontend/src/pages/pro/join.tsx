import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import UniversalHeader from '../../components/UniversalHeader';
import UniversalFooter from '../../components/UniversalFooter';
import { useRouter } from 'next/router';

const ProJoinPage = () => {
  const router = useRouter();
  const { plan: queryPlan } = router.query;
  const [selectedPlan, setSelectedPlan] = useState<string>((queryPlan as string) || 'annual');

  // Update selected plan when query param changes
  useEffect(() => {
    if (queryPlan && typeof queryPlan === 'string') {
      setSelectedPlan(queryPlan);
    }
  }, [queryPlan]);

  const handleJoinPro = () => {
    // Redirect to signup page with selected plan
    router.push(`/pro/signup?plan=${selectedPlan}`);
  };

  return (
    <>
      <Head>
        <title>Join Pro - Sticker Shuttle</title>
        <meta name="description" content="Choose your Pro membership plan and start saving today!" />
        <link rel="canonical" href="https://stickershuttle.com/pro/join" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <div className="flex justify-center mb-6">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Sticker Shuttle Pro Logo" 
                className="h-20 lg:h-24 w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
              Choose Your <span className="pro-gradient">Pro</span> Membership Plan
            </h1>
          </div>

          {/* Plan Selection */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Pro Annual - First on mobile, left on desktop */}
              <div 
                className={`p-6 lg:p-8 rounded-2xl lg:rounded-3xl text-center cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-md order-1 ${
                  selectedPlan === 'annual'
                    ? 'bg-blue-500/20 text-blue-200 font-medium button-selected animate-glow-blue'
                    : 'border-2 border-dashed border-blue-400/50 opacity-65 hover:border-blue-400/70 hover:bg-white/5 hover:opacity-80 text-white/70'
                }`}
                style={{
                  border: selectedPlan === 'annual' ? '1.5px solid rgba(59, 130, 246, 0.5)' : undefined
                }}
                onClick={() => setSelectedPlan('annual')}
              >
                {selectedPlan === 'annual' && (
                  <div className="inline-flex items-center px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium text-blue-300 mb-4"
                       style={{
                         background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                         backdropFilter: 'blur(25px) saturate(180%)',
                         border: '1px solid rgba(59, 130, 246, 0.4)'
                       }}>
                    Best Value
                  </div>
                )}
                <div className="flex items-start justify-center gap-2 lg:gap-3 mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                    alt="Sticker Shuttle Pro Logo" 
                    className="h-8 lg:h-10 w-auto object-contain"
                  />
                  <span className="text-2xl lg:text-3xl font-bold -mt-1">Annual</span>
                </div>
                <div className="flex items-center justify-center gap-3 lg:gap-4 mb-2">
                  <div className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: 'Rubik, sans-serif' }}>$347</div>
                  <div className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-bold text-white"
                       style={{
                         background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)',
                         backdropFilter: 'blur(25px) saturate(180%)',
                         border: '1px solid rgba(239, 68, 68, 0.4)',
                         boxShadow: 'rgba(239, 68, 68, 0.3) 0px 4px 16px'
                       }}>
                    Save $121
                  </div>
                </div>
                <div className="flex justify-center mb-2">
                  <div className="text-sm lg:text-base font-bold tracking-widest"
                       style={{
                         background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 50%, #FF8F00 100%)',
                         WebkitBackgroundClip: 'text',
                         WebkitTextFillColor: 'transparent',
                         backgroundClip: 'text'
                       }}>
                    FOUNDING MEMBER SPECIAL
                  </div>
                </div>
                <div className={`${selectedPlan === 'annual' ? 'text-blue-200' : 'text-gray-300'} text-sm lg:text-base`}>
                  <span className="line-through text-gray-500 mr-2">(originally $468)</span>
                </div>
              </div>
              
              {/* Pro Monthly - Second on mobile, right on desktop */}
              <div 
                className={`p-6 lg:p-8 rounded-2xl lg:rounded-3xl text-center cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-md order-2 ${
                  selectedPlan === 'monthly'
                    ? 'bg-blue-500/20 text-blue-200 font-medium button-selected animate-glow-blue'
                    : 'border-2 border-dashed border-blue-400/50 opacity-65 hover:border-blue-400/70 hover:bg-white/5 hover:opacity-80 text-white/70'
                }`}
                style={{
                  border: selectedPlan === 'monthly' ? '1.5px solid rgba(59, 130, 246, 0.5)' : undefined
                }}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className="flex items-start justify-center gap-2 lg:gap-3 mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                    alt="Sticker Shuttle Pro Logo" 
                    className="h-8 lg:h-10 w-auto object-contain"
                  />
                  <span className="text-2xl lg:text-3xl font-bold -mt-1">Monthly</span>
                </div>
                <div className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Rubik, sans-serif' }}>$39</div>
                <div className="text-sm lg:text-base">per month</div>
              </div>
            </div>
          </div>

          {/* Join Button */}
          <div className="flex justify-center">
            <button
              onClick={handleJoinPro}
              className="px-12 lg:px-16 py-5 lg:py-6 rounded-xl lg:rounded-2xl text-xl lg:text-2xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
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
              Continue
            </button>
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

        @keyframes glow-blue {
          0%, 100% {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.2), 0 0 10px rgba(59, 130, 246, 0.1), 0 0 15px rgba(59, 130, 246, 0.05);
          }
          50% {
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2), 0 0 30px rgba(59, 130, 246, 0.1);
          }
        }
        
        .animate-glow-blue {
          animation: glow-blue 2s ease-in-out infinite;
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

export default ProJoinPage;

