import React, { useEffect, useRef, useState } from 'react';
import { extractCutContourPaths } from '../utils/pdf-cutcontour-detection';

interface PDFViewerProps {
  proofUrl: string;
  proofTitle?: string;
  onHover?: (isHovered: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface CutLine {
  path: string;
  color: string;
  strokeWidth: number;
}

export default function PDFViewer({ proofUrl, proofTitle, onHover, className, style }: PDFViewerProps) {
  const overlayRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cutLines, setCutLines] = useState<CutLine[]>([]);
  const [showCutLines, setShowCutLines] = useState(false);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    loadPDFAndExtractCutLines();
  }, [proofUrl]);

  const loadPDFAndExtractCutLines = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Extract cut contour paths using pdf-lib
      const response = await fetch(proofUrl);
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], 'proof.pdf', { type: 'application/pdf' });
      
      const paths = await extractCutContourPaths(file);
      
      if (paths.length > 0) {
        // Convert paths to CutLine format and scale them to fit the display
        const lines = paths.map(path => ({
          path: path.path,
          color: path.color,
          strokeWidth: path.strokeWidth
        }));
        setCutLines(lines);
        
        // Set PDF dimensions for proper overlay scaling
        if (paths[0].bounds) {
          setPdfDimensions({
            width: paths[0].bounds.width + (paths[0].bounds.x * 2),
            height: paths[0].bounds.height + (paths[0].bounds.y * 2)
          });
        }
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading PDF and extracting cut lines:', err);
      setError('Failed to load PDF');
      setIsLoading(false);
    }
  };

  const handleMouseEnter = () => {
    setShowCutLines(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setShowCutLines(false);
    onHover?.(false);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={style}>
        <div className="text-center">
          <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
          <p className="text-xs text-red-600 font-medium">Error loading PDF</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`} 
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg z-10">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-gray-400">Loading PDF...</p>
          </div>
        </div>
      )}
      
      {/* PDF Display using object embed */}
      <object
        data={proofUrl}
        type="application/pdf"
        className="w-full h-full rounded-lg"
        style={{ minHeight: '300px' }}
      >
        {/* Fallback for browsers that don't support PDF object embed */}
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center p-4">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
            <p className="text-sm font-medium text-gray-600 mb-2">{proofTitle || 'PDF Document'}</p>
            <a 
              href={proofUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Open PDF in new tab
            </a>
          </div>
        </div>
      </object>
      
      {/* Cut line overlay */}
      {cutLines.length > 0 && (
        <svg
          ref={overlayRef}
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
            showCutLines ? 'opacity-100' : 'opacity-0'
          }`}
          viewBox={pdfDimensions ? `0 0 ${pdfDimensions.width} ${pdfDimensions.height}` : '0 0 100 100'}
          preserveAspectRatio="xMidYMid meet"
          style={{ mixBlendMode: 'multiply' }}
        >
          {cutLines.map((line, index) => (
            <g key={index}>
              {/* Glow effect */}
              <path
                d={line.path}
                fill="none"
                stroke={line.color}
                strokeWidth={line.strokeWidth + 4}
                opacity={0.3}
                filter="blur(2px)"
                className="animate-pulse"
              />
              {/* Main cut line */}
              <path
                d={line.path}
                fill="none"
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                strokeDasharray="5,5"
                opacity={0.8}
                className="animate-pulse"
              />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
} 