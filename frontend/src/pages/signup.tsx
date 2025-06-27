import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from "@/components/Layout";
import Link from "next/link";
import { getSupabase } from '../lib/supabase';
import { useMutation } from '@apollo/client';
import { SYNC_CUSTOMER_TO_KLAVIYO } from '../lib/klaviyo-mutations';

export default function SignUp() {
  const router = useRouter();
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Add OTP verification state
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');

  // Klaviyo integration
  const [syncToKlaviyo] = useMutation(SYNC_CUSTOMER_TO_KLAVIYO);

  const [formData, setFormData] = useState({
    email: router.query.email ? decodeURIComponent(router.query.email as string) : '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false
  });

  // Update email if URL param changes
  useEffect(() => {
    if (router.query.email) {
      setFormData(prev => ({
        ...prev,
        email: decodeURIComponent(router.query.email as string)
      }));
    }
  }, [router.query.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) {
      console.log('⚠️ Already processing signup, ignoring duplicate submission...');
      return;
    }
    
    console.log('🔄 Form submitted, starting signup process...');
    console.log('📋 Raw form data:', formData);
    console.log('🖥️ Form that submitted:', (e.target as HTMLFormElement)?.className || 'Unknown form');
    setLoading(true);
    setError(null);

    // Force capture current form values directly from the form
    const form = e.target as HTMLFormElement;
    const formDataElements = new FormData(form);
    console.log('📝 Direct form elements:', {
      firstName: formDataElements.get('firstName'),
      lastName: formDataElements.get('lastName'),
      email: formDataElements.get('email')
    });

    // Use the direct form data instead of state
    const directFirstName = formDataElements.get('firstName') as string;
    const directLastName = formDataElements.get('lastName') as string;
    const directEmail = formDataElements.get('email') as string;
    const directPassword = formDataElements.get('password') as string;

    console.log('🎯 Using direct form data:', {
      firstName: directFirstName,
      lastName: directLastName,
      email: directEmail
    });

    // Validation using direct form data
    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Password validation failed');
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      console.log('❌ Password too short');
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!formData.agreeToTerms) {
      console.log('❌ Terms not agreed');
      setError('Please agree to the terms and conditions');
      setLoading(false);
      return;
    }

    console.log('✅ Validation passed, attempting signup...');

    try {
      console.log('🔄 Getting Supabase client...');
      // Get Supabase client from CDN (latest version)
      const supabase = await getSupabase();
      console.log('✅ Supabase client loaded:', !!supabase);
      
      console.log('🔄 Calling signUp...');

      const metadataToSend = {
        first_name: directFirstName,
        last_name: directLastName,
        full_name: `${directFirstName} ${directLastName}`,
        phone: signupMethod === 'phone' ? formData.phone : null
      };
      console.log('📦 Metadata being sent:', metadataToSend);
      
      // Sign up with modern Supabase API
      const { data, error: authError } = await supabase.auth.signUp({
        email: signupMethod === 'email' ? directEmail : `${formData.phone}@temp.com`,
        password: directPassword,
        options: {
          data: metadataToSend
          // Remove emailRedirectTo for OTP flow
        }
      });

      console.log('📊 Signup result:', { user: !!data?.user, error: authError?.message });

      if (authError) {
        console.log('❌ Auth error:', authError.message);
        setError(authError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Signup successful, showing OTP verification...');
      // Show OTP verification form instead of redirecting
      setUserEmail(directEmail);
      setUserFirstName(directFirstName);
      setUserLastName(directLastName);
      setShowOtpVerification(true);
      setLoading(false);
      
    } catch (err: any) {
      console.log('❌ Catch error:', err);
      setError(err.message || 'An error occurred during signup');
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = await getSupabase();
      
      // Debug Supabase client configuration
      console.log('🔧 Supabase client created:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        client: !!supabase
      });
      
      console.log('🔄 Verifying OTP:', { 
        email: userEmail, 
        token: otpCode, 
        length: otpCode.length,
        timestamp: new Date().toISOString()
      });
      
      // Try multiple verification types to see which one works
      console.log('🧪 Trying signup verification type...');
      let result = await supabase.auth.verifyOtp({
        email: userEmail,
        token: otpCode,
        type: 'signup'
      });
      
      console.log('📊 Signup verification result:', { 
        success: !!result.data?.user, 
        error: result.error?.message,
        errorCode: result.error?.code 
      });
      
      // If signup fails, try email type
      if (result.error) {
        console.log('🧪 Trying email verification type...');
        result = await supabase.auth.verifyOtp({
          email: userEmail,
          token: otpCode,
          type: 'email'
        });
        
        console.log('📊 Email verification result:', { 
          success: !!result.data?.user, 
          error: result.error?.message,
          errorCode: result.error?.code 
        });
      }
      
      // If both fail, try invite type (just in case)
      if (result.error) {
        console.log('🧪 Trying invite verification type...');
        const inviteResult = await supabase.auth.verifyOtp({
          email: userEmail,
          token: otpCode,
          type: 'invite'
        });
        
        console.log('📊 Invite verification result:', { 
          success: !!inviteResult.data?.user, 
          error: inviteResult.error?.message,
          errorCode: inviteResult.error?.code 
        });
        
        if (!inviteResult.error) {
          result = inviteResult;
        }
      }
      
      const { data, error } = result;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      console.log('✅ Email verified successfully!');
      
      // Sync new customer to Klaviyo default list
      try {
        console.log('🔄 Syncing new customer to Klaviyo...');
        await syncToKlaviyo({
          variables: {
            customerData: {
              email: userEmail,
              firstName: userFirstName,
              lastName: userLastName,
              marketingOptIn: true, // New signups default to subscribed
              totalOrders: 0,
              totalSpent: 0,
              averageOrderValue: 0
            }
          }
        });
        console.log('✅ Customer synced to Klaviyo successfully!');
      } catch (klaviyoError) {
        console.error('⚠️ Klaviyo sync failed (non-critical):', klaviyoError);
        // Don't block signup if Klaviyo fails
      }
      
      // Redirect to dashboard after successful verification
      router.push('/account/dashboard');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = await getSupabase();
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail
      });

      if (error) {
        setError(error.message);
      } else {
        setError('New code sent to your email!');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
    
    setLoading(false);
  };

  const handleOAuthSignup = async (provider: string) => {
    if (provider.toLowerCase() !== 'google') {
      alert(`${provider} signup coming soon!`);
      return;
    }

    try {
      setLoading(true);
      const supabase = await getSupabase();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Changed from 'consent' to 'select_account' for better UX
          },
          redirectTo: `${window.location.origin}/account/dashboard`
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        setError(error.message);
        setLoading(false);
      }
      // If successful, user will be redirected by Supabase
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'An error occurred during OAuth signup');
      setLoading(false);
    }
  };

  const thirdPartyProviders = [
    {
      name: 'Google',
      icon: 'https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg',
      color: '#4285F4'
    }
  ];

  // Show OTP verification form if needed
  if (showOtpVerification) {
    return (
      <Layout title="Verify Your Email - Sticker Shuttle">
        <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scale(1.75)' }}
            onLoadedData={(e) => {
              const video = e.target as HTMLVideoElement;
              video.currentTime = 117;
              video.play().catch(console.error);
            }}
          >
            <source src="https://images-assets.nasa.gov/video/KSC-19890502-MH-NAS01-0001-Apollo_11_The_Twentieth_Year_1969_to_1989-B_0514/KSC-19890502-MH-NAS01-0001-Apollo_11_The_Twentieth_Year_1969_to_1989-B_0514~large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        
        <div className="min-h-screen py-4 px-6 md:px-4 relative z-10 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Check Your Email</h1>
              <p className="text-gray-300">We sent a 6-digit code to</p>
              <p className="text-white font-semibold">{userEmail}</p>
            </div>

            <div 
              className="rounded-2xl p-8 shadow-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleOtpVerification}>
                <div className="mb-6">
                  <label htmlFor="otpCode" className="block text-sm font-medium text-gray-300 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="otpCode"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 px-4 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Send New Code
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const supabase = await getSupabase();
                        const { error } = await supabase.auth.signInWithOtp({
                          email: userEmail,
                          options: {
                            emailRedirectTo: `${window.location.origin}/account/dashboard`
                          }
                        });
                        if (!error) {
                          setError('Magic link sent! Check your email for a clickable link.');
                        } else {
                          setError(error.message);
                        }
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                    disabled={loading}
                    className="text-green-400 hover:text-green-300 text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Send Magic Link Instead
                  </button>
                </div>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpVerification(false);
                    setOtpCode('');
                    setUserEmail('');
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                >
                  ← Back to Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sign Up - Join Sticker Shuttle">
      {/* Full Screen Video Background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scale(1.75)' }}
          onLoadedData={(e) => {
            const video = e.target as HTMLVideoElement;
            video.currentTime = 117; // 1:57 = 117 seconds
            video.play().catch(console.error);
          }}
          onCanPlayThrough={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.paused) {
              video.currentTime = 117;
              video.play().catch(console.error);
            }
          }}
          onTimeUpdate={(e) => {
            const video = e.target as HTMLVideoElement;
            // Ensure it loops back to 117 seconds instead of 0
            if (video.currentTime < 117 && video.currentTime > 5) {
              video.currentTime = 117;
            }
          }}
        >
          <source src="https://images-assets.nasa.gov/video/KSC-19890502-MH-NAS01-0001-Apollo_11_The_Twentieth_Year_1969_to_1989-B_0514/KSC-19890502-MH-NAS01-0001-Apollo_11_The_Twentieth_Year_1969_to_1989-B_0514~large.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/60"></div>
        {/* Seamless header fade */}
        <div 
          className="absolute top-0 left-0 right-0 z-10"
          style={{
            height: '25vh',
            background: 'linear-gradient(180deg, #030140 0%, #030140 15%, rgba(3, 1, 64, 0.9) 35%, rgba(3, 1, 64, 0.7) 55%, rgba(3, 1, 64, 0.4) 75%, rgba(3, 1, 64, 0.2) 90%, transparent 100%)'
          }}
        ></div>
      </div>
      
      <div className="min-h-screen py-4 px-6 md:px-4 relative z-10" style={{ backgroundColor: 'transparent' }}>
        {/* Mobile Layout */}
        <div className="lg:hidden max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
              Join the Mission
            </h1>
            <p className="text-gray-300">Create your account and start creating amazing stickers</p>
          </div>

          {/* Sign Up Card */}
          <div 
            className="rounded-2xl p-8 shadow-xl"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {/* Third Party Sign Up Options */}
            <div className="mb-8">
              <p className="text-sm text-gray-300 text-center mb-4">Quick sign up with:</p>
              <div className="flex justify-center">
                {thirdPartyProviders.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => handleOAuthSignup(provider.name)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                  >
                    <img 
                      src={provider.icon} 
                      alt={provider.name} 
                      className="w-5 h-5 object-contain"
                      style={{ filter: provider.name === 'Apple' ? 'invert(1)' : 'none' }}
                    />
                    <span className="text-white text-sm font-medium">{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>



            {/* Method Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSignupMethod('email')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                  signupMethod === 'email' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
                style={signupMethod === 'email' ? {
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                } : {
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => setSignupMethod('phone')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                  signupMethod === 'phone' ? 'text-white' : 'text-gray-300 hover:text-white'
                }`}
                style={signupMethod === 'phone' ? {
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                } : {
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                📱 Phone
              </button>
            </div>

            {/* Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mobile-signup-form">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Email or Phone Field */}
              {signupMethod === 'email' ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
              )}

              {/* Password Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Create a strong password"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-purple-600 bg-transparent border-gray-300 rounded focus:ring-purple-500"
                  required
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-300">
                  I agree to the{' '}
                  <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                onClick={() => console.log('🔴 Button clicked!')}
                className="w-full py-3 px-6 md:px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? '#666' : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                  color: '#030140',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Log In Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-300 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                  Log in here
                </Link>
              </p>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm mb-4">Join thousands of creators who trust Sticker Shuttle</p>
            <div className="flex justify-center gap-6 text-xs text-white">
              <div className="flex items-center gap-1">
                <span>✨</span>
                <span>Premium Materials</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🚚</span>
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⭐</span>
                <span>5-Star Reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-center pt-8 pb-4">
          <div className="w-full max-w-5xl mx-auto bg-white/5 rounded-3xl shadow-2xl" style={{ backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            
            {/* Single Wide Sign Up Form */}
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                  Join the Mission
                </h1>
                <p className="text-gray-300">Create your account and start creating amazing stickers</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Third Party Options */}
                <div>
                  <p className="text-sm text-gray-300 text-center mb-4">Quick sign up with:</p>
                  <div className="flex justify-center mb-6">
                    {thirdPartyProviders.map((provider) => (
                      <button
                        key={provider.name}
                        type="button"
                        onClick={() => handleOAuthSignup(provider.name)}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                      >
                        <img 
                          src={provider.icon} 
                          alt={provider.name} 
                          className="w-5 h-5 object-contain"
                          style={{ filter: provider.name === 'Apple' ? 'invert(1)' : 'none' }}
                        />
                        <span className="text-white text-sm font-medium">{provider.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Features Preview */}
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-3">Join thousands of creators who trust Sticker Shuttle</p>
                    <div className="flex justify-center gap-4 text-xs text-white">
                      <div className="flex items-center gap-1">
                        <span>✨</span>
                        <span>Premium Materials</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🚚</span>
                        <span>Free Shipping</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>⭐</span>
                        <span>5-Star Reviews</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Form */}
                <div>


                  {/* Method Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setSignupMethod('email')}
                      className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        signupMethod === 'email' ? 'text-white' : 'text-gray-300 hover:text-white'
                      }`}
                      style={signupMethod === 'email' ? {
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      📧 Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupMethod('phone')}
                      className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        signupMethod === 'phone' ? 'text-white' : 'text-gray-300 hover:text-white'
                      }`}
                      style={signupMethod === 'phone' ? {
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      📱 Phone
                    </button>
                  </div>

                  {/* Sign Up Form */}
                  <form onSubmit={handleSubmit} className="space-y-4 desktop-signup-form">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          id="firstName-desktop"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="John"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          id="lastName-desktop"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    {/* Email or Phone Field */}
                    {signupMethod === 'email' ? (
                      <div>
                        <label htmlFor="email-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email-desktop"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="phone-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone-desktop"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="+1 (555) 123-4567"
                          required
                        />
                      </div>
                    )}

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor="password-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          id="password-desktop"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="Create a strong password"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="confirmPassword-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          id="confirmPassword-desktop"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="w-full px-6 md:px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </div>

                    {/* Terms Agreement */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="agreeToTerms-desktop"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleInputChange}
                        className="mt-1 w-4 h-4 text-purple-600 bg-transparent border-gray-300 rounded focus:ring-purple-500"
                        required
                      />
                      <label htmlFor="agreeToTerms-desktop" className="text-sm text-gray-300">
                        I agree to the{' '}
                        <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                        {error}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      onClick={() => console.log('🔴 Desktop Button clicked!')}
                      className="w-full py-3 px-6 md:px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: loading ? '#666' : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                        color: '#030140',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>

                  {/* Log In Link */}
                  <div className="mt-6 text-center">
                    <p className="text-gray-300 text-sm">
                      Already have an account?{' '}
                      <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                        Log in here
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 

