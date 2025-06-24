import React, { useState, useEffect } from 'react';

interface AnimatedCreditCounterProps {
  previousBalance: number;
  newBalance: number;
  amountAdded: number;
  reason?: string;
  onAnimationComplete: () => void;
}

const AnimatedCreditCounter: React.FC<AnimatedCreditCounterProps> = ({
  previousBalance,
  newBalance,
  amountAdded,
  reason,
  onAnimationComplete
}) => {
  const [currentValue, setCurrentValue] = useState(previousBalance);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 FPS
    const increment = (newBalance - previousBalance) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newValue = previousBalance + (increment * currentStep);
      
      if (currentStep >= steps) {
        setCurrentValue(newBalance);
        setIsAnimating(false);
        clearInterval(timer);
        
        // Auto dismiss after animation completes
        setTimeout(() => {
          onAnimationComplete();
        }, 1500);
      } else {
        setCurrentValue(newValue);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [previousBalance, newBalance, onAnimationComplete]);

  return (
    <div 
      className="mb-6 p-4 rounded-xl animate-pulse"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.5) 0%, rgba(250, 204, 21, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
        backdropFilter: 'blur(25px) saturate(200%)',
        border: '2px solid rgba(255, 215, 0, 0.6)',
        boxShadow: 'rgba(250, 204, 21, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
      }}
    >
      <div className="flex items-center gap-3">
        <div className="text-3xl animate-bounce">🎉</div>
        <div className="flex-1">
          <h3 className="text-yellow-300 font-bold text-lg mb-2">
            Store Credit Updated!
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-yellow-200 text-sm">
              <span>Credit Balance:</span>
              <span 
                className={`font-bold text-xl transition-all duration-300 ${
                  isAnimating ? 'text-green-300 scale-110' : 'text-yellow-100'
                }`}
              >
                ${currentValue.toFixed(2)}
              </span>
            </div>
            <div className="text-yellow-200 text-xs opacity-80">
              +${amountAdded.toFixed(2)} earned from your recent order
            </div>
            {reason && (
              <div className="text-yellow-200 text-xs mt-1 opacity-70">
                {reason}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onAnimationComplete}
          className="text-yellow-300 hover:text-yellow-100 transition-colors opacity-70 hover:opacity-100"
          title="Close notification"
          aria-label="Close credit notification"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      {/* Progress bar showing animation progress */}
      <div className="mt-3 bg-yellow-400/20 rounded-full h-1 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-yellow-400 to-yellow-300 h-full transition-all duration-100 ease-out"
          style={{
            width: `${((currentValue - previousBalance) / (newBalance - previousBalance)) * 100}%`
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedCreditCounter; 