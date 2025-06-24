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

// GraphQL mutation to add admin notes
const ADD_PROOF_NOTES = gql`
  mutation AddProofNotes($orderId: ID!, $proofId: ID!, $adminNotes: String, $customerNotes: String) {
    addProofNotes(orderId: $orderId, proofId: $proofId, adminNotes: $adminNotes, customerNotes: $customerNotes) {
      id
      proofs {
        id
        adminNotes
        customerNotes
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
  orderItems?: any[]; // Order items to get size information
  hideCutLinesSection?: boolean; // Flag to hide the cut lines section
  defaultCutLines?: string[]; // Default cut line selection from parent
}

export default function ProofUpload({ orderId, onProofUploaded, proofStatus, existingProofs = [], isAdmin = false, orderItems = [], hideCutLinesSection = false, defaultCutLines = ['green'] }: ProofUploadProps) {
  console.log('🏗️ ProofUpload component mounted with:', {
    orderId,
    proofStatus,
    existingProofsCount: existingProofs.length,
    existingProofs
  });
  
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const [selectedCutLines, setSelectedCutLines] = useState<string[]>(defaultCutLines); // Use default from parent
  const [sendingProofs, setSendingProofs] = useState(false);
  const [proofsSent, setProofsSent] = useState(false);
  const [removingProof, setRemovingProof] = useState<string | null>(null);
  const [replacingProof, setReplacingProof] = useState<string | null>(null);
  const [pdfAnalysisResults, setPdfAnalysisResults] = useState<{[key: string]: any}>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  
  const [addOrderProof] = useMutation(ADD_ORDER_PROOF);
  const [sendProofs] = useMutation(SEND_PROOFS);
  const [replaceProofFile] = useMutation(REPLACE_PROOF_FILE);
  const [removeProof] = useMutation(REMOVE_PROOF);
  const [addProofNotes] = useMutation(ADD_PROOF_NOTES);

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
    let cutContourInfo: any = null;
    if (proofFileParam.file.type === 'application/pdf' || proofFileParam.file.name.toLowerCase().endsWith('.pdf')) {
      try {
        console.log(`🔍 ADMIN: Analyzing PDF ${proofFileParam.file.name} for cut contour layers...`);
        
        // Try to import the new pdf-lib analysis utility
        let analyzePDFCutContour;
        try {
          const pdfModule = await import('../utils/pdf-cutcontour-detection');
          analyzePDFCutContour = pdfModule.analyzePDFCutContour;
        } catch (importError) {
          console.error('Failed to import pdf-lib analysis module:', importError);
          throw new Error('PDF analysis module failed to load. This might be due to a browser compatibility issue.');
        }
        
        cutContourInfo = await analyzePDFCutContour(proofFileParam.file);
        
        console.log(`📊 ADMIN: PDF Analysis Results for ${proofFileParam.file.name}:`);
        console.log(`📋 ADMIN: Total layers found: ${cutContourInfo.layersFound.length}`);
        console.log(`📋 ADMIN: Layer names: ${cutContourInfo.layersFound.join(', ') || 'None detected'}`);
        console.log(`📋 ADMIN: Spot colors: ${cutContourInfo.spotColorsFound.join(', ') || 'None detected'}`);
        console.log(`🎯 ADMIN: CutContour detected: ${cutContourInfo.hasCutContour ? 'YES' : 'NO'}`);
        
        // Store PDF analysis results for display
        setPdfAnalysisResults(prev => ({
          ...prev,
          [proofFileParam.file.name]: cutContourInfo
        }));

        if (cutContourInfo.hasCutContour && cutContourInfo.dimensionsInches) {
          const dims = cutContourInfo.dimensionsInches;
          const bbox = cutContourInfo.boundingBox;
          console.log(`📏 ADMIN: Cut contour dimensions: ${dims.width}" × ${dims.height}"`);
          if (bbox) {
            console.log(`📊 ADMIN: Cut contour bounding box (inches): x=${bbox.x}, y=${bbox.y}, w=${bbox.width}, h=${bbox.height}`);
          }
        } else {
          console.log(`⚠️ ADMIN: No CutContour layer found in ${proofFileParam.file.name}`);
        }
      } catch (error) {
        console.error('⚠️ Could not analyze PDF for cut contours:', error);
        if (isAdmin) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          alert(`❌ PDF ANALYSIS ERROR

