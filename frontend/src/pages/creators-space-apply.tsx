import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

export default function CreatorsSpaceApply() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedSizes, setSelectedSizes] = useState<{[key: string]: string}>({
    '1': '4"',
    '5': '4"', 
    '10': '4"',
    '25': '4"'
  });
  const [form, setForm] = useState({
    name: '',
    email: '',
    portfolio: '',
    socialMedia: 'instagram',
    socialMediaHandle: '',
    audience: '',
    experience: '',
    contentType: '',
    categories: [] as string[],
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
      `Instagram: ${form.socialMediaHandle}\n` +
      `Audience Size: ${form.audience}\n` +
      `Primary Category: ${form.categories.join(', ')}\n\n` +
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
        setForm({
          name: '',
          email: '',
          portfolio: '',
          socialMedia: 'instagram',
          socialMediaHandle: '',
          audience: '',
          experience: '',
          contentType: '',
          categories: [],
          message: ''
        });
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

  // Helper functions for pricing and calculations
  const getActualPrice = (quantity: number, size: string) => {
    const pricingTable = {
      '3"': {
        1: 3.99,
        5: 9.98,
        10: 15.96,
        25: 29.93
      },
      '4"': {
        1: 4.99,
        5: 12.48,
        10: 19.96,
        25: 37.43
      },
      '5"': {
        1: 5.99,
        5: 14.98,
        10: 23.96,
        25: 44.92
      }
    };

    const sizeTable = pricingTable[size as keyof typeof pricingTable] || pricingTable['4"'];
    return sizeTable[quantity as keyof typeof sizeTable] || sizeTable[1] * quantity;
  };

  const calculateCosts = (quantity: number, totalRevenue: number) => {
    let materialShippingCost: number;
    let stickerCost = quantity * 0.40;
    let fulfillmentCost: number;

    if (quantity === 1) {
      materialShippingCost = 1.35;
      fulfillmentCost = 0.25;
    } else if (quantity <= 5) {
      materialShippingCost = 1.46;
      fulfillmentCost = 0.26;
    } else if (quantity <= 10) {
      materialShippingCost = 1.61;
      fulfillmentCost = 0.27;
    } else if (quantity <= 25) {
      materialShippingCost = 5.45;
      fulfillmentCost = 0.30;
    } else {
      materialShippingCost = 5.45;
      fulfillmentCost = 0.30;
    }

    const stripeFee = totalRevenue > 0 ? (totalRevenue * 0.029) + 0.30 : 0;
    const totalCosts = materialShippingCost + stickerCost + fulfillmentCost + stripeFee;
    
    return {
      materialShippingCost,
      stickerCost,
      fulfillmentCost,
      stripeFee,
      totalCosts
    };
  };

  const calculateProfit = (quantity: number, size: string) => {
    const totalRevenue = getActualPrice(quantity, size);
    const costs = calculateCosts(quantity, totalRevenue);
    return totalRevenue - costs.totalCosts;
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
          {/* Logo and text hidden */}
        </div>
      </section>

      {/* Cost Structure & Earnings Calculator */}
      <section className="py-0">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div className="rounded-2xl p-8" style={containerStyle}>
            {/* Timeline */}
            <div className="mb-8">
              {/* Desktop Timeline */}
              <div className="hidden md:grid md:grid-cols-4 gap-6 relative mb-6">
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
                    <p className="text-gray-400 text-sm text-center">Apply below and share your creative vision/tell us about your audience. We're being selective on who we work with at first.</p>
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
                    <p className="text-gray-400 text-sm text-center">If approved, we'll handle all the technical prep. We'll upload it to your Space, send you a proof, etc. You just need to place an order for a minimum of 15 stickers.</p>
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
                    <p className="text-gray-400 text-sm text-center">All pricing and profit margins are below... We handle the stuff you don't want to do—printing, packing, support, and delivery.</p>
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

            {/* Average Profit Margin */}
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm font-medium text-purple-300">Average Profit Margin</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-200">
                    {(() => {
                      // Calculate average across ALL possible combinations (4 quantities × 3 sizes = 12 total)
                      const allPossibleCombinations = [
                        { qty: 1, size: '3"' },
                        { qty: 1, size: '4"' },
                        { qty: 1, size: '5"' },
                        { qty: 5, size: '3"' },
                        { qty: 5, size: '4"' },
                        { qty: 5, size: '5"' },
                        { qty: 10, size: '3"' },
                        { qty: 10, size: '4"' },
                        { qty: 10, size: '5"' },
                        { qty: 25, size: '3"' },
                        { qty: 25, size: '4"' },
                        { qty: 25, size: '5"' }
                      ];
                      
                      let totalProfitMargin = 0;
                      let combinationCount = 0;
                      
                      allPossibleCombinations.forEach(({ qty, size }) => {
                        const revenue = getActualPrice(qty, size);
                        const profit = calculateProfit(qty, size);
                        const profitMargin = (profit / revenue) * 100;
                        totalProfitMargin += profitMargin;
                        combinationCount++;
                      });
                      
                      return (totalProfitMargin / combinationCount).toFixed(0);
                    })()}%
                  </div>
                  <div className="text-xs text-purple-300">Across all 12 size/quantity combinations</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* 1 Sticker */}
              <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                <div className="text-lg font-bold text-white mb-2">1 Sticker</div>
                <div className="text-xs text-blue-300 mb-2">Shipped with USPS Stamp (No Tracking)</div>
                <div className="text-xs text-gray-400 space-y-1 mb-3">
                  <div>Material & Shipping: $1.35</div>
                  <div>Sticker Cost: $0.40/ea × 1</div>
                  <div>Fulfillment: $0.25</div>
                  <div>Stripe Fee: ${calculateCosts(1, getActualPrice(1, selectedSizes['1'])).stripeFee.toFixed(2)}</div>
                  <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(1, getActualPrice(1, selectedSizes['1'])).totalCosts.toFixed(2)}</div>
                </div>
                
                {/* Size selections */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { size: '3"', price: 3.99 },
                      { size: '4"', price: 4.99 },
                      { size: '5"', price: 5.99 }
                    ].map(({ size, price }) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSizes(prev => ({ ...prev, '1': size }))}
                        className={`p-2 rounded text-center transition-all duration-200 border ${
                          selectedSizes['1'] === size
                            ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                            : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-medium">{size}</div>
                        <div className="text-xs text-green-300">${price}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Earnings calculation */}
                  <div className="pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Revenue ({selectedSizes['1']}):</span>
                        <span className="text-green-300">${getActualPrice(1, selectedSizes['1']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost to Fulfill:</span>
                        <span className="text-red-300">-${calculateCosts(1, getActualPrice(1, selectedSizes['1'])).totalCosts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Your Earnings:</span>
                        <span className="text-green-400">+${calculateProfit(1, selectedSizes['1']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Your Profit %:</span>
                        <span className="text-blue-300">{((calculateProfit(1, selectedSizes['1']) / getActualPrice(1, selectedSizes['1'])) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 5 Stickers */}
              <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                <div className="text-lg font-bold text-white mb-2">5 Stickers</div>
                <div className="text-xs text-blue-300 mb-2">Shipped with USPS Stamp (No Tracking)</div>
                <div className="text-xs text-gray-400 space-y-1 mb-3">
                  <div>Material & Shipping: $1.46</div>
                  <div>Sticker Cost: $0.40/ea × 5</div>
                  <div>Fulfillment: $0.26</div>
                  <div>Stripe Fee: ${calculateCosts(5, getActualPrice(5, selectedSizes['5'])).stripeFee.toFixed(2)}</div>
                  <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(5, getActualPrice(5, selectedSizes['5'])).totalCosts.toFixed(2)}</div>
                </div>
                
                {/* Size selections */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { size: '3"', price: 9.98 },
                      { size: '4"', price: 12.48 },
                      { size: '5"', price: 14.98 }
                    ].map(({ size, price }) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSizes(prev => ({ ...prev, '5': size }))}
                        className={`p-2 rounded text-center transition-all duration-200 border ${
                          selectedSizes['5'] === size
                            ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                            : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-medium">{size}</div>
                        <div className="text-xs text-green-300">${price}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Earnings calculation */}
                  <div className="pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Revenue ({selectedSizes['5']}):</span>
                        <span className="text-green-300">${getActualPrice(5, selectedSizes['5']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost to Fulfill:</span>
                        <span className="text-red-300">-${calculateCosts(5, getActualPrice(5, selectedSizes['5'])).totalCosts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Your Earnings:</span>
                        <span className="text-green-400">+${calculateProfit(5, selectedSizes['5']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Your Profit %:</span>
                        <span className="text-blue-300">{((calculateProfit(5, selectedSizes['5']) / getActualPrice(5, selectedSizes['5'])) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 10 Stickers */}
              <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                <div className="text-lg font-bold text-white mb-2">10 Stickers</div>
                <div className="text-xs text-blue-300 mb-2">Shipped with USPS Stamp (No Tracking)</div>
                <div className="text-xs text-gray-400 space-y-1 mb-3">
                  <div>Material & Shipping: $1.61</div>
                  <div>Sticker Cost: $0.40/ea × 10</div>
                  <div>Fulfillment: $0.27</div>
                  <div>Stripe Fee: ${calculateCosts(10, getActualPrice(10, selectedSizes['10'])).stripeFee.toFixed(2)}</div>
                  <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(10, getActualPrice(10, selectedSizes['10'])).totalCosts.toFixed(2)}</div>
                </div>
                
                {/* Size selections */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { size: '3"', price: 15.96 },
                      { size: '4"', price: 19.96 },
                      { size: '5"', price: 23.96 }
                    ].map(({ size, price }) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSizes(prev => ({ ...prev, '10': size }))}
                        className={`p-2 rounded text-center transition-all duration-200 border ${
                          selectedSizes['10'] === size
                            ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                            : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-medium">{size}</div>
                        <div className="text-xs text-green-300">${price}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Earnings calculation */}
                  <div className="pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Revenue ({selectedSizes['10']}):</span>
                        <span className="text-green-300">${getActualPrice(10, selectedSizes['10']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost to Fulfill:</span>
                        <span className="text-red-300">-${calculateCosts(10, getActualPrice(10, selectedSizes['10'])).totalCosts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Your Earnings:</span>
                        <span className="text-green-400">+${calculateProfit(10, selectedSizes['10']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Your Profit %:</span>
                        <span className="text-blue-300">{((calculateProfit(10, selectedSizes['10']) / getActualPrice(10, selectedSizes['10'])) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 25 Stickers */}
              <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                <div className="text-lg font-bold text-white mb-2">25 Stickers</div>
                <div className="text-xs text-green-300 mb-2">Shipped with USPS (Includes Tracking)</div>
                <div className="text-xs text-gray-400 space-y-1 mb-3">
                  <div>Material & Shipping: $5.45</div>
                  <div>Sticker Cost: $0.40/ea × 25</div>
                  <div>Fulfillment: $0.30</div>
                  <div>Stripe Fee: ${calculateCosts(25, getActualPrice(25, selectedSizes['25'])).stripeFee.toFixed(2)}</div>
                  <div className="font-medium text-red-300 border-t border-gray-600 pt-1">Cost to Fulfill: ${calculateCosts(25, getActualPrice(25, selectedSizes['25'])).totalCosts.toFixed(2)}</div>
                </div>
                
                {/* Size selections */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-purple-300">Select Size & Price:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { size: '3"', price: 29.93 },
                      { size: '4"', price: 37.43 },
                      { size: '5"', price: 44.92 }
                    ].map(({ size, price }) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSizes(prev => ({ ...prev, '25': size }))}
                        className={`p-2 rounded text-center transition-all duration-200 border ${
                          selectedSizes['25'] === size
                            ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                            : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-medium">{size}</div>
                        <div className="text-xs text-green-300">${price}</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Earnings calculation */}
                  <div className="pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Revenue ({selectedSizes['25']}):</span>
                        <span className="text-green-300">${getActualPrice(25, selectedSizes['25']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost to Fulfill:</span>
                        <span className="text-red-300">-${calculateCosts(25, getActualPrice(25, selectedSizes['25'])).totalCosts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Your Earnings:</span>
                        <span className="text-green-400">+${calculateProfit(25, selectedSizes['25']).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Your Profit %:</span>
                        <span className="text-blue-300">{((calculateProfit(25, selectedSizes['25']) / getActualPrice(25, selectedSizes['25'])) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 ${
                    form.name ? 'bg-green-500/20 text-green-200' : 'bg-white/5 text-white/60'
                  }`}
                  style={{
                    border: form.name ? '2px solid rgba(74, 222, 128, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)',
                    opacity: form.name ? 1 : 0.65
                  }}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 ${
                    form.email ? 'bg-green-500/20 text-green-200' : 'bg-white/5 text-white/60'
                  }`}
                  style={{
                    border: form.email ? '2px solid rgba(74, 222, 128, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)',
                    opacity: form.email ? 1 : 0.65
                  }}
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Portfolio Link</label>
                <input
                  type="url"
                  name="portfolio"
                  value={form.portfolio}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 ${
                    form.portfolio ? 'bg-green-500/20 text-green-200' : 'bg-white/5 text-white/60'
                  }`}
                  style={{
                    border: form.portfolio ? '2px solid rgba(74, 222, 128, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)',
                    opacity: form.portfolio ? 1 : 0.65
                  }}
                  placeholder="https://your-portfolio.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Social Media</label>
                <div className="flex gap-2">
                  <select
                    name="socialMedia"
                    value={form.socialMedia}
                    onChange={handleChange}
                    className={`px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 ${
                      form.socialMedia ? 'bg-green-500/20 text-green-200' : 'bg-white/5 text-white/60'
                    }`}
                    style={{
                      border: form.socialMedia ? '2px solid rgba(74, 222, 128, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)',
                      opacity: form.socialMedia ? 1 : 0.65
                    }}
                    aria-label="Select your social media platform"
                  >
                    <option value="instagram" className="bg-gray-800 text-white">Instagram</option>
                    <option value="tiktok" className="bg-gray-800 text-white">TikTok</option>
                    <option value="youtube" className="bg-gray-800 text-white">YouTube</option>
                    <option value="twitter" className="bg-gray-800 text-white">Twitter/X</option>
                    <option value="facebook" className="bg-gray-800 text-white">Facebook</option>
                    <option value="pinterest" className="bg-gray-800 text-white">Pinterest</option>
                    <option value="linkedin" className="bg-gray-800 text-white">LinkedIn</option>
                    <option value="other" className="bg-gray-800 text-white">Other</option>
                  </select>
                  <input
                    type="text"
                    name="socialMediaHandle"
                    value={form.socialMediaHandle}
                    onChange={handleChange}
                    className={`flex-1 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 ${
                      form.socialMediaHandle ? 'bg-green-500/20 text-green-200' : 'bg-white/5 text-white/60'
                    }`}
                    style={{
                      border: form.socialMediaHandle ? '2px solid rgba(74, 222, 128, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)',
                      opacity: form.socialMediaHandle ? 1 : 0.65
                    }}
                    placeholder="e.g. @username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Total Audience Size</label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { key: '1k-10k', label: '1K - 10K', emoji: '🌟' },
                    { key: '10k-50k', label: '10K - 50K', emoji: '🚀' },
                    { key: '50k-100k', label: '50K - 100K', emoji: '🔥' },
                    { key: '100k-500k', label: '100K - 500K', emoji: '💎' },
                    { key: '500k-1m', label: '500K - 1M', emoji: '👑' },
                    { key: '1m+', label: '1M+', emoji: '⭐' }
                  ].map((range) => (
                    <button
                      key={range.key}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, audience: range.key }))}
                      className={`p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                        form.audience === range.key
                          ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/30'
                      }`}
                      style={{
                        opacity: form.audience === range.key ? 1 : 0.65
                      }}
                    >
                      <div className="text-2xl mb-1">{range.emoji}</div>
                      <div className="text-xs font-medium text-center">{range.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Experience Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'beginner', label: 'Beginner', emoji: '🌱' },
                    { key: 'intermediate', label: 'Intermediate', emoji: '🌿' },
                    { key: 'advanced', label: 'Advanced', emoji: '🌳' },
                    { key: 'expert', label: 'Expert', emoji: '🏆' }
                  ].map((level) => (
                    <button
                      key={level.key}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, experience: level.key }))}
                      className={`p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                        form.experience === level.key
                          ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/30'
                      }`}
                      style={{
                        opacity: form.experience === level.key ? 1 : 0.65
                      }}
                    >
                      <div className="text-2xl mb-1">{level.emoji}</div>
                      <div className="text-xs font-medium text-center">{level.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Content Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'digital-art', label: 'Digital Art', emoji: '🎭' },
                    { key: 'illustrations', label: 'Illustrations', emoji: '🖼️' },
                    { key: 'designs', label: 'Designs', emoji: '🎨' },
                    { key: 'mixed-media', label: 'Mixed Media', emoji: '🎪' }
                  ].map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, contentType: type.key }))}
                      className={`p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                        form.contentType === type.key
                          ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/30'
                      }`}
                      style={{
                        opacity: form.contentType === type.key ? 1 : 0.65
                      }}
                    >
                      <div className="text-2xl mb-1">{type.emoji}</div>
                      <div className="text-xs font-medium text-center">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Primary Categories</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'graphic-design', label: 'Graphic Design', emoji: '🎨' },
                    { key: 'illustrator', label: 'Illustrator', emoji: '✏️' },
                    { key: 'painter', label: 'Painter', emoji: '🖌️' },
                    { key: 'digital-artist', label: 'Digital Artist', emoji: '💻' },
                    { key: 'graffiti', label: 'Graffiti', emoji: '🏗️' }
                  ].map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => {
                        const newCategories = form.categories.includes(category.key)
                          ? form.categories.filter(c => c !== category.key)
                          : [...form.categories, category.key];
                        setForm(prev => ({ ...prev, categories: newCategories }));
                      }}
                      className={`p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                        form.categories.includes(category.key)
                          ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                          : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/30'
                      }`}
                      style={{
                        opacity: form.categories.includes(category.key) ? 1 : 0.65
                      }}
                    >
                      <div className="text-2xl mb-1">{category.emoji}</div>
                      <div className="text-xs font-medium text-center">{category.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">About You / Why You Want a Space *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 ${
                    form.message ? 'bg-green-500/20 text-green-200' : 'bg-white/5 text-white/60'
                  }`}
                  style={{
                    border: form.message ? '2px solid rgba(74, 222, 128, 0.5)' : '2px dashed rgba(255, 255, 255, 0.2)',
                    opacity: form.message ? 1 : 0.65
                  }}
                  placeholder="Tell us about yourself and why you'd like to join our creator space..."
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


