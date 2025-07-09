import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';

const CookiePolicy: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Cookie Policy - Sticker Shuttle</title>
        <meta name="description" content="Sticker Shuttle's cookie policy - how we use cookies and similar technologies on our website." />
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
            <h1 className="text-4xl font-bold text-white mb-8">Cookie Policy</h1>
            <p className="text-gray-300 mb-8">Last updated: January 15, 2024</p>

            <div className="space-y-8 text-gray-200">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">What Are Cookies?</h2>
                <p>Cookies are small text files that are stored on your computer or mobile device when you visit a website. They allow the website to recognize your device and store some information about your preferences or past actions.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">How We Use Cookies</h2>
                <p>Sticker Shuttle uses cookies to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Remember your login status and preferences</li>
                  <li>Keep items in your shopping cart</li>
                  <li>Analyze how you use our website to improve your experience</li>
                  <li>Provide personalized content and recommendations</li>
                  <li>Ensure our website functions properly</li>
                  <li>Prevent fraud and enhance security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Types of Cookies We Use</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-medium text-white mb-3">Essential Cookies</h3>
                    <p className="mb-2">These cookies are necessary for the website to function and cannot be switched off in our systems.</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Authentication cookies (login status)</li>
                      <li>Shopping cart functionality</li>
                      <li>Security cookies</li>
                      <li>Load balancing cookies</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium text-white mb-3">Analytics Cookies</h3>
                    <p className="mb-2">These cookies help us understand how visitors interact with our website.</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>User behavior analytics and feature usage</li>
                      <li>Website performance monitoring</li>
                      <li>Page view tracking</li>
                      <li>User journey analysis</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium text-white mb-3">Functional Cookies</h3>
                    <p className="mb-2">These cookies enable enhanced functionality and personalization.</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Language and region preferences</li>
                      <li>Theme and display preferences</li>
                      <li>Recently viewed products</li>
                      <li>Form data retention</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium text-white mb-3">Marketing Cookies</h3>
                    <p className="mb-2">These cookies are used to deliver relevant advertisements and track campaign effectiveness.</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Email marketing and customer segmentation</li>
                      <li>Abandoned cart tracking</li>
                      <li>Marketing campaign attribution</li>
                      <li>Customer journey tracking</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Third-Party Cookies</h2>
                <p className="mb-4">We also use cookies from trusted third-party services:</p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">Payment Processing</h3>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Secure payment processing and fraud prevention</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white">Authentication</h3>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>User authentication and session management</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white">Content Delivery</h3>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Image optimization and delivery</li>
                      <li>Website hosting and performance optimization</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Cookie Duration</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">Session Cookies</h3>
                    <p>These are temporary cookies that expire when you close your browser.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-white">Persistent Cookies</h3>
                    <p>These cookies remain on your device for a set period or until you delete them. Duration varies:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Authentication cookies: 30 days</li>
                      <li>Preference cookies: 1 year</li>
                      <li>Analytics cookies: 2 years</li>
                      <li>Marketing cookies: 30-90 days</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Managing Your Cookie Preferences</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">Browser Settings</h3>
                    <p>Most web browsers allow you to control cookies through their settings. You can:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Block all cookies</li>
                      <li>Block third-party cookies</li>
                      <li>Delete existing cookies</li>
                      <li>Set cookies to expire when you close your browser</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white">Browser-Specific Instructions</h3>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                      <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                      <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                      <li><strong>Edge:</strong> Settings → Site permissions → Cookies and site data</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Impact of Disabling Cookies</h2>
                <p className="mb-4">Please note that disabling cookies may affect your experience on our website:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>You may need to log in repeatedly</li>
                  <li>Your shopping cart may not work properly</li>
                  <li>Personalized features may not function</li>
                  <li>Some pages may not display correctly</li>
                  <li>We won't be able to remember your preferences</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Updates to This Policy</h2>
                <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Please review this policy periodically for any changes.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
                <p>If you have any questions about our use of cookies, please contact us:</p>
                <div className="mt-4 space-y-2">
                  <p><strong>Email:</strong> orbit@stickershuttle.com</p>
                  <p><strong>Support:</strong> orbit@stickershuttle.com</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CookiePolicy; 