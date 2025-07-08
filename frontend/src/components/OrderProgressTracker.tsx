import React from 'react';

interface OrderProgressTrackerProps {
  order: any;
}

const OrderProgressTracker: React.FC<OrderProgressTrackerProps> = ({ order }) => {
  // Helper function to check if order contains sample packs
  const isSamplePackOrder = (order: any) => {
    return order.items?.some((item: any) => 
      item.productId === 'sample-pack' || 
      item.sku === 'SP-001' ||
      item.name?.toLowerCase().includes('sample pack') ||
      item.product?.id === 'sample-pack'
    ) || order._fullOrderData?.items?.some((item: any) => 
      item.productId === 'sample-pack' || 
      item.sku === 'SP-001' ||
      item.name?.toLowerCase().includes('sample pack') ||
      item.product?.id === 'sample-pack'
    );
  };

  // Get order progress based on status
  const getOrderProgress = (status: string, order?: any) => {
    const isSamplePack = order ? isSamplePackOrder(order) : false;
    
    const steps = isSamplePack ? [
      { 
        id: 'printing', 
        label: 'Printing', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
        ),
        statuses: ['Processing', 'Order Received', 'In Production', 'Printing']
      },
      { 
        id: 'packaging', 
        label: 'Packaging', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        statuses: ['Packaging', 'Ready to Ship']
      },
      { 
        id: 'shipped', 
        label: 'Shipped', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        statuses: ['Shipped', 'In Transit', 'Assume Delivered']
      }
    ] : [
      { 
        id: 'building-proof', 
        label: 'Building Proof', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        ),
        statuses: ['Processing', 'Order Received', 'In Production']
      },
      { 
        id: 'review-proof', 
        label: 'Review Proof', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        statuses: ['Proof Sent', 'Awaiting Approval', 'Proof Review Needed']
      },
      { 
        id: 'printing', 
        label: 'Printing', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
        ),
        statuses: ['Approved', 'Printing', 'In Production']
      },
      { 
        id: 'shipped', 
        label: 'Shipped', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        statuses: ['Shipped', 'In Transit']
      },
      { 
        id: 'out-for-delivery', 
        label: 'Out for Delivery', 
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        ),
        statuses: ['Out for Delivery']
      },
      { 
        id: 'delivered', 
        label: 'Delivered', 
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ),
        statuses: ['Delivered']
      }
    ];

    let currentStepIndex = 0;
    
    // Find current step based on status
    steps.forEach((step: any, index: number) => {
      if (step.statuses.includes(status)) {
        currentStepIndex = index;
      }
    });

    return { steps, currentStepIndex };
  };

  const { steps, currentStepIndex } = getOrderProgress(order.status, order);
  
  // Check if this is a reorder
  const isReorder = order.items?.some((item: any) => 
    item._fullOrderData?.calculatorSelections?.isReorder === true ||
    item._fullOrderData?.isReorder === true
  ) || order._fullOrderData?.items?.some((item: any) => 
    item.calculatorSelections?.isReorder === true ||
    item.isReorder === true
  );
  
  return (
    <div className="px-6 pt-6 pb-4" style={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.03)', 
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      borderBottomLeftRadius: '12px',
      borderBottomRightRadius: '12px'
    }}>
      <style jsx>{`
        .subtle-pulse {
          animation: subtle-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes subtle-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
      
      <div className="relative" style={{ height: '80px', width: '100%' }}>
        {/* Progress line background - spans full width */}
        <div 
          className="absolute h-0.5 bg-gray-600 z-0" 
          style={{ 
            top: '16px',
            left: '8%', /* Start from left edge aligned with image preview */
            right: '8%' /* End at right edge aligned with action buttons */
          }}
        ></div>
        
        {/* Active progress line with gradient */}
        <div 
          className="absolute h-0.5 transition-all duration-700 ease-in-out z-0"
          style={{ 
            top: '16px',
            left: '8%',
            width: currentStepIndex === 0 ? '0px' : 
              `calc(${(currentStepIndex / (steps.length - 1)) * 84}%)`, /* Scale to 84% to match the background line */
            background: 'linear-gradient(90deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
            boxShadow: '0 0 8px rgba(249, 115, 22, 0.4), 0 0 16px rgba(249, 115, 22, 0.2)'
          }}
        ></div>
        
        {steps.map((step: any, index: number) => {
          const isActive = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div 
              key={step.id} 
              className="flex flex-col items-center absolute z-10"
              style={{
                left: `${8 + (index * (84 / (steps.length - 1)))}%`, /* Distribute evenly across the 84% width */
                transform: 'translateX(-50%)',
                top: '0px'
              }}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-orange-500 text-white border-2 border-orange-400 ring-2 ring-orange-400 ring-offset-2 ring-offset-transparent subtle-pulse' 
                    : isActive 
                      ? 'bg-orange-500 text-white border-2 border-orange-400' 
                      : 'bg-gray-700 text-gray-400 border-2 border-gray-600'
                }`}
                title={step.label}
              >
                {step.icon}
              </div>
              <span 
                className={`text-xs mt-2 text-center leading-tight w-16 ${
                  isActive ? 'text-orange-300' : 'text-gray-500'
                }`}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.2'
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Reorder Message */}
      {isReorder && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-amber-300 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">This is a re-order and proofs are skipped and sent straight to production.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderProgressTracker; 