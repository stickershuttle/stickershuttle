export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface CalculatorMetadata {
  selectedCut?: string;
  selectedMaterial?: string;
  selectedSize?: string;
  customWidth?: string;
  customHeight?: string;
  selectedQuantity?: string;
  customQuantity?: string;
  sendProof?: boolean;
  uploadLater?: boolean;
  rushOrder?: boolean;
  postToInstagram?: boolean;
  instagramHandle?: string;
  totalPrice?: string;
  costPerSticker?: string;
  calculatedArea?: number;
  timestamp?: string;
  cutLines?: string;
  marketplaceProduct?: {
    productId: string;
    productTitle: string;
    markupPercentage: number;
  };
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dxcnvqk6b';
const CLOUDINARY_UPLOAD_PRESET = 'sticker-uploads';

export const uploadToCloudinary = async (
  file: File,
  metadata?: CalculatorMetadata,
  onProgress?: (progress: UploadProgress) => void,
  folder?: string
): Promise<CloudinaryUploadResult> => {
  // Starting Cloudinary upload
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
  // Add folder if specified
  if (folder) {
    formData.append('folder', folder);
  }
  
  // Add metadata as context or tags
  if (metadata) {
    // Add timestamp to metadata
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString()
    };
    
    // Add metadata as context (key-value pairs for searching)
    const contextString = Object.entries(enrichedMetadata)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('|');
    
    if (contextString) {
      formData.append('context', contextString);
    }
    
    // Add tags for easier filtering
    const tags = [
      'sticker-orders',
      metadata.selectedCut?.toLowerCase().replace(/\s+/g, '-'),
      metadata.selectedMaterial?.toLowerCase().replace(/\s+/g, '-'),
      metadata.rushOrder ? 'rush-order' : 'standard-order',
      metadata.sendProof ? 'with-proof' : 'no-proof'
    ].filter(Boolean);
    
    formData.append('tags', tags.join(','));
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  try {
    const response = await new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          };
          onProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(xhr.responseText, { status: xhr.status }));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });

          // Response status check

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
          // Cloudinary upload successful
    
    // Return Cloudinary response in our expected format
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      original_filename: result.original_filename || file.name.split('.')[0],
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('💥 Cloudinary upload error:', error);
    throw error;
  }
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size (25MB limit)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 25MB' };
  }

  // Get file extension from filename
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();
  
  // Check file type - allow design files and images
  const allowedTypes = [
    // Standard images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Design files
    'application/postscript', // .ai, .eps files
    'application/illustrator', // .ai files
    'image/vnd.adobe.photoshop', // .psd files
    'application/octet-stream', // generic binary (often used for .psd, .ai)
    // PDF
    'application/pdf'
  ];
  
  // Also check by file extension as a fallback since MIME types can be unreliable for design files
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ai', 'eps', 'psd', 'pdf'];
  
  const typeAllowed = allowedTypes.includes(file.type);
  const extensionAllowed = fileExtension && allowedExtensions.includes(fileExtension);
  
  if (!typeAllowed && !extensionAllowed) {
    return { valid: false, error: 'File must be a design file (.ai, .eps, .psd, .svg) or image (.jpg, .png, .gif, .webp) or PDF' };
  }

  return { valid: true };
};

// Utility functions for AI file display in dashboard/admin

/**
 * Converts any Cloudinary URL (including AI files) to a web-displayable image
 * Automatically handles AI, EPS, PSD, PDF files by converting them to PNG/JPG
 */
export const getImageUrlForDisplay = (
  cloudinaryUrl: string, 
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'png' | 'jpg' | 'webp';
    crop?: 'fill' | 'fit' | 'scale' | 'limit';
  } = {}
): string => {
  if (!cloudinaryUrl || cloudinaryUrl.trim() === '' || !cloudinaryUrl.includes('cloudinary.com')) {
    return cloudinaryUrl || ''; // Return empty string if no URL
  }

  const {
    width = 400,
    height = 300,
    quality = 'auto',
    format = 'auto',
    crop = 'limit'
  } = options;

  // For AI, EPS, PSD, PDF files, Cloudinary automatically converts them
  // We just need to add the right transformation parameters
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `f_${format}`,
    `q_${quality}`
  ].join(',');

  // Insert transformations into the Cloudinary URL
  return cloudinaryUrl.replace(
    '/image/upload/',
    `/image/upload/${transformations}/`
  );
};

/**
 * Gets a thumbnail version of any file type for dashboard/admin lists
 */
export const getThumbnailUrl = (cloudinaryUrl: string): string => {
  return getImageUrlForDisplay(cloudinaryUrl, {
    width: 150,
    height: 150,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  });
};

/**
 * Gets a high-quality preview version for detailed views
 */
export const getPreviewUrl = (cloudinaryUrl: string): string => {
  return getImageUrlForDisplay(cloudinaryUrl, {
    width: 800,
    height: 600,
    crop: 'limit',
    quality: 'auto',
    format: 'auto'
  });
};

/**
 * Detects if a file is a design file (AI, EPS, PSD) that needs conversion
 */
export const isDesignFile = (filename: string): boolean => {
  if (!filename) return false;
  const designExtensions = ['ai', 'eps', 'psd'];
  const extension = filename.toLowerCase().split('.').pop();
  return designExtensions.includes(extension || '');
};

/**
 * Gets the appropriate display URL with a fallback for design files
 */
export const getDisplayUrl = (
  cloudinaryUrl: string, 
  filename: string,
  options?: Parameters<typeof getImageUrlForDisplay>[1]
): string => {
  if (!cloudinaryUrl || cloudinaryUrl.trim() === '') {
    return '';
  }
  
  if (isDesignFile(filename)) {
    // For design files, always use the conversion URL
    return getImageUrlForDisplay(cloudinaryUrl, options);
  } else {
    // For regular images, use the optimized URL
    if (cloudinaryUrl.includes('cloudinary.com')) {
      return cloudinaryUrl.replace(
        '/image/upload/',
        '/image/upload/f_auto,q_auto/'
      );
    } else {
      return cloudinaryUrl;
    }
  }
}; 