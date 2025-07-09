import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from "@/components/Layout";
import Link from "next/link";
import { getSupabase } from '../lib/supabase';
import { useMutation } from '@apollo/client';
import { SYNC_CUSTOMER_TO_KLAVIYO } from '../lib/klaviyo-mutations';
import { CREATE_USER_PROFILE, CREATE_WHOLESALE_USER_PROFILE } from '../lib/profile-mutations';

export default function SignUp() {
  const router = useRouter();
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
  
  // Profile creation mutations
  const [createUserProfile] = useMutation(CREATE_USER_PROFILE);
  const [createWholesaleUserProfile] = useMutation(CREATE_WHOLESALE_USER_PROFILE);

  const [formData, setFormData] = useState({
    email: router.query.email ? decodeURIComponent(router.query.email as string) : '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    companyWebsite: '',
    companyName: '',
    isWholesale: false,
    wholesaleMonthlyCustomers: '',
    wholesaleOrderingFor: '',
    wholesaleFitExplanation: '',
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

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedNumber = phoneNumber.slice(0, 10);
    
    // Apply formatting based on length
    if (limitedNumber.length === 0) {
      return '';
    } else if (limitedNumber.length <= 3) {
      return limitedNumber;
    } else if (limitedNumber.length <= 6) {
      return `${limitedNumber.slice(0, 3)}-${limitedNumber.slice(3)}`;
    } else {
      return `${limitedNumber.slice(0, 3)}-${limitedNumber.slice(3, 6)}-${limitedNumber.slice(6)}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = 'checked' in e.target ? e.target.checked : false;
    
    let processedValue = value;
    
    // Apply phone number formatting for phone number fields
    if (name === 'phoneNumber' && type !== 'checkbox') {
      processedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) {
          // Already processing signup, ignoring duplicate submission
    return;
  }

  // Form submitted, starting signup process
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
    const directPhoneNumber = formDataElements.get('phoneNumber') as string;
    const directCompanyWebsite = formDataElements.get('companyWebsite') as string;
    const directCompanyName = formDataElements.get('companyName') as string;
    const directIsWholesale = formDataElements.get('isWholesale') === 'on';
    const directWholesaleMonthlyCustomers = formDataElements.get('wholesaleMonthlyCustomers') as string;
    const directWholesaleOrderingFor = formDataElements.get('wholesaleOrderingFor') as string;
    const directWholesaleFitExplanation = formDataElements.get('wholesaleFitExplanation') as string;

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

    // Wholesale-only validations
    if (formData.isWholesale) {
      // Phone number validation
      if (!formData.phoneNumber.trim()) {
        console.log('❌ Phone number required for wholesale');
        setError('Phone number is required for wholesale accounts');
        setLoading(false);
        return;
      }

      // Basic phone number format validation (must contain at least 10 digits)
      const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        console.log('❌ Invalid phone number format');
        setError('Please enter a valid phone number');
        setLoading(false);
        return;
      }

      // Company website validation
      if (!formData.companyWebsite.trim()) {
        console.log('❌ Company website required for wholesale');
        setError('Company website is required for wholesale accounts');
        setLoading(false);
        return;
      }

      // Basic URL validation - check for valid domain format
      const websitePattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
      const cleanWebsite = formData.companyWebsite.replace(/^(https?:\/\/)?(www\.)?/, '');
      
      if (!websitePattern.test(cleanWebsite)) {
        console.log('❌ Invalid company website format');
        setError('Please enter a valid website (e.g., yourcompany.com)');
        setLoading(false);
        return;
      }
    }

    if (!formData.agreeToTerms) {
      console.log('❌ Terms not agreed');
      setError('Please agree to the terms and conditions');
      setLoading(false);
      return;
    }

    // Wholesale validation
    if (formData.isWholesale) {
      if (!formData.companyName.trim()) {
        console.log('❌ Wholesale signup missing company name');
        setError('Company name is required for wholesale accounts');
        setLoading(false);
        return;
      }
      if (!formData.wholesaleMonthlyCustomers.trim()) {
        console.log('❌ Wholesale signup missing monthly customers info');
        setError('Please specify how many customers you work with monthly');
        setLoading(false);
        return;
      }
      if (!formData.wholesaleOrderingFor.trim()) {
        console.log('❌ Wholesale signup missing ordering for info');
        setError('Please specify if you are ordering for clients or yourself');
        setLoading(false);
        return;
      }
      if (!formData.wholesaleFitExplanation.trim()) {
        console.log('❌ Wholesale signup missing fit explanation');
        setError('Please explain why we may be a good fit');
        setLoading(false);
        return;
      }
      if (formData.wholesaleOrderingFor === 'myself') {
        console.log('❌ Wholesale signup not allowed for personal use only');
        setError('Wholesale accounts are for ordering for clients only. Please select "For clients" or "Both clients and myself"');
        setLoading(false);
        return;
      }
    }

    console.log('✅ Validation passed, attempting signup...');

    try {
      console.log('🔄 Getting Supabase client...');
      // Get Supabase client from CDN (latest version)
      const supabase = getSupabase();
      console.log('✅ Supabase client loaded:', !!supabase);
      
      console.log('🔄 Calling signUp...');

      const metadataToSend: any = {
        first_name: directFirstName,
        last_name: directLastName,
        full_name: `${directFirstName} ${directLastName}`
      };
      
      // Only add phone number and company website for wholesale accounts
      if (formData.isWholesale) {
        metadataToSend.phone_number = directPhoneNumber;
        // Ensure website has protocol for storage
        const formattedWebsite = directCompanyWebsite.startsWith('http') 
          ? directCompanyWebsite 
          : `https://${directCompanyWebsite.replace(/^www\./, '')}`;
        metadataToSend.company_website = formattedWebsite;
      }
      console.log('📦 Metadata being sent:', metadataToSend);
      
      // Sign up with modern Supabase API
      const { data, error: authError } = await supabase.auth.signUp({
        email: directEmail,
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
      
      // Scroll to top when OTP form is shown
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
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
      const supabase = getSupabase();
      
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
      
      // Create user profile based on type
      if (data.user?.id) {
        try {
          console.log('👤 Creating user profile...');
          
          if (formData.isWholesale) {
            console.log('🏪 Creating wholesale user profile');
            // Ensure website has protocol for storage
            const formattedWebsite = formData.companyWebsite.startsWith('http') 
              ? formData.companyWebsite 
              : `https://${formData.companyWebsite.replace(/^www\./, '')}`;
              
            await createWholesaleUserProfile({
              variables: {
                userId: data.user.id,
                input: {
                  firstName: userFirstName,
                  lastName: userLastName,
                  phoneNumber: formData.phoneNumber,
                  companyWebsite: formattedWebsite,
                  companyName: formData.companyName,
                  wholesaleMonthlyCustomers: formData.wholesaleMonthlyCustomers,
                  wholesaleOrderingFor: formData.wholesaleOrderingFor,
                  wholesaleFitExplanation: formData.wholesaleFitExplanation,
                  signupCreditAmount: 25.00 // $25 welcome bonus for wholesale customers
                }
              }
            });
            console.log('✅ Wholesale profile created successfully!');
          } else {
            console.log('👤 Creating regular user profile');
            await createUserProfile({
              variables: {
                userId: data.user.id,
                firstName: userFirstName,
                lastName: userLastName,
                phoneNumber: null, // Regular users don't provide phone number
                companyWebsite: null // Regular users don't provide company website
              }
            });
            console.log('✅ Regular profile created successfully!');
          }
        } catch (profileError) {
          console.error('⚠️ Profile creation failed (non-critical):', profileError);
          // Don't block signup if profile creation fails
        }
      }
      
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

      // Add customer to Resend General audience
      try {
        console.log('🔄 Adding customer to Resend audience...');
        const response = await fetch('/api/add-to-resend-audience', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            firstName: userFirstName,
            lastName: userLastName
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Customer added to Resend audience successfully!', result);
        } else {
          const errorData = await response.json();
          console.error('⚠️ Resend audience sync failed (non-critical):', errorData);
        }
      } catch (resendError) {
        console.error('⚠️ Resend audience sync failed (non-critical):', resendError);
        // Don't block signup if Resend fails
      }
      
      // Fetch and broadcast profile data to ensure avatar sync
      try {
        console.log('🔄 Fetching fresh profile data for sync...');
        const supabase = getSupabase();
        
        if (data.user?.id) {
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

          if (!profileError && profileData) {
            console.log('✅ Profile data fetched:', profileData);
            // Broadcast profile update to ensure all components are synced
            window.dispatchEvent(new CustomEvent('profileUpdated', {
              detail: {
                profile_photo_url: profileData.profile_photo_url,
                profile_photo_public_id: profileData.profile_photo_public_id
              }
            }));
            console.log('📡 Profile update broadcasted for avatar sync');
          }
        }
      } catch (profileSyncError) {
        console.error('⚠️ Profile sync failed (non-critical):', profileSyncError);
        // Don't block signup if profile sync fails
      }
      
      // Redirect to specified URL or dashboard after successful verification
      const redirectUrl = router.query.redirect as string || '/account/dashboard';
      router.push(redirectUrl);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      
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
      const supabase = getSupabase();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Changed from 'consent' to 'select_account' for better UX
          },
          redirectTo: `${window.location.origin}${router.query.redirect as string || '/account/dashboard'}`
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
          {/* Seamless header fade */}
          <div 
            className="absolute top-0 left-0 right-0 z-10"
            style={{
              height: '25vh',
              background: 'linear-gradient(180deg, #030140 0%, #030140 15%, rgba(3, 1, 64, 0.9) 35%, rgba(3, 1, 64, 0.7) 55%, rgba(3, 1, 64, 0.4) 75%, rgba(3, 1, 64, 0.2) 90%, transparent 100%)'
            }}
          ></div>
        </div>
        
        <div className="min-h-screen py-4 px-4 relative z-10 flex items-center justify-center">
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
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Send New Code
                </button>
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
      
      <div className="min-h-screen py-4 px-4 relative z-10" style={{ backgroundColor: 'transparent' }}>
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





            {/* Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mobile-signup-form">
              {/* Wholesale Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-300" 
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex-1">
                  <h3 className="text-white font-medium text-lg">Wholesale Account</h3>
                  <p className="text-gray-300 text-sm">Get 15% off orders + $25 welcome bonus</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isWholesale: !prev.isWholesale }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.isWholesale ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  aria-label="Toggle wholesale account"
                  title="Toggle wholesale account"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isWholesale ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <input
                  type="checkbox"
                  name="isWholesale"
                  checked={formData.isWholesale}
                  onChange={() => {}} // Handled by button click
                  className="hidden"
                  title="Wholesale account toggle"
                  aria-label="Wholesale account toggle"
                />
              </div>

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

              {/* Email Field */}
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



              {/* Wholesale Questions (shown only when toggle is on) */}
              {formData.isWholesale && (
                <div className="space-y-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <div className="text-center">
                    <h4 className="text-white font-medium text-lg mb-2">Wholesale Application</h4>
                    <p className="text-gray-300 text-sm">Please provide additional information for wholesale pricing</p>
                  </div>

                  {/* Company Name */}
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Your Company Name"
                      required={formData.isWholesale}
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      maxLength={12}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="555-123-4567"
                      required={formData.isWholesale}
                    />
                  </div>

                  {/* Company Website */}
                  <div>
                    <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-300 mb-2">
                      Company Website *
                    </label>
                    <input
                      type="text"
                      id="companyWebsite"
                      name="companyWebsite"
                      value={formData.companyWebsite}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="yourcompany.com"
                      required={formData.isWholesale}
                    />
                  </div>

                  {/* Monthly Customers */}
                  <div>
                    <label htmlFor="wholesaleMonthlyCustomers" className="block text-sm font-medium text-gray-300 mb-2">
                      How many customers do you work with monthly? *
                    </label>
                    <select
                      id="wholesaleMonthlyCustomers"
                      name="wholesaleMonthlyCustomers"
                      value={formData.wholesaleMonthlyCustomers}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      style={{ 
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }}
                      required={formData.isWholesale}
                    >
                      <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select range</option>
                      <option value="1-10" style={{ color: 'black', backgroundColor: 'white' }}>1-10 customers</option>
                      <option value="11-25" style={{ color: 'black', backgroundColor: 'white' }}>11-25 customers</option>
                      <option value="26-50" style={{ color: 'black', backgroundColor: 'white' }}>26-50 customers</option>
                      <option value="51-100" style={{ color: 'black', backgroundColor: 'white' }}>51-100 customers</option>
                      <option value="100+" style={{ color: 'black', backgroundColor: 'white' }}>100+ customers</option>
                    </select>
                  </div>

                  {/* Ordering For */}
                  <div>
                    <label htmlFor="wholesaleOrderingFor" className="block text-sm font-medium text-gray-300 mb-2">
                      Are you ordering for clients or yourself? *
                    </label>
                    <select
                      id="wholesaleOrderingFor"
                      name="wholesaleOrderingFor"
                      value={formData.wholesaleOrderingFor}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      style={{ 
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }}
                      required={formData.isWholesale}
                    >
                      <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select option</option>
                      <option value="clients" style={{ color: 'black', backgroundColor: 'white' }}>For clients</option>
                      <option value="myself" style={{ color: 'black', backgroundColor: 'white' }}>For myself</option>
                      <option value="both" style={{ color: 'black', backgroundColor: 'white' }}>Both clients and myself</option>
                    </select>
                    
                    {/* Validation message for "For myself" selection */}
                    {formData.wholesaleOrderingFor === 'myself' && (
                      <div className="mt-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                        <p className="text-red-300 text-sm">
                          ⚠️ This is for wholesale only. You must order for other clients to qualify for wholesale pricing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Fit Explanation */}
                  <div>
                    <label htmlFor="wholesaleFitExplanation" className="block text-sm font-medium text-gray-300 mb-2">
                      Explain why we may be a good fit *
                    </label>
                    <textarea
                      id="wholesaleFitExplanation"
                      name="wholesaleFitExplanation"
                      value={formData.wholesaleFitExplanation}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
                      placeholder="Tell us about your business needs, expected order volume, how you plan to use our services, etc."
                      required={formData.isWholesale}
                    />
                  </div>
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
                  <Link href="/terms-and-conditions" className="text-purple-400 hover:text-purple-300 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy-policy" className="text-purple-400 hover:text-purple-300 underline">
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
                disabled={loading || (formData.isWholesale && formData.wholesaleOrderingFor === 'myself')}
                onClick={() => console.log('🔴 Button clicked!')}
                className="w-full py-3 px-6 md:px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: (loading || (formData.isWholesale && formData.wholesaleOrderingFor === 'myself')) ? '#666' : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                  color: '#030140',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: (loading || (formData.isWholesale && formData.wholesaleOrderingFor === 'myself')) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating Account...' : 
                 (formData.isWholesale && formData.wholesaleOrderingFor === 'myself') ? 'Wholesale Only for Clients' : 
                 'Create Account'}
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




                  {/* Sign Up Form */}
                  <form onSubmit={handleSubmit} className="space-y-4 desktop-signup-form">
                    {/* Wholesale Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-300" 
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-lg">Wholesale Account</h3>
                        <p className="text-gray-300 text-sm">Get 15% off orders + $25 welcome bonus</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isWholesale: !prev.isWholesale }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          formData.isWholesale ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                        aria-label="Toggle wholesale account"
                        title="Toggle wholesale account"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.isWholesale ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <input
                        type="checkbox"
                        name="isWholesale"
                        checked={formData.isWholesale}
                        onChange={() => {}} // Handled by button click
                        className="hidden"
                        title="Wholesale account toggle"
                        aria-label="Wholesale account toggle"
                      />
                    </div>

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

                    {/* Email Field */}
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



                    {/* Wholesale Questions (shown only when toggle is on) */}
                    {formData.isWholesale && (
                      <div className="space-y-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                        <div className="text-center">
                          <h4 className="text-white font-medium text-lg mb-2">Wholesale Application</h4>
                          <p className="text-gray-300 text-sm">Please provide additional information for wholesale pricing</p>
                        </div>

                        {/* Company Name */}
                        <div>
                          <label htmlFor="companyName-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            id="companyName-desktop"
                            name="companyName"
                            value={formData.companyName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Your Company Name"
                            required={formData.isWholesale}
                          />
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label htmlFor="phoneNumber-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            id="phoneNumber-desktop"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            maxLength={12}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="555-123-4567"
                            required={formData.isWholesale}
                          />
                        </div>

                        {/* Company Website */}
                        <div>
                          <label htmlFor="companyWebsite-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                            Company Website *
                          </label>
                          <input
                            type="text"
                            id="companyWebsite-desktop"
                            name="companyWebsite"
                            value={formData.companyWebsite}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="yourcompany.com"
                            required={formData.isWholesale}
                          />
                        </div>

                        {/* Monthly Customers */}
                        <div>
                          <label htmlFor="wholesaleMonthlyCustomers-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                            How many customers do you work with monthly? *
                          </label>
                          <select
                            id="wholesaleMonthlyCustomers-desktop"
                            name="wholesaleMonthlyCustomers"
                            value={formData.wholesaleMonthlyCustomers}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            style={{ 
                              color: 'white',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }}
                            required={formData.isWholesale}
                          >
                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select range</option>
                            <option value="1-10" style={{ color: 'black', backgroundColor: 'white' }}>1-10 customers</option>
                            <option value="11-25" style={{ color: 'black', backgroundColor: 'white' }}>11-25 customers</option>
                            <option value="26-50" style={{ color: 'black', backgroundColor: 'white' }}>26-50 customers</option>
                            <option value="51-100" style={{ color: 'black', backgroundColor: 'white' }}>51-100 customers</option>
                            <option value="100+" style={{ color: 'black', backgroundColor: 'white' }}>100+ customers</option>
                          </select>
                        </div>

                        {/* Ordering For */}
                        <div>
                          <label htmlFor="wholesaleOrderingFor-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                            Are you ordering for clients or yourself? *
                          </label>
                          <select
                            id="wholesaleOrderingFor-desktop"
                            name="wholesaleOrderingFor"
                            value={formData.wholesaleOrderingFor}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            style={{ 
                              color: 'white',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }}
                            required={formData.isWholesale}
                          >
                            <option value="" style={{ color: 'black', backgroundColor: 'white' }}>Select option</option>
                            <option value="clients" style={{ color: 'black', backgroundColor: 'white' }}>For clients</option>
                            <option value="myself" style={{ color: 'black', backgroundColor: 'white' }}>For myself</option>
                            <option value="both" style={{ color: 'black', backgroundColor: 'white' }}>Both clients and myself</option>
                          </select>
                          
                          {/* Validation message for "For myself" selection */}
                          {formData.wholesaleOrderingFor === 'myself' && (
                            <div className="mt-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                              <p className="text-red-300 text-sm">
                                ⚠️ This is for wholesale only. You must order for other clients to qualify for wholesale pricing.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Fit Explanation */}
                        <div>
                          <label htmlFor="wholesaleFitExplanation-desktop" className="block text-sm font-medium text-gray-300 mb-2">
                            Explain why we may be a good fit *
                          </label>
                          <textarea
                            id="wholesaleFitExplanation-desktop"
                            name="wholesaleFitExplanation"
                            value={formData.wholesaleFitExplanation}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-vertical"
                            placeholder="Tell us about your business needs, expected order volume, how you plan to use our services, etc."
                            required={formData.isWholesale}
                          />
                        </div>
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
                        <Link href="/terms-and-conditions" className="text-purple-400 hover:text-purple-300 underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy-policy" className="text-purple-400 hover:text-purple-300 underline">
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
                      disabled={loading || (formData.isWholesale && formData.wholesaleOrderingFor === 'myself')}
                      onClick={() => console.log('🔴 Desktop Button clicked!')}
                                              className="w-full py-3 px-6 md:px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{
                        background: (loading || (formData.isWholesale && formData.wholesaleOrderingFor === 'myself')) ? '#666' : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                        color: '#030140',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: (loading || (formData.isWholesale && formData.wholesaleOrderingFor === 'myself')) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? 'Creating Account...' : 
                       (formData.isWholesale && formData.wholesaleOrderingFor === 'myself') ? 'Wholesale Only for Clients' : 
                       'Create Account'}
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

