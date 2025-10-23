import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import UniversalHeader from '../components/UniversalHeader';
import UniversalFooter from '../components/UniversalFooter';
import { Check, Star, ShieldCheck, Truck, Tag, Headphones, Sparkles, ArrowRight } from 'lucide-react';

const StickerShuttlePro = () => {
  const [selectedPlan, setSelectedPlan] = React.useState('annual');
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0);
  const [displayText, setDisplayText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [proMemberCount, setProMemberCount] = React.useState(242); // Default fallback

  const messages = [
    'never worry about<br/>getting your stickers<br/>on time again.',
    'stop panic-ordering<br/>stickers at 2am<br/>before events.',
    'never hear "sorry,<br/>we\'re out of<br/>stickers" again.',
    'quit being the person<br/>who forgot stickers<br/>for the trade show.',
    'stop explaining why<br/>you don\'t have<br/>branded stickers.',
    'never run to<br/>random stores for<br/>crappy stickers again.',
    'quit disappointing<br/>customers who ask<br/>for stickers.',
    'stop using boring<br/>business cards when<br/>stickers work better.',
    'never say "we\'ll<br/>mail you one"<br/>ever again.',
    'quit making excuses<br/>about your marketing<br/>materials.',
    'stop feeling unprepared<br/>at every networking<br/>event.',
    'never watch competitors<br/>hand out cool stickers<br/>while you stand empty-handed.',
    'quit being the brand<br/>people forget because<br/>you have nothing sticky.'
  ];

  // Fetch Pro member count
  React.useEffect(() => {
    const fetchProMemberCount = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const response = await fetch(`${backendUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query {
                getProMemberCount
              }
            `
          })
        });

        const result = await response.json();
        console.log('📊 Pro member count response:', result);
        
        if (result.data?.getProMemberCount !== undefined) {
          const count = result.data.getProMemberCount;
          setProMemberCount(count);
          console.log('✅ Pro member count fetched:', count);
        }
      } catch (error) {
        console.error('Error fetching Pro member count:', error);
        // Keep default fallback value
      }
    };

    fetchProMemberCount();
  }, []);

  React.useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    const typingSpeed = isDeleting ? 8 : 30;
    const pauseTime = isDeleting ? 500 : 2000;

    const timer = setTimeout(() => {
      if (!isDeleting && displayText === currentMessage) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && displayText === '') {
        setIsDeleting(false);
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      } else {
        setDisplayText(prev => {
          if (isDeleting) {
            return currentMessage.substring(0, prev.length - 1);
          } else {
            return currentMessage.substring(0, prev.length + 1);
          }
        });
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentMessageIndex, messages]);
  const benefits = [
    {
      icon: <Sparkles className="w-8 h-8 text-blue-400" />,
      title: "100 Custom Stickers",
      description: "Premium vinyl stickers delivered monthly",
      value: "Normally $87",
      highlight: true
    },
    {
      icon: <Truck className="w-8 h-8 text-blue-400" />,
      title: "FREE 2-Day Air Shipping",
      description: "Lightning-fast delivery on all your orders",
      value: "Save $15+ per order",
      highlight: true
    },
    {
      icon: <Tag className="w-8 h-8 text-blue-400" />,
      title: "25% Off Marketspace",
      description: "Exclusive discounts on designer stickers",
      value: "Unlimited savings",
      highlight: false
    },
    {
      icon: <Star className="w-8 h-8 text-blue-400" />,
      title: "Priority Printing",
      description: "Your orders jump to the front of the line",
      value: "Faster turnaround",
      highlight: false
    },
    {
      icon: <Headphones className="w-8 h-8 text-blue-400" />,
      title: "Exclusive Text Support",
      description: "Direct line to our support team via SMS",
      value: "Premium support",
      highlight: false
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-blue-400" />,
      title: "Quality Guarantee",
      description: "100% satisfaction or we'll make it right",
      value: "Peace of mind",
      highlight: false
    }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Small Business Owner",
      content: "Sticker Shuttle Pro has been a game-changer for my business. The monthly stickers and priority printing keep my inventory fresh!",
      rating: 5
    },
    {
      name: "Mike R.",
      role: "Content Creator",
      content: "The 2-day shipping and Marketspace discount alone pay for the subscription. Everything else is just bonus value.",
      rating: 5
    },
    {
      name: "Jessica L.",
      role: "Event Planner",
      content: "Priority printing has saved me so many times when I need stickers for last-minute events. Worth every penny!",
      rating: 5
    }
  ];

  return (
    <>
      <Head>
        <title>Sticker Shuttle Pro</title>
        <meta name="description" content="Get 100 custom stickers monthly, FREE 2-day shipping, 25% off Marketspace, priority printing, and exclusive support with Sticker Shuttle Pro." />
        <meta name="keywords" content="sticker subscription, premium stickers, custom stickers monthly, fast shipping, sticker shuttle pro" />
        <meta property="og:title" content="Sticker Shuttle Pro - Premium Sticker Subscription" />
        <meta property="og:description" content="Get 100 custom stickers monthly, FREE 2-day shipping, 25% off Marketspace, priority printing, and exclusive support." />
        <meta property="og:image" content="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" />
        <meta property="og:url" content="https://stickershuttle.com/pro" />
        <link rel="canonical" href="https://stickershuttle.com/pro" />
        <link rel="icon" type="image/png" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" />
        <link rel="shortcut icon" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" />
        <link rel="icon" sizes="16x16 32x32 48x48" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" />
        <link rel="icon" type="image/x-icon" href="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140', minHeight: '100vh' }}>
        <UniversalHeader />
        
        {/* Hero Section */}
        <div className="relative overflow-hidden pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                          <div className="text-center">
                <div className="flex justify-center mb-6 pt-8">
                <img 
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                  alt="Sticker Shuttle Pro Logo" 
                  className="h-18 md:h-32 lg:h-30 w-auto object-contain"
                />
              </div>
              
              <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 lg:mb-8" style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'bold' }}>
                <span className="block">Join <span className="pro-gradient">Pro</span> and</span>
                <span className="block min-h-[3.6em] lg:min-h-[2.8em]" dangerouslySetInnerHTML={{
                  __html: displayText + '<span class="animate-pulse">|</span>'
                }}></span>
              </h1>
              
              <p className="text-xl md:text-2xl lg:text-3xl text-gray-300 mb-8 max-w-3xl lg:max-w-4xl mx-auto">
                Pro is only $39/month. Cancel anytime.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                                  <Link href={`/pro/join?plan=${selectedPlan}`}>
                    <button className="px-18 py-5 lg:px-24 lg:py-6 rounded-xl text-lg lg:text-xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:translate-y-[-2px] flex items-center gap-2 lg:gap-3 animate-pulse-subtle button-gradient"
                          style={{
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(61, 209, 249, 0.4)',
                            boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          }}>
                    Join Pro
                      <ArrowRight className="w-5 h-5 transition-transform duration-300 hover:translate-x-1" />
                    </button>
                  </Link>
              </div>
              
              {/* Pro Members Count */}
              <div className="mb-8 max-w-xs lg:max-w-md xl:max-w-lg mx-auto">
                <div className="text-center mb-3">
                  <span className="text-sm lg:text-base font-bold text-blue-300 tracking-wider">
                    Founding 100 Members
                  </span>
                </div>
                <div className="relative w-full h-3 lg:h-4 bg-gray-700/30 rounded-full overflow-hidden"
                     style={{
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                       backdropFilter: 'blur(12px)'
                     }}>
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-red-500 rounded-full transition-all duration-1000 ease-out"
                       style={{ width: `${Math.min(100, (proMemberCount / 100) * 100)}%` }}></div>
                </div>
                <div className="text-center text-xs lg:text-sm text-gray-400 mt-2">
                  <span>{Math.max(0, 100 - proMemberCount)} spots left</span>
                </div>
              </div>
              
              {/* Value Proposition */}
              <i className="text-gray-300 text-base lg:text-lg">Save <b>$1,294 per year</b> with Pro membership</i>
              
              {/* Benefits List */}
              <div className="mt-8 lg:mt-12 flex justify-center">
                <ul className="space-y-2 lg:space-y-3 text-gray-300 text-base lg:text-lg max-w-2xl lg:max-w-4xl" style={{ fontFamily: 'Rubik, sans-serif' }}>
                  {/* Main Benefits Section Header */}
                  <li className="flex items-center justify-center mb-4 lg:mb-6">
                    <span className="text-lg lg:text-xl font-bold text-green-300 uppercase tracking-wide">What's Included?</span>
                    <span className="text-sm lg:text-base text-gray-400 ml-2">$150/mo in value</span>
                  </li>
                  
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">📦</span>
                    <span><span style={{ fontWeight: 'bold' }}>100 custom stickers</span> delivered monthly <span className="line-through text-red-400" style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'bold' }}>$87</span></span>
                  </li>
                  
                  {/* Divider */}
                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">✈️</span>
                    <span><span style={{ fontWeight: 'bold' }}>2-Day Air</span> shipping on custom orders <span className="line-through text-red-400" style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'bold' }}>$20</span></span>
                  </li>
                  
                  {/* Divider */}
                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">🎫</span>
                    <span><span style={{ fontWeight: 'bold' }}>Fast Pass</span> - faster printing time&#160;</span> <span className="line-through text-red-400" style={{ fontFamily: 'Rubik, sans-serif', fontWeight: 'bold' }}>40% fee</span>
                  </li>
                  
                  {/* Divider */}
                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">💬</span>
                    <span><span style={{ fontWeight: 'bold' }}>Exclusive text support</span> for instant help</span>
                  </li>
                  
                  {/* Divider */}
                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  
                  <li className="flex items-center justify-center mb-8 lg:mb-10">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                      alt="Coin Icon" 
                      className="w-5 h-5 lg:w-6 lg:h-6 mr-3 lg:mr-4 flex-shrink-0"
                    />
                    <span><span style={{ fontWeight: 'bold' }}>Earn 5% back</span> on custom  orders</span>
                  </li>
                  
                  {/* Additional Benefits Section Header */}
                  <li className="flex items-center justify-center mb-4 lg:mb-6 mt-12 lg:mt-12">
                    <span className="text-lg lg:text-xl font-bold text-blue-300 uppercase tracking-wide">+ Additional Benefits</span>
                  </li>
                  
                  <li className="flex items-center justify-center">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                      alt="Pro Logo" 
                      className="h-5 lg:h-6 w-auto mr-3 lg:mr-4 flex-shrink-0"
                    />
                    <span><span style={{ fontWeight: 'bold' }}>Pro only</span> discounts on stickers</span>
                  </li>
                  
                  {/* Divider */}
                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">🤝</span>
                    <span><span style={{ fontWeight: 'bold' }}>Discounts</span> for 100+ small businesses</span>
                  </li>


                  
                  {/* Bonus Section */}
                  <li className="flex items-center justify-center mb-4 mt-12 lg:mb-6">
                    <span className="text-lg lg:text-xl font-bold text-yellow-300 uppercase tracking-wide">+ Founding 100 Bonuses</span>
                  </li>
                       
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">🎁</span>
                    <span><span style={{ fontWeight: 'bold' }}>Additional 25 stickers for your first month</span></span>
                  </li>

                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>

                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">💎</span>
                    <span><span style={{ fontWeight: 'bold' }}>Exclusive Founding Member Sticker Pack</span></span>
                  </li>

                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">📖</span>
                    <span><span style={{ fontWeight: 'bold' }}>FREE 30-Day Small Business Challenge</span></span>
                  </li>
                  
                  {/* Divider */}
                  <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  

                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">🗺️</span>
                    <span><span style={{ fontWeight: 'bold' }}>FREE Roadmap to Your First 100 Sales</span></span>
                  </li>
                                    {/* Divider */}
                                    <div className="flex justify-center">
                    <div className="w-32 lg:w-64 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30"></div>
                  </div>
                  <li className="flex items-center justify-center">
                    <span className="text-xl lg:text-2xl mr-3 lg:mr-4 flex-shrink-0">🎨</span>
                    <span><span style={{ fontWeight: 'bold' }}>150+ Exclusive Customizable Designs</span></span>
                  </li>
                </ul>
              </div>
              
              {/* Trusted Brands Section */}
              <div className="mt-12 lg:mt-16">
                <div className="flex justify-center mb-8 lg:mb-12">
                  <div 
                    className="px-4 lg:px-6 py-1.5 lg:py-2 rounded-full text-center text-sm lg:text-base text-gray-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    Brands we print for:
                  </div>
                </div>
                <div className="relative overflow-hidden">
                  <div 
                    className="flex gap-4 lg:gap-6 animate-scroll"
                    style={{
                      animation: 'scroll 35s linear infinite',
                      width: 'max-content'
                    }}
                  >
                    {/* First set of brands */}
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" width={120} height={80} className="h-20 w-auto brand-float-1" priority />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" width={120} height={80} className="h-20 w-auto brand-float-2" priority />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" width={120} height={80} className="h-20 w-auto brand-float-3" priority />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" width={120} height={80} className="h-20 w-auto brand-float-4" priority />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" width={120} height={80} className="h-20 w-auto brand-float-5" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751505017/StickerShuttle_HarryPotter_zlrki5.png" alt="Harry Potter" width={120} height={80} className="h-20 w-auto brand-float-6" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751396878/CanAmIcon_o3tydg.png" alt="Can-Am" width={96} height={64} className="h-16 w-auto brand-float-1" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" width={120} height={80} className="h-20 w-auto brand-float-2" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" width={120} height={80} className="h-20 w-auto brand-float-3" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" width={120} height={80} className="h-20 w-auto brand-float-4" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" width={120} height={80} className="h-20 w-auto brand-float-5" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" width={120} height={80} className="h-20 w-auto brand-float-6" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" width={120} height={80} className="h-20 w-auto brand-float-1" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" width={120} height={80} className="h-20 w-auto brand-float-2" />
                    
                    {/* Duplicate set for seamless loop */}
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593661/StickerShuttle_Brands_AndHealth_bawirz.png" alt="AndHealth" width={120} height={80} className="h-20 w-auto brand-float-1" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593675/Wahl-Icon-Web_tq0jqm.webp" alt="Wahl" width={120} height={80} className="h-20 w-auto brand-float-2" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593600/Amazon-Go_by2gkb.png" alt="Amazon" width={120} height={80} className="h-20 w-auto brand-float-3" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593604/ChickFilA-Icon-Web_anobg1.png" alt="Chick-fil-A" width={120} height={80} className="h-20 w-auto brand-float-4" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_Nike_gmedyb.png" alt="Nike" width={120} height={80} className="h-20 w-auto brand-float-5" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751505017/StickerShuttle_HarryPotter_zlrki5.png" alt="Harry Potter" width={120} height={80} className="h-20 w-auto brand-float-6" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751396878/CanAmIcon_o3tydg.png" alt="Can-Am" width={96} height={64} className="h-16 w-auto brand-float-1" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593671/StickerShuttle_Brands_XFinity_nz2obt.png" alt="Xfinity" width={120} height={80} className="h-20 w-auto brand-float-2" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_Valhallan_cxjhgn.png" alt="Valhallan" width={120} height={80} className="h-20 w-auto brand-float-3" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593665/StickerShuttle_Brands_SSPR_ewqax7.png" alt="SSPR" width={120} height={80} className="h-20 w-auto brand-float-4" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593662/StickerShuttle_Brands_CGR_ryewlb.png" alt="CGR" width={120} height={80} className="h-20 w-auto brand-float-5" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593669/StickerShuttle_Brands_WF_vrafue.png" alt="WF" width={120} height={80} className="h-20 w-auto brand-float-6" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593666/StickerShuttle_Brands_UnoMas_ntorew.png" alt="UnoMas" width={120} height={80} className="h-20 w-auto brand-float-1" />
                    <Image src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593610/LT-Icon_llqxai.png" alt="LT" width={120} height={80} className="h-20 w-auto brand-float-2" />
                  </div>
                  
                  {/* Fade effects */}
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#030140] to-transparent pointer-events-none"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#030140] to-transparent pointer-events-none"></div>
                </div>
              </div>
              
              {/* Pricing Selection */}
              <div className="mt-16 lg:mt-20 max-w-4xl lg:max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-8 lg:mb-12">
                  {/* Pro Monthly */}
                  <div 
                    className={`p-8 lg:p-10 rounded-2xl lg:rounded-3xl text-center cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-md ${
                      selectedPlan === 'monthly'
                        ? 'bg-blue-500/20 text-blue-200 font-medium button-selected animate-glow-blue'
                        : 'border-2 border-dashed border-blue-400/50 opacity-65 hover:border-blue-400/70 hover:bg-white/5 hover:opacity-80 text-white/70'
                    }`}
                    style={{
                      border: selectedPlan === 'monthly' ? '1.5px solid rgba(59, 130, 246, 0.5)' : undefined
                    }}
                    onClick={() => setSelectedPlan('monthly')}>
                    <div className="flex items-start justify-center gap-2 lg:gap-3 mb-4 lg:mb-6">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                        alt="Sticker Shuttle Pro Logo" 
                        className="h-8 lg:h-10 w-auto object-contain"
                      />
                      <span className="text-2xl lg:text-3xl font-bold -mt-1">Monthly</span>
                    </div>
                    <div className="text-4xl lg:text-5xl font-bold mb-2 lg:mb-3" style={{ fontFamily: 'Rubik, sans-serif' }}>$39</div>
                    <div className="text-sm lg:text-base">per month</div>
                  </div>
                  
                  {/* Pro Annual */}
                  <div 
                    className={`p-8 lg:p-10 rounded-2xl lg:rounded-3xl text-center cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-md ${
                      selectedPlan === 'annual'
                        ? 'bg-blue-500/20 text-blue-200 font-medium button-selected animate-glow-blue'
                        : 'border-2 border-dashed border-blue-400/50 opacity-65 hover:border-blue-400/70 hover:bg-white/5 hover:opacity-80 text-white/70'
                    }`}
                    style={{
                      border: selectedPlan === 'annual' ? '1.5px solid rgba(59, 130, 246, 0.5)' : undefined
                    }}
                    onClick={() => setSelectedPlan('annual')}>
                    {selectedPlan === 'annual' && (
                      <div className="inline-flex items-center px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium text-blue-300 mb-4 lg:mb-6"
                           style={{
                             background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                             backdropFilter: 'blur(25px) saturate(180%)',
                             border: '1px solid rgba(59, 130, 246, 0.4)'
                           }}>
                        Best Value
                      </div>
                    )}
                    <div className="flex items-start justify-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                        alt="Sticker Shuttle Pro Logo" 
                        className="h-8 lg:h-10 w-auto object-contain"
                      />
                      <span className="text-2xl lg:text-3xl font-bold -mt-1">Annual</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 lg:gap-4 mb-2 lg:mb-3">
                      <div className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: 'Rubik, sans-serif' }}>$347</div>
                      <div className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-bold text-white"
                           style={{
                             background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)',
                             backdropFilter: 'blur(25px) saturate(180%)',
                             border: '1px solid rgba(239, 68, 68, 0.4)',
                             boxShadow: 'rgba(239, 68, 68, 0.3) 0px 4px 16px'
                           }}>
                        Save $121
                      </div>
                    </div>
                    <div className="flex justify-center mb-2 lg:mb-3">
                      <div className="text-sm lg:text-base font-bold tracking-widest"
                           style={{
                             background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 50%, #FF8F00 100%)',
                             WebkitBackgroundClip: 'text',
                             WebkitTextFillColor: 'transparent',
                             backgroundClip: 'text'
                           }}>
                        FOUNDING MEMBER SPECIAL
                      </div>
                    </div>
                    <div className={`${selectedPlan === 'annual' ? 'text-blue-200' : 'text-gray-300'} text-sm lg:text-base`}>
                      <span className="line-through text-gray-500 mr-2">(originally $468)</span>
                    </div>
                  </div>
                </div>
                
                {/* Join Pro Button */}
                <div className="flex justify-center">
                  <Link href={`/pro/join?plan=${selectedPlan}`}>
                    <button className="px-12 py-5 lg:px-16 lg:py-7 rounded-xl lg:rounded-2xl text-xl lg:text-2xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:translate-y-[-2px] flex items-center gap-3 lg:gap-4 animate-pulse-subtle button-gradient"
                          style={{
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(61, 209, 249, 0.4)',
                            boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          }}>
                      Join Pro
                      <ArrowRight className="w-6 h-6 lg:w-7 lg:h-7 transition-transform duration-300 hover:translate-x-1" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* FAQ Section */}
        <div className="py-0" style={{ backgroundColor: '#030140' }}>
          <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#030140' }}>
                         <div className="text-center mb-8 lg:mb-12">
               <div className="flex justify-center mb-6 lg:mb-8">
                 <img 
                   src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755794735/faq_wbkcw7.png" 
                   alt="Frequently Asked Questions" 
                   className="h-16 lg:h-20 w-auto object-contain"
                 />
               </div>
             </div>
            
            <div className="space-y-6 lg:space-y-8" style={{ backgroundColor: '#030140' }}>
              {[
                {
                  question: "Do you design the stickers for me?",
                  answer: "No, you upload your own designs, logo, whatever you want and we ship it to you monthly. You can change your design within a specific window."
                },
                {
                  question: "How do the 100 monthly stickers work?",
                  answer: "Every month, you'll receive 100 custom premium vinyl stickers. You have the option to change the designs within a dedicated window. These are high-quality, weather-resistant stickers perfect for any use."
                },
                {
                  question: "Is the 2-day shipping really free?",
                  answer: "Yes! All Pro members get completely free 2-day air shipping on all custom orders, no minimum purchase required. This alone saves most members $15+ per order. *Doesn't include the 100 monthly stickers."
                },
                {
                  question: "Can I cancel anytime?",
                  answer: "Absolutely. You can cancel your Pro membership at any time with no cancellation fees. Your benefits continue until the end of your current billing period."
                },
                {
                  question: "How does priority printing work?",
                  answer: "Pro member orders are moved to the front of our production queue, meaning faster turnaround times on all your custom sticker orders. Normally within 24 hours."
                },
                {
                  question: "What's included in exclusive text support?",
                  answer: "Pro members get a direct SMS line to our support team for faster response times and personalized assistance with orders and design questions. We're here to help!"
                }
              ].map((faq, index) => (
                <div key={index} className="flex gap-3 lg:gap-4">
                  {/* Question Bubble */}
                  <div className="flex-shrink-0">
                    <img 
                      src={[
                        "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390217/StickerShuttle_Avatar4_ozomh4.png",
                        "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar3_ybu1x4.png",
                        "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar2_iflxh7.png",
                        "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar1_dmnkat.png"
                      ][index % 4]}
                      alt="User Avatar" 
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="bg-blue-500/20 rounded-2xl lg:rounded-3xl rounded-tl-md px-4 lg:px-6 pt-4 lg:pt-5 pb-3 lg:pb-4 mb-4 lg:mb-5"
                         style={{
                           border: '1px solid rgba(59, 130, 246, 0.3)',
                           boxShadow: 'rgba(59, 130, 246, 0.2) 0px 4px 16px'
                         }}>
                      <h3 className="text-lg lg:text-xl font-semibold text-white">{faq.question}</h3>
                    </div>
                    
                    {/* Answer Bubble */}
                    <div className="flex gap-3 lg:gap-4">
                      <div className="flex-shrink-0">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591685/Candy_Gradient_-_Circle_Peel_-_SA_o742cg.png" 
                          alt="Sticker Shuttle Avatar" 
                          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-700/30 rounded-2xl lg:rounded-3xl rounded-tl-md p-4 lg:p-6"
                             style={{
                               border: '1px solid rgba(255, 255, 255, 0.1)',
                               boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 16px'
                             }}>
                          <p className="text-gray-200 text-base lg:text-lg">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Join Pro Button */}
            <div className="flex justify-center mt-12 lg:mt-16 mb-16 lg:mb-20">
              <Link href={`/pro/join?plan=${selectedPlan}`}>
                <button className="px-12 py-5 lg:px-16 lg:py-7 rounded-xl lg:rounded-2xl text-xl lg:text-2xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:translate-y-[-2px] flex items-center gap-3 lg:gap-4 animate-pulse-subtle button-gradient"
                      style={{
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(61, 209, 249, 0.4)',
                        boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}>
                  Join Pro
                  <ArrowRight className="w-6 h-6 lg:w-7 lg:h-7 transition-transform duration-300 hover:translate-x-1" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <UniversalFooter />
        </div>
      </div>

      {/* Custom CSS for infinite scroll animation */}
      <style jsx global>{`
        body {
          background-color: #030140 !important;
        }
        html {
          background-color: #030140 !important;
        }
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        /* Floating animations for brand icons */
        @keyframes float1 {
          0%, 100% {
            transform: translateY(0px) rotate(-3deg);
          }
          25% {
            transform: translateY(-3px) rotate(4.5deg);
          }
          50% {
            transform: translateY(-6px) rotate(-5deg);
          }
          75% {
            transform: translateY(-2px) rotate(3.8deg);
          }
        }
        
        @keyframes float2 {
          0%, 100% {
            transform: translateY(0px) rotate(2.5deg);
          }
          30% {
            transform: translateY(-4px) rotate(-4.8deg);
          }
          60% {
            transform: translateY(-2px) rotate(5.5deg);
          }
          90% {
            transform: translateY(-5px) rotate(-3.2deg);
          }
        }
        
        @keyframes float3 {
          0%, 100% {
            transform: translateY(0px) rotate(-2deg);
          }
          20% {
            transform: translateY(-2px) rotate(4.5deg);
          }
          40% {
            transform: translateY(-5px) rotate(-5.5deg);
          }
          60% {
            transform: translateY(-4px) rotate(3.8deg);
          }
          80% {
            transform: translateY(-3px) rotate(-2.8deg);
          }
        }
        
        @keyframes float4 {
          0%, 100% {
            transform: translateY(0px) rotate(4deg);
          }
          25% {
            transform: translateY(-3px) rotate(-5.2deg);
          }
          50% {
            transform: translateY(-6px) rotate(6deg);
          }
          75% {
            transform: translateY(-1px) rotate(-3.8deg);
          }
        }
        
        @keyframes float5 {
          0%, 100% {
            transform: translateY(0px) rotate(-3.5deg);
          }
          30% {
            transform: translateY(-4px) rotate(5.2deg);
          }
          60% {
            transform: translateY(-2px) rotate(-4.8deg);
          }
          85% {
            transform: translateY(-5px) rotate(2.8deg);
          }
        }
        
        @keyframes float6 {
          0%, 100% {
            transform: translateY(0px) rotate(3.2deg);
          }
          35% {
            transform: translateY(-3px) rotate(-5.8deg);
          }
          65% {
            transform: translateY(-4px) rotate(4.8deg);
          }
          85% {
            transform: translateY(-2px) rotate(-2.8deg);
          }
        }
        
        /* Brand floating classes */
        .brand-float-1 {
          animation: float1 8s ease-in-out infinite;
        }
        
        .brand-float-2 {
          animation: float2 9s ease-in-out infinite;
        }
        
        .brand-float-3 {
          animation: float3 7s ease-in-out infinite;
        }
        
        .brand-float-4 {
          animation: float4 10s ease-in-out infinite;
        }
        
        .brand-float-5 {
          animation: float5 8.5s ease-in-out infinite;
        }
        
        .brand-float-6 {
          animation: float6 9.5s ease-in-out infinite;
        }
        
        /* Subtle pulse animation for button */
        @keyframes pulse-subtle {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.95;
          }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
        
        /* Blue glow animation for selected cards */
        @keyframes glow-blue {
          0%, 100% {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.2), 0 0 10px rgba(59, 130, 246, 0.1), 0 0 15px rgba(59, 130, 246, 0.05);
          }
          50% {
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2), 0 0 30px rgba(59, 130, 246, 0.1);
          }
        }
        
        .animate-glow-blue {
          animation: glow-blue 2s ease-in-out infinite;
        }
        
        /* Moving gradient animation for Pro text */
        @keyframes gradient-move {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .pro-gradient {
          background: linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9);
          background-size: 300% 300%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-move 3s ease-in-out infinite;
        }
        
        .button-gradient {
          background: linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9);
          background-size: 300% 300%;
          animation: gradient-move 3s ease-in-out infinite;
          font-family: 'Rubik', sans-serif;
          font-weight: bold;
        }
      `}</style>
    </>
  );
};

export default StickerShuttlePro;
