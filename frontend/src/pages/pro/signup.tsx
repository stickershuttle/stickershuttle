import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import UniversalHeader from '../../components/UniversalHeader';
import UniversalFooter from '../../components/UniversalFooter';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { CREATE_STRIPE_CHECKOUT_SESSION } from '@/lib/stripe-mutations';
import { CREATE_USER_PROFILE } from '@/lib/profile-mutations';
import { getSupabase } from '@/lib/supabase';

const ProSignupPage = () => {
  const router = useRouter();
  const { plan } = router.query;
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication states
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(true);
  
  // Signup form data
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  
  // Login form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // OTP states
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [createCheckoutSession] = useMutation(CREATE_STRIPE_CHECKOUT_SESSION);
  const [createUserProfile] = useMutation(CREATE_USER_PROFILE);

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // If already logged in, show the continue button
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };
    checkUser();
  }, []);

  // Handle signup
  const handleSignup = async () => {
    if (!signupData.firstName || !signupData.lastName || !signupData.email || !signupData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsSendingOtp(true);
      setError(null);
      
      const supabase = getSupabase();
      
      // Sign up with Supabase to trigger OTP
      const { data, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            full_name: `${signupData.firstName} ${signupData.lastName}`,
            created_via_pro_signup: true
          }
        }
      });
      
      if (authError) {
        setError(`Error: ${authError.message}`);
        setIsSendingOtp(false);
        return;
      }
      
      // Switch to OTP mode
      setIsOtpMode(true);
      setIsSendingOtp(false);
    } catch (error: any) {
      console.error('Error during signup:', error);
      setError('Failed to create account. Please try again.');
      setIsSendingOtp(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setError(null);

      const supabase = getSupabase();
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: signupData.email,
        token: otpCode,
        type: 'signup'
      });

      if (verifyError) {
        setError(`Verification failed: ${verifyError.message}`);
        setIsVerifyingOtp(false);
        return;
      }

      if (data.user) {
        // Create user profile
        await createUserProfile({
          variables: {
            userId: data.user.id,
            firstName: signupData.firstName,
            lastName: signupData.lastName
          }
        });

        setUser(data.user);
        setIsOtpMode(false);
        setShowLoginForm(false);
        
        // Proceed to checkout
        await proceedToCheckout(data.user);
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError('Verification failed. Please try again.');
      setIsVerifyingOtp(false);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setError('Please enter email and password');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const supabase = getSupabase();
      
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (loginError) {
        setError(`Login failed: ${loginError.message}`);
        setIsProcessing(false);
        return;
      }

      if (data.user) {
        setUser(data.user);
        setShowLoginForm(false);
        
        // Proceed to checkout
        await proceedToCheckout(data.user);
      }
    } catch (error: any) {
      console.error('Error during login:', error);
      setError('Login failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Proceed to Stripe checkout
  const proceedToCheckout = async (currentUser: any) => {
    try {
      setIsProcessing(true);
      setError(null);

      const selectedPlan = (plan as string) || 'annual';
      const priceAmount = selectedPlan === 'monthly' ? 39.00 : 347.00;
      const productName = selectedPlan === 'monthly' 
        ? 'Sticker Shuttle Pro - Monthly Membership' 
        : 'Sticker Shuttle Pro - Annual Membership';

      // Create checkout session
      const { data } = await createCheckoutSession({
        variables: {
          input: {
            lineItems: [
              {
                name: productName,
                description: 'Premium sticker subscription with exclusive benefits',
                unitPrice: priceAmount,
                totalPrice: priceAmount,
                quantity: 1,
                productId: `pro-${selectedPlan}`,
                sku: `PRO-${selectedPlan.toUpperCase()}`
              }
            ],
            successUrl: `${window.location.origin}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/pro/signup?plan=${selectedPlan}`,
            customerEmail: currentUser?.email || undefined,
            userId: currentUser?.id || undefined,
            metadata: {
              type: 'pro_membership',
              plan: selectedPlan,
              isSubscription: 'true'
            }
          }
        }
      });

      if (data?.createStripeCheckoutSession?.success && data?.createStripeCheckoutSession?.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.createStripeCheckoutSession.checkoutUrl;
      } else {
        throw new Error(data?.createStripeCheckoutSession?.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError(error instanceof Error ? error.message : 'Failed to proceed to checkout');
      setIsProcessing(false);
    }
  };

  // Handle continue (for already logged in users)
  const handleContinue = async () => {
    if (!user) {
      setShowLoginForm(true);
      return;
    }
    await proceedToCheckout(user);
  };

  return (
    <>
      <Head>
        <title>Sign Up for Pro - Sticker Shuttle</title>
        <meta name="description" content="Create your account or log in to join Sticker Shuttle Pro" />
        <link rel="canonical" href="https://stickershuttle.com/pro/signup" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />
        
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20">
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
              {user ? (
                <>Join <span className="pro-gradient">Pro</span></>
              ) : (
                <>Create Account to Join <span className="pro-gradient">Pro</span></>
              )}
            </h1>
            <p className="text-lg text-gray-300">
              {user ? (
                `Continue as ${user.email}`
              ) : (
                'Create your account or log in to continue'
              )}
            </p>
          </div>

          {/* Plan Info Badge */}
          <div 
            className="p-4 rounded-xl mb-8 text-center"
            style={{
              background: 'rgba(61, 209, 249, 0.1)',
              border: '1px solid rgba(61, 209, 249, 0.3)',
            }}
          >
            <p className="text-cyan-300 font-semibold">
              Selected Plan: {plan === 'monthly' ? 'Monthly ($39/mo)' : 'Annual ($347/yr - Save $121)'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
              <p className="text-red-300 text-center">{error}</p>
            </div>
          )}

          {/* Already Logged In - Show Continue Button */}
          {user && !showLoginForm && (
            <div 
              className="p-6 lg:p-8 rounded-2xl mb-6"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-center mb-6">
                <p className="text-gray-300 mb-2">You're logged in as:</p>
                <p className="text-white font-semibold text-lg">{user.email}</p>
              </div>

              <button
                onClick={handleContinue}
                disabled={isProcessing}
                className="w-full px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: !isProcessing
                    ? 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)'
                    : 'rgba(255, 255, 255, 0.1)',
                  backgroundSize: '300% 300%',
                  animation: !isProcessing ? 'gradient-move 3s ease-in-out infinite' : 'none',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(61, 209, 249, 0.4)',
                  boxShadow: !isProcessing
                    ? 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    : 'none',
                  fontFamily: 'Rubik, sans-serif'
                }}
              >
                {isProcessing ? 'Processing...' : 'Continue to Checkout'}
              </button>

              <button
                onClick={() => {
                  setShowLoginForm(true);
                  setIsSignupMode(false);
                }}
                className="w-full mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Not you? Sign in with a different account
              </button>
            </div>
          )}

          {/* Login/Signup Forms */}
          {(!user || showLoginForm) && (
            <div 
              className="p-6 lg:p-8 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              {/* Toggle between Signup and Login */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    setIsSignupMode(true);
                    setError(null);
                    setIsOtpMode(false);
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                    isSignupMode ? 'text-blue-200' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  style={{
                    background: isSignupMode
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isSignupMode
                      ? '1px solid rgba(59, 130, 246, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    boxShadow: isSignupMode
                      ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'none'
                  }}
                >
                  Create Account
                </button>
                <button
                  onClick={() => {
                    setIsSignupMode(false);
                    setError(null);
                    setIsOtpMode(false);
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                    !isSignupMode ? 'text-blue-200' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  style={{
                    background: !isSignupMode
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: !isSignupMode
                      ? '1px solid rgba(59, 130, 246, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    boxShadow: !isSignupMode
                      ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'none'
                  }}
                >
                  Log In
                </button>
              </div>

              {/* Signup Form */}
              {isSignupMode && !isOtpMode && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                      <input
                        type="text"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData({...signupData, firstName: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg text-white bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:outline-none"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({...signupData, lastName: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg text-white bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg text-white bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg text-white bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:outline-none"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    onClick={handleSignup}
                    disabled={isSendingOtp}
                    className="w-full px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: !isSendingOtp
                        ? 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)'
                        : 'rgba(255, 255, 255, 0.1)',
                      backgroundSize: '300% 300%',
                      animation: !isSendingOtp ? 'gradient-move 3s ease-in-out infinite' : 'none',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(61, 209, 249, 0.4)',
                      boxShadow: !isSendingOtp
                        ? 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        : 'none',
                      fontFamily: 'Rubik, sans-serif'
                    }}
                  >
                    {isSendingOtp ? 'Sending Code...' : 'Create Account'}
                  </button>
                </div>
              )}

              {/* OTP Verification */}
              {isSignupMode && isOtpMode && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-gray-300">We sent a 6-digit code to:</p>
                    <p className="text-white font-semibold">{signupData.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Enter Code</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 rounded-lg text-white text-center text-2xl tracking-widest bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:outline-none"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="w-full px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: !isVerifyingOtp && otpCode.length === 6
                        ? 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)'
                        : 'rgba(255, 255, 255, 0.1)',
                      backgroundSize: '300% 300%',
                      animation: !isVerifyingOtp && otpCode.length === 6 ? 'gradient-move 3s ease-in-out infinite' : 'none',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(61, 209, 249, 0.4)',
                      boxShadow: !isVerifyingOtp && otpCode.length === 6
                        ? 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        : 'none',
                      fontFamily: 'Rubik, sans-serif'
                    }}
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                  </button>

                  <button
                    onClick={() => setIsOtpMode(false)}
                    className="w-full text-gray-400 hover:text-gray-300 text-sm mt-2"
                  >
                    ← Back to signup form
                  </button>
                </div>
              )}

              {/* Login Form */}
              {!isSignupMode && !isOtpMode && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg text-white bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg text-white bg-white/5 border border-white/10 focus:border-cyan-400/50 focus:outline-none"
                      placeholder="••••••••"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleLogin();
                        }
                      }}
                    />
                  </div>

                  <button
                    onClick={handleLogin}
                    disabled={isProcessing}
                    className="w-full px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: !isProcessing
                        ? 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)'
                        : 'rgba(255, 255, 255, 0.1)',
                      backgroundSize: '300% 300%',
                      animation: !isProcessing ? 'gradient-move 3s ease-in-out infinite' : 'none',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(61, 209, 249, 0.4)',
                      boxShadow: !isProcessing
                        ? 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        : 'none',
                      fontFamily: 'Rubik, sans-serif'
                    }}
                  >
                    {isProcessing ? 'Logging In...' : 'Log In & Continue'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Security Note */}
          <div 
            className="p-4 rounded-xl text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <p className="text-sm text-gray-400">
              🔒 Secure checkout powered by Stripe
            </p>
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

export default ProSignupPage;

