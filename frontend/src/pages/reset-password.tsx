import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { updatePassword, getUser } from '../lib/auth';

export default function ResetPassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Check if user has a valid session (from password reset link)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getUser();
        if (user) {
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
        }
      } catch (err) {
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await updatePassword(formData.password);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      
      // Redirect to login after a few seconds
      setTimeout(() => {
        router.push('/login?message=Password updated successfully. Please log in with your new password.');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating password');
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <Layout title="Reset Password - Sticker Shuttle">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-white mt-4">Verifying reset link...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error if invalid session
  if (isValidSession === false) {
    return (
      <Layout title="Reset Password - Sticker Shuttle">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div 
              className="rounded-2xl p-8 shadow-xl text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h1>
              <p className="text-gray-300 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link 
                href="/forgot-password"
                className="inline-block py-3 px-6 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  color: '#ffffff'
                }}
              >
                Request New Reset Link
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reset Password - Sticker Shuttle">
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
      
      <div className="min-h-screen flex items-center justify-center px-4 relative z-10" style={{ backgroundColor: 'transparent' }}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
              Reset Password
            </h1>
            <p className="text-gray-300">Enter your new password below</p>
          </div>

          {/* Reset Password Card */}
          <div 
            className="rounded-2xl p-8 shadow-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter new password (min. 8 characters)"
                    required
                    minLength={8}
                  />
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Confirm new password"
                    required
                    minLength={8}
                  />
                </div>

                {/* Password Requirements */}
                <div className="text-xs text-gray-400">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li className={formData.password.length >= 8 ? 'text-green-400' : ''}>
                      At least 8 characters long
                    </li>
                    <li className={formData.password === formData.confirmPassword && formData.password.length > 0 ? 'text-green-400' : ''}>
                      Passwords match
                    </li>
                  </ul>
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
                  disabled={loading || formData.password !== formData.confirmPassword || formData.password.length < 8}
                  className="w-full py-3 px-4 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading ? '#666' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    color: '#ffffff'
                  }}
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            ) : (
              /* Success Message */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
                  Password updated successfully! Redirecting to login...
                </div>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mx-auto"></div>
              </div>
            )}

            {/* Back to Login Link */}
            {!success && (
              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 