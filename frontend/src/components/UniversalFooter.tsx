import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

export default function UniversalFooter() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };

    checkUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <footer className="py-12 mt-8" style={{ backgroundColor: '#030140', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                <span className="mr-2">🔗</span>
                Quick links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/shipping-process" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                    <span className="mr-2">🚚</span>
                    Shipping Process
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                    <span className="mr-2">📝</span>
                    Blog Posts
                  </Link>
                </li>
                <li>
                  <Link href="/contact-us" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">
                    <span className="mr-2">📞</span>
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Shop */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">
                Shop
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/deals" className="text-gray-300 hover:text-white transition-colors duration-200">
                    ⚡ Deals
                  </Link>
                </li>
                <li>
                  <a href="/products" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Start Your Order →
                  </a>
                </li>
                {user ? (
                  /* Logged In - Show Account Dashboard and Sign Out */
                  <>
                    <li>
                      <Link href="/account/dashboard" className="text-gray-300 hover:text-white transition-colors duration-200">
                        👨‍🚀 Account Dashboard
                      </Link>
                    </li>
                    <li>
                      <button 
                        onClick={handleSignOut}
                        className="text-gray-300 hover:text-white transition-colors duration-200 text-left"
                      >
                        Sign Out
                      </button>
                    </li>
                  </>
                ) : (
                  /* Not Logged In - Show Login and Signup */
                  <>
                    <li>
                      <Link href="/login" className="text-gray-300 hover:text-white transition-colors duration-200">
                        Log in
                      </Link>
                    </li>
                    <li>
                      <Link href="/signup" className="text-gray-300 hover:text-white transition-colors duration-200">
                        Signup
                      </Link>
                    </li>
                  </>
                )}
                <li>
                  <Link href="/cart" className="text-gray-300 hover:text-white transition-colors duration-200">
                    🛒 Cart
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Info */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">
                Legal & Info
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/terms-and-conditions" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/returns" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Returns & Refunds
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="text-gray-300 hover:text-white transition-colors duration-200">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/dmca-copyright" className="text-gray-300 hover:text-white transition-colors duration-200">
                    DMCA Copyright
                  </Link>
                </li>
              </ul>
            </div>

            {/* Our Mission */}
            <div>
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                <span className="mr-2">🚀</span>
                Our mission
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                We're called Sticker Shuttle, what do you think our mission is? To get your stickers to you as fast as humanly possible. At no extra cost.
              </p>
              
              {/* Social Media Links */}
              <div className="flex space-x-4">
                <a 
                  href="https://www.instagram.com/stickershuttle/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/@stickershuttle" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className="flex flex-col md:flex-row items-center justify-between">
              {/* Logo */}
              <div className="mb-4 md:mb-0">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                  alt="Sticker Shuttle Logo" 
                  className="h-10 w-auto object-contain footer-logo-hover cursor-pointer"
                />
              </div>
              
              {/* Built with Love and Copyright */}
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="text-gray-300 text-sm flex items-center">
                  Built with ❤️ by © Sticker Shuttle
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Footer Styles */}
      <style jsx>{`
        .footer-logo-hover {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .footer-logo-hover:hover {
          transform: scale(1.15) rotate(-3deg);
          filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.8)) 
                  drop-shadow(0 0 30px rgba(59, 130, 246, 0.5))
                  drop-shadow(0 0 45px rgba(220, 220, 220, 0.4));
          animation: footer-logo-wiggle 0.8s ease-in-out;
        }
        
        @keyframes footer-logo-wiggle {
          0% { transform: scale(1.15) rotate(-3deg); }
          15% { transform: scale(1.18) rotate(-5deg); }
          30% { transform: scale(1.16) rotate(-1deg); }
          45% { transform: scale(1.19) rotate(-6deg); }
          60% { transform: scale(1.17) rotate(-2deg); }
          75% { transform: scale(1.18) rotate(-4deg); }
          100% { transform: scale(1.15) rotate(-3deg); }
        }
      `}</style>
    </>
  );
} 