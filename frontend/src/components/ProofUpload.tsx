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

// GraphQL mutation to replace proof file
const REPLACE_PROOF_FILE = gql`
  mutation ReplaceProofFile($orderId: ID!, $proofId: ID!, $newProofData: OrderProofInput!) {
    replaceProofFile(orderId: $orderId, proofId: $proofId, newProofData: $newProofData) {
      id
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        replacedAt
        uploadedBy
        status
      }
    }
  }
`;

// GraphQL mutation to remove proof
const REMOVE_PROOF = gql`
  mutation RemoveProof($orderId: ID!, $proofId: ID!) {
    removeProof(orderId: $orderId, proofId: $proofId) {
      id
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
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
  proofStatus?: string;
  existingProofs?: any[];
  isAdmin?: boolean; // Flag to show admin-only features
}

export default function ProofUpload({ orderId, onProofUploaded, proofStatus, existingProofs = [], isAdmin = false }: ProofUploadProps) {
  console.log('🏗️ ProofUpload component mounted with:', {
    orderId,
    proofStatus,
    existingProofsCount: existingProofs.length,
    existingProofs
  });
  
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const [selectedCutLines, setSelectedCutLines] = useState<string[]>(['green']); // Default to green selected
  const [sendingProofs, setSendingProofs] = useState(false);
  const [proofsSent, setProofsSent] = useState(false);
  const [removingProof, setRemovingProof] = useState<string | null>(null);
  const [replacingProof, setReplacingProof] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  
  const [addOrderProof] = useMutation(ADD_ORDER_PROOF);
  const [sendProofs] = useMutation(SEND_PROOFS);
  const [replaceProofFile] = useMutation(REPLACE_PROOF_FILE);
  const [removeProof] = useMutation(REMOVE_PROOF);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('🎯 Drag over');
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('🎯 Drag leave');
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('📥 Drop event triggered');
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    console.log('📥 Dropped files:', files.length, files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 handleFileSelect triggered');
    if (e.target.files) {
      const files = Array.from(e.target.files);
      console.log('📁 Files selected:', files.length, files);
      handleFiles(files);
      // Clear the input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleFiles = (files: File[]) => {
    console.log('🔄 handleFiles called with', files.length, 'files');
    
    const newProofFiles: ProofFile[] = files.map(file => {
      console.log('📄 Processing file:', file.name, file.type, file.size);
      
      const validation = validateFile(file);
      console.log('✅ Validation result for', file.name, ':', validation);
      
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

    console.log('📦 New proof files created:', newProofFiles);
    setProofFiles(prev => [...prev, ...newProofFiles]);
    
    // Auto-upload valid files
    newProofFiles.forEach(proofFile => {
      if (!proofFile.error) {
        console.log('🚀 Auto-uploading file:', proofFile.file.name);
        uploadProof(proofFile);
      } else {
        console.log('❌ Skipping upload for file with error:', proofFile.file.name, proofFile.error);
      }
    });
  };

  const uploadProof = async (proofFileParam: ProofFile) => {
    console.log('📤 uploadProof called with file:', proofFileParam.file.name);
    
    if (!proofFileParam || proofFileParam.error) {
      console.log('❌ Upload aborted - file not found or has error');
      return;
    }

    const proofId = proofFileParam.id;

    // Update uploading state
    setProofFiles(prev => prev.map(p => 
      p.id === proofId ? { ...p, uploading: true, progress: 0 } : p
    ));

    // Check for CutContour1 layer if it's a PDF
    let cutContourInfo = null;
    if (proofFileParam.file.type === 'application/pdf' || proofFileParam.file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const { analyzePDFForCutLines } = await import('../utils/pdf-layer-detection');
        cutContourInfo = await analyzePDFForCutLines(proofFileParam.file);
        
        if (cutContourInfo.hasCutLines && cutContourInfo.layerInfo.cutContourDimensions) {
          const dims = cutContourInfo.layerInfo.cutContourDimensions;
          console.log(`🎯 ADMIN: CutContour1 layer detected in ${proofFileParam.file.name}`);
          console.log(`📏 ADMIN: Cut dimensions: ${dims.widthInches}" × ${dims.heightInches}"`);
          console.log(`📊 ADMIN: Bounding box: x=${dims.boundingBox.x}, y=${dims.boundingBox.y}, w=${dims.boundingBox.width}, h=${dims.boundingBox.height}`);
          
          // Show admin notification
          if (isAdmin) {
            alert(`✅ CutContour1 Layer Detected!\n\nDimensions: ${dims.widthInches}" × ${dims.heightInches}"\n\nBounding Box:\nX: ${dims.boundingBox.x}\nY: ${dims.boundingBox.y}\nWidth: ${dims.boundingBox.width} pts\nHeight: ${dims.boundingBox.height} pts`);
          }
        } else {
          console.log(`⚠️ ADMIN: No CutContour1 layer found in ${proofFileParam.file.name}`);
          if (isAdmin) {
            console.log(`📋 ADMIN: Available layers: ${cutContourInfo.layerInfo.layerNames.join(', ') || 'None'}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not analyze PDF for cut contours:', error);
      }
    }

    try {
      // Upload to Cloudinary with "proofs" folder
      console.log('📤 Uploading proof to Cloudinary folder: proofs');
      const cloudinaryResult = await uploadToCloudinary(
        proofFileParam.file,
        {
          // Add proof-specific metadata
          selectedCut: 'proof',
          selectedMaterial: 'proof',
          timestamp: new Date().toISOString(),
          cutLines: selectedCutLines.join(',') // Include selected cut lines
        },
        (progress: UploadProgress) => {
          setProofFiles(prev => prev.map(p => 
            p.id === proofId ? { ...p, progress: progress.percentage } : p
          ));
        },
        'proofs' // Specify the folder
      );
      
      console.log('✅ Proof uploaded to Cloudinary:', {
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url,
        folder: 'proofs'
      });

      // Add folder prefix to public_id for organization
      const proofPublicId = cloudinaryResult.public_id; // Don't add proofs/ prefix - it's already included
      const proofUrl = cloudinaryResult.secure_url.replace(
        `/image/upload/`,
        `/image/upload/f_auto,q_auto/`
      );

      console.log('📁 Saving proof with:', {
        proofUrl,
        proofPublicId,
        orderId
      });

      // Save to Supabase via GraphQL
      await addOrderProof({
        variables: {
          orderId,
          proofData: {
            proofUrl,
            proofPublicId,
            proofTitle: proofFileParam.file.name,
          }
        }
      });

      // Remove the temporary upload item since it's now saved to database
      setProofFiles(prev => prev.filter(p => p.id !== proofId));

      if (onProofUploaded) {
        onProofUploaded({
          proofUrl,
          proofPublicId,
          proofTitle: proofFileParam.file.name
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

  const removeProofFile = (proofId: string) => {
    const proofFile = proofFiles.find(p => p.id === proofId);
    if (proofFile?.preview) {
      URL.revokeObjectURL(proofFile.preview);
    }
    setProofFiles(prev => prev.filter(p => p.id !== proofId));
  };

  // Handle removing existing proof from database
  const handleRemoveExistingProof = async (proofId: string) => {
    setRemovingProof(proofId);
    try {
      await removeProof({
        variables: {
          orderId,
          proofId
        }
      });
      
      if (onProofUploaded) {
        onProofUploaded({ removed: true, proofId });
      }
    } catch (error) {
      console.error('Error removing proof:', error);
      alert('Failed to remove proof. Please try again.');
    } finally {
      setRemovingProof(null);
    }
  };

  const handleSendProofs = async () => {
    if (!hasAnyProofs) return;
    
    setSendingProofs(true);
    try {
      await sendProofs({
        variables: { orderId }
      });
      
      // Successfully sent - update state to show View Proofs button
      setProofsSent(true);
      
    } catch (error) {
      console.error('Error sending proofs:', error);
      alert('Failed to send proofs. Please try again.');
    } finally {
      setSendingProofs(false);
    }
  };

  // Helper function to format date and time for accountability
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Handle proof replacement
  const handleReplaceProof = async (proofId: string, file: File) => {
    console.log('🔄 Replacing proof:', proofId, 'with file:', file.name);
    setReplacingProof(proofId);
    
    try {
      // Upload new file to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        file,
        {
          selectedCut: 'proof',
          selectedMaterial: 'proof',
          timestamp: new Date().toISOString(),
          cutLines: selectedCutLines.join(',') // Include selected cut lines
        },
        (progress) => console.log('Upload progress:', progress.percentage + '%'),
        'proofs'
      );

      const proofUrl = cloudinaryResult.secure_url.replace(
        `/image/upload/`,
        `/image/upload/f_auto,q_auto/`
      );

      // Replace proof file via GraphQL
      await replaceProofFile({
        variables: {
          orderId,
          proofId,
          newProofData: {
            proofUrl,
            proofPublicId: cloudinaryResult.public_id, // Don't add proofs/ prefix - it's already included
            proofTitle: file.name,
          }
        }
      });

      if (onProofUploaded) {
        onProofUploaded({ replaced: true, proofId });
      }

    } catch (error) {
      console.error('Error replacing proof:', error);
      alert('Failed to replace proof. Please try again.');
    } finally {
      setReplacingProof(null);
    }
  };

  // Handle file selection for replacement
  const handleReplaceFileSelect = (proofId: string) => {
    setReplacingProof(proofId);
    if (replaceFileInputRef.current) {
      // Clear previous event handler to prevent duplicates
      replaceFileInputRef.current.onchange = null;
      replaceFileInputRef.current.value = ''; // Clear previous selection
      
      replaceFileInputRef.current.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const validation = validateFile(file);
          if (validation.valid) {
            handleReplaceProof(proofId, file);
          } else {
            alert(validation.error);
            setReplacingProof(null);
          }
        }
        // Clear the input after handling
        e.target.value = '';
      };
      replaceFileInputRef.current.click();
    }
  };

  // Get status color for proof
  const getProofStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'changes_requested':
        return 'text-yellow-400';
      case 'sent':
        return 'text-blue-400';
      case 'pending':
      default:
        return 'text-purple-400';
    }
  };

  // Get status display text
  const getProofStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'changes_requested':
        return 'Changes Requested';
      case 'sent':
        return 'Sent to Customer';
      case 'pending':
      default:
        return 'Ready to Send';
    }
  };

  const canAddMore = proofFiles.length + (existingProofs?.length || 0) < 25;
  const hasUploadedProofs = proofFiles.some(p => p.uploaded);
  const hasExistingProofs = existingProofs && existingProofs.length > 0;
  const hasAnyProofs = hasUploadedProofs || hasExistingProofs;

  return (
    <div className="space-y-6">
      {/* Cut Line Selection - Simplified */}
      {isAdmin && (
        <div className="mb-6 p-4 rounded-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-sm font-medium text-white">Cut Line Options</h3>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Include cut lines in proofs:</span>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedCutLines(prev => 
                  prev.includes('green') 
                    ? prev.filter(c => c !== 'green')
                    : [...prev, 'green']
                )}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  selectedCutLines.includes('green')
                    ? 'bg-green-500/20 text-green-300 border-green-400/50'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/50 hover:border-gray-400/50'
                }`}
              >
                Green Cut Line
              </button>
              <button
                onClick={() => setSelectedCutLines(prev => 
                  prev.includes('grey') 
                    ? prev.filter(c => c !== 'grey')
                    : [...prev, 'grey']
                )}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  selectedCutLines.includes('grey')
                    ? 'bg-gray-500/20 text-gray-300 border-gray-400/50'
                    : 'bg-gray-600/20 text-gray-500 border-gray-600/50 hover:border-gray-500/50'
                }`}
              >
                Grey Cut Line
              </button>
            </div>
          </div>
          
          {selectedCutLines.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedCutLines.includes('green') && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 border-2 border-green-500 rounded"></div>
                  <span className="text-green-400">Green cut-line indicates where the sticker will be cut</span>
                </div>
              )}
              {selectedCutLines.includes('grey') && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 border-2 border-gray-400 rounded"></div>
                  <span className="text-gray-400">Grey cut-line indicates where the sticker will be cut</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Areas */}
      <div className="space-y-3">
        {/* Existing proofs from database */}
        {existingProofs && existingProofs.map((proof) => (
          <div
            key={proof.id}
            className={`rounded-lg p-4 border transition-all ${proof.replaced ? 'ring-2 ring-orange-400 ring-opacity-50' : ''}`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${proof.replaced ? 'rgba(251, 146, 60, 0.8)' : // Orange for replaced
                                 proof.status === 'approved' ? 'rgba(34, 197, 94, 0.5)' : 
                                 proof.status === 'changes_requested' ? 'rgba(251, 191, 36, 0.5)' : 
                                 proof.status === 'sent' ? 'rgba(59, 130, 246, 0.5)' : 
                                 'rgba(156, 163, 175, 0.3)'}`
            }}
          >
            <div className="flex items-start gap-4">
              {/* Preview */}
                              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  {proof.proofUrl ? (
                    proof.proofUrl.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-8 h-8 text-red-500 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                          </svg>
                          <span className="text-xs text-red-600 font-medium">PDF</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={proof.proofUrl}
                        alt="Proof preview" 
                        className="w-full h-full object-contain cursor-pointer p-4"
                        onClick={() => window.open(proof.proofUrl, '_blank')}
                      />
                    )
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
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{proof.proofTitle || 'Design Proof'}</p>
                      {proof.replaced && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                          Replaced
                        </span>
                      )}
                    </div>
                    
                    {/* Detailed timestamp for accountability */}
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-gray-400">
                        <span className="font-medium">Uploaded:</span> {formatDateTime(proof.uploadedAt)}
                      </p>
                      {proof.replacedAt && (
                        <p className="text-xs text-yellow-400">
                          <span className="font-medium">Replaced:</span> {formatDateTime(proof.replacedAt)}
                        </p>
                      )}
                      {proof.approvedAt && (
                        <p className="text-xs text-green-400">
                          <span className="font-medium">Approved:</span> {formatDateTime(proof.approvedAt)}
                        </p>
                      )}
                      {proof.changesRequestedAt && (
                        <p className="text-xs text-yellow-400">
                          <span className="font-medium">Changes Requested:</span> {formatDateTime(proof.changesRequestedAt)}
                        </p>
                      )}
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2 mt-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          proof.status === 'approved' ? 'bg-green-400' :
                          proof.status === 'changes_requested' ? 'bg-yellow-400' :
                          proof.status === 'sent' ? 'bg-blue-400' : 'bg-purple-400'
                        }`}
                      />
                      <span className={`text-xs font-medium ${getProofStatusColor(proof.status)}`}>
                        {getProofStatusText(proof.status)}
                      </span>
                    </div>

                    {/* Notes display */}
                    {proof.adminNotes && (
                      <div className="mt-2 p-2 bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-20 rounded text-xs">
                        <p className="text-blue-300 font-medium">Admin Notes:</p>
                        <p className="text-gray-300 mt-1">{proof.adminNotes}</p>
                      </div>
                    )}
                    {proof.customerNotes && (
                      <div className="mt-2 p-2 bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-20 rounded text-xs">
                        <p className="text-purple-300 font-medium">Customer Notes:</p>
                        <p className="text-gray-300 mt-1">{proof.customerNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Only show for admin */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleReplaceFileSelect(proof.id)}
                        disabled={replacingProof === proof.id}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all disabled:opacity-50 cursor-pointer hover:scale-105"
                        title="Replace proof"
                      >
                        {replacingProof === proof.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveExistingProof(proof.id)}
                        disabled={removingProof === proof.id}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 cursor-pointer hover:scale-105"
                        title="Remove proof"
                      >
                        {removingProof === proof.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* New proof files being uploaded */}
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
                {proofFile.file.type === 'application/pdf' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-6 h-6 text-red-500 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                      </svg>
                    </div>
                  </div>
                ) : proofFile.preview ? (
                  <img 
                    src={proofFile.preview} 
                    alt="Proof preview" 
                    className="w-full h-full object-contain p-4"
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
                  {(proofFile.file.size / 1024 / 1024).toFixed(2)} MB • Uploaded: {formatDateTime(new Date().toISOString())}
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
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="text-xs text-blue-400">Ready to Send</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <button
                onClick={() => removeProofFile(proofFile.id)}
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
              dragActive 
                ? 'border-gray-400' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            style={{
              backgroundColor: dragActive ? 'rgba(156, 163, 175, 0.1)' : 'transparent',
              ...(dragActive ? {} : {
                '&:hover': {
                  backgroundColor: 'rgba(156, 163, 175, 0.02)'
                }
              })
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={(e) => {
              if (!dragActive) {
                e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (!dragActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
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
                Supports: .ai, .svg, .eps, .png, .jpg, .psd, .pdf (max 10MB)
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
        accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        title="Select proof files"
        aria-label="Select proof files to upload"
      />

      {/* Send Proofs Button or View Proofs Page Button */}
      {(hasAnyProofs || (existingProofs && existingProofs.length > 0)) && (
        <div className="flex justify-center pt-4 border-t border-gray-700 border-opacity-30">
          {(proofsSent || proofStatus === 'awaiting_approval') ? (
            <button
              onClick={() => window.open(`/proofs?orderId=${orderId}`, '_blank')}
              className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg text-white transition-all hover:bg-opacity-80 cursor-pointer"
              style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)'
              }}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Proofs Page
            </button>
          ) : (
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
                  Send All Proofs
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Info */}
      {proofFiles.length > 0 && (
        <div className="text-xs text-gray-400 text-center">
          {proofFiles.length} of 25 proofs • {proofFiles.filter(p => p.uploaded).length} uploaded
        </div>
      )}

      {/* Hidden file input for proof replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*,.pdf"
        style={{ display: 'none' }}
        title="Select replacement proof file"
        aria-label="Select replacement proof file"
      />
    </div>
  );
} 