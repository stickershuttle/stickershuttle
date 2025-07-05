import React, { useState } from 'react';
import { getDisplayUrl, getThumbnailUrl, getPreviewUrl, isDesignFile } from '../utils/cloudinary';

interface AIFileImageProps {
  src: string;
  filename: string;
  alt?: string;
  className?: string;
  size?: 'thumbnail' | 'preview' | 'custom';
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  crop?: 'fill' | 'fit' | 'scale' | 'limit';
  onClick?: () => void;
  showFileType?: boolean;
}

/**
 * AIFileImage Component
 * 
 * Automatically displays AI, EPS, PSD, PDF, and other design files as images
 * by leveraging Cloudinary's automatic conversion capabilities.
 * 
 * Features:
 * - Automatically detects design files (AI, EPS, PSD)
 * - Converts them to web-displayable images
 * - Provides thumbnail and preview size presets
 * - Shows file type badge for design files
 * - Handles loading and error states
 */
export default function AIFileImage({
  src,
  filename,
  alt = 'Design file',
  className = '',
  size = 'custom',
  width,
  height,
  quality = 'auto',
  crop = 'limit',
  onClick,
  showFileType = false
}: AIFileImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get the appropriate display URL based on size preset or custom options
  const getImageUrl = () => {
    switch (size) {
      case 'thumbnail':
        return getThumbnailUrl(src);
      case 'preview':
        return getPreviewUrl(src);
      case 'custom':
      default:
        return getDisplayUrl(src, filename, {
          width,
          height,
          quality,
          crop
        });
    }
  };

  const imageUrl = getImageUrl();
  const isDesign = isDesignFile(filename);
  const fileExtension = filename.toLowerCase().split('.').pop();

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: open original file in new tab
      window.open(src, '_blank');
    }
  };

  return (
    <div className={`relative ${className}`} onClick={handleClick}>
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-none rounded text-gray-400">
          <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs"></span>
        </div>
      )}

      {/* Main Image */}
      {!error && (
        <img
          src={imageUrl}
          alt={alt}
          className={`w-full h-full object-contain ${onClick ? 'cursor-pointer' : ''} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* File Type Badge */}
      {showFileType && isDesign && (
        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {fileExtension?.toUpperCase()}
        </div>
      )}


    </div>
  );
}

// Export individual utility functions for direct use
export {
  getDisplayUrl,
  getThumbnailUrl,
  getPreviewUrl,
  isDesignFile
} from '../utils/cloudinary'; 