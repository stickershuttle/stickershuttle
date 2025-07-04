import { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import SEOHead from "../components/SEOHead";
import { getSupabase } from "../lib/supabase";
import { useRouter } from "next/router";
import { useQuery } from '@apollo/client';
import { GET_USER_PROFILE } from '../lib/profile-mutations';

export default function StoreCredit() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user profile to check wholesale status
  const { data: profileData } = useQuery(GET_USER_PROFILE, {
    variables: { userId: user?.id },
    skip: !user?.id
  });

  const userProfile = profileData?.getUserProfile;
  const isWholesale = userProfile?.isWholesaleCustomer || false;
  const creditRate = isWholesale ? 10 : 5;
  const creditRateDecimal = isWholesale ? 0.10 : 0.05;

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      if (typeof window !== 'undefined') {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Store Credit & Rewards Program - Sticker Shuttle",
    "description": `Learn about Sticker Shuttle's ${creditRate}% back store credit program${isWholesale ? ' for wholesale customers' : ''}. Earn rewards on every order and save on future purchases.`,
    "url": "https://stickershuttle.com/store-credit"
  };

  return (
    <>
      <SEOHead
        title={`Store Credit & ${creditRate}% Back Program${isWholesale ? ' - Wholesale' : ''} - Sticker Shuttle`}
        description={`Earn ${creditRate}% back on every order with Sticker Shuttle's store credit program${isWholesale ? ' for wholesale customers' : ''}. Learn how to maximize your rewards and save on custom stickers.`}
        keywords={`store credit, rewards program, ${creditRate}% back, sticker rewards, customer loyalty, discount program${isWholesale ? ', wholesale rewards, business discounts' : ''}`}
        canonical="https://stickershuttle.com/store-credit"
        structuredData={structuredData}
      />
      
      <Layout title="Store Credit & Rewards Program">
        {/* Hero Section */}
        <section className="py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div 
              className="rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0.05) 100%)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(255, 215, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >


              <div className="relative z-10">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <i className="fas fa-coins text-yellow-300 text-5xl"></i>
                  <h1 className="text-4xl md:text-6xl font-bold text-yellow-200">
                    Earn {creditRate}% Back{isWholesale && <span className="text-sm block mt-2">Wholesale Rate</span>}
                  </h1>
                  <i className="fas fa-coins text-yellow-300 text-5xl"></i>
                </div>
                
                                  <div className="max-w-4xl mx-auto">
                  <p className="text-yellow-100 text-xl md:text-2xl mb-8 leading-relaxed">
                    {isWholesale ? (
                      <>
                        <strong className="text-yellow-200">Wholesale Benefits:</strong> Get {creditRate}% of your order total back as store credit 
                        with every purchase! Double the rewards for your business needs.
                      </>
                    ) : (
                      <>
                        <strong className="text-yellow-200">Limited-Time Offer:</strong> Get {creditRate}% of your order total back as store credit 
                        with every purchase (normal is 2.5%). Stack your rewards and save big on future orders!
                      </>
                    )}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/products">
                      <button 
                        className="px-8 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105 rounded-lg"
                        style={{
                          backgroundColor: '#ffd713',
                          color: '#030140',
                          boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                          border: 'solid',
                          borderWidth: '0.03125rem',
                          borderColor: '#e6c211'
                        }}
                      >
                        Start Earning Now →
                      </button>
                    </Link>
                    
                    {!user && !loading && (
                      <Link href="/signup">
                        <button 
                          className="px-8 py-4 font-bold text-lg text-yellow-200 hover:text-yellow-100 transition-all duration-300 hover:scale-105 rounded-lg border-2 border-yellow-400 hover:border-yellow-300"
                          style={{
                            background: 'rgba(255, 215, 0, 0.1)',
                            backdropFilter: 'blur(12px)'
                          }}
                        >
                          Create Account
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                Earning store credit is automatic and easy. Here's how our rewards program works:
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div 
                className="rounded-2xl p-6 text-center relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-xl font-bold text-white mb-3">1. Shop & Order</h3>
                <p className="text-gray-300">
                  Place any order for custom stickers, banners, or other products. No minimum purchase required!
                </p>
              </div>

              <div 
                className="rounded-2xl p-6 text-center relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-white mb-3">2. Earn Automatically</h3>
                <p className="text-gray-300">
                  Receive {creditRate}% of your order total as store credit{isWholesale && ' (wholesale rate)'}. Credits are added to your account after order completion.
                </p>
              </div>

              <div 
                className="rounded-2xl p-6 text-center relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="text-6xl mb-4">💳</div>
                <h3 className="text-xl font-bold text-white mb-3">3. Save & Spend</h3>
                <p className="text-gray-300">
                  Use your store credit on future orders. Stack credits from multiple orders for bigger savings!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div 
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 50%, rgba(255, 215, 0, 0.05) 100%)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(255, 215, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >


              <div className="relative z-10">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎁</div>
                    <h3 className="text-lg font-semibold text-yellow-200 mb-2">No Expiration</h3>
                    <p className="text-yellow-100 text-sm">Your store credit never expires. Save up for bigger projects!</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl mb-3">🔄</div>
                    <h3 className="text-lg font-semibold text-yellow-200 mb-2">Stackable</h3>
                    <p className="text-yellow-100 text-sm">Combine credits from multiple orders for maximum savings.</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl mb-3">⚡</div>
                    <h3 className="text-lg font-semibold text-yellow-200 mb-2">Instant Apply</h3>
                    <p className="text-yellow-100 text-sm">Credits automatically apply at checkout. No codes needed!</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl mb-3">💯</div>
                    <h3 className="text-lg font-semibold text-yellow-200 mb-2">No Minimums</h3>
                    <p className="text-yellow-100 text-sm">Earn on every order, no matter how small. Every purchase counts!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>





        {/* Call to Action */}
        <section className="py-8">
          <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
            <div 
              className="rounded-2xl p-8 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0.05) 100%)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(255, 215, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >


              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-yellow-200 mb-4">
                  Ready to Start Earning?
                </h2>
                <p className="text-yellow-100 text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands of customers who are already earning {creditRate}% back on their orders{isWholesale && ' with wholesale benefits'}. 
                  Start your first order today and watch your savings grow!
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/products">
                    <button 
                      className="px-10 py-4 font-bold text-xl transition-all duration-300 transform hover:scale-105 rounded-lg"
                      style={{
                        backgroundColor: '#ffd713',
                        color: '#030140',
                        boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                        border: 'solid',
                        borderWidth: '0.03125rem',
                        borderColor: '#e6c211'
                      }}
                    >
                      Shop Now & Earn →
                    </button>
                  </Link>
                  
                  {user && (
                    <Link href="/account/dashboard">
                      <button 
                        className="px-10 py-4 font-bold text-xl text-yellow-200 hover:text-yellow-100 transition-all duration-300 hover:scale-105 rounded-lg border-2 border-yellow-400 hover:border-yellow-300"
                        style={{
                          background: 'rgba(255, 215, 0, 0.1)',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        View My Credits
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Custom CSS */}
        <style jsx>{`
          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .animate-spin-slow {
            animation: spin-slow 3s linear infinite;
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </Layout>
    </>
  );
}