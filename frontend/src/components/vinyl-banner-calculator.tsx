import React, { useState, useEffect } from 'react';
import { ShoppingCart, Upload, Instagram, Clock } from 'lucide-react';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress, CalculatorMetadata } from '@/utils/cloudinary';
import AIFileImage from './AIFileImage';
import { getSupabase } from '@/lib/supabase';

const VinylBannerCalculator: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<string>('3x5');
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<string>('1');
  const [customQuantity, setCustomQuantity] = useState<string>('');

  const [selectedFinishing, setSelectedFinishing] = useState<string>('hemmed-grommeted');
  const [rushOrder, setRushOrder] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<CloudinaryUploadResult | null>(null);
  const [postToInstagram, setPostToInstagram] = useState<boolean>(false);
  const [instagramUsername, setInstagramUsername] = useState<string>('');
  const [customSizeError, setCustomSizeError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadLater, setUploadLater] = useState<boolean>(false);

  // User and profile states
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const bannerSizes = [
    { value: '2x4', label: '2\' × 4\'', sqFt: 8, popular: false },
    { value: '3x5', label: '3\' × 5\'', sqFt: 15, popular: true },
    { value: '4x8', label: '4\' × 8\'', sqFt: 32, popular: false },
    { value: 'custom', label: 'Custom Size', sqFt: 0 }
  ];

  const finishingOptions = [
    { value: 'hemmed-grommeted', label: 'Hemmed & Grommeted (Standard)', priceMultiplier: 1.0 },
    { value: 'no-finishing', label: 'No Finishing (Raw Edges)', priceMultiplier: 0.85 }
  ];

  // Fetch user and profile data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = await getSupabase();
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          // Get user profile
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [])

  // Calculate dynamic credit rate based on wholesale status
  const getCreditRate = () => {
    if (!profile) return 0.05; // Default 5% for non-logged in users
    
    // Check if user is wholesale and approved
    if (profile.is_wholesale_customer && profile.wholesale_status === 'approved') {
      return profile.wholesale_credit_rate || 0.10; // Use profile rate or default 10%
    }
    
    return 0.05; // Default 5% for regular users
  }

  const getTierPricing = (sqFt: number): number => {
    if (sqFt <= 10) return 4.50;
    if (sqFt <= 25) return 3.75;
    if (sqFt <= 50) return 3.25;
    return 2.85;
  };

  const getQuantityDiscount = (qty: number): number => {
    if (qty >= 25) return 0.25;
    if (qty >= 15) return 0.15;
    if (qty >= 10) return 0.10;
    if (qty >= 5) return 0.05;
    return 0;
  };

  const calculateSquareFootage = (): number => {
    if (selectedSize === 'custom') {
      const width = parseFloat(customWidth) || 0;
      const height = parseFloat(customHeight) || 0;
      return width * height;
    }
    
    const sizeOption = bannerSizes.find(size => size.value === selectedSize);
    return sizeOption?.sqFt || 0;
  };

  const validateCustomSize = (width: string, height: string) => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    
    if (width && height) {
      if (w < 1 || h < 1) {
        setCustomSizeError('Minimum size is 1\' × 1\'');
        return false;
      }
      if (w > 20 || h > 20) {
        setCustomSizeError('Maximum size is 20\' × 20\'');
        return false;
      }
      if (w * h < 2) {
        setCustomSizeError('Minimum area must be 2 sq ft');
        return false;
      }
    }
    
    setCustomSizeError('');
    return true;
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    if (size !== 'custom') {
      setCustomWidth('');
      setCustomHeight('');
      setCustomSizeError('');
    }
  };

  const handleCustomSizeChange = (dimension: 'width' | 'height', value: string) => {
    if (dimension === 'width') {
      setCustomWidth(value);
      validateCustomSize(value, customHeight);
    } else {
      setCustomHeight(value);
      validateCustomSize(customWidth, value);
    }
  };

  const calculatePricing = () => {
    const sqFt = calculateSquareFootage();
    const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity);
    
    if (sqFt === 0 || (selectedSize === 'custom' && customSizeError) || quantity <= 0) {
      return {
        basePrice: 0,
        materialPrice: 0,
        finishingPrice: 0,
        subtotal: 0,
        quantityDiscount: 0,
        rushFee: 0,
        instagramFee: 0,
        total: 0,
        perUnit: 0,
        sqFt: sqFt
      };
    }

    const basePricePerSqFt = getTierPricing(sqFt);
    const basePrice = sqFt * basePricePerSqFt;

    const finishingMultiplier = finishingOptions.find(f => f.value === selectedFinishing)?.priceMultiplier || 1.0;

    const unitPrice = basePrice * finishingMultiplier;
    const subtotal = unitPrice * quantity;
    
    const discountRate = getQuantityDiscount(quantity);
    const quantityDiscount = subtotal * discountRate;
    
    const rushFee = rushOrder ? subtotal * 0.35 : 0;
    const instagramFee = 0; // No charge for Instagram tagging
    
    const total = subtotal - quantityDiscount + rushFee + instagramFee;

    return {
      basePrice,
      finishingPrice: basePrice * (finishingMultiplier - 1),
      subtotal,
      quantityDiscount,
      rushFee,
      instagramFee,
      total,
      perUnit: total / quantity,
      sqFt
    };
  };

  const pricing = calculatePricing();

  const handleFileUpload = async (file: File) => {
    // Reset previous states
    setUploadError(null);
    setUploadProgress(null);
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    
    try {
      // Prepare metadata from current calculator state
      const sqFt = calculateSquareFootage();
      
      const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity);
      
      const metadata: CalculatorMetadata = {
        selectedSize,
        customWidth: customWidth || undefined,
        customHeight: customHeight || undefined,
        selectedMaterial: selectedFinishing, // Use selectedMaterial field for finishing
        selectedQuantity,
        customQuantity: customQuantity || undefined,
        rushOrder,
        postToInstagram,
        totalPrice: pricing.total > 0 ? `$${pricing.total.toFixed(2)}` : undefined,
        calculatedArea: sqFt > 0 ? sqFt : undefined
      };
      
      const result = await uploadToCloudinary(file, metadata, (progress: UploadProgress) => {
        setUploadProgress(progress);
      });
      
      setUploadedFile(result);
      setUploadLater(false); // Uncheck "upload later" since file is uploaded
      console.log('File uploaded successfully with metadata:', result);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setUploadError(null);
  };

  // Get file type icon based on format
  const getFileTypeIcon = (format: string): string | null => {
    const lowerFormat = format.toLowerCase();
    
    if (lowerFormat === 'ai') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751503976/Adobe_Illustrator_.AI_File_Icon_v3wshr.png';
    }
    if (lowerFormat === 'psd') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504068/PSD_file_icon.svg_sbi8dh.png';
    }
    if (lowerFormat === 'eps') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504098/9034333_ykhb8f.png';
    }
    if (lowerFormat === 'pdf') {
      return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751504123/PDF_file_icon.svg_uovjbk.png';
    }
    
    return null;
  };

  const handleAddToCart = () => {
    if (pricing.total === 0) return;
    
    const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity);
    
    const cartItem = {
      productType: 'vinyl-banners',
      productId: 'VB-001',
      size: selectedSize === 'custom' ? `${customWidth}' × ${customHeight}'` : selectedSize,
      finishing: selectedFinishing,
      quantity,
      rushOrder,
      postToInstagram,
      unitPrice: pricing.perUnit,
      totalPrice: pricing.total,
      uploadedFile: uploadedFile?.original_filename || null
    };
    
    console.log('Adding to cart:', cartItem);
    alert('Added to cart! (Cart functionality to be implemented)');
  };

  const handleQuantityChange = (amount: string) => {
    setSelectedQuantity(amount);
    if (amount !== 'Custom') {
      setCustomQuantity('');
    }
  };

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value);
  };

  return (
    <>
      <style jsx>{`
        .animate-glow-purple {
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.4), 0 0 25px rgba(168, 85, 247, 0.2);
        }
        
        .animate-glow-green {
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 0 25px rgba(34, 197, 94, 0.2);
        }
        
        .button-interactive {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .button-interactive:hover {
          transform: translateY(-1px);
        }
        
        .button-interactive:active {
          transform: translateY(0) scale(0.98);
        }
        
        .button-selected {
          position: relative;
        }
        
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
      `}</style>
      <div 
        className="rounded-2xl p-4 md:p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Configuration */}
        <div className="space-y-6 flex flex-col">
          {/* Size Selection */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span role="img" aria-label="ruler" className="text-purple-400">
                📏
              </span>
              Banner Size
            </h2>
            <div className="space-y-3">
              {bannerSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => handleSizeChange(size.value)}
                  aria-label={`Select ${size.label} banner size`}
                  className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                    ${
                      selectedSize === size.value
                        ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <span>{size.label}</span>
                  {size.popular && (
                    <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">
                      Most Popular
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Size Inputs */}
            {selectedSize === 'custom' && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Width (feet)</label>
                    <input
                      type="number" 
                      title="Banner width in feet"
                      value={customWidth}
                      onChange={(e) => handleCustomSizeChange('width', e.target.value)}
                      placeholder="e.g. 5'"
                      min="1"
                      max="20"
                      step="0.5"
                      className={`w-full p-2 rounded-lg bg-white/10 border-2 text-white placeholder-gray-400 ${
                        customSizeError ? 'border-red-400' : 'border-white/20'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">Height (feet)</label>
                    <input
                      type="number"
                      title="Banner height in feet"
                      value={customHeight}
                      onChange={(e) => handleCustomSizeChange('height', e.target.value)}
                      placeholder="e.g. 3'"
                      min="1"
                      max="20"
                      step="0.5"
                      className={`w-full p-2 rounded-lg bg-white/10 border-2 text-white placeholder-gray-400 ${
                        customSizeError ? 'border-red-400' : 'border-white/20'
                      }`}
                    />
                  </div>
                </div>
                {customSizeError && (
                  <p className="text-red-400 text-sm">{customSizeError}</p>
                )}
                {!customSizeError && customWidth && customHeight && (
                  <p className="text-green-400 text-sm">
                    Total: {calculateSquareFootage()} sq ft
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Finishing Options */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="text-green-400">🏁</span>
              Finishing
            </h2>
            <div className="space-y-3">
              {finishingOptions.map((finishing) => (
                <button
                  key={finishing.value}
                  onClick={() => setSelectedFinishing(finishing.value)}
                  aria-label={`Select ${finishing.label} finishing option`}
                  className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                    ${
                      selectedFinishing === finishing.value
                        ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <div>
                    <div className="font-medium">{finishing.label}</div>
                    {finishing.priceMultiplier !== 1.0 && (
                      <div className="text-xs text-gray-300 mt-1">
                        {finishing.priceMultiplier > 1.0 ? '+' : ''}
                        {Math.round((finishing.priceMultiplier - 1) * 100)}%
                      </div>
                    )}
                  </div>
                  {finishing.value === 'hemmed-grommeted' && (
                    <span className="absolute top-1 right-2 text-[10px] text-green-300 font-medium">
                      Standard
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="flex-1 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <span className="text-green-400">#️⃣</span>
              Select Quantity
            </h2>
            <div className="space-y-3">
              {['1', '5', '10', '25', 'Custom'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuantityChange(amount)}
                  aria-label={`Select ${amount} banners`}
                  className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                    ${
                      selectedQuantity === amount
                        ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                >
                  <span>{amount === 'Custom' ? 'Custom Quantity' : `${amount} Banner${amount === '1' ? '' : 's'}`}</span>
                  {amount === '5' && (
                    <span className="absolute top-1 right-2 text-[10px] text-green-300 font-medium">
                      5% Off
                    </span>
                  )}
                  {amount === '10' && (
                    <span className="absolute top-1 right-2 text-[10px] text-green-300 font-medium">
                      10% Off
                    </span>
                  )}
                  {amount === '25' && (
                    <span className="absolute top-1 right-2 text-[10px] text-green-300 font-medium">
                      25% Off
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col justify-end">
              {selectedQuantity === 'Custom' && (
                <div className="mt-3">
                  <input
                    type="number"
                    placeholder="Enter quantity (1-25)"
                    value={customQuantity}
                    onChange={(e) => handleCustomQuantityChange(e.target.value)}
                    min="1"
                    max="25"
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-green-400 backdrop-blur-md button-interactive"
                  />
                </div>
              )}
              {(() => {
                const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 0 : parseInt(selectedQuantity);
                if (quantity >= 5) {
                  return (
                    <p className="text-green-400 text-sm mt-2">
                      {Math.round(getQuantityDiscount(quantity) * 100)}% quantity discount applied!
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Right Column - Upload, Options, and Pricing */}
        <div className="space-y-6">
          {/* File Upload */}
          <div className="container-style p-6 transition-colors duration-200">

            
            {/* Hidden file input - always present */}
            <input
              id="file-input"
              type="file"
              accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload artwork file"
            />

            {!uploadedFile ? (
              <div 
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md relative"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                
                {isUploading ? (
                  <div className="mb-4">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-white font-medium text-base mb-2">Uploading...</p>
                    {uploadProgress && (
                      <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                        <div 
                          className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.percentage}%` }}
                        ></div>
                      </div>
                    )}
                    {uploadProgress && (
                      <p className="text-white/80 text-sm">{uploadProgress.percentage}% complete</p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="mb-3 flex justify-center -ml-4">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                        alt="Upload file" 
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                    <p className="text-white font-medium text-base mb-2 hidden md:block">Drag or click to upload your file</p>
                    <p className="text-white font-medium text-base mb-2 md:hidden">Tap to add file</p>
                    <p className="text-white/80 text-sm">All formats supported. Max file size: 25MB | 1 file per order</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-green-400/50 rounded-xl p-4 bg-green-500/10 backdrop-blur-md">
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
                          <p className="text-green-200 font-medium break-words text-lg">{uploadedFile.original_filename}</p>
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
                          onClick={removeUploadedFile}
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

            {uploadError && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-400/50 rounded-lg">
                <p className="text-red-200 text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  {uploadError}
                </p>
              </div>
            )}
            
            {!uploadedFile && (
              <div className="mt-4 flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                   style={{
                     background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                     border: '1px solid rgba(147, 51, 234, 0.4)',
                     backdropFilter: 'blur(12px)'
                   }}>
                <button
                  onClick={() => setUploadLater(!uploadLater)}
                  disabled={!!uploadedFile}
                  title={uploadLater ? "Disable upload later" : "Enable upload later"}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    uploadLater ? 'bg-purple-500' : 'bg-white/20'
                  } ${uploadedFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    uploadLater ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
                <label className={`text-sm font-medium ${uploadedFile ? 'text-white/50' : 'text-purple-200'}`}>
                  Upload Artwork Later
                </label>
              </div>
            )}
            {uploadLater && !uploadedFile && (
              <div className="mt-2 text-white/80 text-sm italic flex items-center">
                <span role="img" aria-label="caution" className="mr-1">⚠️</span>
                You can upload your artwork after placing the order
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            {/* Rush Order Toggle */}
            <div>
              <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                   style={{
                     background: rushOrder 
                       ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.15) 50%, rgba(239, 68, 68, 0.05) 100%)'
                       : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(59, 130, 246, 0.05) 100%)',
                     border: rushOrder 
                       ? '1px solid rgba(239, 68, 68, 0.4)'
                       : '1px solid rgba(59, 130, 246, 0.4)',
                     backdropFilter: 'blur(12px)'
                   }}>
                <button
                  onClick={() => setRushOrder(!rushOrder)}
                  title={rushOrder ? "Switch to standard production" : "Enable rush order"}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    rushOrder ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    rushOrder ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
                <label className={`text-sm font-medium ${rushOrder ? 'text-red-200' : 'text-blue-200'}`}>
                  {rushOrder ? '🚀 Rush Order (+35%)' : '🕒 Standard Production Time'}
                </label>
              </div>
              
              {/* Rush Order Disclaimer - right under rush order toggle */}
              {rushOrder && (
                <div className="mt-3 text-xs text-white/70 leading-relaxed">
                  *Rush Orders are prioritized in our production queue and completed within 24 hours. Orders under 10 banners are completed on time. If you have a tight deadline or specific concerns, feel free to contact us.
                </div>
              )}
            </div>

            {/* Instagram Post Option */}
            <div>
              <div className="flex items-center justify-start gap-3 p-3 rounded-lg text-sm font-medium"
                   style={{
                     background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(147, 51, 234, 0.15) 50%, rgba(147, 51, 234, 0.05) 100%)',
                     border: '1px solid rgba(147, 51, 234, 0.4)',
                     backdropFilter: 'blur(12px)'
                   }}>
                <button
                  onClick={() => setPostToInstagram(!postToInstagram)}
                  title={postToInstagram ? "Disable Instagram posting" : "Enable Instagram posting"}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    postToInstagram ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    postToInstagram ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
                <Instagram className="h-5 w-5 text-purple-400" />
                <label className="text-sm font-medium text-purple-200">
                  Post this order to Instagram
                </label>
              </div>
              
              {/* Instagram handle input - right under Instagram toggle */}
              {postToInstagram && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xl">@</span>
                    <div className="flex-grow p-3 rounded-lg backdrop-blur-md"
                         style={{
                           background: 'rgba(255, 255, 255, 0.05)',
                           border: '1px solid rgba(255, 255, 255, 0.1)',
                           boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                         }}>
                      <input
                        type="text"
                        placeholder="Enter your Instagram handle"
                        value={instagramUsername}
                        onChange={(e) => setInstagramUsername(e.target.value)}
                        className="w-full bg-transparent text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all border-0"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-white/70 italic">
                    You are opting in to let Sticker Shuttle post and tag you in the making of your stickers on their Instagram.
                  </div>
                  <div className="text-xs">
                    <a 
                      href="https://www.instagram.com/stickershuttle/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-300 hover:text-purple-200 underline"
                    >
                      Follow @stickershuttle • 24.9k followers
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">Pricing Breakdown</h3>
            
            {pricing.total > 0 ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Base ({pricing.sqFt} sq ft × ${getTierPricing(pricing.sqFt).toFixed(2)}/sq ft)</span>
                  <span>${pricing.basePrice.toFixed(2)}</span>
                </div>
                
                {pricing.finishingPrice !== 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>Finishing {pricing.finishingPrice > 0 ? 'Upgrade' : 'Discount'}</span>
                    <span>{pricing.finishingPrice > 0 ? '+' : ''}${pricing.finishingPrice.toFixed(2)}</span>
                  </div>
                )}
                
                {(() => {
                  const quantity = selectedQuantity === 'Custom' ? parseInt(customQuantity) || 1 : parseInt(selectedQuantity);
                  return (
                    <>
                      <div className="flex justify-between text-gray-300">
                        <span>Subtotal (× {quantity})</span>
                        <span>${pricing.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {pricing.quantityDiscount > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Quantity Discount ({Math.round(getQuantityDiscount(quantity) * 100)}%)</span>
                          <span>-${pricing.quantityDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                
                {pricing.rushFee > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Rush Order (35%)</span>
                    <span>+${pricing.rushFee.toFixed(2)}</span>
                  </div>
                )}
                
                {pricing.instagramFee > 0 && (
                  <div className="flex justify-between text-pink-400">
                    <span>Instagram Posting</span>
                    <span>+${pricing.instagramFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-white/20 pt-2 mt-3">
                  <div className="flex justify-between text-white font-semibold text-xl">
                    <span>Total:</span>
                    <span className="text-green-200">${pricing.total.toFixed(2)}</span>
                  </div>
                  <div className="text-right text-gray-300 text-sm">
                    ${pricing.perUnit.toFixed(2)} per banner
                  </div>
                  {/* Store Credit Notification */}
                  <div className="mt-3 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left"
                       style={{
                         background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0.05) 100%)',
                         border: '1px solid rgba(255, 215, 0, 0.4)',
                         backdropFilter: 'blur(12px)'
                       }}>
                    <span className="flex items-center justify-start gap-1.5 text-yellow-200">
                      <i className="fas fa-coins text-yellow-300"></i>
                      You'll earn ${(pricing.total * getCreditRate()).toFixed(2)} in store credit on this order!
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                {selectedSize === 'custom' && customSizeError ? (
                  <p className="text-red-400">Please fix size requirements</p>
                ) : (
                  <p className="text-gray-400">Configure your banner to see pricing</p>
                )}
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={pricing.total === 0}
            className={`w-full py-4 px-6 rounded-xl text-lg font-semibold transition-all duration-300 flex items-center justify-center relative overflow-hidden group ${
              pricing.total > 0
                ? 'hover:scale-[1.025] cursor-pointer'
                : 'bg-gray-600 text-white cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
            }`}
            style={pricing.total > 0 ? {
              background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
              color: '#030140',
              fontWeight: 'bold',
              border: 'solid',
              borderWidth: '0.03125rem',
              borderColor: '#e6c211',
              boxShadow: '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)'
            } : {}}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to Cart - ${pricing.total.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default VinylBannerCalculator; 