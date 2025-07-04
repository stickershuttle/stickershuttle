import React, { useState } from 'react';
import { useLazyQuery, useMutation, gql } from '@apollo/client';

const VALIDATE_DISCOUNT = gql`
  query ValidateDiscountCode($code: String!, $orderAmount: Float!, $sessionId: String) {
    validateDiscountCode(code: $code, orderAmount: $orderAmount, sessionId: $sessionId) {
      valid
      discountCode {
        id
        code
        discountType
        discountValue
      }
      discountAmount
      message
    }
  }
`;

const REMOVE_DISCOUNT_SESSION = gql`
  mutation RemoveDiscountSession($sessionId: String) {
    removeDiscountSession(sessionId: $sessionId) {
      success
    }
  }
`;

interface DiscountCodeInputProps {
  orderAmount: number;
  onDiscountApplied: (discount: { code: string; amount: number } | null) => void;
  className?: string;
  currentAppliedDiscount?: { code: string; amount: number } | null;
  hasReorderDiscount?: boolean;
  reorderDiscountAmount?: number;
  hasStoreCredits?: boolean;
}

// Helper function to get or create a persistent session ID
function getSessionId(): string {
  const SESSION_KEY = 'ss_discount_session_id';
  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    // Generate a new session ID using crypto API or fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      // Fallback for older browsers
      sessionId = 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
        return (Math.random() * 16 | 0).toString(16);
      });
    }
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

