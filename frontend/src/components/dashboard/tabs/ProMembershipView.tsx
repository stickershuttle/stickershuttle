import React, { useState } from 'react';
import Link from 'next/link';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '@/utils/cloudinary';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import AIFileImage from '../../AIFileImage';

// GraphQL mutations for Pro design management
const UPDATE_PRO_MEMBER_DESIGN = gql`
  mutation UpdateProMemberDesign($userId: ID!, $designFile: String!) {
    updateProMemberDesign(userId: $userId, designFile: $designFile) {
      success
      message
      userProfile {
        proCurrentDesignFile
        proDesignApproved
        proDesignLocked
      }
      error
    }
  }
`;


interface ProMembershipViewProps {
  profile: any;
  user: any;
}

export default function ProMembershipView({ profile, user }: ProMembershipViewProps) {
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSwappingDesign, setIsSwappingDesign] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // GraphQL mutations
  const [updateProMemberDesign] = useMutation(UPDATE_PRO_MEMBER_DESIGN);

  // Check if design is locked (within 5-day production window)
  const isDesignLocked = () => {
    if (!profile?.pro_design_locked || !profile?.pro_design_locked_at) return false;
    
    const lockedAt = new Date(profile.pro_design_locked_at);
    const now = new Date();
    const daysSinceLocked = (now.getTime() - lockedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceLocked < 5;
  };

  // Handle design swap
  const handleSwapDesign = async () => {
    if (!uploadedFile || !user?.id) return;

    try {
      setIsSwappingDesign(true);
      setSwapError(null);
      setSwapSuccess(null);

      // First, update the user's design file
      const { data } = await updateProMemberDesign({
        variables: {
          userId: user.id,
          designFile: uploadedFile.secure_url
        }
      });

      if (data?.updateProMemberDesign?.success) {
        setSwapSuccess(data.updateProMemberDesign.message);

        // Clear the uploaded file since it's now saved
        setUploadedFile(null);
        // Refresh the page to show updated profile data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSwapError(data?.updateProMemberDesign?.error || 'Failed to update design');
      }
    } catch (error) {
      console.error('Error swapping design:', error);
      setSwapError('Failed to update design. Please try again.');
    } finally {
      setIsSwappingDesign(false);
    }
  };

  // Calculate next print date (30 days from subscription start)
  const getNextPrintDate = () => {
    if (!profile?.pro_current_period_start) {
      return null;
    }

    const periodStart = new Date(profile.pro_current_period_start);
    const nextPrintDate = new Date(periodStart);
    nextPrintDate.setDate(nextPrintDate.getDate() + 30);
    
    return nextPrintDate;
  };

  // Check if we're within 5 days of the next print
  const isWithinNotificationWindow = () => {
    const nextPrint = getNextPrintDate();
    if (!nextPrint) return false;

    const today = new Date();
    const daysUntilPrint = Math.ceil((nextPrint.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilPrint <= 5 && daysUntilPrint >= 0;
  };

  // Get days until next print
  const getDaysUntilNextPrint = () => {
    const nextPrint = getNextPrintDate();
    if (!nextPrint) return null;

    const today = new Date();
    const daysUntil = Math.ceil((nextPrint.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntil;
  };

  const nextPrintDate = getNextPrintDate();
  const daysUntil = getDaysUntilNextPrint();
  const withinWindow = isWithinNotificationWindow();

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Upload functions
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
      setUploadProgress(null);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl" style={{
          background: 'linear-gradient(135deg, rgba(61, 209, 249, 0.2), rgba(43, 184, 217, 0.2))',
          border: '1px solid rgba(61, 209, 249, 0.3)',
        }}>
          <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pro Membership</h1>
          <p className="text-sm text-gray-400">Your monthly sticker benefits</p>
        </div>
      </div>

      {/* Membership Status Card */}
      <div 
        className="p-6 rounded-2xl relative overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        {/* Animated gradient background */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)',
            backgroundSize: '300% 300%',
            animation: 'gradient-move 3s ease-in-out infinite',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755785867/ProOnly_1_jgp5s4.png" 
                alt="Pro Badge" 
                className="h-12 w-auto"
              />
              <div>
                <h2 className="text-xl font-bold text-white">Active Member</h2>
                <p className="text-sm text-cyan-400">
                  {profile?.pro_plan === 'monthly' ? 'Monthly Plan' : 
                   profile?.pro_plan === 'annual' ? 'Annual Plan' : 'Pro Plan'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-400">Active</span>
              </div>
            </div>
          </div>

          {/* Membership Period */}
          {profile?.pro_current_period_start && profile?.pro_current_period_end && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Current Billing Period</p>
              <p className="text-sm text-white">
                {new Date(profile.pro_current_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' → '}
                {new Date(profile.pro_current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Next Monthly Stickers */}
      {nextPrintDate && (
        <div 
          className="p-6 rounded-2xl"
          style={{
            background: withinWindow 
              ? 'linear-gradient(135deg, rgba(61, 209, 249, 0.1), rgba(43, 184, 217, 0.1))'
              : 'rgba(255, 255, 255, 0.05)',
            border: withinWindow 
              ? '1px solid rgba(61, 209, 249, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: withinWindow 
              ? 'rgba(61, 209, 249, 0.2) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
              : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/20 flex-shrink-0">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {withinWindow ? '🎉 Your Monthly Stickers Are Being Prepared!' : 'Next Monthly Sticker Batch'}
              </h3>
              
              {daysUntil !== null && (
                <div className="mb-3">
                  {daysUntil > 0 ? (
                    <p className="text-cyan-400 font-medium">
                      {withinWindow ? 'Printing in' : 'Prints in'} {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                    </p>
                  ) : daysUntil === 0 ? (
                    <p className="text-cyan-400 font-medium">Printing today! 🚀</p>
                  ) : (
                    <p className="text-gray-400">Check your orders for tracking</p>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-300 mb-4">
                <strong className="text-white">Print Date:</strong> {formatDate(nextPrintDate)}
              </p>

              {withinWindow && (
                <div 
                  className="p-4 rounded-lg mb-4"
                  style={{
                    background: 'rgba(61, 209, 249, 0.1)',
                    border: '1px solid rgba(61, 209, 249, 0.2)',
                  }}
                >
                  <p className="text-sm text-cyan-300">
                    <strong>✨ What's Next:</strong> We'll send you a proof for approval before printing. 
                    Once approved, your 100 custom stickers will ship with FREE 2-Day Air delivery!
                  </p>
                </div>
              )}

              {/* Design Upload Section */}
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  {withinWindow 
                    ? 'Make sure your design is uploaded for this month\'s batch!'
                    : 'Upload or update your design for next month\'s batch'}
                </p>
                
                <Link href="/pro/upload">
                  <button 
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)',
                      backgroundSize: '300% 300%',
                      animation: 'gradient-move 3s ease-in-out infinite',
                      border: '1px solid rgba(61, 209, 249, 0.4)',
                      boxShadow: 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                    }}
                  >
                    {withinWindow ? 'View/Update Design' : 'Upload Design'}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pro Benefits */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Your Pro Benefits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">100 Monthly Stickers</p>
              <p className="text-sm text-gray-400">Custom design every month</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">FREE 2-Day Air Shipping</p>
              <p className="text-sm text-gray-400">On all orders</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Priority Printing</p>
              <p className="text-sm text-gray-400">Your orders print first</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Exclusive Discounts</p>
              <p className="text-sm text-gray-400">Bigger savings on bulk orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Month's Sticker Design */}
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Here's what we're printing this month:</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Preview */}
          <div className="space-y-4">
            {uploadedFile ? (
              <div className="rounded-xl p-4 bg-green-500/20 backdrop-blur-md border border-green-400/30">
                <div className="flex gap-4 items-start">
                  {/* Image Preview */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-green-400/30 bg-white/5 backdrop-blur-md p-2 flex items-center justify-center flex-shrink-0">
                    <AIFileImage
                      src={uploadedFile.secure_url}
                      filename={uploadedFile.original_filename}
                      alt={uploadedFile.original_filename}
                      className="w-full h-full object-contain"
                      size="preview"
                      showFileType={false}
                    />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="text-green-400 text-lg">📎</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-green-200 font-medium break-words text-sm">{uploadedFile.original_filename}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => document.getElementById('pro-file-input')?.click()}
                          className="text-blue-300 hover:text-blue-200 p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Replace file"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => setUploadedFile(null)}
                          className="text-red-300 hover:text-red-200 p-1.5 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* File Details */}
                    <div className="flex flex-wrap items-center gap-3 text-green-300/80 text-xs">
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

                    <div className="mt-2 text-green-300 text-xs">
                      ✅ Design uploaded successfully!
                    </div>
                  </div>
                </div>

                {/* Send/Swap Design Button */}
                <div className="mt-4">
                  <button
                    onClick={handleSwapDesign}
                    disabled={isSwappingDesign || isDesignLocked()}
                    className="w-full px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      background: isDesignLocked() 
                        ? 'rgba(156, 163, 175, 0.3)'
                        : 'linear-gradient(45deg, #3dd1f9, #2bb8d9, #4dd8ff, #7ee3ff, #3dd1f9)',
                      backgroundSize: '300% 300%',
                      animation: isDesignLocked() ? 'none' : 'gradient-move 3s ease-in-out infinite',
                      border: `1px solid ${isDesignLocked() ? 'rgba(156, 163, 175, 0.4)' : 'rgba(61, 209, 249, 0.4)'}`,
                      boxShadow: isDesignLocked() 
                        ? 'none'
                        : 'rgba(61, 209, 249, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    {isSwappingDesign ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Updating Design...
                      </div>
                    ) : isDesignLocked() ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Design Locked
                      </div>
                    ) : (
                      'Swap Design'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 rounded-xl overflow-hidden border border-white/20 bg-white/5 flex items-center justify-center">
                <div 
                  className="w-full h-full border-2 border-dashed border-gray-400/30 rounded-xl p-4 text-center hover:border-gray-400/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('pro-file-input')?.click()}
                >
                  {isUploading ? (
                    <div className="mb-2">
                      <div className="text-2xl mb-2">⏳</div>
                      <p className="text-white font-medium text-base mb-2">Uploading...</p>
                      {uploadProgress && (
                        <>
                          <div className="w-full max-w-xs mx-auto bg-white/20 rounded-full h-2 mb-1">
                            <div 
                              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.percentage}%` }}
                            ></div>
                          </div>
                          <p className="text-white/80 text-sm">{uploadProgress.percentage}% complete</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex justify-center">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                          alt="Upload file" 
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                      <p className="text-white font-medium text-base mb-2">
                        Drag or click to upload
                      </p>
                      <p className="text-gray-400 text-xs mb-2">
                        AI, EPS, SVG, PSD, PNG, JPG, PDF up to 50MB
                      </p>
                      <div className="text-xs text-gray-500">
                        <p>• Vector files preferred</p>
                        <p>• High-res raster files accepted</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Hidden file input */}
            <input
              id="pro-file-input"
              type="file"
              accept=".ai,.eps,.svg,.psd,.pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload design file"
            />

            {/* Upload error */}
            {uploadError && !uploadedFile && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-300 text-sm">{uploadError}</p>
              </div>
            )}
          </div>

          {/* Timeline Info */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Print Date</p>
                  <p className="text-sm text-cyan-400">
                    {nextPrintDate ? formatDate(nextPrintDate) : 'TBD'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Estimated Delivery</p>
                  <p className="text-sm text-green-400">
                    {nextPrintDate ? 
                      formatDate(new Date(nextPrintDate.getTime() + (5 * 24 * 60 * 60 * 1000))) : 
                      'TBD'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Quantity</p>
                  <p className="text-sm text-purple-400">100 custom stickers</p>
                </div>
              </div>
            </div>

            {withinWindow && (
              <div 
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(61, 209, 249, 0.1)',
                  border: '1px solid rgba(61, 209, 249, 0.2)',
                }}
              >
                <p className="text-sm text-cyan-300">
                  <strong>📋 Next Steps:</strong> We'll send you a proof for approval before printing. 
                  Once approved, your stickers will be printed and shipped with FREE 2-Day Air delivery!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Need Help */}
      <div 
        className="p-4 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <p className="text-sm text-gray-400 text-center">
          Questions about your Pro membership?{' '}
          <Link href="/account/dashboard?view=support" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Contact Support
          </Link>
        </p>
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
      `}</style>
    </div>
  );
}

