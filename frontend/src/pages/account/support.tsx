import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Support() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?redirect=/account/support');
          return;
        }

        setUser(session.user);
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      // Here you would send the support request to your backend
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
      setMessage('');
      setSubject('');
      setOrderNumber('');
      
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Error sending support request:', error);
      alert('Failed to send support request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/account/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-white">Get Support</h1>
        </div>

        {/* Support Form */}
        <div className="glassmorphism rounded-2xl p-8">
          {success ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Support Request Sent!</h2>
              <p className="text-gray-300">We'll get back to you within 24 hours.</p>
              <Link
                href="/account/dashboard"
                className="inline-block mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quick Contact Info */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-300">
                  <strong>Need urgent help?</strong> Email us directly at{' '}
                  <a href="mailto:support@stickershuttle.com" className="underline hover:text-blue-200">
                    support@stickershuttle.com
                  </a>
                </p>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
                  placeholder="What can we help you with?"
                />
              </div>

              {/* Order Number (Optional) */}
              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-300 mb-2">
                  Order Number (Optional)
                </label>
                <input
                  type="text"
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
                  placeholder="e.g., #SS12345"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                  placeholder="Please describe your issue or question in detail..."
                />
              </div>

              {/* Common Issues */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300">Common Issues:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSubject('Order Status Inquiry')}
                    className="text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-white font-medium text-sm">Order Status</p>
                    <p className="text-gray-400 text-xs mt-1">Check on your order progress</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubject('File Upload Issue')}
                    className="text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-white font-medium text-sm">File Issues</p>
                    <p className="text-gray-400 text-xs mt-1">Problems uploading or with files</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubject('Shipping Question')}
                    className="text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-white font-medium text-sm">Shipping</p>
                    <p className="text-gray-400 text-xs mt-1">Delivery times and tracking</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubject('Proof Approval Help')}
                    className="text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-white font-medium text-sm">Proof Help</p>
                    <p className="text-gray-400 text-xs mt-1">Questions about your proof</p>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Link
                  href="/account/dashboard"
                  className="px-6 py-3 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={sending || !subject || !message}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* FAQ Section */}
        <div className="mt-8 glassmorphism rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-white font-medium mb-2">How long does production take?</h3>
              <p className="text-gray-300 text-sm">
                Standard production time is 3-5 business days after proof approval. Rush orders may be available for an additional fee.
              </p>
            </div>
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-white font-medium mb-2">Can I change my order after placing it?</h3>
              <p className="text-gray-300 text-sm">
                You can make changes to your order before proof approval. Once proofs are approved, the order goes into production and cannot be changed.
              </p>
            </div>
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-white font-medium mb-2">What file formats do you accept?</h3>
              <p className="text-gray-300 text-sm">
                We accept PDF, AI, EPS, PNG, and JPG files. For best results, provide vector files (PDF, AI, EPS) with fonts outlined.
              </p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">Do you offer samples?</h3>
              <p className="text-gray-300 text-sm">
                Yes! We offer sample packs for $5 that include all our sticker materials. Order a sample pack from our products page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 