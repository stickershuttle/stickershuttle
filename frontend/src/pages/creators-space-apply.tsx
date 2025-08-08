import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

export default function CreatorsSpaceApply() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [form, setForm] = useState({
    name: '',
    email: '',
    portfolio: '',
    instagram: '',
    tiktok: '',
    audience: '',
    category: 'illustration',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    const composed = `Creators Space Application\n\n` +
      `Name: ${form.name}\n` +
      `Email: ${form.email}\n` +
      `Portfolio: ${form.portfolio}\n` +
      `Instagram: ${form.instagram}\n` +
      `TikTok: ${form.tiktok}\n` +
      `Audience Size: ${form.audience}\n` +
      `Primary Category: ${form.category}\n\n` +
      `About You / Why You Want a Space:\n${form.message}`;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: 'creators-space-application',
          message: composed
        })
      });

      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', portfolio: '', instagram: '', tiktok: '', audience: '', category: 'illustration', message: '' });
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
    backdropFilter: 'blur(12px)'
  };

  const buttonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
    backdropFilter: 'blur(25px) saturate(180%)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
  };

  return (
    <Layout
      title="Creators Space – Apply for a Space"
      description="Collaborate with Sticker Shuttle. We print, pack and ship. You create and earn. Transparent $2/sticker production cost. Apply for your space."
      canonical="https://stickershuttle.com/creators-space-apply"
    >
      {/* Hero */}
      <section className="pt-6 pb-2 md:pt-8 md:pb-4">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="rounded-2xl p-0 text-center relative overflow-hidden min-h-[300px] md:min-h-[320px]">
            {/* Background banner (match homepage) */}
            <div className="absolute inset-0 hero-creators-banner" />
            {/* Overlay gradient */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 46, 0.75) 0%, rgba(26, 26, 74, 0.65) 35%, rgba(45, 27, 107, 0.6) 65%, rgba(124, 58, 237, 0.45) 100%)'
            }} />

            <div className="relative z-10 max-w-4xl mx-auto py-8 md:py-10 px-6">
              <div className="flex items-center justify-center mb-3 md:mb-4">
                <img
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1754416141/CreatorsSpaceWhite_ebiqt3.svg"
                  alt="Creators Space"
                  className="h-16 md:h-24 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
                />
              </div>

              <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-8">
              <b>Your job:</b> Sell stickers. <br /><b>Our job:</b> Everything else.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#apply" className="px-8 py-4 rounded-lg font-bold text-white transition-all duration-300 hover:scale-105 inline-block" style={buttonStyle}>
                  Apply for a Space
                </a>
                <Link href="/marketplace" className="px-8 py-4 rounded-lg font-semibold text-white/90 border border-white/20 hover:bg-white/10 transition-all duration-300 inline-block">
                  Explore the Marketplace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive hero background (same as homepage) */}
      <style jsx>{`
        .hero-creators-banner {
          background-image: url('https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751994147/StickerShuttle_Banner_MainMobile_a93h3q.png');
          background-size: cover;
          background-position: center bottom;
          background-repeat: no-repeat;
        }
        @media (min-width: 768px) {
          .hero-creators-banner {
            background-image: url('https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751382016/StickerShuttle_Banner_Main_nlzoro.png');
          }
        }
      `}</style>

      {/* How it Works - Modern Timeline */}
      <section className="pt-2 md:pt-4 pb-10 md:pb-12 relative overflow-hidden">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-gray-400 text-lg">Your journey from creator to entrepreneur in 4 simple steps</p>
          </div>
          
          {/* Desktop Timeline */}
          <div className="hidden md:grid md:grid-cols-4 gap-6 relative">
            {/* Connecting Line */}
            <div className="absolute top-12 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-blue-500/20 via-purple-500/40 to-purple-500/20"></div>
            
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 relative z-10" style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '2px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
                }}>
                  <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Step 1</span>
                <h3 className="text-xl font-bold mb-2">Become a creator.</h3>
                <p className="text-gray-400 text-sm text-center">Share your creative vision and tell us about your audience. We're being selective on who we work with at first.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 relative z-10" style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
                  border: '2px solid rgba(6, 182, 212, 0.4)',
                  boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)'
                }}>
                  <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Step 2</span>
                <h3 className="text-xl font-bold mb-2">Send us your designs.</h3>
                <p className="text-gray-400 text-sm text-center">Submit your designs and we'll handle all the technical prep. Upload it to our platform, prep it for print, send you a proof, etc.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 relative z-10" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
                }}>
                  <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Step 3</span>
                <h3 className="text-xl font-bold mb-2">We do everything else.</h3>
                <p className="text-gray-400 text-sm text-center">We print, laminate, cut, pack, and ship stickers of your designs to your customers. Straight from the source. All orders shipped same-day*.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 relative z-10" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  border: '2px solid rgba(168, 85, 247, 0.4)',
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)'
                }}>
                  <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Step 4</span>
                <h3 className="text-xl font-bold mb-2">You make bank.</h3>
                <p className="text-gray-400 text-sm text-center">We charge $2 per sticker, and you keep the rest. We handle the stuff you don't want to do—printing, packing and delivery. Get paid weekly, monthly, or quarterly.</p>
              </div>
            </div>
          </div>

          {/* Mobile Timeline */}
          <div className="md:hidden space-y-6">
            {[
              { step: 1, color: 'blue', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', title: 'Apply', desc: 'Share your creative vision and tell us about your audience' },
              { step: 2, color: 'cyan', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', title: 'Upload', desc: 'Submit your designs and we\'ll handle all the technical prep' },
              { step: 3, color: 'emerald', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', title: 'We Fulfill', desc: 'Professional printing, cutting, and shipping handled for you' },
              { step: 4, color: 'purple', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'You Earn', desc: 'Set your prices and receive regular payouts' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-${item.color}-500/10 border-2 border-${item.color}-500/40`}>
                    <svg className={`w-8 h-8 text-${item.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={item.icon}/>
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <span className={`text-xs font-bold text-${item.color}-400 uppercase tracking-wider`}>Step {item.step}</span>
                  <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Creators Space */}
      <section className="py-6">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold">Why Creators Love This</h2>
            <p className="text-gray-300 mt-2">A beautiful, hands-off way to launch your sticker line.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-6" style={containerStyle}>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zM6 22v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Zero Inventory</h3>
              <p className="text-gray-300 text-sm">No minimums. We print on demand and ship direct to your customers.</p>
            </div>
            <div className="rounded-2xl p-6" style={containerStyle}>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v8m-4-4h8M4 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8-8-3.582-8-8z"/></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Simple Earnings</h3>
              <p className="text-gray-300 text-sm">Set your price. We handle the rest—printing, packing and delivery.</p>
            </div>
            <div className="rounded-2xl p-6" style={containerStyle}>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Pro Quality</h3>
              <p className="text-gray-300 text-sm">Outdoor-rated vinyl, premium laminate and precision die-cut.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-6">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-4">
            {[{
              name: 'Certified Garbage Rat',
              avatar: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601651/unnamed_1_100x100_crop_center_ozo8lq.webp',
              text: 'Speed and quality blew us away. Switching to Sticker Shuttle was a game changer.'
            },{
              name: 'Panda Reaper',
              avatar: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601649/download_1_100x100_crop_center_z69tdh.avif',
              text: 'Great quality. No blurriness. We’ll be sticking with this for future drops.'
            },{
              name: 'Rach Plants',
              avatar: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749601644/111_100x100_crop_center_ubs7st.avif',
              text: 'Beautiful work, attention to detail, and communication. 10/10!'
            }].map((r, i) => (
              <div key={i} className="rounded-2xl p-6" style={containerStyle}>
                <div className="flex items-center mb-3">
                  <img src={r.avatar} alt={r.name} className="w-10 h-10 rounded-full mr-3" />
                  <div className="ml-auto flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                  </div>
                </div>
                <p className="text-white font-semibold text-sm mb-1">{r.name}</p>
                <p className="text-gray-300 text-sm">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Creators Choose Us */}
      <section className="py-6">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-6" style={containerStyle}>
              <h3 className="text-lg font-semibold mb-1">Pro Quality</h3>
              <p className="text-gray-300 text-sm">Outdoor-rated vinyl, rich color, precision die-cutting—premium every time.</p>
            </div>
            <div className="rounded-2xl p-6" style={containerStyle}>
              <h3 className="text-lg font-semibold mb-1">Hands-off Fulfillment</h3>
              <p className="text-gray-300 text-sm">We handle proofs, printing, shipping, and support so you can focus on growth.</p>
            </div>
            <div className="rounded-2xl p-6" style={containerStyle}>
              <h3 className="text-lg font-semibold mb-1">Fast Payouts</h3>
              <p className="text-gray-300 text-sm">Simple revenue math: your price minus $2. Payouts on a predictable schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-10">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="rounded-2xl p-8 md:p-10 relative overflow-hidden" style={containerStyle}>
            {/* Decorative stars */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-6 left-8 text-yellow-400 text-lg">⭐</div>
              <div className="absolute top-4 left-1/4 text-white text-sm">✨</div>
              <div className="absolute top-8 right-1/4 text-purple-400 text-base">⭐</div>
              <div className="absolute top-6 right-8 text-blue-400 text-sm">✨</div>
            </div>
            <div className="mb-6 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Apply for a Space</h2>
              <p className="text-gray-300">Tell us about you and your work. We review applications within 2–3 business days.</p>
            </div>

            {status === 'success' && (
              <div className="mb-6 p-4 rounded-lg border text-green-300" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)' }}>
                Application received! We'll email you shortly.
              </div>
            )}
            {status === 'error' && (
              <div className="mb-6 p-4 rounded-lg border text-red-300" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}>
                Something went wrong. Please try again.
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={containerStyle}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={containerStyle}
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Portfolio / Website</label>
                <input
                  type="url"
                  name="portfolio"
                  value={form.portfolio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={containerStyle}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Instagram Handle</label>
                <input
                  type="text"
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={containerStyle}
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">TikTok Handle</label>
                <input
                  type="text"
                  name="tiktok"
                  value={form.tiktok}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={containerStyle}
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Audience Size</label>
                <input
                  type="text"
                  name="audience"
                  value={form.audience}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={containerStyle}
                  placeholder="e.g. 25,000"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">Primary Category</label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={containerStyle}
                >
                  <option value="illustration" className="bg-gray-800">Illustration</option>
                  <option value="digital-art" className="bg-gray-800">Digital Art</option>
                  <option value="photography" className="bg-gray-800">Photography</option>
                  <option value="lettering" className="bg-gray-800">Lettering / Typography</option>
                  <option value="other" className="bg-gray-800">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">About You / Why You Want a Space *</label>
                <textarea
                  required
                  name="message"
                  rows={6}
                  value={form.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  style={containerStyle}
                  placeholder="A few sentences about your work, audience, and what you want to sell."
                />
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 rounded-lg font-bold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={buttonStyle}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Application'}
                </button>
                <p className="text-gray-400 text-xs">By applying, you agree to our terms and creator guidelines.</p>
              </div>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
}


