import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import UniversalHeader from '../../components/UniversalHeader';
import UniversalFooter from '../../components/UniversalFooter';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '@/utils/cloudinary';
import AIFileImage from '../../components/AIFileImage';
import { getSupabase } from '@/lib/supabase';
import { useMutation, gql } from '@apollo/client';

// GraphQL mutation for creating Pro member order
const CREATE_PRO_MEMBER_ORDER = gql`
  mutation CreateProMemberOrder($userId: ID!) {
    createProMemberOrder(userId: $userId) {
      id
      orderNumber
      orderStatus
      fulfillmentStatus
      createdAt
    }
  }
`;

// GraphQL mutation for updating Pro member design
const UPDATE_PRO_MEMBER_DESIGN = gql`
  mutation UpdateProMemberDesign($userId: ID!, $designFile: String!) {
    updateProMemberDesign(userId: $userId, designFile: $designFile) {
      success
      message
      error
    }
  }
`;

const ProSuccessPage = () => {
  const router = useRouter();
  const { session_id } = router.query;
  
  // Upload states
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [user, setUser] = useState<any>(null);

  // GraphQL mutations
  const [updateProMemberDesign] = useMutation(UPDATE_PRO_MEMBER_DESIGN);
  const [createProMemberOrder] = useMutation(CREATE_PRO_MEMBER_ORDER);

  // Fetch user on mount
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

  useEffect(() => {
    // Track successful Pro membership purchase
    if (typeof window !== 'undefined' && window.fbq && session_id) {
      try {
        window.fbq('track', 'Purchase', {
          content_name: 'Sticker Shuttle Pro Membership',
          content_type: 'product',
          value: 39.00,
          currency: 'USD'
        });
        console.log('📊 Facebook Pixel: Purchase tracked for Pro membership');
      } catch (fbError) {
        console.error('📊 Facebook Pixel tracking error:', fbError);
      }
    }

    // Force refresh the page after 3 seconds to ensure Pro status is updated
    // This gives the webhook time to update the database
    // Only refresh once using sessionStorage flag
    if (session_id && typeof window !== 'undefined') {
      const hasRefreshed = sessionStorage.getItem(`pro_refresh_${session_id}`);
      
      if (!hasRefreshed) {
        console.log('⏳ Scheduling profile refresh to update Pro logo in 3 seconds...');
        sessionStorage.setItem(`pro_refresh_${session_id}`, 'true');
        
        const refreshTimer = setTimeout(() => {
          console.log('🔄 Refreshing page to update Pro status...');
          window.location.reload();
        }, 3000);

        return () => clearTimeout(refreshTimer);
      } else {
        console.log('✅ Pro status refresh already completed');
      }
    }
  }, [session_id]);

  // File upload handlers
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

      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        setIsUploading(false);
        return;
      }

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
      setUploadProgress(null);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Submit design and create Pro order
  const handleSubmitDesign = async () => {
    if (!uploadedFile) {
      alert('Please upload your design first!');
      return;
    }

    if (!user?.id) {
      alert('User not found. Please try refreshing the page.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadError(null);

      console.log('📤 Submitting Pro design and creating order...');

      // Step 1: Update the user's Pro design file
      const { data: designData } = await updateProMemberDesign({
        variables: {
          userId: user.id,
          designFile: uploadedFile.secure_url
        }
      });

      if (!designData?.updateProMemberDesign?.success) {
        throw new Error(designData?.updateProMemberDesign?.error || 'Failed to save design');
      }

      console.log('✅ Design file saved to profile');

      // Step 2: Create the Pro member order with preset selections
      // (Custom Shape, Matte Finish, 3" Size, 100 qty)
      const { data: orderData } = await createProMemberOrder({
        variables: {
          userId: user.id
        }
      });

      if (orderData?.createProMemberOrder) {
        console.log('✅ Pro member order created:', orderData.createProMemberOrder.orderNumber);
        
        // Show success message and redirect to dashboard
        alert(`Success! Your design has been uploaded and order ${orderData.createProMemberOrder.orderNumber} has been created. You'll receive a proof for approval soon!`);
        router.push('/account/dashboard?view=pro-membership');
      } else {
        throw new Error('Failed to create Pro member order');
      }

    } catch (error) {
      console.error('❌ Error submitting design:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to submit design');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Welcome to Pro! - Sticker Shuttle</title>
        <meta name="description" content="Thank you for joining Sticker Shuttle Pro!" />
        <link rel="canonical" href="https://stickershuttle.com/pro/success" />
      </Head>

      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140' }}>
        <UniversalHeader />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20">
          <div className="text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Sticker Shuttle Pro Logo" 
                className="h-24 lg:h-32 w-auto object-contain animate-bounce-slow"
              />
            </div>

            {/* Success Message */}
            <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Rubik, sans-serif' }}>
              Welcome to <span className="pro-gradient">Pro</span>!
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Thank you for joining Sticker Shuttle Pro.
            </p>

            {/* Upload Your Design Section */}
            <div 
              className="p-6 lg:p-8 rounded-2xl lg:rounded-3xl mb-8 max-w-2xl mx-auto"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
 
              <p className="text-gray-300 mb-6 text-center">
                Get started by uploading your design. We'll send you a proof for approval before printing!
              </p>

              {/* File Upload */}
              <div className="mb-6">
    
                <input
                  id="design-file-input"
                  type="file"
                  accept=".ai,.eps,.svg,.psd,.pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload design file"
                />

                {!uploadedFile ? (
                  <div 
                    className="border-2 border-dashed border-gray-400/30 rounded-xl p-8 text-center hover:border-gray-400/50 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('design-file-input')?.click()}
                  >
                    {isUploading ? (
                      <div>
                        <div className="text-3xl mb-2">⏳</div>
                        <p className="text-white font-medium mb-2">Uploading...</p>
                        {uploadProgress && (
                          <>
                            <div className="w-full max-w-xs mx-auto bg-white/20 rounded-full h-2 mb-1">
                              <div 
                                className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.percentage}%` }}
                              ></div>
                            </div>
                            <p className="text-white/80 text-sm">{uploadProgress.percentage}% complete</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="mb-3 flex justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                            alt="Upload file" 
                            className="w-16 h-16 object-contain"
                          />
                        </div>
                        <p className="text-white font-medium mb-2">Click or drag to upload</p>
                        <p className="text-gray-400 text-sm">AI, EPS, SVG, PSD, PNG, JPG, PDF</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl p-4 bg-green-500/20 border border-green-400/30">
                    <div className="flex gap-4 items-start">
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-green-400/30 bg-white/5 p-2 flex items-center justify-center flex-shrink-0">
                        <AIFileImage
                          src={uploadedFile.secure_url}
                          filename={uploadedFile.original_filename}
                          alt={uploadedFile.original_filename}
                          className="w-full h-full object-contain"
                          size="preview"
                          showFileType={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-green-200 font-medium text-sm truncate">{uploadedFile.original_filename}</p>
                          <button
                            onClick={() => setUploadedFile(null)}
                            className="text-red-300 hover:text-red-200 p-1 hover:bg-red-500/20 rounded transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                        <p className="text-green-300 text-xs">✅ File uploaded successfully!</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {uploadError && (
                  <p className="text-red-400 text-sm mt-2">{uploadError}</p>
                )}
              </div>

              {/* Submit Design Button */}
              <button
                onClick={handleSubmitDesign}
                disabled={!uploadedFile || isSubmitting}
                className="w-full px-8 py-4 rounded-xl text-lg font-bold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: uploadedFile && !isSubmitting
                    ? 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)'
                    : 'rgba(255, 255, 255, 0.1)',
                  backgroundSize: '300% 300%',
                  animation: uploadedFile && !isSubmitting ? 'gradient-move 3s ease-in-out infinite' : 'none',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(61, 209, 249, 0.4)',
                  boxShadow: uploadedFile && !isSubmitting
                    ? 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    : 'none',
                  fontFamily: 'Rubik, sans-serif'
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Order...
                  </span>
                ) : uploadedFile ? (
                  'Submit Design'
                ) : (
                  'Upload Design to Continue'
                )}
              </button>

  

              <p className="text-center text-gray-400 text-sm mt-4">
                You can also upload your design later from your{' '}
                <Link href="/account/dashboard?view=pro-membership" className="text-cyan-400 hover:text-cyan-300">
                  Pro Dashboard
                </Link>
              </p>
            </div>




          </div>
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

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }

        .pro-gradient {
          background: linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9);
          background-size: 300% 300%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-move 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default ProSuccessPage;

