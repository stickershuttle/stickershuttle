import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery, useMutation, gql } from '@apollo/client';
import UniversalHeader from '../../../components/UniversalHeader';
import UniversalFooter from '../../../components/UniversalFooter';
import { GET_USER_PROFILE } from '../../../lib/profile-mutations';
import { getSupabase } from '../../../lib/supabase';
import { Upload, X, ArrowRight, Instagram, MapPin, BadgeCheck, Crown } from 'lucide-react';
import { FaTiktok } from 'react-icons/fa';
import { uploadToCloudinary, validateFile } from '../../../utils/cloudinary';

// GraphQL mutation to create a circle business
const CREATE_CIRCLE_BUSINESS = gql`
  mutation CreateCircleBusiness($input: CreateCircleBusinessInput!) {
    createCircleBusiness(input: $input) {
      success
      message
      business {
        id
        companyName
        category
        state
      }
    }
  }
`;

// Category options
const CATEGORY_OPTIONS = [
  'Food & Beverage',
  'Home & Garden',
  'Creative Services',
  'Health & Wellness',
  'Technology',
  'Fashion & Lifestyle',
  'Retail',
  'Pet Services',
  'Automotive',
  'Beauty & Personal Care',
  'Entertainment & Events',
  'Education & Training',
  'Professional Services',
  'Sports & Recreation',
  'Travel & Tourism',
  'Photography & Videography',
  'Music & Audio',
  'Real Estate',
  'Non-Profit & Charity',
  'E-commerce & Online Business',
  'Fitness & Athletics',
];

// State options
const STATE_OPTIONS = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

// Discount type options
const DISCOUNT_TYPES = [
  { label: 'Percentage Off', value: 'percentage' },
  { label: 'Store Credit', value: 'credit' },
  { label: 'Free Shipping', value: 'shipping' },
  { label: 'Buy One Get One', value: 'bogo' },
];

