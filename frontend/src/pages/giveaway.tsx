import { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Layout from '../components/Layout';
import { SUBSCRIBE_TO_KLAVIYO, GET_KLAVIYO_SUBSCRIPTION_STATUS } from '../lib/klaviyo-mutations';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const Giveaway: NextPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Klaviyo subscription mutation
  const [subscribeToKlaviyo] = useMutation(SUBSCRIBE_TO_KLAVIYO);

  // Calculate time left until August 8th, 2025
  useEffect(() => {
    const targetDate = new Date('2025-08-08T00:01:00-06:00'); // August 8th, 2025 at 12:01 AM MST
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      
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
    }, 1000);

    return () => clearInterval(timer);
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
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Subscribe to Klaviyo using specific giveaway list
      const { data } = await subscribeToKlaviyo({
        variables: {
          email: formData.email,
          listId: process.env.NEXT_PUBLIC_KLAVIYO_GIVEAWAY_LIST_ID || "UdvUWy" // Giveaway list ID from env or fallback
        }
      });

      if (data.subscribeToKlaviyo.success) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: ''
        });
        // Increment entry count on successful submission
        // setEntryCount(prev => prev + 1); // This line is removed
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.subscribeToKlaviyo.message || 'Failed to enter giveaway');
      }
    } catch (error) {
      console.error('Error entering giveaway:', error);
      setSubmitStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout
      title="Sticker Giveaway - Win 2,000 Custom Stickers | Sticker Shuttle"
      description="Enter our giveaway to win 2,000 premium custom vinyl stickers! Perfect for businesses, organizations, and creators. Enter now!"
      ogImage="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp"
    >
      <Head>
        <link rel="canonical" href="https://stickershuttle.com/giveaway" />
      </Head>

      <div className="min-h-screen py-8" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">

            {/* Countdown Timer */}
            <div 
              className="p-4 rounded-xl mb-6 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(248, 113, 113, 0.7) 25%, rgba(239, 68, 68, 0.6) 50%, rgba(248, 113, 113, 0.7) 75%, rgba(239, 68, 68, 0.8) 100%)',
                backdropFilter: 'blur(25px) saturate(200%)',
                border: '1px solid rgba(239, 68, 68, 0.8)',
                boxShadow: 'rgba(239, 68, 68, 0.4) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
              }}
            >
              <h3 className="text-lg font-bold text-red-100 mb-4">⏰ Time Remaining:</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{timeLeft.days}</div>
                  <div className="text-xs text-red-200">DAYS</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{timeLeft.hours}</div>
                  <div className="text-xs text-red-200">HOURS</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{timeLeft.minutes}</div>
                  <div className="text-xs text-red-200">MINUTES</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white">{timeLeft.seconds}</div>
                  <div className="text-xs text-red-200">SECONDS</div>
                </div>
              </div>
            </div>

            {/* Giveaway Information */}
            <div 
              className="p-4 rounded-xl mb-6"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.8) 0%, rgba(255, 193, 7, 0.7) 25%, rgba(255, 215, 0, 0.6) 50%, rgba(255, 193, 7, 0.7) 75%, rgba(255, 215, 0, 0.8) 100%)',
                backdropFilter: 'blur(25px) saturate(200%)',
                border: '1px solid rgba(255, 215, 0, 0.8)',
                boxShadow: 'rgba(255, 215, 0, 0.4) 0px 4px 20px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset'
              }}
            >
              <h3 className="text-lg font-bold text-yellow-100 mb-4">Giveaway Information:</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎁</span>
                  <span className="text-yellow-100">2,000 Custom Stickers</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">👥</span>
                  <span className="text-yellow-100">2 Winners, 1,000 each</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <span className="text-yellow-100">Winners announced August 8th</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎲</span>
                  <span className="text-yellow-100">Winners are randomly selected</span>
                </div>
              </div>
            </div>

            {/* Entry Form */}
            <div 
              className="p-4 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >

              {/* Success Message */}
              {submitStatus === 'success' && (
                <div className="mb-6 p-6 rounded-xl bg-green-500/20 border border-green-500/40 text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <h3 className="text-xl font-bold text-green-300 mb-2">You're Entered!</h3>
                  <p className="text-green-300">
                    Thank you for entering the giveaway! We'll announce the winner soon and contact you if you win.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-center">
                  <strong>Oops!</strong> {errorMessage || 'Something went wrong. Please try again.'}
                </div>
              )}

              {/* Entry Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-400/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                    required
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-400/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.email}
                  className="w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Entering Giveaway...
                    </div>
                  ) : (
                    '🎯 Enter Giveaway Now!'
                  )}
                </button>
              </form>

              {/* Terms */}
              <div className="mt-6 text-center text-sm text-gray-400">
                <p>
                  By entering, you agree to receive promotional emails from Sticker Shuttle. 
                  No purchase necessary. Winner will be selected randomly and contacted via email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Giveaway; 