import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';

const TermsAndConditions: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Terms and Conditions - Sticker Shuttle</title>
        <meta name="description" content="Sticker Shuttle's terms and conditions - our legal agreement for using our services." />
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
            <h1 className="text-4xl font-bold text-white mb-8">Terms and Conditions</h1>
            <p className="text-gray-300 mb-8">Last updated: January 15, 2024</p>

            <div className="space-y-8 text-gray-200">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                <p>By accessing and using Sticker Shuttle's website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">2. Services Description</h2>
                <p>Sticker Shuttle provides custom printing services including:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Custom vinyl stickers and decals</li>
                  <li>Specialty stickers (chrome, holographic, glitter, clear)</li>
                  <li>Sticker sheets and multi-packs</li>
                  <li>Vinyl banners and signage</li>
                  <li>Design and proofing services</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">3. Order Process and Pricing</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">Ordering</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>All orders must be placed through our website</li>
                    <li>Prices are calculated based on size, quantity, and material specifications</li>
                    <li>Custom quotes may be provided for large or complex orders</li>
                    <li>Payment is required in full before production begins</li>
                  </ul>
                  
                  <h3 className="text-xl font-medium text-white">Pricing</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>All prices are in USD and include applicable taxes</li>
                    <li>Shipping costs are calculated separately</li>
                    <li>Prices are subject to change without notice</li>
                    <li>Promotional pricing may have specific terms and limitations</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Design Requirements and Proofs</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">File Requirements</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>High-resolution files (300 DPI minimum) preferred</li>
                    <li>Accepted formats: PDF, PNG, JPG, AI, EPS, SVG</li>
                    <li>Vector files recommended for best quality</li>
                    <li>Color mode: CMYK preferred, RGB acceptable</li>
                  </ul>
                  
                  <h3 className="text-xl font-medium text-white">Proof Approval</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Digital proofs will be provided for approval before production</li>
                    <li>Customer is responsible for reviewing and approving all content</li>
                    <li>Production begins only after proof approval</li>
                    <li>Changes after approval may incur additional fees</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">5. Production and Shipping</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">Production Times</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Standard production: 3-5 business days after proof approval</li>
                    <li>Rush orders available for additional fees</li>
                    <li>Production times may vary during peak seasons</li>
                    <li>Custom or complex orders may require additional time</li>
                  </ul>
                  
                  <h3 className="text-xl font-medium text-white">Shipping</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Shipping options and costs calculated at checkout</li>
                    <li>Free shipping available on qualifying orders</li>
                    <li>International shipping available to select countries</li>
                    <li>Customer responsible for customs fees and duties</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">6. Payment Terms</h2>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Payment processed securely through industry-standard payment processors</li>
                  <li>Accepted payment methods: Credit cards, debit cards</li>
                  <li>Store credit and promotional codes may be applied</li>
                  <li>Failed payments may result in order cancellation</li>
                  <li>Refunds processed according to our return policy</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">Customer Content</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Customer retains ownership of submitted designs and content</li>
                    <li>Customer grants Sticker Shuttle license to reproduce content for order fulfillment</li>
                    <li>Customer warrants they have rights to all submitted content</li>
                    <li>Sticker Shuttle may showcase completed work for promotional purposes</li>
                  </ul>
                  
                  <h3 className="text-xl font-medium text-white">Prohibited Content</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Copyrighted material without proper authorization</li>
                    <li>Trademarked logos or brands without permission</li>
                    <li>Offensive, inappropriate, or illegal content</li>
                    <li>Content that violates third-party rights</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">8. Quality and Satisfaction</h2>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>We guarantee the quality of our materials and workmanship</li>
                  <li>Color variations may occur due to monitor differences and printing processes</li>
                  <li>Customer satisfaction is our priority - contact us with any concerns</li>
                  <li>Defective products will be reprinted or refunded at our discretion</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">9. Returns and Refunds</h2>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Custom products are generally non-returnable unless defective</li>
                  <li>Refund requests must be made within 30 days of delivery</li>
                  <li>Proof of defect or error required for refund consideration</li>
                  <li>Shipping costs are non-refundable unless error is ours</li>
                  <li>Store credit may be offered as alternative to refunds</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
                <p>Sticker Shuttle's liability is limited to the cost of the products ordered. We are not liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">11. Privacy and Data Protection</h2>
                <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">12. Modifications to Terms</h2>
                <p>Sticker Shuttle reserves the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Continued use of our services constitutes acceptance of modified terms.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">13. Governing Law</h2>
                <p>These terms are governed by and construed in accordance with applicable local laws. Any disputes will be resolved through binding arbitration or in the appropriate local courts.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">14. Contact Information</h2>
                <p>For questions about these terms and conditions, please contact us:</p>
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

export default TermsAndConditions; 