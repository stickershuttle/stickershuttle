import Layout from "@/components/Layout";
import { useState, useRef, useEffect } from "react";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from "@/utils/cloudinary";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/router";

interface BackgroundRemovalState {
  originalFile: CloudinaryUploadResult | null;
  processedFile: string | null;
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
  showResults: boolean;
  showOriginal: boolean;
  processingProgress: number;
  usageCount: number;
  usageTimestamp: number;
  showLoginModal: boolean;
}

export default function BackgroundRemoval() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize usage tracking from localStorage
  const getUsageData = () => {
    try {
      const stored = localStorage.getItem('bg-removal-usage');
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        const hoursPassed = (now - data.timestamp) / (1000 * 60 * 60);
        
        // Reset if more than 24 hours have passed
        if (hoursPassed >= 24) {
          return { count: 0, timestamp: now };
        }
        return { count: data.count || 0, timestamp: data.timestamp };
      }
    } catch (error) {
      console.error('Error reading usage data:', error);
    }
    return { count: 0, timestamp: Date.now() };
  };

  const usageData = getUsageData();
  
  const [state, setState] = useState<BackgroundRemovalState>({
    originalFile: null,
    processedFile: null,
    isUploading: false,
    isProcessing: false,
    uploadProgress: null,
    error: null,
    showResults: false,
    showOriginal: false,
    processingProgress: 0,
    usageCount: usageData.count,
    usageTimestamp: usageData.timestamp,
    showLoginModal: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Update localStorage when usage changes
  useEffect(() => {
    localStorage.setItem('bg-removal-usage', JSON.stringify({
      count: state.usageCount,
      timestamp: state.usageTimestamp
    }));
  }, [state.usageCount, state.usageTimestamp]);

  // Check if user can still use the tool
  const canUseTools = () => {
    return state.usageCount < 3;
  };

  // Get remaining uses
  const getRemainingUses = () => {
    return Math.max(0, 3 - state.usageCount);
  };

  // Get time until reset
  const getTimeUntilReset = () => {
    const now = Date.now();
    const hoursPassed = (now - state.usageTimestamp) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 24 - hoursPassed);
    return Math.ceil(hoursRemaining);
  };

  // Generate background-removed image URL using Cloudinary transformation
  const generateBackgroundRemovedUrl = (publicId: string): string => {
    const CLOUDINARY_CLOUD_NAME = 'dxcnvqk6b';
    // Force PNG format to preserve transparency and add quality optimization
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/e_background_removal/f_png/q_auto/${publicId}`;
  };

  const processFile = async (file: File) => {
    // Check if user is logged in first
    if (!user) {
      setState(prev => ({ ...prev, showLoginModal: true }));
      return;
    }

    // Check usage limit
    if (!canUseTools()) {
      setState(prev => ({ 
        ...prev, 
        error: `You've reached your daily limit of 3 background removals. Try again in ${getTimeUntilReset()} hours.` 
      }));
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setState(prev => ({ ...prev, error: validation.error || 'Invalid file' }));
      return;
    }

    // Check if it's an image file (background removal only works on images)
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: 'Background removal only works with image files (JPG, PNG, GIF, WebP)' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      error: null,
      showResults: false,
      uploadProgress: { percentage: 0, loaded: 0, total: 0 }
    }));

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        file,
        {
          selectedCut: 'background-removal',
          selectedMaterial: 'tool',
          timestamp: new Date().toISOString()
        },
        (progress) => {
          setState(prev => ({ ...prev, uploadProgress: progress }));
        },
        'background-removal-tool'
      );

      setState(prev => ({
        ...prev,
        originalFile: result,
        isUploading: false,
        isProcessing: true,
        uploadProgress: null,
        processingProgress: 10
      }));

      // Generate background-removed URL
      const processedUrl = generateBackgroundRemovedUrl(result.public_id);
      
      // Animate progress bar while checking if image is ready
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          processingProgress: Math.min(prev.processingProgress + Math.random() * 15, 95)
        }));
      }, 1500);
      
      // Cloudinary background removal can take 10-30 seconds to process
      // We'll check if the processed image is ready by trying to load it
      const checkImageReady = async (url: string, maxAttempts: number = 15): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              clearInterval(progressInterval);
              setState(prev => ({ ...prev, processingProgress: 100 }));
              return true;
            }
          } catch (error) {
            console.log(`Attempt ${attempt}: Image not ready yet...`);
          }
          
          // Wait before next attempt (progressively longer delays)
          const delay = Math.min(2000 + (attempt * 1000), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        clearInterval(progressInterval);
        return false;
      };

      // Check if the processed image is ready
      const isReady = await checkImageReady(processedUrl);
      
      if (isReady) {
        setState(prev => ({
          ...prev,
          processedFile: processedUrl,
          isProcessing: false,
          showResults: true,
          usageCount: prev.usageCount + 1,
          usageTimestamp: prev.usageCount === 0 ? Date.now() : prev.usageTimestamp // Set timestamp on first use
        }));
      } else {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'Background removal is taking longer than expected. Please try again with a different image or try again later.'
        }));
      }

    } catch (error: any) {
      console.error('Upload failed:', error);
      setState(prev => ({
        ...prev,
        isUploading: false,
        isProcessing: false,
        error: error.message || 'Upload failed. Please try again.',
        uploadProgress: null
      }));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUploadClick = () => {
    // Check if user is logged in
    if (!user) {
      setState(prev => ({ ...prev, showLoginModal: true }));
      return;
    }
    
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      originalFile: null,
      processedFile: null,
      isUploading: false,
      isProcessing: false,
      uploadProgress: null,
      error: null,
      showResults: false,
      showOriginal: false,
      processingProgress: 0
    }));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!state.processedFile) return;
    
    // Create download link
    const link = document.createElement('a');
    link.href = state.processedFile;
    link.download = `background-removed-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
    backdropFilter: 'blur(12px)'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
    backdropFilter: 'blur(25px) saturate(180%)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
  };

  return (
    <Layout 
      title="Background Removal Tool - Sticker Shuttle"
      description="Remove backgrounds from your images instantly using our AI-powered background removal tool. Perfect for creating transparent PNGs for stickers and designs."
      keywords="background removal, image editing, transparent PNG, AI background removal, sticker design tool"
    >
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h1 className="text-4xl font-bold text-white">Background Removal</h1>
              <span className="ml-3 px-3 py-1 bg-blue-400 text-white text-sm font-bold rounded-full">
                FREE
              </span>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Remove backgrounds from your images instantly.
              Perfect for creating transparent PNGs for stickers, logos, and designs. 100% free.
            </p>
          </div>

          {/* Usage Counter - Show after first use */}
          {state.usageCount > 0 && (
            <div className="max-w-md mx-auto mb-8">
              <div 
                className="rounded-xl p-4 text-center"
                style={{
                  background: getRemainingUses() > 0 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
                  border: getRemainingUses() > 0 
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-2xl">
                    {getRemainingUses() > 0 ? '✅' : '⏰'}
                  </span>
                  <span className={`font-bold text-lg ${getRemainingUses() > 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {getRemainingUses()} of 3 uses remaining today
                  </span>
                </div>
                {getRemainingUses() === 0 ? (
                  <p className="text-red-200 text-sm">
                    ⏱️ Resets in {getTimeUntilReset()} hour{getTimeUntilReset() !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <p className="text-green-200 text-sm">
                    🔄 Resets in {getTimeUntilReset()} hour{getTimeUntilReset() !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="max-w-4xl mx-auto">
            <div 
              className="rounded-2xl p-6 lg:p-8"
              style={containerStyle}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload image for background removal"
                title="Select an image file to remove its background"
              />

              {/* Upload Area - Show when no file uploaded */}
              {!state.originalFile && (
                <div>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 text-center backdrop-blur-md relative transition-colors ${
                      canUseTools() 
                        ? 'border-white/20 hover:border-purple-400 cursor-pointer' 
                        : 'border-red-500/30 cursor-not-allowed opacity-60'
                    }`}
                    onDrop={canUseTools() ? handleDrop : undefined}
                    onDragOver={canUseTools() ? handleDragOver : undefined}
                    onClick={canUseTools() ? handleUploadClick : undefined}
                  >
                    {state.isUploading ? (
                      <div className="mb-4">
                        <div className="text-4xl mb-3">⏳</div>
                        <p className="text-white font-medium text-base mb-2">Uploading...</p>
                        {state.uploadProgress && (
                          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                            <div 
                              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${state.uploadProgress.percentage}%` }}
                            ></div>
                          </div>
                        )}
                        {state.uploadProgress && (
                          <p className="text-white/80 text-sm">{state.uploadProgress.percentage}% complete</p>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="mb-3 flex justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                            alt="Upload file" 
                            className={`w-20 h-20 object-contain ${!canUseTools() ? 'grayscale' : ''}`}
                          />
                        </div>
                        {canUseTools() ? (
                          <>
                            <p className="text-white font-medium text-base mb-2 hidden md:block">Drag or click to upload your image</p>
                            <p className="text-white font-medium text-base mb-2 md:hidden">Tap to add image</p>
                            <p className="text-white/80 text-sm">JPG, PNG, GIF, WebP supported. Max file size: 25MB</p>
                          </>
                        ) : (
                          <>
                            <p className="text-red-300 font-medium text-base mb-2">Daily limit reached</p>
                            <p className="text-red-200/80 text-sm">You've used all 3 background removals for today</p>
                            <p className="text-red-200/60 text-xs mt-2">Try again in {getTimeUntilReset()} hour{getTimeUntilReset() !== 1 ? 's' : ''}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Processing State */}
              {state.isProcessing && state.originalFile && (
                <div className="text-center space-y-8 py-12">
                  {/* Animated Background Circles */}
                  <div className="relative flex items-center justify-center h-32">
                    {/* Outer rotating ring */}
                    <div className="absolute w-24 h-24 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
                    
                    {/* Middle rotating ring (opposite direction) */}
                    <div className="absolute w-16 h-16 border-4 border-blue-500/30 border-r-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    
                    {/* Inner pulsing circle */}
                    <div className="absolute w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"></div>
                    
                    {/* Floating AI Particles */}
                    <div className="absolute w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ top: '10px', left: '20px', animationDelay: '0s' }}></div>
                    <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ top: '30px', right: '15px', animationDelay: '0.5s' }}></div>
                    <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ bottom: '20px', left: '30px', animationDelay: '1s' }}></div>
                    <div className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ bottom: '10px', right: '25px', animationDelay: '1.5s' }}></div>
                  </div>

                  {/* Rocket Progress Bar */}
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="relative">
                      <div className="w-full bg-gray-700/50 rounded-full h-3 backdrop-blur-md border border-white/10">
                        <div 
                          className="h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                          style={{
                            width: `${state.processingProgress}%`,
                            background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 50%, #10B981 100%)',
                            boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
                          }}
                        >
                          {/* Animated shimmer effect */}
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
                            style={{ animationDuration: '2s' }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Horizontal Rocket emoji that moves with progress */}
                      <div 
                        className="absolute top-1/2 text-2xl transition-all duration-500 ease-out"
                        style={{ 
                          left: `${state.processingProgress}%`,
                          transform: 'translateX(-50%) translateY(-50%) rotate(45deg)'
                        }}
                      >
                        🚀
                      </div>
                    </div>
                    
                    <p className="text-white font-medium text-lg">🤖 AI is removing the background...</p>
                    <p className="text-gray-400 text-sm">Analyzing pixels and preserving fine details</p>
                    <p className="text-blue-300 text-lg font-bold">{Math.round(state.processingProgress)}%</p>
                  </div>

                  {/* Fun Status Messages */}
                  <div className="px-6 py-4 rounded-xl max-w-lg mx-auto"
                       style={{
                         background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(16, 185, 129, 0.2) 100%)',
                         border: '1px solid rgba(147, 51, 234, 0.3)',
                         backdropFilter: 'blur(12px)'
                       }}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2 text-purple-300">
                        <span>✨</span>
                        <span className="text-sm font-medium">Detecting edges and fine details</span>
                        <span>✨</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-blue-300">
                        <span>🎯</span>
                        <span className="text-sm">Separating foreground from background</span>
                        <span>🎯</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-green-300">
                        <span>🖼️</span>
                        <span className="text-sm">Creating transparent masterpiece</span>
                        <span>🖼️</span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated time */}
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Estimated time: 10-30 seconds</p>
                    <p className="text-gray-500 text-xs mt-1">Complex images with lots of details may take longer</p>
                  </div>
                </div>
              )}

              {/* Results Display - Show when processing is complete */}
              {state.showResults && state.originalFile && state.processedFile && (
                <div className="space-y-6">
                  {/* Toggle Switch */}
                  <div className="flex items-center justify-center gap-4 p-4 rounded-lg"
                       style={{
                         background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                         border: '1px solid rgba(147, 51, 234, 0.4)',
                         backdropFilter: 'blur(12px)'
                       }}>
                    <span className={`text-sm font-medium transition-colors ${!state.showOriginal ? 'text-green-300' : 'text-white/60'}`}>
                      Background Removed
                    </span>
                    <button
                      onClick={() => setState(prev => ({ ...prev, showOriginal: !prev.showOriginal }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        state.showOriginal ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      title={state.showOriginal ? "Switch to background removed view" : "Switch to original image view"}
                      aria-label={state.showOriginal ? "Switch to background removed view" : "Switch to original image view"}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        state.showOriginal ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-sm font-medium transition-colors ${state.showOriginal ? 'text-blue-300' : 'text-white/60'}`}>
                      Original
                    </span>
                  </div>

                  {/* Image Display */}
                  <div className="rounded-xl overflow-hidden border border-green-400/30 bg-white/5 backdrop-blur-md">
                    <div className="w-full h-[32rem] flex items-center justify-center p-4">
                      {state.showOriginal ? (
                        <img 
                          src={state.originalFile.secure_url} 
                          alt="Original image" 
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      ) : (
                        <div 
                          className="w-full h-full rounded-lg flex items-center justify-center"
                          style={{
                            backgroundImage: `
                              linear-gradient(45deg, #666 25%, transparent 25%), 
                              linear-gradient(-45deg, #666 25%, transparent 25%), 
                              linear-gradient(45deg, transparent 75%, #666 75%), 
                              linear-gradient(-45deg, transparent 75%, #666 75%)
                            `,
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                          }}
                        >
                          <img 
                            src={state.processedFile} 
                            alt="Background removed" 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-400/30">
                    <div className="flex items-center gap-3">
                      <div className="text-green-400 text-xl">✅</div>
                      <div>
                        <p className="text-green-200 font-medium">{state.originalFile.original_filename}</p>
                        <div className="flex items-center gap-4 text-green-300/80 text-sm">
                          <span>{(state.originalFile.bytes / 1024 / 1024).toFixed(2)} MB</span>
                          <span>{state.originalFile.format.toUpperCase()}</span>
                          {state.originalFile.width && state.originalFile.height && (
                            <span>{state.originalFile.width}×{state.originalFile.height}px</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUploadClick}
                        className="text-blue-300 hover:text-blue-200 p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Replace image"
                      >
                        🔄
                      </button>
                      <button
                        onClick={handleReset}
                        className="text-red-300 hover:text-red-200 p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Remove image"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleDownload}
                      className="py-3 px-6 rounded-xl text-white font-medium transition-all hover:scale-105 flex items-center justify-center"
                      style={buttonStyle}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Transparent PNG
                    </button>
                    
                    <button
                      onClick={handleReset}
                      className="py-3 px-6 rounded-xl text-white font-medium transition-all hover:scale-105 flex items-center justify-center bg-gray-600/50 hover:bg-gray-600/70 border border-gray-500/50"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Process Another Image
                    </button>
                  </div>

                  {/* Pro Tip */}
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-blue-300">
                        <p className="font-medium mb-1">Pro Tip</p>
                        <p className="text-sm">The transparent PNG is perfect for creating stickers! Upload it to our vinyl calculator to get an instant quote.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {state.error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mt-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-400 font-medium">Error</span>
                  </div>
                  <p className="text-red-300 mt-2">{state.error}</p>
                  {state.originalFile && (
                    <div className="mt-4 flex gap-3">
                      {canUseTools() ? (
                        <button
                          onClick={() => {
                            setState(prev => ({ ...prev, error: null, isProcessing: true, processingProgress: 10 }));
                            // Retry processing
                            const processedUrl = generateBackgroundRemovedUrl(state.originalFile!.public_id);
                            setState(prev => ({ 
                              ...prev, 
                              processedFile: processedUrl, 
                              isProcessing: false, 
                              showResults: true,
                              error: null,
                              processingProgress: 100,
                              usageCount: prev.usageCount + 1
                            }));
                          }}
                          className="py-2 px-4 rounded-lg text-white font-medium transition-all hover:scale-105 flex items-center bg-red-600/50 hover:bg-red-600/70 border border-red-500/50"
                        >
                          🔄 Try Again
                        </button>
                      ) : (
                        <div className="py-2 px-4 rounded-lg text-red-300 text-sm bg-red-900/30 border border-red-500/50">
                          Can't retry - daily limit reached
                        </div>
                      )}
                      <button
                        onClick={handleReset}
                        className="py-2 px-4 rounded-lg text-white font-medium transition-all hover:scale-105 flex items-center bg-gray-600/50 hover:bg-gray-600/70 border border-gray-500/50"
                      >
                        🗑️ Start Over
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Login Modal */}
      {state.showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-2xl p-8 max-w-md w-full mx-auto text-center animate-in fade-in duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="mb-6">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Login Required
              </h3>
              <p className="text-gray-300 text-lg">
                Please log in to use the background removal tool
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 px-6 rounded-xl text-white font-medium transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Go to Login
              </button>

              <button
                onClick={() => setState(prev => ({ ...prev, showLoginModal: false }))}
                className="w-full py-3 px-6 rounded-xl text-gray-300 font-medium transition-all hover:scale-105 hover:text-white border border-gray-500/50 hover:border-gray-400/50"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}