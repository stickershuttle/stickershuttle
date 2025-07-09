import React, { useState, useRef } from 'react';
import AIFileImage from './AIFileImage';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '../utils/cloudinary';

interface FileUploadToEmailProps {
  userData: {
    email: string;
    name?: string;
  };
  onUploadComplete?: (success: boolean) => void;
}

interface UploadedFileInfo {
  file: File;
  cloudinaryResult: CloudinaryUploadResult;
  name: string;
  size: number;
  type: string;
}

export default function FileUploadToEmail({ userData, onUploadComplete }: FileUploadToEmailProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported file types (matching calculator)
  const supportedTypes = [
    '.ai', '.psd', '.svg', '.eps', // Design files
    '.png', '.jpg', '.jpeg', '.gif', '.webp', // Images
    '.pdf' // PDF files
  ];

  const handleFileUpload = async (file: File) => {
    // Reset previous states
    setUploadError(null);
    setUploadProgress(null);
    
    // Validate file using the same function as calculator
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload to Cloudinary for preview (like calculator does)
      // Use 'support-files' folder to separate from order files
      const result = await uploadToCloudinary(
        file, 
        {
          // Add minimal metadata to identify as support file
          timestamp: new Date().toISOString()
        },
        (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
        'support-files'
      );
      
      // Store both original file and Cloudinary result
      const fileInfo: UploadedFileInfo = {
        file, // Original file for email sending
        cloudinaryResult: result, // Cloudinary URL for preview
        name: file.name,
        size: file.size,
        type: file.type
      };
      
      setUploadedFile(fileInfo);
      console.log('File uploaded for preview:', fileInfo.name);
    } catch (error) {
      console.error('File upload failed:', error);
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setUploadError(null);
    setUploadProgress(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendFile = async () => {
    if (!uploadedFile) return;

    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file); // Send original file
      formData.append('userData', JSON.stringify(userData));
      if (message.trim()) {
        formData.append('message', message.trim());
      }

      const response = await fetch('/api/upload-to-email', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert(`File "${uploadedFile.name}" sent successfully to orbit@stickershuttle.com!`);
        setMessage(''); // Clear message after successful send
        removeUploadedFile(); // Clear the uploaded file
        onUploadComplete?.(true);
      } else {
        throw new Error(result.error || 'Send failed');
      }
    } catch (error: any) {
      console.error('Send error:', error);
      alert(`Send failed: ${error.message}`);
      onUploadComplete?.(false);
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type icon based on format
  const getFileTypeIcon = (format: string) => {
    const icons: { [key: string]: string } = {
      'ai': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/ai-icon_hbqxvs.png',
      'psd': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/psd-icon_hbqxvs.png',
      'svg': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/svg-icon_hbqxvs.png',
      'eps': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/eps-icon_hbqxvs.png',
      'pdf': 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751422400/pdf-icon_hbqxvs.png'
    };
    return icons[format.toLowerCase()] || null;
  };

  return (
    <div className="space-y-4">
      {/* Message Input */}
      <div>
        <label htmlFor="fileMessage" className="block text-sm font-medium text-gray-300 mb-2">
          Message (Optional)
        </label>
        <textarea
          id="fileMessage"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message to accompany your file..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
          disabled={isSending}
        />
      </div>

      {/* File Upload/Preview Area */}
      <div>
        {!uploadedFile ? (
          <div 
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md relative"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
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
                <p className="text-white font-medium text-base mb-2 hidden md:block">Drag or click to select your file</p>
                <p className="text-white font-medium text-base mb-2 md:hidden">Tap to select file</p>
                <p className="text-white/80 text-sm">Design files, images, PDFs • Max: 10MB</p>
              </div>
            )}
            
            {/* Drag overlay */}
            {dragActive && (
              <div className="absolute inset-0 bg-purple-500/20 border-2 border-purple-400 rounded-xl flex items-center justify-center">
                <p className="text-purple-300 text-lg font-medium">Drop your file here</p>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-green-400/50 rounded-xl p-4 bg-green-500/10 backdrop-blur-md">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative z-10">
                  <AIFileImage
                    src={uploadedFile.cloudinaryResult.secure_url}
                    filename={uploadedFile.cloudinaryResult.original_filename}
                    alt={uploadedFile.name}
                    className="w-full h-full object-cover rounded-lg relative z-10"
                    size="thumbnail"
                    showFileType={false}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-green-200 font-medium break-words">{uploadedFile.name}</p>
                  
                  {/* File Information - matching calculator format */}
                  <div className="space-y-2 mt-2">
                    <div className="flex flex-wrap items-center gap-3 text-green-300/80 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="text-green-400">📏</span>
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-green-400">🎨</span>
                        {uploadedFile.cloudinaryResult.format.toUpperCase()}
                      </span>
                      {uploadedFile.cloudinaryResult.width && uploadedFile.cloudinaryResult.height && (
                        <span className="flex items-center gap-1">
                          <span className="text-green-400">📐</span>
                          {uploadedFile.cloudinaryResult.width}x{uploadedFile.cloudinaryResult.height}px
                        </span>
                      )}
                    </div>
                    
                    {/* File Type Icon */}
                    {getFileTypeIcon(uploadedFile.cloudinaryResult.format) && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={getFileTypeIcon(uploadedFile.cloudinaryResult.format)!} 
                          alt={`${uploadedFile.cloudinaryResult.format.toUpperCase()} file`}
                          className="w-6 h-6 object-contain opacity-80"
                        />
                        <span className="text-xs text-green-300/60">
                          Professional design file detected
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload Success Message */}
                  <div className="flex items-center gap-2 text-green-300 text-sm mt-2">
                    <span className="text-green-400">✅</span>
                    <span>File uploaded successfully!</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-300 hover:text-blue-200 p-2 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                  title="Replace file"
                  disabled={isSending}
                >
                  🔄
                </button>
                <button
                  onClick={removeUploadedFile}
                  className="text-red-300 hover:text-red-200 p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                  disabled={isSending}
                >
                  🗑️
                </button>
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
      </div>

      {/* Send Button - Only show when file is uploaded, aligned left */}
      {uploadedFile && (
        <div className="flex justify-start">
          <button
            onClick={handleSendFile}
            disabled={isSending}
            className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            style={{
              background: isSending 
                ? 'rgba(102, 102, 102, 0.5)' 
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: isSending 
                ? 'none' 
                : 'rgba(59, 130, 246, 0.15) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            }}
          >
            {isSending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send to Support
              </>
            )}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={supportedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading || isSending}
        aria-label="Upload file to support team"
      />

      {/* Info Section */}
      <div 
        className="p-4 rounded-lg border"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-white mb-2">How it works:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Upload your file and add an optional message</li>
              <li>• Click "Send to Support" to email it to orbit@stickershuttle.com</li>
              <li>• Our team will review your file and respond via email</li>
              <li>• Supported: Design files (.ai, .psd, .eps), images, PDFs (10MB max)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 