import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getSupabase } from '../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get Supabase client from CDN
      const supabase = await getSupabase();
      
      // Sign in with modern Supabase API
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginMethod === 'email' ? formData.email : `${formData.phone}@temp.com`,
        password: formData.password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Success! Redirect to dashboard
      router.push('/account/dashboard');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
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
    <Layout title="Log In - Sticker Shuttle">
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
      
      <div className="min-h-screen flex items-start justify-center px-4 relative z-10 pt-8" style={{ backgroundColor: 'transparent' }}>
        {/* Mobile Layout */}
        <div className="lg:hidden max-w-md mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-4" style={{ paddingTop: '2px' }}>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
              Welcome Back
            </h1>
            <p className="text-gray-300 text-sm">Log in to your account and continue your mission</p>
          </div>

          {/* Login Card */}
          <div 
            className="rounded-2xl p-4 shadow-xl"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {/* Third Party Login Options */}
            <div className="mb-4">
              <p className="text-sm text-gray-300 text-center mb-3">Quick log in with:</p>
              <div className="grid grid-cols-2 gap-2">
                {thirdPartyProviders.map((provider) => (
                  <button
                    key={provider.name}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 transform hover:scale-105"
                  >
                    <img 
                      src={provider.icon} 
                      alt={provider.name} 
                      className="w-4 h-4 object-contain"
                      style={{ filter: provider.name === 'Apple' ? 'invert(1)' : 'none' }}
                    />
                    <span className="text-white text-xs font-medium">{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="text-center mb-4">
              <span className="text-gray-400 text-sm">Or log in with</span>
            </div>

            {/* Method Toggle */}
            <div className="flex rounded-lg p-1 mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'email'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  loginMethod === 'phone'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                📱 Phone
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email or Phone Field */}
              {loginMethod === 'email' ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
              )}

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <a href="#" className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200">
                  Forgot your password?
                </a>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? '#666' : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                  color: '#030140',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Logging In...' : 'Log In'}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">
                Don't have an account?{' '}
                <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-start justify-center w-full min-h-screen pt-24">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center">
            {/* Left Column - Third Party Options */}
            <div>
              <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
                Welcome Back
              </h1>
              <p className="text-xl text-gray-300 mb-8">Log in to your account and continue your mission</p>
              
              <div>
                <p className="text-sm text-gray-300 text-center mb-6">Quick log in with:</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {thirdPartyProviders.map((provider) => (
                    <button
                      key={provider.name}
                      className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 transform hover:scale-105"
                    >
                      <img 
                        src={provider.icon} 
                        alt={provider.name} 
                        className="w-6 h-6 object-contain"
                        style={{ filter: provider.name === 'Apple' ? 'invert(1)' : 'none' }}
                      />
                      <span className="text-white text-sm font-medium">{provider.name}</span>
                    </button>
                  ))}
                </div>

                {/* Features Preview */}
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-3">Trusted by thousands of creators</p>
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
            </div>

            {/* Right Column - Login Form */}
            <div>
              <div 
                className="rounded-2xl p-8 shadow-xl max-w-md ml-auto"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                {/* Divider */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-gray-400">Or log in with</span>
                  </div>
                </div>

                {/* Method Toggle */}
                <div className="flex rounded-lg p-1 mb-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                      loginMethod === 'email'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    📧 Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                      loginMethod === 'phone'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    📱 Phone
                  </button>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email or Phone Field */}
                  {loginMethod === 'email' ? (
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

                  {/* Password Field */}
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
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  {/* Forgot Password Link */}
                  <div className="text-right">
                    <a href="#" className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200">
                      Forgot your password?
                    </a>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: loading ? '#666' : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                      color: '#030140',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Logging In...' : 'Log In'}
                  </button>
                </form>

                {/* Sign Up Link */}
                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium">
                      Sign up here
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 