📄 File: ${proofFileParam.file.name}
⚠️ Error: ${errorMessage}

This might indicate:
• Corrupted or invalid PDF file
• PDF without proper layer structure  
• Browser compatibility issue with PDF.js

Please try re-uploading or contact support.`);
        }
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
            // Store PDF dimensions for size display (not visible to customer)
            adminNotes: cutContourInfo?.dimensionsInches ? 
              `PDF_DIMENSIONS:${cutContourInfo.dimensionsInches.width}x${cutContourInfo.dimensionsInches.height}` : 
              null
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
      
      // Trigger parent component refresh to update proof statuses
      if (onProofUploaded) {
        onProofUploaded({ sent: true });
      }
      
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

  // Helper function to extract size from order items
  const getOrderSize = () => {
    if (!orderItems || orderItems.length === 0) return null;
    
    const firstItem = orderItems[0];
    if (!firstItem?.calculatorSelections?.size) return null;
    
    const sizeValue = firstItem.calculatorSelections.size.value || firstItem.calculatorSelections.size.displayValue;
    
    // Parse size strings like "Small (2\")", "Medium (3\")", "4\" x 6\"", etc.
    const sizeMatch = sizeValue.match(/(\d+(?:\.\d+)?)\s*[\"x×]\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*\"/);
    
    if (sizeMatch) {
      if (sizeMatch[1] && sizeMatch[2]) {
        // Format like "4\" x 6\""
        return {
          width: parseFloat(sizeMatch[1]),
          height: parseFloat(sizeMatch[2]),
          display: `${sizeMatch[1]}" × ${sizeMatch[2]}"`
        };
      } else if (sizeMatch[3]) {
        // Format like "3\"" (square)
        const size = parseFloat(sizeMatch[3]);
        return {
          width: size,
          height: size,
          display: `${size}" × ${size}"`
        };
      }
    }
    
    return {
      width: null,
      height: null,
      display: sizeValue
    };
  };

  // Admin notes handlers
  const handleEditNote = (proofId: string, currentNote: string) => {
    setEditingNote(proofId);
    // Extract custom note if it exists, otherwise start blank
    const adminNotes = currentNote || '';
    if (adminNotes.startsWith('PDF_DIMENSIONS:')) {
      setNoteText(''); // Start blank if only PDF dimensions
    } else {
      // Remove PDF dimensions from display to show only custom note
      const noteWithoutDimensions = adminNotes.replace(/\nPDF_DIMENSIONS:[0-9.]+x[0-9.]+/, '').trim();
      setNoteText(noteWithoutDimensions);
    }
  };

  const handleSaveNote = async (proofId: string) => {
    try {
      // Find the existing proof to check for PDF dimensions
      const existingProof = existingProofs.find(p => p.id === proofId);
      const existingAdminNotes = existingProof?.adminNotes || '';
      
      // Preserve PDF dimensions if they exist
      let finalNotes = noteText.trim() || null;
      if (existingAdminNotes.includes('PDF_DIMENSIONS:')) {
        const pdfDimensionMatch = existingAdminNotes.match(/PDF_DIMENSIONS:[0-9.]+x[0-9.]+/);
        if (pdfDimensionMatch && finalNotes) {
          // Append PDF dimensions to the custom note
          finalNotes = `${finalNotes}\n${pdfDimensionMatch[0]}`;
        } else if (pdfDimensionMatch && !finalNotes) {
          // Keep only PDF dimensions if no custom note
          finalNotes = pdfDimensionMatch[0];
        }
      }
      
      await addProofNotes({
        variables: {
          orderId,
          proofId,
          adminNotes: finalNotes,
          customerNotes: null
        }
      });
      setEditingNote(null);
      setNoteText('');
      
      // Refresh the component by calling onProofUploaded if available
      if (onProofUploaded) {
        onProofUploaded({ id: proofId });
      }
    } catch (error) {
      console.error('Error saving admin note:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteText('');
  };

  const canAddMore = proofFiles.length + (existingProofs?.length || 0) < 25;
  const hasUploadedProofs = proofFiles.some(p => p.uploaded);
  const hasExistingProofs = existingProofs && existingProofs.length > 0;
  const hasAnyProofs = hasUploadedProofs || hasExistingProofs;
  
  // Check if there are any proofs that haven't been sent yet (based on database state)
  const hasUnsentProofs = existingProofs?.some(proof => proof.status !== 'sent') || hasUploadedProofs;
  
  // Determine if proofs have been sent (based on database state, not local state)
  // Show "Send Proofs" button if there are any proofs that aren't 'sent' status
  const shouldShowSendButton = hasUnsentProofs;
  
  // Show "View Proofs" button if all proofs are sent OR if order status is awaiting_approval
  const shouldShowViewButton = (hasExistingProofs && !hasUnsentProofs && !hasUploadedProofs) || proofStatus === 'awaiting_approval';
  
  // Debug logging
  console.log('ProofUpload button logic:', {
    hasExistingProofs,
    hasUploadedProofs,
    hasUnsentProofs,
    shouldShowSendButton,
    shouldShowViewButton,
    proofStatus,
    existingProofStatuses: existingProofs?.map(p => ({ id: p.id, status: p.status, title: p.proofTitle }))
  });

  return (
    <div className="space-y-6">
      {/* Cut Line Selection - Simplified */}
      {!hideCutLinesSection && isAdmin && (
        <div className="mb-6 p-4 rounded-lg" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Include cut lines in proofs:</span>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedCutLines(prev => 
                  prev.includes('green') 
                    ? prev.filter(c => c !== 'green')
                    : [...prev, 'green']
                )}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border flex items-center gap-2 ${
                  selectedCutLines.includes('green')
                    ? 'bg-green-500/20 text-green-300 border-green-400/50'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/50 hover:border-gray-400/50'
                }`}
              >
                <div className="w-4 h-0.5" style={{ backgroundColor: '#91c848' }}></div>
                Green Cut Line
              </button>
              <button
                onClick={() => setSelectedCutLines(prev => 
                  prev.includes('grey') 
                    ? prev.filter(c => c !== 'grey')
                    : [...prev, 'grey']
                )}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border flex items-center gap-2 ${
                  selectedCutLines.includes('grey')
                    ? 'bg-gray-500/20 text-gray-300 border-gray-400/50'
                    : 'bg-gray-600/20 text-gray-500 border-gray-600/50 hover:border-gray-500/50'
                }`}
              >
                <div className="w-4 h-0.5" style={{ backgroundColor: '#9ca3af' }}></div>
                Grey Cut Line
              </button>
            </div>
          </div>
          

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

                    {/* Admin Notes and PDF Analysis Side by Side */}
                    {isAdmin && (() => {
                      const adminNotes = proof.adminNotes;
                      // Check if there's a custom note (not just PDF dimensions)
                      const hasCustomNote = adminNotes && !adminNotes.startsWith('PDF_DIMENSIONS:') && adminNotes.replace(/\nPDF_DIMENSIONS:[0-9.]+x[0-9.]+/, '').trim();
                      const customNoteText = hasCustomNote ? adminNotes.replace(/\nPDF_DIMENSIONS:[0-9.]+x[0-9.]+/, '').trim() : '';
                      const isEditing = editingNote === proof.id;
                      
                      // Get PDF analysis for this specific file - either from state or from saved adminNotes
                      const pdfAnalysis = pdfAnalysisResults[proof.proofTitle || 'Design Proof'];
                      const orderSize = getOrderSize();
                      
                      // Check if we have PDF dimensions from saved adminNotes (for persistence)
                      let pdfDims = pdfAnalysis?.dimensionsInches;
                      if (!pdfDims && adminNotes && adminNotes.includes('PDF_DIMENSIONS:')) {
                        const dimensionMatch = adminNotes.match(/PDF_DIMENSIONS:([0-9.]+)x([0-9.]+)/);
                        if (dimensionMatch) {
                          pdfDims = {
                            width: parseFloat(dimensionMatch[1]),
                            height: parseFloat(dimensionMatch[2])
                          };
                        }
                      }
                      
                      // Check if dimensions align (within 0.1" tolerance)
                      let dimensionsAlign = false;
                      if (pdfDims && orderSize?.width && orderSize?.height) {
                        const tolerance = 0.1;
                        const widthMatch = Math.abs(pdfDims.width - orderSize.width) <= tolerance;
                        const heightMatch = Math.abs(pdfDims.height - orderSize.height) <= tolerance;
                        dimensionsAlign = widthMatch && heightMatch;
                      }
                      
                      // Hide notes and PDF analysis if order is approved unless there's a custom note
                      const isOrderApproved = proof.status === 'approved';
                      if (isOrderApproved && !hasCustomNote) {
                        return null;
                      }
                      
                                              return (
                          <div className="flex gap-4 mt-4">
                              {/* Admin Notes - Left Side (Much Wider when no PDF analysis) */}
                              <div className={`${(isOrderApproved || !pdfDims) ? 'w-full' : 'w-7/12'} p-3 rounded-lg`} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <p className="text-sm text-blue-300 font-medium mb-2">Note from our team:</p>
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <textarea
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      placeholder="Add a note for the customer..."
                                      className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400"
                                      rows={3}
                                      maxLength={500}
                                      autoFocus
                                    />
                                    <div className="flex justify-between items-center">
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleSaveNote(proof.id)}
                                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                      <span className="text-xs text-gray-400">{noteText.length}/500</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    className="text-sm text-gray-300 min-h-[40px] cursor-pointer hover:bg-white/5 rounded-lg px-3 py-2 transition-colors border border-transparent hover:border-white/10"
                                    onClick={() => handleEditNote(proof.id, adminNotes || '')}
                                  >
                                    {hasCustomNote ? customNoteText : 'Click to add a note...'}
                                  </div>
                                )}
                              </div>
                              
                              {/* PDF Analysis - Right Side (Hidden when approved) */}
                              {!isOrderApproved && pdfDims && (
                                <div className="w-5/12">
                                  <div className="mb-2">
                                    <p className="text-sm text-orange-300 font-medium">PDF Analysis:</p>
                                  </div>
                                  <div className="space-y-2">
                                    {/* Actual Dimensions from PDF */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400">Actual Dimensions:</span>
                                      <span className="px-2.5 py-1 text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full whitespace-nowrap">
                                        {pdfDims.width.toFixed(2)}" × {pdfDims.height.toFixed(2)}"
                                      </span>
                                    </div>
                                    
                                    {/* Ordered Size */}
                                    {orderSize && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">Ordered Size:</span>
                                        <span className="px-2.5 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full whitespace-nowrap">
                                          {orderSize.display}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Size Match Status */}
                                    {orderSize && (
                                      <div className="flex items-center gap-2 mt-2">
                                        {dimensionsAlign ? (
                                          <>
                                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-xs text-green-400">Sizes match</span>
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <span className="text-xs text-yellow-400">Size mismatch - verify before sending</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                                              )}
                            </div>
                          );
                    })()}
                    
                    {/* Customer Notes - Read Only */}
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
          {shouldShowViewButton ? (
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
                backgroundColor: 'rgba(145, 200, 72, 0.2)',
                border: '1px solid rgba(145, 200, 72, 0.4)'
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
                  {existingProofs?.some(p => p.replaced) ? 'Re-Send Proofs' : 'Send All Proofs'}
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