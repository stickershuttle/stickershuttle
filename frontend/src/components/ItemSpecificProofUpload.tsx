import React, { useState, useCallback, useEffect } from 'react';
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from '../utils/cloudinary';
import { useMutation, gql } from '@apollo/client';

// GraphQL mutation to add proof to order with item ID
const ADD_ORDER_PROOF = gql`
  mutation AddOrderProof($orderId: ID!, $proofData: OrderProofInput!) {
    addOrderProof(orderId: $orderId, proofData: $proofData) {
      id
      proofs {
        id
        orderItemId
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        cutLines
      }
    }
  }
`;

interface ItemSpecificProofUploadProps {
  orderId: string;
  orderItem: {
    id: string;
    productName: string;
    quantity: number;
    calculatorSelections?: any;
  };
  onProofUploaded?: (proof: any) => void;
  isAdmin?: boolean;
  defaultCutLines?: string[];
  existingProofs?: any[];
  renderChildren?: () => React.ReactNode;
  itemNumber?: number;
}

interface UploadState {
  isDragOver: boolean;
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export default function ItemSpecificProofUpload({ 
  orderId, 
  orderItem, 
  onProofUploaded, 
  isAdmin = false,
  defaultCutLines = ['green'],
  existingProofs = [],
  renderChildren,
  itemNumber
}: ItemSpecificProofUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragOver: false,
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  });

  const [addOrderProof] = useMutation(ADD_ORDER_PROOF);

  // Check if this item already has proofs
  const itemProofs = existingProofs.filter(proof => proof.orderItemId === orderItem.id);
  const hasProofs = itemProofs.length > 0;

  // Debug: Add document-level drag listeners to see if events are firing
  useEffect(() => {
    const handleDocDragEnter = (e: DragEvent) => {
      console.log('📄 Document drag enter, target:', e.target);
    };
    
    const handleDocDragOver = (e: DragEvent) => {
      e.preventDefault(); // Prevent default to allow drop
    };

    document.addEventListener('dragenter', handleDocDragEnter);
    document.addEventListener('dragover', handleDocDragOver);

    return () => {
      document.removeEventListener('dragenter', handleDocDragEnter);
      document.removeEventListener('dragover', handleDocDragOver);
    };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, isDragOver: true }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set the dropEffect to copy to show the correct cursor
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, isDragOver: false }));
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setUploadState(prev => ({ ...prev, isDragOver: false }));
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      return;
    }
    
    // Take the first file only
    const file = files[0];
    await uploadProofForItem(file);
  }, []);

  const uploadProofForItem = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadState(prev => ({ ...prev, error: validation.error || 'Invalid file' }));
      setTimeout(() => setUploadState(prev => ({ ...prev, error: null })), 3000);
      return;
    }

    setUploadState(prev => ({ 
      ...prev, 
      isUploading: true, 
      progress: 0, 
      error: null, 
      success: false 
    }));

    try {
      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        file,
        {
          selectedCut: 'proof',
          selectedMaterial: 'proof',
          timestamp: new Date().toISOString(),
          cutLines: defaultCutLines.join(',')
        },
        (progress: UploadProgress) => {
          setUploadState(prev => ({ ...prev, progress: progress.percentage }));
        }
      );

      // Save to backend with orderItemId
      const result = await addOrderProof({
        variables: {
          orderId,
          proofData: {
            proofUrl: cloudinaryResult.secure_url,
            proofPublicId: cloudinaryResult.public_id,
            proofTitle: file.name,
            // This is the key part - assign to specific order item
            orderItemId: orderItem.id
          }
        }
      });

      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        success: true, 
        progress: 100 
      }));

      // Call the callback to refresh the parent component
      if (onProofUploaded) {
        const newProof = result.data?.addOrderProof?.proofs?.find((p: any) => p.proofTitle === file.name);
        onProofUploaded(newProof);
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }));
      }, 3000);

    } catch (error) {
      console.error('Error uploading proof:', error);
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }));
      setTimeout(() => setUploadState(prev => ({ ...prev, error: null })), 3000);
    }
  };

  const getDropZoneStyle = () => {
    // For custom children (renderChildren), only show effects during interactions
    if (renderChildren) {
      if (uploadState.success) {
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '2px solid rgba(34, 197, 94, 0.4)',
          boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
          borderRadius: '8px'
        };
      }
      
      if (uploadState.error) {
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
          borderRadius: '8px'
        };
      }
      
      if (uploadState.isDragOver) {
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          border: '2px solid rgba(59, 130, 246, 0.6)',
          boxShadow: '0 0 25px rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          transform: 'scale(1.01)'
        };
      }
      
      // When wrapping existing content, no default styling
      return {};
    }

    // Original styling for standalone component
    if (uploadState.success) {
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        border: '2px solid rgba(34, 197, 94, 0.4)',
        boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
      };
    }
    
    if (uploadState.error) {
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '2px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
      };
    }
    
    if (uploadState.isDragOver) {
      return {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        border: '2px solid rgba(59, 130, 246, 0.6)',
        boxShadow: '0 0 25px rgba(59, 130, 246, 0.3)',
        transform: 'scale(1.02)'
      };
    }
    
    if (hasProofs) {
      return {
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
        border: '1px solid rgba(147, 51, 234, 0.2)'
      };
    }
    
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    };
  };

  return (
    <div
      className="relative transition-all duration-300"
      style={{ 
        ...(renderChildren ? getDropZoneStyle() : {}),
        position: 'relative',
        zIndex: 10
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}

      data-drop-zone="item-specific"
      data-item-id={orderItem.id}
      data-item-name={orderItem.productName}
    >
      {/* Render custom children if provided, otherwise show default content */}
      {renderChildren ? (
        renderChildren()
      ) : (
        <div className="p-4 rounded-lg">
          {/* Product Info */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h4 className="text-white font-medium">{orderItem.productName}</h4>
              <p className="text-gray-400 text-sm">Quantity: {orderItem.quantity}</p>
              {orderItem.calculatorSelections?.size?.displayValue && (
                <p className="text-gray-400 text-xs">
                  Size: {orderItem.calculatorSelections.size.displayValue}
                </p>
              )}
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              {hasProofs && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">
                  {itemProofs.length} proof{itemProofs.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drag Zone Overlay */}
      {uploadState.isDragOver && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-blue-500/30 rounded-lg border-2 border-dashed border-blue-400 backdrop-blur-sm z-50"
          style={{ 
            pointerEvents: 'none',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)'
          }}
        >
          <div className="text-center">
            <svg className="w-12 h-12 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-blue-300 font-bold text-base">Drop proof for Item #{itemNumber}</p>
            <p className="text-blue-200 text-sm">{orderItem.productName}</p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3">
              <svg className="w-16 h-16 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-white font-medium text-sm">Uploading...</p>
            <div className="w-24 bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p className="text-gray-300 text-xs mt-1">{uploadState.progress}%</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadState.success && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg backdrop-blur-sm">
          <div className="text-center">
            <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-300 font-medium text-sm">Proof uploaded!</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadState.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg backdrop-blur-sm">
          <div className="text-center">
            <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-300 font-medium text-sm">{uploadState.error}</p>
          </div>
        </div>
      )}

      {/* Drop Zone Instructions - only show for default content */}
      {!renderChildren && !uploadState.isDragOver && !uploadState.isUploading && !uploadState.success && !uploadState.error && (
        <div className="text-center py-2">
          {hasProofs ? (
            <p className="text-purple-300 text-xs">
              <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Has proofs • Drop to add more
            </p>
          ) : (
            <p className="text-gray-400 text-xs">
              <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Drop proof file here
            </p>
          )}
        </div>
      )}
    </div>
  );
} 