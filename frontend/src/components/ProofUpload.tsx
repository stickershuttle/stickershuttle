import React, { useState, useRef } from 'react';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '../utils/cloudinary';
import { useMutation, gql } from '@apollo/client';

// GraphQL mutation to add proof to order
const ADD_ORDER_PROOF = gql`
  mutation AddOrderProof($orderId: ID!, $proofData: OrderProofInput!) {
    addOrderProof(orderId: $orderId, proofData: $proofData) {
      id
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
      }
    }
  }
`;

// GraphQL mutation to send proofs
const SEND_PROOFS = gql`
  mutation SendProofs($orderId: ID!) {
    sendProofs(orderId: $orderId) {
      id
      proofs {
        id
        status
      }
    }
  }
`;

interface ProofFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  uploaded: boolean;
  cloudinaryResult?: CloudinaryUploadResult;
  error?: string;
}

interface ProofUploadProps {
  orderId: string;
  onProofUploaded?: (proof: any) => void;
}

export default function ProofUpload({ orderId, onProofUploaded }: ProofUploadProps) {
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [sendingProofs, setSendingProofs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [addOrderProof] = useMutation(ADD_ORDER_PROOF);
  const [sendProofs] = useMutation(SEND_PROOFS);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const newProofFiles: ProofFile[] = files.map(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: '',
          uploading: false,
          progress: 0,
          uploaded: false,
          error: validation.error
        };
      }

      const preview = URL.createObjectURL(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview,
        uploading: false,
        progress: 0,
        uploaded: false
      };
    });

    setProofFiles(prev => [...prev, ...newProofFiles]);
    
    // Auto-upload valid files
    newProofFiles.forEach(proofFile => {
      if (!proofFile.error) {
        uploadProof(proofFile.id);
      }
    });
  };

  const uploadProof = async (proofId: string) => {
    const proofFile = proofFiles.find(p => p.id === proofId);
    if (!proofFile || proofFile.error) return;

    // Update uploading state
    setProofFiles(prev => prev.map(p => 
      p.id === proofId ? { ...p, uploading: true, progress: 0 } : p
    ));

    try {
             // Upload to Cloudinary with "proofs" folder
       const cloudinaryResult = await uploadToCloudinary(
         proofFile.file,
         {
           // Add proof-specific metadata
           selectedCut: 'proof',
           selectedMaterial: 'proof',
           timestamp: new Date().toISOString()
         },
         (progress: UploadProgress) => {
           setProofFiles(prev => prev.map(p => 
             p.id === proofId ? { ...p, progress: progress.percentage } : p
           ));
         },
         'proofs' // Specify the folder
       );

      // Add folder prefix to public_id for organization
      const proofPublicId = `proofs/${cloudinaryResult.public_id}`;
      const proofUrl = cloudinaryResult.secure_url.replace(
        `/image/upload/`,
        `/image/upload/f_auto,q_auto/`
      );

      // Save to Supabase via GraphQL
      await addOrderProof({
        variables: {
          orderId,
          proofData: {
            proofUrl,
            proofPublicId,
            proofTitle: proofFile.file.name,
          }
        }
      });

      // Update state
      setProofFiles(prev => prev.map(p => 
        p.id === proofId ? { 
          ...p, 
          uploading: false, 
          uploaded: true, 
          cloudinaryResult,
          progress: 100 
        } : p
      ));

      if (onProofUploaded) {
        onProofUploaded({
          proofUrl,
          proofPublicId,
          proofTitle: proofFile.file.name
        });
      }

    } catch (error) {
      console.error('Error uploading proof:', error);
      setProofFiles(prev => prev.map(p => 
        p.id === proofId ? { 
          ...p, 
          uploading: false, 
          error: 'Failed to upload proof' 
        } : p
      ));
    }
  };

  const removeProof = (proofId: string) => {
    const proofFile = proofFiles.find(p => p.id === proofId);
    if (proofFile?.preview) {
      URL.revokeObjectURL(proofFile.preview);
    }
    setProofFiles(prev => prev.filter(p => p.id !== proofId));
  };

  const handleSendProofs = async () => {
    if (!hasUploadedProofs) return;
    
    setSendingProofs(true);
    try {
      await sendProofs({
        variables: { orderId }
      });
      
      // Show success message
      alert('Proofs sent to customer successfully!');
      
    } catch (error) {
      console.error('Error sending proofs:', error);
      alert('Failed to send proofs. Please try again.');
    } finally {
      setSendingProofs(false);
    }
  };

  const canAddMore = proofFiles.length < 25;
  const hasUploadedProofs = proofFiles.some(p => p.uploaded);

  return (
    <div className="space-y-4">
      {/* Upload Areas */}
      <div className="space-y-3">
        {/* Existing proof files */}
        {proofFiles.map((proofFile) => (
          <div
            key={proofFile.id}
            className="rounded-lg p-4 border transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: proofFile.error 
                ? '1px solid rgba(239, 68, 68, 0.5)' 
                : proofFile.uploaded 
                ? '1px solid rgba(34, 197, 94, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                {proofFile.preview ? (
                  <img 
                    src={proofFile.preview} 
                    alt="Proof preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{proofFile.file.name}</p>
                <p className="text-xs text-gray-400">
                  {(proofFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {/* Status */}
                {proofFile.error && (
                  <p className="text-xs text-red-400 mt-1">{proofFile.error}</p>
                )}
                
                {proofFile.uploading && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${proofFile.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{proofFile.progress}%</span>
                    </div>
                  </div>
                )}
                
                {proofFile.uploaded && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-green-400">Uploaded successfully</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <button
                onClick={() => removeProof(proofFile.id)}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                disabled={proofFile.uploading}
                title="Remove proof"
                aria-label="Remove proof"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Add new proof upload area */}
        {canAddMore && (
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
              dragOver 
                ? 'border-gray-400 bg-gray-500 bg-opacity-10' 
                : 'border-gray-600 hover:border-gray-500 hover:bg-white hover:bg-opacity-10'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">Upload Proof</h3>
              <p className="text-sm text-gray-400 mb-4">
                Drag and drop files here, or click to select
              </p>
              <div className="text-xs text-gray-500">
                Supports: .ai, .svg, .eps, .png, .jpg, .psd (max 10MB)
                <br />
                Up to {25 - proofFiles.length} more files allowed
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
        onChange={handleFileSelect}
        className="hidden"
        title="Select proof files"
        aria-label="Select proof files to upload"
      />

      {/* Send Proofs Button */}
      {hasUploadedProofs && (
        <div className="flex justify-center pt-4 border-t border-gray-700 border-opacity-30">
          <button
            onClick={handleSendProofs}
            disabled={sendingProofs}
            className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg text-white transition-all hover:bg-opacity-80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.4)'
            }}
          >
            {sendingProofs ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Proofs...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Proofs to Customer
              </>
            )}
          </button>
        </div>
      )}

      {/* Info */}
      {proofFiles.length > 0 && (
        <div className="text-xs text-gray-400 text-center">
          {proofFiles.length} of 25 proofs • {proofFiles.filter(p => p.uploaded).length} uploaded
        </div>
      )}
    </div>
  );
} 