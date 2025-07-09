import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/Layout';

const DMCACopyright: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>DMCA Copyright - Sticker Shuttle</title>
        <meta name="description" content="Sticker Shuttle's DMCA copyright policy and takedown procedures for intellectual property protection." />
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
            <h1 className="text-4xl font-bold text-white mb-8">DMCA Copyright Policy</h1>
            <p className="text-gray-300 mb-8">Last updated: January 15, 2024</p>

            <div className="space-y-8 text-gray-200">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Digital Millennium Copyright Act (DMCA) Notice</h2>
                <p>Sticker Shuttle respects the intellectual property rights of others and expects our users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond expeditiously to claims of copyright infringement committed using our services.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Copyright Infringement Policy</h2>
                <p>It is our policy to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Remove or disable access to material that is claimed to be infringing</li>
                  <li>Terminate accounts of users who are repeat infringers</li>
                  <li>Implement procedures for copyright owners to report alleged infringement</li>
                  <li>Provide counter-notification procedures for users who believe content was wrongly removed</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Filing a DMCA Takedown Notice</h2>
                <p className="mb-4">If you believe that your copyrighted work has been copied and is accessible on our website in a way that constitutes copyright infringement, you may notify us by providing our DMCA agent with the following information:</p>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">Required Information</h3>
                  <ol className="list-decimal list-inside ml-4 space-y-2">
                    <li>A physical or electronic signature of the copyright owner or person authorized to act on behalf of the owner</li>
                    <li>Identification of the copyrighted work claimed to have been infringed</li>
                    <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to permit us to locate the material</li>
                    <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and email address</li>
                    <li>A statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law</li>
                    <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed</li>
                  </ol>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">DMCA Agent Contact Information</h2>
                <div 
                  className="p-6 rounded-lg mb-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <p className="font-semibold text-white mb-2">DMCA Agent</p>
                  <p><strong>Email:</strong> orbit@stickershuttle.com</p>
                  <p><strong>Subject Line:</strong> DMCA Takedown Request</p>
                  <p className="mt-4 text-sm text-gray-300">
                    Please note that we only accept DMCA notices sent to the designated agent above. 
                    DMCA notices sent to other email addresses or contacts will not be processed.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Counter-Notification Process</h2>
                <p className="mb-4">If you believe that your content was removed or disabled by mistake or misidentification, you may file a counter-notification with our DMCA agent. Your counter-notification must include:</p>
                
                <ol className="list-decimal list-inside ml-4 space-y-2">
                  <li>Your physical or electronic signature</li>
                  <li>Identification of the content that has been removed and the location where it appeared before removal</li>
                  <li>A statement under penalty of perjury that you have a good faith belief that the content was removed as a result of mistake or misidentification</li>
                  <li>Your name, address, and telephone number</li>
                  <li>A statement that you consent to the jurisdiction of the federal court in your district, or if outside the United States, any judicial district in which we may be found</li>
                  <li>A statement that you will accept service of process from the person who provided the original DMCA notice</li>
                </ol>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Response Timeline</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">DMCA Takedown Notices</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>We will review valid DMCA notices within 24-48 hours</li>
                    <li>If the notice is complete and valid, we will remove or disable access to the allegedly infringing material</li>
                    <li>We will notify the user who posted the content about the removal</li>
                  </ul>
                  
                  <h3 className="text-xl font-medium text-white">Counter-Notifications</h3>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>We will forward valid counter-notifications to the original complainant</li>
                    <li>Content may be restored 10-14 business days after counter-notification unless the complainant files a court action</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Repeat Infringer Policy</h2>
                <p>In accordance with the DMCA and other applicable laws, we have adopted a policy of terminating accounts of users who are deemed to be repeat infringers. We may also limit access to our services and/or terminate accounts of users who infringe any intellectual property rights of others, whether or not there is any repeat infringement.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">False Claims</h2>
                <p>Please note that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing or was removed or disabled by mistake or misidentification may be subject to liability. Please ensure that your DMCA notice or counter-notification is accurate.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Content Review Process</h2>
                <p className="mb-4">Before printing any custom designs, Sticker Shuttle reviews submitted content to identify potential copyright infringement. We reserve the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Refuse to print content that appears to infringe copyrights or trademarks</li>
                  <li>Request proof of authorization for branded or copyrighted material</li>
                  <li>Suspend or cancel orders containing potentially infringing content</li>
                  <li>Report suspected infringement to appropriate rights holders</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Trademark Policy</h2>
                <p>In addition to copyright protection, we also respect trademark rights. We will not knowingly print content that infringes on registered trademarks or service marks. If you believe your trademark rights have been violated, please contact our DMCA agent with relevant trademark registration information.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">User Responsibilities</h2>
                <p className="mb-4">All users of our services are responsible for ensuring that:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>They own all rights to submitted content or have proper authorization</li>
                  <li>Their designs do not infringe on copyrights, trademarks, or other intellectual property rights</li>
                  <li>They comply with all applicable laws and regulations</li>
                  <li>They provide accurate information in any DMCA-related communications</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Legal Disclaimer</h2>
                <p>This DMCA policy is provided for informational purposes and does not constitute legal advice. The DMCA is a complex law, and we recommend consulting with an attorney if you have questions about your rights or obligations under copyright law.</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
                <p>For all DMCA-related matters, please contact:</p>
                <div className="mt-4 space-y-2">
                  <p><strong>DMCA Agent Email:</strong> orbit@stickershuttle.com</p>
                  <p><strong>General Support:</strong> orbit@stickershuttle.com</p>
                  <p><strong>Legal Department:</strong> orbit@stickershuttle.com</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DMCACopyright; 