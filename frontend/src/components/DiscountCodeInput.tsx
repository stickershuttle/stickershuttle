import React, { useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';

const VALIDATE_DISCOUNT = gql`
  query ValidateDiscountCode($code: String!, $orderAmount: Float!) {
    validateDiscountCode(code: $code, orderAmount: $orderAmount) {
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

interface DiscountCodeInputProps {
  orderAmount: number;
  onDiscountApplied: (discount: { code: string; amount: number } | null) => void;
  className?: string;
}

export default function DiscountCodeInput({ orderAmount, onDiscountApplied, className = '' }: DiscountCodeInputProps) {
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [hasValidated, setHasValidated] = useState(false);

  const [validateDiscount] = useLazyQuery(VALIDATE_DISCOUNT, {
    onCompleted: (data) => {
      const result = data.validateDiscountCode;
      setValidationResult(result);
      setIsValidating(false);

      if (result.valid) {
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

  const handleValidate = async () => {
    if (!discountCode.trim()) return;

    setIsValidating(true);
    setHasValidated(true);

    validateDiscount({
      variables: {
        code: discountCode.toUpperCase(),
        orderAmount
      }
    });
  };

  const handleRemove = () => {
    setDiscountCode('');
    setValidationResult(null);
    setHasValidated(false);
    onDiscountApplied(null);
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
      <div className="flex gap-3">
        {/* Search bar styled input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Discount code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            disabled={validationResult?.valid}
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
            disabled={isValidating || !discountCode.trim()}
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
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{validationResult.message}</span>
              </div>
              <span className="font-semibold">
                {formatDiscountDisplay()} = -${validationResult.discountAmount.toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{validationResult.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 