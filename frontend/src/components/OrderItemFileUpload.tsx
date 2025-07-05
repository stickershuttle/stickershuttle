import React, { useState, useRef, useCallback } from 'react';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '../utils/cloudinary';
import { useMutation, gql } from '@apollo/client';

// GraphQL mutation to update order item files
const UPDATE_ORDER_ITEM_FILES = gql`
  mutation UpdateOrderItemFiles($orderId: ID!, $itemId: ID!, $customFiles: [String!]!) {
    updateOrderItemFiles(orderId: $orderId, itemId: $itemId, customFiles: $customFiles) {
      id
      items {
        id
        customFiles
      }
    }
  }
`;

interface OrderItemFileUploadProps {
  orderId: string;
  itemId: string;
  onUploadComplete?: (fileUrl: string) => void;
  className?: string;
}

export default function OrderItemFileUpload({ 
  orderId, 
  itemId, 
  onUploadComplete,
  className = ''
}: OrderItemFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [updateOrderItemFiles] = useMutation(UPDATE_ORDER_ITEM_FILES);

  const handleFileUpload = async (file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setTimeout(() => setUploadError(null), 3000);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        file,
        {
          selectedCut: 'order-artwork',
          selectedMaterial: 'order-upload',
          timestamp: new Date().toISOString()
        },
        (progress: UploadProgress) => {
          setUploadProgress(progress.percentage);
        },
        'order-artwork'
      );

      // Update order item with the new file
      await updateOrderItemFiles({
        variables: {
          orderId,
          itemId,
          customFiles: [result.secure_url]
        }
      });

      // Show success state
      setUploadSuccess(true);
      setIsUploading(false);
      setUploadProgress(0);
      
      // Call callback if provided
      if (onUploadComplete) {
        onUploadComplete(result.secure_url);
      }
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
      setTimeout(() => setUploadError(null), 3000);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          w-full h-full min-h-[100px] rounded-lg border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center transition-all duration-200 p-4
          ${uploadSuccess
            ? 'border-green-400 bg-green-400/10'
            : isDragOver 
            ? 'border-blue-400 bg-blue-400/10 scale-105' 
            : 'border-gray-500 hover:border-gray-400 hover:bg-white/5'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{
          background: uploadSuccess 
            ? 'rgba(34, 197, 94, 0.1)' 
            : isDragOver 
            ? 'rgba(59, 130, 246, 0.1)' 
            : 'rgba(255, 255, 255, 0.02)',
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="text-center">
            <div className="text-blue-400 text-sm font-medium mb-2">
              Uploading... {uploadProgress}%
            </div>
            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : uploadSuccess ? (
          <div className="text-center">
            <svg 
              className="w-12 h-12 text-green-400 mx-auto mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
            <div className="text-green-400 font-medium text-sm">Upload Complete!</div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
            <div className="space-y-1">
              <div className="text-white font-medium text-sm">Upload Your Design</div>
              <div className="text-gray-400 text-xs">Drop files here or click to browse</div>
              <div className="text-gray-500 text-xs">AI, SVG, EPS, PNG, JPG, PSD, PDF</div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
        title="Select artwork file to upload"
        aria-label="Select artwork file to upload"
      />

      {/* Error message */}
      {uploadError && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-xs">
          {uploadError}
        </div>
      )}
      
      {/* Success message */}
      {uploadSuccess && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-green-500/20 border border-green-500/30 rounded text-green-300 text-xs text-center">
          ✅ Uploaded! Admin notified
        </div>
      )}


    </div>
  );
} 