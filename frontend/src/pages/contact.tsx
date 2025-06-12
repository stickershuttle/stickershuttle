import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { getSupabase } from '../lib/supabase';

export default function Contact() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    relatedOrder: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    // Check if this is a concern request
    if (router.query.concern === 'true') {
      setFormData(prev => ({
        ...prev,
        subject: 'concern'
      }));
    }
  }, [router.query]);

  const loadUserData = async () => {
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        
        // Fetch profile data
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!error && profileData) {
          setProfile(profileData);
        }

        // Auto-fill form with user data
        const displayName = profileData?.first_name || 
                           session.user?.user_metadata?.first_name || 
                           session.user?.email?.split('@')[0] || '';
        
        const userEmail = session.user?.email || '';

        setFormData(prev => ({
          ...prev,
          name: displayName,
          email: userEmail
        }));

        // Load user's recent orders (sample data for now)
        const sampleOrders = [
          { id: 'ORD-2024-001', date: '2024-01-15', total: 45.99, status: 'Delivered', items: [{ name: 'Custom Logo Stickers', quantity: 100 }] },
          { id: 'ORD-2024-002', date: '2024-01-20', total: 89.50, status: 'In Production', items: [{ name: 'Business Cards', quantity: 250 }] },
          { id: 'ORD-2024-003', date: '2024-01-25', total: 32.75, status: 'Shipped', items: [{ name: 'Vinyl Decals', quantity: 50 }] }
        ];
        setUserOrders(sampleOrders);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Don't redirect, just continue without auto-fill
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle special cases for non-logged-in users
    if (name === 'relatedOrder' && (value === 'login' || value === 'signup')) {
      router.push(`/${value}?redirect=/contact`);
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  if (submitted) {
    return (
      <Layout title="Contact - Sticker Shuttle">
        <div className="min-h-screen flex items-center justify-center"
             style={{ backgroundColor: '#030140' }}>
          <div className="max-w-md mx-auto text-center p-8 rounded-xl"
               style={{
                 backgroundColor: 'rgba(255, 255, 255, 0.08)',
                 backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(255, 255, 255, 0.15)'
               }}>
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-white mb-4">Message Sent!</h2>
            <p className="text-gray-300 mb-6">
              Thanks for reaching out! Our ground crew will get back to you within 24 hours.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({ name: '', email: '', subject: '', message: '', relatedOrder: '' });
              }}
              className="px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                color: 'white'
              }}
            >
              Send Another Message
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Contact - Sticker Shuttle">
      <div className="min-h-screen py-12"
           style={{ backgroundColor: '#030140' }}>
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
              🛟 Ground Control Support
            </h1>
            <p className="text-xl text-gray-300">
              Need help with your mission? Our crew is standing by!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="rounded-xl p-8 shadow-xl"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.08)',
                   backdropFilter: 'blur(20px)',
                   border: '1px solid rgba(255, 255, 255, 0.15)'
                 }}>
              <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white'
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#030140', color: 'white' }}>Select a topic</option>
                    <option value="concern" style={{ backgroundColor: '#030140', color: 'white' }}>Raise a Concern</option>
                    <option value="order-issue" style={{ backgroundColor: '#030140', color: 'white' }}>Order Issue</option>
                    <option value="design-help" style={{ backgroundColor: '#030140', color: 'white' }}>Design Help</option>
                    <option value="shipping" style={{ backgroundColor: '#030140', color: 'white' }}>Shipping Question</option>
                    <option value="billing" style={{ backgroundColor: '#030140', color: 'white' }}>Billing Question</option>
                    <option value="technical" style={{ backgroundColor: '#030140', color: 'white' }}>Technical Support</option>
                    <option value="other" style={{ backgroundColor: '#030140', color: 'white' }}>Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="relatedOrder" className="block text-sm font-medium text-gray-300 mb-2">
                    Related Order (Optional)
                  </label>
                  <select
                    id="relatedOrder"
                    name="relatedOrder"
                    value={formData.relatedOrder}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white'
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#030140', color: 'white' }}>
                      {user ? 'Select an order (optional)' : 'Login to see your orders'}
                    </option>
                    {user ? (
                      userOrders.map((order) => (
                        <option 
                          key={order.id} 
                          value={order.id}
                          style={{ backgroundColor: '#030140', color: 'white' }}
                        >
                          {order.id} - {new Date(order.date).toLocaleDateString()} - ${order.total} ({order.status})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="login" style={{ backgroundColor: '#030140', color: 'white' }}>
                          → Login to your account
                        </option>
                        <option value="signup" style={{ backgroundColor: '#030140', color: 'white' }}>
                          → Create an account
                        </option>
                      </>
                    )}
                  </select>
                  {!user && (
                    <p className="text-xs text-gray-400 mt-1">
                      <a href="/login" className="text-purple-400 hover:text-purple-300 underline">Login</a> or{' '}
                      <a href="/signup" className="text-purple-400 hover:text-purple-300 underline">sign up</a> to select from your recent orders
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                    placeholder="Tell us how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: isSubmitting ? '#666' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                    color: 'white'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      🚀 Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              {/* Quick Help */}
              <div className="rounded-xl p-6 shadow-xl"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.08)',
                     backdropFilter: 'blur(20px)',
                     border: '1px solid rgba(255, 255, 255, 0.15)'
                   }}>
                <h3 className="text-xl font-bold text-white mb-4">🔧 Quick Help</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <h4 className="font-semibold text-white text-sm">Order Status</h4>
                    <p className="text-xs text-gray-300">Check your dashboard for real-time updates</p>
                  </div>
                  <div className="p-3 rounded-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <h4 className="font-semibold text-white text-sm">Design Guidelines</h4>
                    <p className="text-xs text-gray-300">300 DPI, CMYK, vector formats preferred</p>
                  </div>
                  <div className="p-3 rounded-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <h4 className="font-semibold text-white text-sm">Shipping Times</h4>
                    <p className="text-xs text-gray-300">3-5 business days production + shipping</p>
                  </div>
                </div>
              </div>

              {/* Contact Methods */}
              <div className="rounded-xl p-6 shadow-xl"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.08)',
                     backdropFilter: 'blur(20px)',
                     border: '1px solid rgba(255, 255, 255, 0.15)'
                   }}>
                <h3 className="text-xl font-bold text-white mb-4">📞 Other Ways to Reach Us</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg"
                         style={{
                           background: 'linear-gradient(135deg, #10b981, #34d399)',
                           boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                         }}>
                      <span className="text-white">📧</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Email</p>
                      <p className="text-gray-300 text-sm">support@stickershuttle.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg"
                         style={{
                           background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                           boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                         }}>
                      <span className="text-white">💬</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Live Chat</p>
                      <p className="text-gray-300 text-sm">Available 9 AM - 6 PM EST</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg"
                         style={{
                           background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                           boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
                         }}>
                      <span className="text-white">⏰</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Response Time</p>
                      <p className="text-gray-300 text-sm">Usually within 24 hours</p>
                    </div>
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