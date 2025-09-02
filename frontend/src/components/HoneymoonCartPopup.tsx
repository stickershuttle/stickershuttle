import React, { useState } from 'react';
import Link from 'next/link';

interface HoneymoonCartPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const HoneymoonCartPopup: React.FC<HoneymoonCartPopupProps> = ({
  isVisible,
  onClose,
  onAgree
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);

  // Default content for the honeymoon popup
  const defaultContent = {
    title: "🚨 Arrivederci! We're Off to Italy!",
    excerpt: "We are temporarily closed until Sept. 18th as we'll be on our honeymoon! Orders placed during this time will be processed once we return. Thank you for your patience and support. Taking this time off was a tough decision for us as a small business, and we truly appreciate your understanding.❤️",
    published_at: "2024-09-01T00:00:00Z"
  };

  const handleAgreeChange = (checked: boolean) => {
    setHasAgreed(checked);
    if (checked) {
      onAgree();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Subtle Backdrop with Blur */}
      <div 
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(3, 1, 64, 0.05)', // Same as main bg color #030140 with 10% opacity
          backdropFilter: 'blur(1.5px)' // 10% blur effect
        }}
        onClick={onClose}
      />
      
      {/* Popup Container */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div 
          className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl animate-in slide-in-from-bottom-4 duration-300"
          style={{
            background: '#030140',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            title="Close popup"
            className="absolute top-4 right-4 z-10 p-2 rounded-full text-white hover:bg-white hover:bg-opacity-10 transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Blog Post Image with Fade */}
          <div className="relative h-64 w-full overflow-hidden">
            <img
              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1755285232/blog/y4zgxmgbi4y1xb5vjwde.jpg"
              alt={defaultContent.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to a default image if the featured image fails to load
                const target = e.target as HTMLImageElement;
                if (target.src !== "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png") {
                  target.src = "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png";
                }
              }}
            />
            {/* Gradient fade at bottom of image */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030140] via-[#030140]/80 to-transparent" />
          </div>

          {/* Content - positioned to overlap the image fade */}
          <div className="relative -mt-16 px-6 pb-6 space-y-4">
            {/* Title - positioned over the fade */}
            <div className="relative z-10 mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {defaultContent.title}
              </h1>
            </div>

            {/* Blog Content */}
            <div className="blog-content">
              <div className="text-gray-300 leading-relaxed text-base">
                <p className="mb-4">
                  {defaultContent.excerpt}
                </p>
              </div>
            </div>

            {/* Full Blog Link */}
            <div className="text-center">
              <Link 
                href="/blog/ciao-bella-were-off-to-italy"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 text-sm underline"
                onClick={onClose}
              >
                View full blog post →
              </Link>
            </div>

            {/* Agreement Checkbox */}
            <div className="pt-6 mt-6 border-t border-white border-opacity-10">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={hasAgreed}
                    onChange={(e) => handleAgreeChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div 
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      hasAgreed 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-white border-opacity-30 hover:border-opacity-50'
                    }`}
                  >
                    {hasAgreed && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-white text-sm leading-relaxed group-hover:text-gray-200 transition-colors duration-200">
                  I agree to the current status of this order and understand that production of this order will be delayed until we return (September 18th).
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                Close
              </button>
              <button
                onClick={onClose}
                disabled={!hasAgreed}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  hasAgreed 
                    ? 'hover:scale-105' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  background: hasAgreed 
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: hasAgreed 
                    ? '1px solid rgba(59, 130, 246, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: hasAgreed 
                    ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    : 'none'
                }}
              >
                <span className="text-white">
                  Continue to Cart
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HoneymoonCartPopup;
