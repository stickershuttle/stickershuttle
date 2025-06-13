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
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dxcnvqk6b';
const CLOUDINARY_UPLOAD_PRESET = 'sticker-uploads';

export const uploadToCloudinary = async (
  file: File,
  metadata?: CalculatorMetadata,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> => {
  console.log('🚀 Starting Cloudinary upload...');
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
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

    console.log('📊 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Cloudinary upload successful:', result);
    
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
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/svg+xml',
    'application/postscript', // .ai, .eps
    'image/vnd.adobe.photoshop', // .psd
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check file extension for formats that might not have proper MIME types
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ['.ai', '.svg', '.eps', '.png', '.jpg', '.jpeg', '.psd'].some(ext => 
    fileName.endsWith(ext)
  );

  if (!allowedTypes.includes(file.type) && !hasValidExtension) {
    return { valid: false, error: 'File type not supported. Please use .ai, .svg, .eps, .png, .jpg, or .psd files' };
  }

  return { valid: true };
}; 