import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import UniversalHeader from '../../components/UniversalHeader';
import UniversalFooter from '../../components/UniversalFooter';
import AIFileImage from '../../components/AIFileImage';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '@/utils/cloudinary';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { CREATE_STRIPE_CHECKOUT_SESSION } from '@/lib/stripe-mutations';
import { getSupabase } from '@/lib/supabase';

const ProUploadPage = () => {
  const router = useRouter();
  const { plan: queryPlan } = router.query;
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>((queryPlan as string) || 'annual');
  const [showPlanSelection, setShowPlanSelection] = useState(false);

  const [createCheckoutSession] = useMutation(CREATE_STRIPE_CHECKOUT_SESSION);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Helper function to get file type icons
  const getFileTypeIcon = (format: string): string | null => {
    const lowerFormat = format.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'ai': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341796/StickerShuttle_AIFileIcon_mbruxk.png',
      'eps': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341810/StickerShuttle_EPSFileIcon_dkkgzb.png',
      'svg': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341810/StickerShuttle_SVGFileIcon_gfkokx.png',
      'psd': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341809/StickerShuttle_PSDFileIcon_t98zn6.png',
    };
    return iconMap[lowerFormat] || null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await uploadFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await uploadFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const uploadFile = async (file: File) => {
    try {
      setUploadError(null);
      setIsUploading(true);
      setUploadProgress({ percentage: 0, loaded: 0, total: file.size });

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        setIsUploading(false);
        return;
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        file,
        undefined,
        (progress) => {
          setUploadProgress(progress);
        },
        'pro-uploads'
      );

      setUploadedFile(result);
      setIsUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadError(null);
  };

  const handleProceedToPlanSelection = () => {
    setShowPlanSelection(true);
  };

  const handleContinue = async () => {
    try {
      setIsProcessing(true);

      // Determine the price based on the selected plan
      const priceAmount = selectedPlan === 'monthly' ? 39.00 : 347.00; // in dollars
      const productName = selectedPlan === 'monthly' 
        ? 'Sticker Shuttle Pro - Monthly Membership' 
        : 'Sticker Shuttle Pro - Annual Membership';

      // Create checkout session
      const { data } = await createCheckoutSession({
        variables: {
          input: {
            lineItems: [
              {
                name: productName,
                description: 'Premium sticker subscription with exclusive benefits',
                unitPrice: priceAmount,
                totalPrice: priceAmount, // Backend expects totalPrice
                quantity: 1,
                productId: `pro-${selectedPlan}`,
                sku: `PRO-${selectedPlan.toUpperCase()}`
              }
            ],
            successUrl: `${window.location.origin}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/pro/upload?plan=${selectedPlan}`,
            customerEmail: user?.email || undefined,
            userId: user?.id || undefined,
            metadata: {
              type: 'pro_membership',
              plan: selectedPlan,
              uploadedFileUrl: uploadedFile?.secure_url || '',
              uploadedFileName: uploadedFile?.original_filename || '',
              isSubscription: 'true' // Mark as subscription
            }
          }
        }
      });

      if (data?.createStripeCheckoutSession?.success && data?.createStripeCheckoutSession?.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.createStripeCheckoutSession.checkoutUrl;
      } else {
        throw new Error(data?.createStripeCheckoutSession?.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to proceed to checkout');
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Upload Your Design - Sticker Shuttle Pro</title>
        <meta name="description" content="Upload your design to start your Pro membership with Sticker Shuttle" />
        <link rel="canonical" href="https://stickershuttle.com/pro/upload" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <div className="flex justify-center mb-6">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Sticker Shuttle Pro Logo" 
                className="h-20 lg:h-24 w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
              {showPlanSelection 
                ? 'Choose your Pro membership plan' 
                : 'Upload your design to start your Pro membership.'}
            </h1>
            
          </div>

          {/* Upload Section - Only show if plan not selected yet */}
          {!showPlanSelection && (
            <div className="mb-8">
              <div 
                className="p-6 lg:p-8 rounded-2xl lg:rounded-3xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                {/* Hidden file input */}
                <input
                  id="file-input"
                  type="file"
                  accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload artwork file"
                />

                {!uploadedFile ? (
                  <div 
                    className="border-2 border-dashed border-gray-400/30 rounded-xl p-12 lg:p-16 text-center hover:border-gray-400/50 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    {isUploading ? (
                      <div className="mb-4">
                        <div className="text-5xl lg:text-6xl mb-4">⏳</div>
                        <p className="text-white font-medium text-lg lg:text-xl mb-3">Uploading...</p>
                        {uploadProgress && (
                          <>
                            <div className="w-full max-w-md mx-auto bg-white/20 rounded-full h-3 mb-2">
                              <div 
                                className="bg-purple-400 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.percentage}%` }}
                              ></div>
                            </div>
                            <p className="text-white/80 text-base">{uploadProgress.percentage}% complete</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4 flex justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                            alt="Upload file" 
                            className="w-24 h-24 lg:w-28 lg:h-28 object-contain"
                          />
                        </div>
                        <p className="text-white font-medium text-lg lg:text-xl mb-3 hidden md:block">
                          Drag or click to upload your file
                        </p>
                        <p className="text-white font-medium text-lg lg:text-xl mb-3 md:hidden">
                          Tap to add file
                        </p>
                        <p className="text-white/60 text-sm lg:text-base">
                          Supported formats: AI, SVG, EPS, PNG, JPG, PSD, ZIP
                        </p>
                        <p className="text-white/60 text-sm lg:text-base mt-2">
                          Maximum file size: 100MB
                        </p>
                      </div>
                    )}

                    {uploadError && (
                      <div className="mt-4 text-red-400 text-sm lg:text-base">
                        {uploadError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl p-6 lg:p-8 bg-green-500/20 backdrop-blur-md animate-glow-green"
                       style={{
                         border: '1.5px solid rgba(34, 197, 94, 0.5)'
                       }}>
                    {/* Responsive Layout: Vertical on mobile, Horizontal on desktop */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      {/* Image Preview - Full width on mobile, fixed size on desktop */}
                      <div className="w-full h-48 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-xl overflow-hidden border border-green-400/30 bg-white/5 backdrop-blur-md p-3 flex items-center justify-center flex-shrink-0">
                        <AIFileImage
                          src={uploadedFile.secure_url}
                          filename={uploadedFile.original_filename}
                          alt={uploadedFile.original_filename}
                          className="w-full h-full object-contain"
                          size="preview"
                          showFileType={false}
                        />
                      </div>

                      {/* File Info - Below image on mobile, right side on desktop */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="text-green-400 text-xl">📎</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-green-200 font-medium break-words text-base lg:text-lg">{uploadedFile.original_filename}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => document.getElementById('file-input')?.click()}
                              className="text-blue-300 hover:text-blue-200 p-2 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Replace file"
                            >
                              🔄
                            </button>
                            <button
                              onClick={handleRemoveFile}
                              className="text-red-300 hover:text-red-200 p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* File Details */}
                        <div className="space-y-2 mb-3">
                          <div className="flex flex-wrap items-center gap-3 text-green-300/80 text-sm">
                            <span className="flex items-center gap-1">
                              <span className="text-green-400">📏</span>
                              {(uploadedFile.bytes / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-green-400">🎨</span>
                              {uploadedFile.format.toUpperCase()}
                            </span>
                            {uploadedFile.width && uploadedFile.height && (
                              <span className="flex items-center gap-1">
                                <span className="text-green-400">📐</span>
                                {uploadedFile.width}x{uploadedFile.height}px
                              </span>
                            )}
                          </div>
                          
                          {/* File Type Icon */}
                          {getFileTypeIcon(uploadedFile.format) && (
                            <div className="flex items-center gap-2">
                              <img 
                                src={getFileTypeIcon(uploadedFile.format)!} 
                                alt={`${uploadedFile.format.toUpperCase()} file`}
                                className="w-6 h-6 object-contain opacity-80"
                              />
                              <span className="text-xs text-green-300/60">
                                Professional design file detected
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Upload Success Message */}
                        <div className="flex items-center gap-2 text-green-300 text-sm">
                          <span className="text-green-400">✅</span>
                          <span>File uploaded successfully!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

            {/* Continue Button - Only show when file is uploaded */}
            {!showPlanSelection && (
              <div className="flex flex-col items-center justify-center gap-4 mb-8">
                <button
                  onClick={handleProceedToPlanSelection}
                  disabled={!uploadedFile}
                  className="px-12 lg:px-16 py-5 lg:py-6 rounded-xl lg:rounded-2xl text-xl lg:text-2xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background: uploadedFile
                      ? 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)'
                      : 'rgba(255, 255, 255, 0.1)',
                    backgroundSize: '300% 300%',
                    animation: uploadedFile ? 'gradient-move 3s ease-in-out infinite' : 'none',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(61, 209, 249, 0.4)',
                    boxShadow: uploadedFile
                      ? 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      : 'none',
                    fontFamily: 'Rubik, sans-serif'
                  }}
                >
                  {uploadedFile ? 'Continue with Design' : 'Upload Design to Continue'}
                </button>
                
                {!uploadedFile && (
                  <p className="text-sm text-gray-400 text-center max-w-md">
                    Please upload your design file to proceed with Pro membership. This ensures your first monthly stickers are ready to print!
                  </p>
                )}
              </div>
            )}

          {/* Plan Selection - Show after first continue */}
          {showPlanSelection && (
            <>
            <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Pro Monthly */}
              <div 
                className={`p-6 lg:p-8 rounded-2xl lg:rounded-3xl text-center cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-md ${
                  selectedPlan === 'monthly'
                    ? 'bg-blue-500/20 text-blue-200 font-medium button-selected animate-glow-blue'
                    : 'border-2 border-dashed border-blue-400/50 opacity-65 hover:border-blue-400/70 hover:bg-white/5 hover:opacity-80 text-white/70'
                }`}
                style={{
                  border: selectedPlan === 'monthly' ? '1.5px solid rgba(59, 130, 246, 0.5)' : undefined
                }}
                onClick={() => setSelectedPlan('monthly')}>
                <div className="flex items-start justify-center gap-2 lg:gap-3 mb-4">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                    alt="Sticker Shuttle Pro Logo" 
                    className="h-8 lg:h-10 w-auto object-contain"
                  />
                  <span className="text-2xl lg:text-3xl font-bold -mt-1">Monthly</span>
                </div>
                <div className="text-4xl lg:text-5xl font-bold mb-2" style={{ fontFamily: 'Rubik, sans-serif' }}>$39</div>
                <div className="text-sm lg:text-base">per month</div>
              </div>
              
              {/* Pro Annual */}
              <div 
                className={`p-6 lg:p-8 rounded-2xl lg:rounded-3xl text-center cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-md ${
                  selectedPlan === 'annual'
                    ? 'bg-blue-500/20 text-blue-200 font-medium button-selected animate-glow-blue'
                    : 'border-2 border-dashed border-blue-400/50 opacity-65 hover:border-blue-400/70 hover:bg-white/5 hover:opacity-80 text-white/70'
                }`}
                style={{
                  border: selectedPlan === 'annual' ? '1.5px solid rgba(59, 130, 246, 0.5)' : undefined
                }}
                onClick={() => setSelectedPlan('annual')}>
                {selectedPlan === 'annual' && (
                  <div className="inline-flex items-center px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-xs lg:text-sm font-medium text-blue-300 mb-4"
                       style={{
                         background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                         backdropFilter: 'blur(25px) saturate(180%)',
                         border: '1px solid rgba(59, 130, 246, 0.4)'
                       }}>
                    Best Value
                  </div>
                )}
                <div className="flex items-start justify-center gap-2 lg:gap-3 mb-2">
                  <img 
                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                    alt="Sticker Shuttle Pro Logo" 
                    className="h-8 lg:h-10 w-auto object-contain"
                  />
                  <span className="text-2xl lg:text-3xl font-bold -mt-1">Annual</span>
                </div>
                <div className="flex items-center justify-center gap-3 lg:gap-4 mb-2">
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
                <div className="flex justify-center mb-2">
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
          </div>

          {/* Final Continue Button - Proceed to Checkout */}
          <div className="flex justify-center">
            <button
              onClick={handleContinue}
              disabled={isProcessing}
              className="px-12 lg:px-16 py-5 lg:py-6 rounded-xl lg:rounded-2xl text-xl lg:text-2xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: uploadedFile && !isProcessing
                  ? 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)'
                  : 'rgba(255, 255, 255, 0.1)',
                backgroundSize: '300% 300%',
                animation: uploadedFile && !isProcessing ? 'gradient-move 3s ease-in-out infinite' : 'none',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(61, 209, 249, 0.4)',
                boxShadow: uploadedFile && !isProcessing
                  ? 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  : 'none',
                fontFamily: 'Rubik, sans-serif'
              }}
            >
              {isProcessing ? 'Processing...' : 'Continue'}
            </button>
          </div>
          </>
          )}
        </div>

        <div className="hidden md:block">
          <UniversalFooter />
        </div>
      </div>

      <style jsx global>{`
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

        @keyframes glow-green {
          0%, 100% {
            box-shadow: 0 0 5px rgba(34, 197, 94, 0.2), 0 0 10px rgba(34, 197, 94, 0.1), 0 0 15px rgba(34, 197, 94, 0.05);
          }
          50% {
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2), 0 0 30px rgba(34, 197, 94, 0.1);
          }
        }
        
        .animate-glow-green {
          animation: glow-green 2s ease-in-out infinite;
        }

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
      `}</style>
    </>
  );
};

export default ProUploadPage;