export default function DiscountCodeInput({ orderAmount, onDiscountApplied, className = '', currentAppliedDiscount, hasReorderDiscount, reorderDiscountAmount, hasStoreCredits }: DiscountCodeInputProps) {
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [hasValidated, setHasValidated] = useState(false);
  const [sessionId] = useState(() => getSessionId());

  // Initialize component state based on current applied discount
  React.useEffect(() => {
    console.log('🔄 DiscountCodeInput: currentAppliedDiscount changed:', currentAppliedDiscount);
    
    if (currentAppliedDiscount && currentAppliedDiscount.code) {
      // Apply discount from parent
      setDiscountCode(currentAppliedDiscount.code);
      setValidationResult({
        valid: true,
        discountCode: {
          code: currentAppliedDiscount.code,
          discountType: 'unknown',
          discountValue: 0
        },
        discountAmount: currentAppliedDiscount.amount,
        message: `Discount code "${currentAppliedDiscount.code}" applied`
      });
      setHasValidated(true);
    } else if (!currentAppliedDiscount) {
      // No discount applied from parent - clear everything
      console.log('🔄 DiscountCodeInput: Clearing all discount state');
      setDiscountCode('');
      setValidationResult(null);
      setHasValidated(false);
    }
  }, [currentAppliedDiscount]);

  const [validateDiscount] = useLazyQuery(VALIDATE_DISCOUNT, {
    onCompleted: (data) => {
      const result = data.validateDiscountCode;
      setValidationResult(result);
      setIsValidating(false);

      if (result.valid) {
        // Check if there's already a different discount applied
        if (currentAppliedDiscount && currentAppliedDiscount.code !== result.discountCode.code) {
          setValidationResult({
            valid: false,
            message: `Cannot apply "${result.discountCode.code}". Remove "${currentAppliedDiscount.code}" first to use a different discount code.`,
            showResetOption: true
          });
          onDiscountApplied(null);
          return;
        }

        onDiscountApplied({
          code: result.discountCode.code,
          amount: result.discountAmount
        });
      } else {
        onDiscountApplied(null);
      }
    },
    onError: (error) => {
      console.error('Error validating discount:', error);
      setValidationResult({
        valid: false,
        message: 'Error validating discount code'
      });
      onDiscountApplied(null);
      setIsValidating(false);
    }
  });

  const [removeDiscountSession] = useMutation(REMOVE_DISCOUNT_SESSION, {
    onCompleted: (data) => {
      console.log('✅ Discount session removed successfully:', data?.removeDiscountSession?.success);
    },
    onError: (error) => {
      console.error('⚠️ Error removing discount session (non-blocking):', error.message);
      // Don't block the UI for backend session cleanup errors
    }
  });

  const handleValidate = async () => {
    if (!discountCode.trim()) return;

    // Check if store credits are being used
    if (hasStoreCredits) {
      setValidationResult({
        valid: false,
        message: 'Cannot apply discount codes with store credit. Remove store credit to use discount codes.',
        showResetOption: false
      });
      setHasValidated(true);
      return;
    }

    // Check if there's a reorder discount active
    if (hasReorderDiscount) {
      setValidationResult({
        valid: false,
        message: `Cannot apply discount codes with reorder discount. You're already saving ${reorderDiscountAmount ? `$${reorderDiscountAmount.toFixed(2)}` : '10%'} on this reorder!`
      });
      setHasValidated(true);
      return;
    }

    // Check if there's already a different discount applied
    if (currentAppliedDiscount && currentAppliedDiscount.code !== discountCode.toUpperCase()) {
      console.log('🚫 DiscountCodeInput: Preventing multiple discount codes');
      console.log('   Current:', currentAppliedDiscount.code);
      console.log('   Trying:', discountCode.toUpperCase());
      setValidationResult({
        valid: false,
        message: `Cannot apply multiple discount codes. Remove "${currentAppliedDiscount.code}" first to use a different discount code.`,
        showResetOption: true
      });
      setHasValidated(true);
      return;
    }

    // If trying to apply the same discount that's already applied, show success
    if (currentAppliedDiscount && currentAppliedDiscount.code === discountCode.toUpperCase()) {
      setValidationResult({
        valid: true,
        discountCode: {
          code: currentAppliedDiscount.code,
          discountType: 'unknown',
          discountValue: 0
        },
        discountAmount: currentAppliedDiscount.amount,
        message: `Discount code "${currentAppliedDiscount.code}" is already applied`
      });
      setHasValidated(true);
      return;
    }

    setIsValidating(true);
    setHasValidated(true);

    validateDiscount({
      variables: {
        code: discountCode.toUpperCase(),
        orderAmount,
        sessionId
      }
    });
  };

  const handleRemove = () => {
    console.log('🔄 DiscountCodeInput: Removing discount');
    
    // Clear all local state immediately
    setDiscountCode('');
    setValidationResult(null);
    setHasValidated(false);
    
    // Notify parent to clear discount state
    onDiscountApplied(null);
    
    // Remove backend session (non-blocking)
    try {
      removeDiscountSession({
        variables: {
          sessionId
        }
      }).catch((error: any) => {
        console.warn('⚠️ Backend session cleanup failed (non-critical):', error?.message || error);
      });
    } catch (error: any) {
      console.warn('⚠️ Backend session cleanup error (non-critical):', error?.message || error);
    }
    
    console.log('✅ DiscountCodeInput: Discount removed and parent notified');
  };

  // Force reset function to clear stuck states
  const handleForceReset = () => {
    console.log('🔄 FORCE RESET: Clearing all discount state');
    
    // Clear all local state
    setDiscountCode('');
    setValidationResult(null);
    setHasValidated(false);
    
    // Clear parent state multiple times to ensure it sticks
    onDiscountApplied(null);
    
    // Small delay then notify parent again to make sure
    setTimeout(() => {
      onDiscountApplied(null);
      console.log('✅ FORCE RESET: Secondary parent notification sent');
    }, 100);
    
    // Clear localStorage session
    localStorage.removeItem('ss_discount_session_id');
    
    // Generate new session ID to avoid conflicts
    const newSessionId = 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
      return (Math.random() * 16 | 0).toString(16);
    });
    localStorage.setItem('ss_discount_session_id', newSessionId);
    
    // Remove backend session (non-blocking)
    try {
      removeDiscountSession({
        variables: {
          sessionId
        }
      }).catch((error: any) => {
        console.warn('⚠️ Force reset: Backend session cleanup failed (non-critical):', error?.message || error);
      });
    } catch (error: any) {
      console.warn('⚠️ Force reset: Backend session cleanup error (non-critical):', error?.message || error);
    }
    
    console.log('✅ FORCE RESET: Complete - all state cleared');
  };

  const formatDiscountDisplay = () => {
    if (!validationResult?.discountCode) return '';
    
    const { discountType, discountValue } = validationResult.discountCode;
    if (discountType === 'percentage') {
      return `${discountValue}% off`;
    } else if (discountType === 'fixed_amount') {
      return `$${discountValue} off`;
    } else {
      return 'Free shipping';
    }
  };

  // Blue checkout button styling
  const checkoutButtonStyle = {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
    backdropFilter: 'blur(25px) saturate(180%)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  };

  const removeButtonStyle = {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
    backdropFilter: 'blur(25px) saturate(180%)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Show store credit notice if active */}
      {hasStoreCredits && (
        <div 
          className="text-sm px-4 py-3 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.4) 0%, rgba(250, 204, 21, 0.25) 50%, rgba(250, 204, 21, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(250, 204, 21, 0.4)',
            boxShadow: 'rgba(250, 204, 21, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
            color: 'rgb(254, 240, 138)'
          }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
            <span className="font-medium">
              Store Credit Active
            </span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            Cannot apply discount codes while using store credit.
          </div>
        </div>
      )}

      {/* Show reorder discount notice if active */}
      {hasReorderDiscount && (
        <div 
          className="text-sm px-4 py-3 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: 'rgba(245, 158, 11, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
            color: 'rgb(254, 240, 138)'
          }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">
              Reorder Discount Active: {reorderDiscountAmount ? `$${reorderDiscountAmount.toFixed(2)}` : '10%'} off
            </span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            Additional discount codes cannot be applied with reorder discounts.
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {/* Search bar styled input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Discount code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            disabled={validationResult?.valid || hasReorderDiscount || hasStoreCredits}
            className="w-full rounded-xl px-4 py-3 pl-11 text-white text-sm placeholder-white/60 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: 'rgba(0, 0, 0, 0.1) 0px 2px 8px inset, rgba(255, 255, 255, 0.1) 0px 1px 0px'
            }}
          />
          <svg className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>

        {/* Checkout button styled apply/remove button */}
        {!validationResult?.valid ? (
          <button
            onClick={handleValidate}
            disabled={isValidating || !discountCode.trim() || hasReorderDiscount || hasStoreCredits}
            className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
            style={checkoutButtonStyle}
          >
            {isValidating ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Checking...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Apply</span>
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={handleRemove}
            className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            style={removeButtonStyle}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Remove</span>
            </div>
          </button>
        )}
      </div>

      {hasValidated && validationResult && (
        <div 
          className="text-sm px-4 py-2 rounded-lg"
          style={validationResult.valid ? {
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.4) 0%, rgba(250, 204, 21, 0.25) 50%, rgba(250, 204, 21, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(250, 204, 21, 0.4)',
            boxShadow: 'rgba(250, 204, 21, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
            color: 'rgb(254, 240, 138)'
          } : {
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: 'rgba(239, 68, 68, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
            color: 'rgb(252, 165, 165)'
          }}
        >
          {validationResult.valid ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs truncate">{validationResult.message}</span>
              </div>
              <span className="font-semibold text-xs ml-2 flex-shrink-0">
                {formatDiscountDisplay()} = -${validationResult.discountAmount.toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{validationResult.message}</span>
              </div>
              {validationResult.showResetOption && (
                <button
                  onClick={handleForceReset}
                  className="ml-3 px-3 py-1 text-xs rounded-lg font-medium transition-all hover:bg-red-500/20 border border-red-400/30 text-red-300"
                  title="Reset discount state"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 