import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from "@/components/Layout";
import Link from "next/link";
import { getSupabase } from '../lib/supabase';

export default function SignUp() {
  const router = useRouter();
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        }
      });

      console.log('📊 Signup result:', { user: !!data?.user, error: authError?.message });

      if (authError) {
        console.log('❌ Auth error:', authError.message);
        setError(authError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Signup successful, redirecting...');
      // Success! Redirect to login with confirmation message
      router.push('/login?message=Check your email to confirm your account');
      
    } catch (err: any) {
      console.log('❌ Catch error:', err);
      setError(err.message || 'An error occurred during signup');
      setLoading(false);
    }
  };

  const thirdPartyProviders = [
    {
      name: 'Google',
      icon: 'https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg',
      color: '#4285F4'
    },
    {
      name: 'Amazon',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
      color: '#FF9900'
    },
    {
      name: 'Apple',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/814px-Apple_logo_black.svg.png',
      color: '#000000'
    },
    {
      name: 'Facebook',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1024px-Facebook_Logo_%282019%29.png',
      color: '#1877F2'
    }
  ];

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
              <div className="grid grid-cols-2 gap-3">
                {thirdPartyProviders.map((provider) => (
                  <button
                    key={provider.name}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 transform hover:scale-105"
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

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">Or sign up with</span>
              </div>
            </div>

            {/* Method Toggle */}
            <div className="flex rounded-lg p-1 mb-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                onClick={() => setSignupMethod('email')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  signupMethod === 'email'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => setSignupMethod('phone')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  signupMethod === 'phone'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
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
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {thirdPartyProviders.map((provider) => (
                      <button
                        key={provider.name}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 transform hover:scale-105"
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
                  {/* Divider */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-transparent text-gray-400">Or sign up with</span>
                    </div>
                  </div>

                  {/* Method Toggle */}
                  <div className="flex rounded-lg p-1 mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <button
                      type="button"
                      onClick={() => setSignupMethod('email')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                        signupMethod === 'email'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      📧 Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupMethod('phone')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                        signupMethod === 'phone'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-300 hover:text-white'
                      }`}
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
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                      className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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