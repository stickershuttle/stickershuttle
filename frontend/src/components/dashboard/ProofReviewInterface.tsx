import React from 'react';
import AIFileImage from '../AIFileImage';

interface ProofReviewInterfaceProps {
  order: any;
  proofAction: string | null;
  setProofAction: (action: string | null) => void;
  proofComments: string;
  setProofComments: (comments: string) => void;
  showApprovalConfirm: boolean;
  setShowApprovalConfirm: (show: boolean) => void;
  highlightComments: boolean;
  setHighlightComments: (highlight: boolean) => void;
  handleProofAction: (action: 'approve' | 'request_changes', orderId: string, proofId: string) => void;
  uploadedFiles: Record<string, boolean>;
  stagedFile: any;
  uploadProgress: any;
  uploadError: string | null;
  replacementSent: Record<string, boolean>;
  handleFileSelect: (file: File, orderId: string, proofId: string) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>, orderId: string, proofId: string) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  removeUploadedFile: () => void;
  handleSendReplacement: () => void;
  handleCancelReplacement: () => void;
  getFileTypeIcon: (format: string) => string | null;
  isOrderShippedWithTracking: (order: any) => boolean;
  handleTrackOrder: (order: any) => void;
}

const ProofReviewInterface: React.FC<ProofReviewInterfaceProps> = ({
  order,
  proofAction,
  setProofAction,
  proofComments,
  setProofComments,
  showApprovalConfirm,
  setShowApprovalConfirm,
  highlightComments,
  setHighlightComments,
  handleProofAction,
  uploadedFiles,
  stagedFile,
  uploadProgress,
  uploadError,
  replacementSent,
  handleFileSelect,
  handleDrop,
  handleDragOver,
  removeUploadedFile,
  handleSendReplacement,
  handleCancelReplacement,
  getFileTypeIcon,
  isOrderShippedWithTracking,
  handleTrackOrder
}) => {
  const [showValidationMessage, setShowValidationMessage] = React.useState<{[key: string]: boolean}>({});
  
  const handleRequestChangesClick = (orderId: string, proofId: string) => {
    const hasComments = proofComments.trim().length > 0;
    const hasUploadedFile = stagedFile && stagedFile.orderId === orderId && stagedFile.proofId === proofId;
    
    // If there's a file uploaded, send the replacement instead
    if (hasUploadedFile) {
      handleSendReplacement();
      return;
    }
    
    if (!hasComments && !hasUploadedFile) {
      setShowValidationMessage({...showValidationMessage, [`${orderId}-${proofId}`]: true});
      return;
    }
    
    setShowValidationMessage({...showValidationMessage, [`${orderId}-${proofId}`]: false});
    handleProofAction('request_changes', orderId, proofId);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'changes_requested':
        return 'bg-orange-900 bg-opacity-40 text-orange-300';
      case 'pending':
      case 'sent':
      default:
        return 'bg-yellow-900 bg-opacity-40 text-yellow-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'changes_requested':
        return 'Changes Requested';
      case 'pending':
      case 'sent':
      default:
        return 'Pending Review';
    }
  };

  // Get proofs from either proofs array or legacy proofUrl
  const proofs = order.proofs && order.proofs.length > 0 
    ? order.proofs 
    : order.proofUrl 
      ? [{
          id: 'legacy',
          proofUrl: order.proofUrl,
          proofTitle: 'Design Proof',
          uploadedAt: order.date,
          status: order.proof_status || 'pending',
          customerNotes: '',
          adminNotes: ''
        }]
      : [];

  if (proofs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">
          <svg className="mx-auto h-8 w-8 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-medium text-white mb-1">No proofs uploaded yet</h3>
          <p className="text-xs text-gray-400">We're working on your design proofs.</p>
        </div>
      </div>
    );
  }

  const approvedProofs = proofs.filter((proof: any) => proof.status === 'approved').length;
  const totalProofs = proofs.length;
  const allProofsApproved = approvedProofs === totalProofs;
  const hasMultipleProofs = totalProofs > 1;

  return (
    <div className="space-y-4">
      {/* Proof Status Summary - Only show for multiple proofs */}
      {hasMultipleProofs && (
                  <div 
            className="rounded-2xl p-4 mb-4"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${allProofsApproved ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
              <h4 className="text-lg font-semibold text-white">Proof Approval Status</h4>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              allProofsApproved 
                ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                : 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
            }`}>
              {approvedProofs}/{totalProofs} approved
            </div>
          </div>
          
          {!allProofsApproved && (
            <div className="mt-3 flex items-center gap-2 text-sm text-orange-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>You have {totalProofs - approvedProofs} proof{totalProofs - approvedProofs !== 1 ? 's' : ''} pending your review</span>
            </div>
          )}
          
          {allProofsApproved && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>All proofs approved! Your order is ready for production.</span>
            </div>
          )}
        </div>
      )}

      {proofs.map((proof: any, index: number) => {
        const proofKey = `${order.id}-${proof.id}`;
        const hasReplacementSent = replacementSent[proofKey];
        
        if (hasReplacementSent) {
          return (
            <div 
              key={proof.id} 
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Replacement File Received</h3>
              <p className="text-gray-300 mb-4">
                We've received your new file and will send you an updated proof shortly. Check back soon.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-blue-400">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                Processing your replacement file
              </div>
            </div>
          );
        }
        
        return (
          <div 
            key={proof.id} 
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            {/* Proof Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Design Proof #{index + 1}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-gray-400">Uploaded {formatDate(proof.uploadedAt)}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proof.status)}`}>
                {getStatusText(proof.status)}
              </span>
            </div>

            {/* Improved Proof Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left - Proof Image */}
              <div className="lg:col-span-1">
                <div 
                  className="rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-200 hover:shadow-lg relative bg-white"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    aspectRatio: '1'
                  }}
                  onClick={() => window.open(proof.proofUrl, '_blank')}
                >
                  <AIFileImage
                    src={proof.proofUrl}
                    filename={proof.proofUrl.split('/').pop()?.split('?')[0] || 'proof.jpg'}
                    alt={proof.proofTitle}
                    className="w-full h-full object-contain p-4 transition-all duration-200 bg-white"
                    size="preview"
                    showFileType={false}
                  />
                </div>
                <div className="mt-3 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div 
                      className="w-5 h-5 rounded border-2 flex-shrink-0" 
                      style={{ 
                        borderColor: '#91c848', 
                        backgroundColor: 'transparent' 
                      }}
                    ></div>
                    <span className="text-xs font-medium text-white md:whitespace-nowrap">
                      This is the cut line, it will not show up on the print.
                    </span>
                  </div>
                  
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proof.status)}`}>
                    {getStatusText(proof.status)}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">
                    Uploaded {formatDate(proof.uploadedAt)} at {new Date(proof.uploadedAt).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                </div>
              </div>

              {/* Right - Order Summary & Actions */}
              <div className="lg:col-span-2 space-y-4">
                {/* Order Summary Container */}
                <div 
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <h4 className="text-sm font-semibold text-white mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Product:</span>
                      <span className="text-white">Vinyl Stickers</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Material:</span>
                      <span className="text-white">Matte</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Size:</span>
                      <span className="text-white">Medium (3")</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Quantity:</span>
                      <span className="text-white">100</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-white/10">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-green-400 font-semibold">${order.totalPrice || '$122.85'}</span>
                    </div>
                  </div>

                  {/* Production Info */}
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750314056/cmyk_nypyrn.png" 
                        alt="CMYK" 
                        className="w-4 h-4"
                      />
                      <span className="text-white text-xs">Converted to CMYK</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white text-xs">Printed within 24-hrs of Approval</span>
                    </div>
                  </div>
                </div>

                {/* Actions Container */}
                <div 
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  {(proof.status === 'pending' || proof.status === 'sent') && (
                    <div className="space-y-4">
                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <button
                          className="w-full py-3 px-6 md:px-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] text-sm font-medium backdrop-blur-md"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderColor: 'rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                          }}
                          onClick={() => handleProofAction('approve', order.id, proof.id)}
                        >
                          ✅ Approve This Proof
                        </button>

                        <button
                          className="w-full py-3 px-6 md:px-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] text-sm font-medium backdrop-blur-md"
                          style={{
                            background: (stagedFile && stagedFile.orderId === order.id && stagedFile.proofId === proof.id) 
                              ? 'rgba(34, 197, 94, 0.1)' 
                              : 'rgba(251, 146, 60, 0.1)',
                            borderColor: (stagedFile && stagedFile.orderId === order.id && stagedFile.proofId === proof.id) 
                              ? 'rgba(34, 197, 94, 0.3)' 
                              : 'rgba(251, 146, 60, 0.3)',
                            color: (stagedFile && stagedFile.orderId === order.id && stagedFile.proofId === proof.id) 
                              ? '#22c55e' 
                              : '#fb923c',
                            boxShadow: (stagedFile && stagedFile.orderId === order.id && stagedFile.proofId === proof.id) 
                              ? '0 4px 16px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                              : '0 4px 16px rgba(251, 146, 60, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                          }}
                          onClick={() => handleRequestChangesClick(order.id, proof.id)}
                        >
                          {(stagedFile && stagedFile.orderId === order.id && stagedFile.proofId === proof.id) 
                            ? '📁 Send Replacement' 
                            : '✏️ Request Changes'
                          }
                        </button>
                        
                        {/* Validation message */}
                        {showValidationMessage[`${order.id}-${proof.id}`] && (
                          <div className="mt-2 p-3 rounded-xl border border-red-400/50 bg-red-500/10 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-red-300 text-sm">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Please either add comments describing the changes needed or upload a revised file before requesting changes.</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="border-t border-white/10 my-4"></div>

                      {/* Review & Respond Section */}
                      <div>
                        <h5 className="text-sm font-medium text-white mb-3">Review & Respond</h5>
                        
                        {/* File Upload Area */}
                        {!stagedFile || (stagedFile.orderId !== order.id || stagedFile.proofId !== proof.id) ? (
                          <div>
                            <input 
                              id={`proof-file-input-${proof.id}`}
                              type="file" 
                              className="hidden" 
                              accept=".ai,.svg,.eps,.png,.jpg,.jpeg,.psd"
                              aria-label="Upload proof file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileSelect(file, order.id, proof.id);
                                  // Clear validation message when file is uploaded
                                  if (showValidationMessage[`${order.id}-${proof.id}`]) {
                                    setShowValidationMessage({...showValidationMessage, [`${order.id}-${proof.id}`]: false});
                                  }
                                }
                              }}
                            />

                            <div 
                              className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md relative mb-3"
                              onDrop={(e) => {
                                handleDrop(e, order.id, proof.id);
                                // Clear validation message when file is dropped
                                if (showValidationMessage[`${order.id}-${proof.id}`]) {
                                  setShowValidationMessage({...showValidationMessage, [`${order.id}-${proof.id}`]: false});
                                }
                              }}
                              onDragOver={handleDragOver}
                              onClick={() => document.getElementById(`proof-file-input-${proof.id}`)?.click()}
                            >
                              <div className="mb-4">
                                <div className="mb-3 flex justify-center -ml-4">
                                  <img 
                                    src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                                    alt="Upload file" 
                                    className="w-20 h-20 object-contain"
                                  />
                                </div>
                                <p className="text-white font-medium text-base mb-2">Drag or click to upload your file</p>
                                <p className="text-white/80 text-sm">All formats supported. Max file size: 25MB | 1 file per order</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-green-400/50 rounded-xl p-4 bg-green-500/10 backdrop-blur-md mb-3">
                            {/* Responsive Layout: Vertical on mobile, Horizontal on desktop */}
                            <div className="flex flex-col md:flex-row gap-4 items-start">
                              {/* Image Preview - Full width on mobile, fixed size on desktop */}
                              <div className="w-full h-48 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-xl overflow-hidden border border-green-400/30 bg-white/5 backdrop-blur-md p-3 flex items-center justify-center flex-shrink-0">
                                <AIFileImage
                                  src={URL.createObjectURL(stagedFile.file)}
                                  filename={stagedFile.file.name}
                                  alt={stagedFile.file.name}
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
                                      <p className="text-green-200 font-medium break-words text-lg">{stagedFile.file.name}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      onClick={() => document.getElementById(`proof-file-input-${proof.id}`)?.click()}
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
                                      {(stagedFile.file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-green-400">🎨</span>
                                      {stagedFile.file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                                    </span>
                                  </div>
                                  
                                  {/* File Type Icon */}
                                  {getFileTypeIcon(stagedFile.file.name.split('.').pop() || '') && (
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={getFileTypeIcon(stagedFile.file.name.split('.').pop() || '')!} 
                                        alt={`${stagedFile.file.name.split('.').pop()?.toUpperCase()} file`}
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

                        {/* Feedback Textarea */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Add feedback or notes
                          </label>
                          <textarea
                            value={proofComments}
                            onChange={(e) => {
                              setProofComments(e.target.value);
                              // Clear validation message when user starts typing
                              if (showValidationMessage[`${order.id}-${proof.id}`]) {
                                setShowValidationMessage({...showValidationMessage, [`${order.id}-${proof.id}`]: false});
                              }
                            }}
                            placeholder="Share any feedback about this proof..."
                            className="w-full h-20 p-3 rounded-2xl text-white placeholder-gray-400 text-sm resize-none bg-white/5 border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            <span className="text-yellow-400">*</span> When requesting changes, you must provide either written feedback or upload a revised file
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Messages for completed proofs */}
                  {proof.status === 'approved' && (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-3">
                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-green-300 text-lg font-medium">Proof Approved!</p>
                      {isOrderShippedWithTracking(order) ? (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <p className="text-gray-400 text-sm">Your order was printed and shipped!</p>
                          <button
                            onClick={() => handleTrackOrder(order)}
                            className="px-2 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                            style={{
                              backgroundColor: 'rgba(34, 197, 94, 0.2)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              color: 'white'
                            }}
                          >
                            Track
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Your order is now in production</p>
                      )}
                    </div>
                  )}

                  {proof.status === 'changes_requested' && (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-3">
                        <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-orange-300 text-lg font-medium">Changes Requested</p>
                      <p className="text-gray-400 text-sm">Our team is working on your updates</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProofReviewInterface; 