export default function AddMyBusiness() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPublicId, setLogoPublicId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountAmount, setDiscountAmount] = useState(10);
  const [backgroundColor, setBackgroundColor] = useState('#9ca3af'); // Light Grey default
  const [showCustomColor, setShowCustomColor] = useState(false);
  
  // Preset color swatches
  const COLOR_PRESETS = [
    { name: 'Light Grey', value: '#9ca3af' },
    { name: 'Deep Purple', value: '#581c87' },
    { name: 'Emerald', value: '#065f46' },
    { name: 'Rose', value: '#881337' },
    { name: 'Galaxy', value: '#0f172a' },
  ];

  // Check user authentication
  useEffect(() => {
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
    checkUser();
  }, []);

  // Query user profile to check Pro status
  const { data: profileData, loading: profileLoading } = useQuery(GET_USER_PROFILE, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  const userProfile = profileData?.getUserProfile;
  const isProMember = userProfile?.isProMember === true && userProfile?.proStatus === 'active';

  // Mutation for creating business
  const [createBusiness] = useMutation(CREATE_CIRCLE_BUSINESS);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    try {
      console.log('📤 Uploading logo to Cloudinary...');
      
      const result = await uploadToCloudinary(file, {}, undefined, 'pro-circle-logos');
      
      console.log('✅ Logo uploaded successfully:', result);
      setLogoUrl(result.secure_url);
      setLogoPublicId(result.public_id);
    } catch (error) {
      console.error('❌ Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!logoUrl || !companyName || !category || !state || !bio) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
        const result = await createBusiness({
        variables: {
          input: {
            userId: user.id,
            logoUrl,
            logoPublicId,
            companyName,
            category,
            state,
            bio,
            website: website || null,
            instagram: instagram || null,
            tiktok: tiktok || null,
            discountType,
            discountAmount: parseFloat(discountAmount.toString()),
            backgroundColor: backgroundColor,
          },
        },
      });

      if (result.data?.createCircleBusiness?.success) {
        alert('Business submitted successfully! It will be reviewed and added to Pro Circle.');
        router.push('/pro/circle');
      } else {
        alert(result.data?.createCircleBusiness?.message || 'Failed to submit business');
      }
    } catch (error) {
      console.error('Error submitting business:', error);
      alert('Failed to submit business. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate discount text for preview
  const getDiscountText = () => {
    if (discountType === 'percentage') {
      return `${discountAmount}% Off`;
    } else if (discountType === 'credit') {
      return `$${discountAmount} Credit`;
    } else if (discountType === 'shipping') {
      return 'Free Shipping';
    } else if (discountType === 'bogo') {
      return 'BOGO';
    }
    return '10% Off';
  };

  if (loading || profileLoading) {
    return (
      <>
        <Head>
          <title>Add My Business | Pro Circle</title>
          <meta name="description" content="Add your business to Pro Circle" />
        </Head>
        <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
          <UniversalHeader />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-300 text-lg">Loading...</p>
            </div>
          </div>
          <UniversalFooter />
        </div>
      </>
    );
  }

  if (!user || !isProMember) {
    router.push('/pro/circle');
    return null;
  }

  return (
    <>
      <Head>
        <title>Add My Business | Pro Circle</title>
        <meta name="description" content="Add your business to Pro Circle" />
        <link rel="canonical" href="https://stickershuttle.com/pro/circle/add-my-business" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />

        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4 pt-24 pb-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Rubik, sans-serif' }}>
              Add Your Business to <span className="pro-gradient">Pro</span> Circle
            </h1>
            <p className="text-gray-300">Fill out the form below to submit your business for approval</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Right Side - Live Preview (shows first on mobile) */}
              <div className="order-1 lg:order-2">
                <div className="lg:sticky lg:top-24">
                  <h2 className="text-2xl font-bold text-white mb-4">Live Preview</h2>
                  <div
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)',
                      maxWidth: '400px',
                      width: '100%',
                    }}
                  >
                    {/* Logo Container */}
                    <div 
                      className="w-full h-48 flex items-center justify-center p-8"
                      style={{ backgroundColor: backgroundColor }}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Business logo preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-gray-500 text-center">
                          <Upload className="w-16 h-16 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Logo preview</p>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Company Name */}
                      <h3 className="text-xl font-bold text-left pro-gradient mb-2" style={{ fontFamily: 'Rubik, sans-serif' }}>
                        {companyName || 'Your Business Name'}
                      </h3>

                      {/* Category & Location Row */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {category && (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-300 border-blue-500/30">
                            {category}
                          </span>
                        )}
                        {state && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-700/30 text-gray-300">
                            <MapPin className="w-3 h-3" />
                            {state}
                          </span>
                        )}
                      </div>

                      {/* Verified Partner Badge */}
                      <div className="flex items-center gap-1 mb-3">
                        <BadgeCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-blue-400 font-medium">Verified Partner</span>
                      </div>

                      {/* Bio */}
                      <p className="text-gray-300 text-left mb-4 min-h-[4rem]">
                        {bio || 'Your business description will appear here...'}
                      </p>

                      {/* Social Icons */}
                      <div className="flex items-center gap-3 mb-4">
                        {instagram && (
                          <div className="social-icon-instagram">
                            <Instagram className="w-5 h-5" />
                          </div>
                        )}
                        {tiktok && (
                          <div className="social-icon-tiktok">
                            <FaTiktok className="w-5 h-5" />
                          </div>
                        )}
                        {!instagram && !tiktok && (
                          <span className="text-xs text-gray-500">Add social media links</span>
                        )}
                      </div>

                      {/* Shop Button Preview */}
                      <div
                        className="w-full px-6 py-3 rounded-xl text-base font-bold text-white flex items-center justify-center gap-2"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(59, 130, 246, 0.06) 0px 8px 32px, rgba(255, 255, 255, 0.04) 0px 1px 0px inset',
                        }}
                      >
                        Shop {getDiscountText()}
                        <ArrowRight className="w-4 h-4" />
                      </div>

                      {/* Pro Benefit Footer */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-center gap-2">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                            alt="Pro" 
                            className="w-4 h-4 object-contain"
                          />
                          <span className="text-xs text-gray-400">Exclusive Pro Benefit</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-gray-500 mt-4 text-left max-w-[400px]">
                    Note: The design style may change slightly over time as we develop this feature.
                  </p>
                </div>
              </div>

              {/* Left Side - Form (shows second on mobile) */}
              <div
                className="order-2 lg:order-1 p-6 rounded-2xl space-y-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <h2 className="text-2xl font-bold text-white mb-4">Business Details</h2>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Business Logo <span className="text-red-400">*</span>
                  </label>
                  <div
                    className="relative border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-400/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    {logoUrl ? (
                      <div className="relative">
                        <img
                          src={logoUrl}
                          alt="Business logo"
                          className="max-w-full max-h-48 mx-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoUrl('');
                            setLogoPublicId('');
                          }}
                          className="absolute top-0 right-0 p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-300 mb-1">
                          {uploading ? 'Uploading...' : 'Click to upload logo'}
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 25MB</p>
                      </div>
                    )}
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </div>
                </div>

                {/* Background Color Picker */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Logo Background Color
                  </label>
                  
                  {/* Preset Swatches */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setBackgroundColor(preset.value);
                          setShowCustomColor(false);
                        }}
                        className={`relative p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                          backgroundColor === preset.value && !showCustomColor
                            ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#030140]'
                            : 'hover:scale-105'
                        }`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div
                          className="w-full h-12 rounded-lg mb-2"
                          style={{ backgroundColor: preset.value }}
                        ></div>
                        <p className="text-xs text-white/70 text-center">{preset.name}</p>
                        {backgroundColor === preset.value && !showCustomColor && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                    
                    {/* Custom Color Button */}
                    <button
                      type="button"
                      onClick={() => setShowCustomColor(true)}
                      className={`relative p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                        showCustomColor
                          ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#030140]'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div
                        className="w-full h-12 rounded-lg mb-2 flex items-center justify-center"
                        style={{
                          background: showCustomColor 
                            ? backgroundColor 
                            : 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #feca57 75%, #ff9ff3 100%)',
                        }}
                      >
                        {!showCustomColor && (
                          <span className="text-white text-xs font-bold">Custom</span>
                        )}
                      </div>
                      <p className="text-xs text-white/70 text-center">Custom</p>
                      {showCustomColor && (
                        <div className="absolute top-2 right-2">
                          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                  
                  {/* Custom Color Inputs - Show when Custom is selected */}
                  {showCustomColor && (
                    <div className="flex gap-3 mb-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        placeholder="#1e3a8a"
                        className="flex-1 px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px)',
                        }}
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400">Choose a color that complements your logo</p>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Business Name"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                    required
                  >
                    <option value="" className="bg-gray-800">Select a category</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat} className="bg-gray-800">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    State <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                    required
                  >
                    <option value="" className="bg-gray-800">Select a state</option>
                    {STATE_OPTIONS.map((st) => (
                      <option key={st} value={st} className="bg-gray-800">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Short Bio <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 150))}
                    placeholder="Brief description of your business (max 150 characters)"
                    maxLength={150}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                    required
                  />
                  <div className="text-xs text-gray-400 mt-1 text-right">{bio.length}/150</div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Website URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourbusiness.com"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                    }}
                    required
                  />
                </div>

                {/* Social Media */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@yourbusiness"
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      TikTok
                    </label>
                    <input
                      type="text"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="@yourbusiness"
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                      }}
                    />
                  </div>
                </div>

                {/* Discount Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Discount Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                      }}
                      required
                    >
                      {DISCOUNT_TYPES.map((type) => (
                        <option key={type.value} value={type.value} className="bg-gray-800">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      {discountType === 'percentage' ? 'Discount %' : discountType === 'credit' ? 'Credit Amount ($)' : 'Amount'}
                    </label>
                    {discountType === 'percentage' ? (
                      <select
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((percent) => (
                          <option key={percent} value={percent} className="bg-gray-800">
                            {percent}%
                          </option>
                        ))}
                      </select>
                    ) : discountType === 'credit' ? (
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Dollar amount"
                        min="1"
                        step="1"
                        className="w-full px-4 py-3 rounded-xl text-white placeholder-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px)',
                        }}
                      />
                    ) : (
                      <div className="w-full px-4 py-3 rounded-xl text-gray-500 flex items-center justify-center"
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        N/A
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !logoUrl || !companyName || !category || !state || !bio}
                  className="w-full px-6 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-[1.0125] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                  {!submitting && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </form>
        </div>

        <UniversalFooter />
      </div>

      {/* Custom CSS */}
      <style jsx global>{`
        body {
          background-color: #030140 !important;
        }
        html {
          background-color: #030140 !important;
        }
        
        .pro-gradient {
          background: linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9);
          background-size: 300% 300%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-move 3s ease-in-out infinite;
        }
        
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
        
        .social-icon-instagram,
        .social-icon-tiktok {
          color: #9ca3af;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .social-icon-instagram:hover {
          color: #E1306C;
          transform: scale(1.1);
        }
        
        .social-icon-tiktok:hover {
          color: #00f2ea;
          transform: scale(1.1);
        }
      `}</style>
    </>
  );
}

