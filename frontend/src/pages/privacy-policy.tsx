import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';

const PrivacyPolicy: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy - Sticker Shuttle</title>
        <meta name="description" content="Sticker Shuttle's privacy policy - how we collect, use, and protect your personal information." />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4 py-16">
          <div 
            className="max-w-4xl mx-auto p-8 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
            <p className="text-gray-300 mb-8">Last updated: January 15, 2024</p>

            <div className="space-y-8 text-gray-200">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">Personal Information</h3>
                  <p>We collect information you provide directly to us, such as:</p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Name and contact information (email address, phone number, mailing address)</li>
                    <li>Payment information (processed securely through Stripe)</li>
                    <li>Account credentials and profile information</li>
                    <li>Order history and preferences</li>
                    <li>Design files and custom artwork you upload</li>
                    <li>Communications with our customer support team</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Process and fulfill your orders</li>
                  <li>Communicate with you about your orders and account</li>
                  <li>Provide customer support and respond to your inquiries</li>
                  <li>Send you promotional emails (with your consent)</li>
                  <li>Improve our products and services</li>
                  <li>Detect and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">3. Information Sharing</h2>
                <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our business (payment processing, shipping, email services)</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Data Security</h2>
                <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>SSL encryption for data transmission</li>
                  <li>Secure payment processing through Stripe</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to personal information on a need-to-know basis</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">5. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Access and update your personal information</li>
                  <li>Request deletion of your account and data</li>
                  <li>Opt out of promotional communications</li>
                  <li>Request a copy of your data</li>
                  <li>Lodge a complaint with a supervisory authority</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">6. Cookies and Tracking</h2>
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze website traffic and usage patterns</li>
                  <li>Provide personalized content and advertisements</li>
                  <li>Improve our website functionality</li>
                </ul>
                <p className="mt-4">You can control cookies through your browser settings.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">7. Third-Party Services</h2>
                <p>Our website integrates with third-party services including:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>Stripe:</strong> Payment processing</li>
                  <li><strong>Supabase:</strong> Database and authentication</li>
                  <li><strong>Cloudinary:</strong> Image storage and processing</li>
                  <li><strong>EasyPost:</strong> Shipping and tracking</li>
                  <li><strong>PostHog:</strong> Analytics and user insights</li>
                  <li><strong>Klaviyo:</strong> Email marketing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">8. Children's Privacy</h2>
                <p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
                <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">10. Contact Us</h2>
                <p>If you have any questions about this privacy policy, please contact us:</p>
                <div className="mt-4 space-y-2">
                  <p><strong>Email:</strong> privacy@stickershuttle.com</p>
                  <p><strong>Address:</strong> Sticker Shuttle Privacy Team</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy; 