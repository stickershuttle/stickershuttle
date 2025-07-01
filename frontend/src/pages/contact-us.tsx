import { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import Layout from '../components/Layout';

const ContactUs: NextPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Contact Us - Sticker Shuttle</title>
        <meta name="description" content="Get in touch with Sticker Shuttle. We're here to help with your custom sticker orders and questions." />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div 
              className="p-8 rounded-2xl mb-8"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
                <p className="text-gray-300 text-lg">
                  Have questions about our products or need help with an order? We're here to help!
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contact Form */}
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-6">Send us a Message</h2>
                  
                  {submitStatus === 'success' && (
                    <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300">
                      Thank you for your message! We'll get back to you within 24 hours.
                    </div>
                  )}

                  {submitStatus === 'error' && (
                    <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300">
                      Sorry, there was an error sending your message. Please try again or email us directly.
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-white font-medium mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-white font-medium mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-white font-medium mb-2">
                        Subject *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        <option value="" className="bg-gray-800">Select a subject</option>
                        <option value="general" className="bg-gray-800">General Inquiry</option>
                        <option value="order" className="bg-gray-800">Order Question</option>
                        <option value="custom" className="bg-gray-800">Custom Design Request</option>
                        <option value="shipping" className="bg-gray-800">Shipping & Delivery</option>
                        <option value="technical" className="bg-gray-800">Technical Support</option>
                        <option value="wholesale" className="bg-gray-800">Wholesale Inquiry</option>
                        <option value="other" className="bg-gray-800">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-white font-medium mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}
                        placeholder="Tell us how we can help you..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </div>

                {/* Contact Information */}
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-6">Get in Touch</h2>
                  
                  <div className="space-y-6">
                    <div 
                      className="p-6 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <h3 className="text-white font-semibold mb-3">📧 Email Support</h3>
                      <p className="text-gray-300">
                        <strong>All inquiries:</strong> orbit@stickershuttle.com
                      </p>
                    </div>

                    <div 
                      className="p-6 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <h3 className="text-white font-semibold mb-3">⏰ Response Times</h3>
                      <p className="text-gray-300 mb-2">
                        <strong>Email:</strong> Within 24 hours
                      </p>
                      <p className="text-gray-300 mb-2">
                        <strong>Order Issues:</strong> Within 4 hours
                      </p>
                      <p className="text-gray-300">
                        <strong>Custom Quotes:</strong> 1-2 business days
                      </p>
                    </div>

                    <div 
                      className="p-6 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <h3 className="text-white font-semibold mb-3">🕒 Business Hours</h3>
                      <p className="text-gray-300 mb-2">
                        <strong>Monday - Friday:</strong> 7:00 AM - 6:00 PM MT
                      </p>
                      <p className="text-gray-300 mb-2">
                        <strong>Saturday:</strong> Closed
                      </p>
                      <p className="text-gray-300">
                        <strong>Sunday:</strong> Closed
                      </p>
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
};

export default ContactUs; 