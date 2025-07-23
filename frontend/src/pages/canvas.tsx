import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Type, 
  Square, 
  Circle, 
  Triangle,
  Image as ImageIcon,
  Trash2, 
  Copy,
  ChevronUp, 
  ChevronDown,
  Layers,
  Palette,
  Settings,
  Move,
  RotateCw,
  Minus,
  Plus,
  Brush,
  Lock,
  Unlock,
  Edit3,
  Undo,
  Redo
} from 'lucide-react';
import Layout from '../components/Layout';

interface CanvasElement {
  id: string;
  type: 'image' | 'text' | 'shape';
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  // Image specific
  src?: string;
  stickerMode?: boolean;
  stickerBorderWidth?: number;
  stickerBorderColor?: string;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  // Shape specific
  shapeType?: 'rectangle' | 'circle' | 'triangle';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  elements: CanvasElement[];
  selectedElementId: string | null;
  zoom: number;
  panX: number;
  panY: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function CanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');

  const [canvasState, setCanvasState] = useState<CanvasState>({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#030140',
    elements: [],
    selectedElementId: null,
    zoom: 1,
    panX: 0,
    panY: 0
  });

  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'rectangle' | 'circle' | 'image'>('select');
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [stickerMenuOpen, setStickerMenuOpen] = useState(false);
  const [stickerSettings, setStickerSettings] = useState({
    borderWidth: 6,
    borderColor: '#ffffff'
  });
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctxRef.current = ctx;
    
    // Set canvas to fill available space
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        renderCanvas();
      }
    };
    
    updateCanvasSize();
    
    // Listen for window resize
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Render canvas whenever state changes
  useEffect(() => {
    renderCanvas();
  }, [canvasState]);

  // Keep loaded images in cache for better performance
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    ctx.fillStyle = canvasState.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw dotted grid
    drawDottedGrid(ctx, canvas.width, canvas.height);

    // Sort elements by zIndex
    const sortedElements = [...canvasState.elements].sort((a, b) => a.zIndex - b.zIndex);

    // Render each element
    sortedElements.forEach(element => {
      if (!element.visible) return;

      ctx.save();
      ctx.globalAlpha = element.opacity;
      
      // Apply transformations
      ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-element.width / 2, -element.height / 2);

      switch (element.type) {
        case 'text':
          renderTextElement(ctx, element);
          break;
        case 'shape':
          renderShapeElement(ctx, element);
          break;
        case 'image':
          renderImageElement(ctx, element);
          break;
      }

      ctx.restore();

      // Render selection outline
      if (element.id === canvasState.selectedElementId) {
        renderSelectionOutline(ctx, element);
      }
    });
  }, [canvasState]);

  const drawDottedGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20; // Grid spacing
    const dotSize = 1; // Dot size
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Subtle white dots to match dark theme
    
    for (let x = gridSize; x < width; x += gridSize) {
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  const renderTextElement = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    if (!element.text) return;
    
    ctx.font = `${element.fontWeight || 'normal'} ${element.fontSize || 24}px ${element.fontFamily || 'Arial'}`;
    ctx.fillStyle = element.textColor || '#000000';
    ctx.textAlign = element.textAlign || 'left';
    ctx.textBaseline = 'top';
    
    const lines = element.text.split('\n');
    const lineHeight = (element.fontSize || 24) * 1.2;
    
    lines.forEach((line, index) => {
      let x = 0;
      if (element.textAlign === 'center') x = element.width / 2;
      if (element.textAlign === 'right') x = element.width;
      
      ctx.fillText(line, x, index * lineHeight);
    });
  };

  const renderShapeElement = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    ctx.fillStyle = element.fillColor || '#3b82f6';
    ctx.strokeStyle = element.strokeColor || '#1e40af';
    ctx.lineWidth = element.strokeWidth || 0;

    switch (element.shapeType) {
      case 'rectangle':
        ctx.fillRect(0, 0, element.width, element.height);
        if (element.strokeWidth && element.strokeWidth > 0) {
          ctx.strokeRect(0, 0, element.width, element.height);
        }
        break;
      case 'circle':
        const radius = Math.min(element.width, element.height) / 2;
        ctx.beginPath();
        ctx.arc(element.width / 2, element.height / 2, radius, 0, 2 * Math.PI);
        ctx.fill();
        if (element.strokeWidth && element.strokeWidth > 0) {
          ctx.stroke();
        }
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(element.width / 2, 0);
        ctx.lineTo(0, element.height);
        ctx.lineTo(element.width, element.height);
        ctx.closePath();
        ctx.fill();
        if (element.strokeWidth && element.strokeWidth > 0) {
          ctx.stroke();
        }
        break;
    }
  };

  const renderImageElement = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    if (!element.src) return;
    
    // Check if image is already cached
    let img = imageCache.current.get(element.src);
    
    if (!img) {
      // Create new image and cache it
      img = new Image();
      img.crossOrigin = 'anonymous';
      imageCache.current.set(element.src, img);
      
      img.onload = () => {
        // Re-render when image loads
        renderCanvas();
      };
      img.onerror = () => {
        console.error('Failed to load image:', element.src);
        if (element.src) {
          imageCache.current.delete(element.src);
        }
      };
      img.src = element.src;
    }
    
    // Draw image if it's loaded
    if (img.complete && img.naturalHeight !== 0) {
      if (element.stickerMode) {
        // Create sticker effect with white border
        const borderWidth = element.stickerBorderWidth || 6;
        const borderColor = element.stickerBorderColor || '#ffffff';
        
        // Create temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        tempCanvas.width = element.width + borderWidth * 2;
        tempCanvas.height = element.height + borderWidth * 2;
        
        // Draw the border effect by drawing the image multiple times with slight offsets
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.fillStyle = borderColor;
        
        // Create border by drawing image with offsets in all directions
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const offsetX = Math.cos(angle) * borderWidth + borderWidth;
          const offsetY = Math.sin(angle) * borderWidth + borderWidth;
          tempCtx.drawImage(img, offsetX, offsetY, element.width, element.height);
        }
        
        // Use composite operation to create the border effect
        tempCtx.globalCompositeOperation = 'source-atop';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw original image on top
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.drawImage(img, borderWidth, borderWidth, element.width, element.height);
        
        // Draw the final result
        ctx.drawImage(tempCanvas, -borderWidth, -borderWidth);
      } else {
        // Draw normal image
        ctx.drawImage(img, 0, 0, element.width, element.height);
      }
    }
  };

  const getElementBounds = (element: CanvasElement) => {
    if (element.type === 'text' && element.text) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return { x: element.x, y: element.y, width: element.width, height: element.height };
      
      ctx.font = `${element.fontWeight || 'normal'} ${element.fontSize || 24}px ${element.fontFamily || 'Arial'}`;
      const textMetrics = ctx.measureText(element.text);
      const textWidth = textMetrics.width;
      const textHeight = element.fontSize || 24;
      
      return {
        x: element.x,
        y: element.y,
        width: textWidth,
        height: textHeight
      };
    }
    
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height
    };
  };

  const renderSelectionOutline = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    ctx.save();
    ctx.resetTransform();
    
    const bounds = getElementBounds(element);
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
    
    // Render resize handles
    const handles = [
      { x: bounds.x - 4, y: bounds.y - 4 }, // top-left
      { x: bounds.x + bounds.width - 4, y: bounds.y - 4 }, // top-right
      { x: bounds.x - 4, y: bounds.y + bounds.height - 4 }, // bottom-left
      { x: bounds.x + bounds.width - 4, y: bounds.y + bounds.height - 4 }, // bottom-right
    ];
    
    ctx.fillStyle = '#3b82f6';
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, 8, 8);
    });
    
    ctx.restore();
  };

  // Generate unique ID
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add new element
  const addElement = useCallback((type: CanvasElement['type'], properties: Partial<CanvasElement> = {}) => {
    const newElement: CanvasElement = {
      id: generateId(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${canvasState.elements.length + 1}`,
      visible: true,
      locked: false,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: canvasState.elements.length,
      ...properties
    };

    setCanvasState(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
      selectedElementId: newElement.id
    }));

    return newElement.id;
  }, [canvasState.elements.length]);

  // Handle file upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      
      // Create image to get dimensions
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let width = Math.min(300, img.width);
        let height = width / aspectRatio;
        
        // If height is too large, scale by height instead
        if (height > 300) {
          height = 300;
          width = height * aspectRatio;
        }

        // Center the image on canvas
        const canvas = canvasRef.current;
        const centerX = canvas ? (canvas.width / 2) - (width / 2) : 100;
        const centerY = canvas ? (canvas.height / 2) - (height / 2) : 100;

        addElement('image', {
          src,
          width,
          height,
          name: file.name,
          x: centerX,
          y: centerY,
          stickerMode: false,
          stickerBorderWidth: 6,
          stickerBorderColor: '#ffffff'
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
  }, [addElement]);

  // Add text
  const addText = useCallback(() => {
    addElement('text', {
      text: 'Double click to edit',
      fontSize: 24,
      fontFamily: 'Arial',
      textColor: '#000000',
      fontWeight: 'normal',
      textAlign: 'left',
      width: 200,
      height: 30
    });
  }, [addElement]);

  // Add shape
  const addShape = useCallback((shapeType: 'rectangle' | 'circle' | 'triangle') => {
    const dimensions = shapeType === 'circle' 
      ? { width: 100, height: 100 }
      : shapeType === 'triangle'
      ? { width: 100, height: 100 }
      : { width: 200, height: 100 };

    addElement('shape', {
      shapeType,
      fillColor: '#3b82f6',
      strokeColor: '#1e40af',
      strokeWidth: 0,
      ...dimensions
    });
  }, [addElement]);

  // Check if point is inside element (accounting for actual content bounds)
  const isPointInElement = (x: number, y: number, element: CanvasElement): boolean => {
    if (!element.visible) return false;
    
    // For text elements, use tighter bounds based on actual text content
    if (element.type === 'text' && element.text) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return false;
      
      ctx.font = `${element.fontWeight || 'normal'} ${element.fontSize || 24}px ${element.fontFamily || 'Arial'}`;
      const textMetrics = ctx.measureText(element.text);
      const textWidth = textMetrics.width;
      const textHeight = element.fontSize || 24;
      
      return x >= element.x && x <= element.x + textWidth && 
             y >= element.y && y <= element.y + textHeight;
    }
    
    // For other elements, use full bounds
    return x >= element.x && x <= element.x + element.width && 
           y >= element.y && y <= element.y + element.height;
  };

  // Canvas mouse events
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if clicking on an element (reverse order to check top elements first)
    const sortedElements = [...canvasState.elements].sort((a, b) => b.zIndex - a.zIndex);
    
    for (const element of sortedElements) {
      if (isPointInElement(x, y, element)) {
        setCanvasState(prev => ({ ...prev, selectedElementId: element.id }));
        setIsDragging(true);
        setDragStart({
          x,
          y,
          elementX: element.x,
          elementY: element.y
        });
        return;
      }
    }

    // No element clicked, deselect
    setCanvasState(prev => ({ ...prev, selectedElementId: null }));
    setHoveredElementId(null);
  }, [canvasState.elements]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isDragging && canvasState.selectedElementId) {
      // Handle dragging
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;

      setCanvasState(prev => ({
        ...prev,
        elements: prev.elements.map(element =>
          element.id === canvasState.selectedElementId
            ? {
                ...element,
                x: dragStart.elementX + deltaX,
                y: dragStart.elementY + deltaY
              }
            : element
        )
      }));
    } else {
      // Handle hover detection
      const sortedElements = [...canvasState.elements].sort((a, b) => b.zIndex - a.zIndex);
      let newHoveredId = null;
      
      for (const element of sortedElements) {
        if (isPointInElement(x, y, element)) {
          newHoveredId = element.id;
          break;
        }
      }
      
      if (newHoveredId !== hoveredElementId) {
        setHoveredElementId(newHoveredId);
        // Update cursor
        canvas.style.cursor = newHoveredId ? 'pointer' : 'default';
      }
    }
  }, [isDragging, canvasState.selectedElementId, canvasState.elements, dragStart, hoveredElementId]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Close sticker menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stickerMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.sticker-menu') && !target.closest('.sticker-button')) {
          setStickerMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stickerMenuOpen]);

  // Update element property
  const updateElement = useCallback((elementId: string, updates: Partial<CanvasElement>) => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.map(element =>
        element.id === elementId ? { ...element, ...updates } : element
      )
    }));
  }, []);

  // Delete element
  const deleteElement = useCallback((elementId: string) => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.filter(element => element.id !== elementId),
      selectedElementId: prev.selectedElementId === elementId ? null : prev.selectedElementId
    }));
  }, []);

  // Stickerfy function - adds border to all images with current settings
  const stickerifyDesign = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.map(element =>
        element.type === 'image' 
          ? { 
              ...element, 
              stickerMode: true,
              stickerBorderWidth: stickerSettings.borderWidth,
              stickerBorderColor: stickerSettings.borderColor
            }
          : element
      )
    }));
    setStickerMenuOpen(false);
  }, [stickerSettings]);

  // Turn into Sticker function - adds 10px white border to all images
  const turnIntoSticker = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.map(element =>
        element.type === 'image' 
          ? { 
              ...element, 
              stickerMode: true,
              stickerBorderWidth: 10,
              stickerBorderColor: '#ffffff'
            }
          : element
      )
    }));
  }, []);

  // Export canvas
  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'canvas-design.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  const selectedElement = canvasState.elements.find(el => el.id === canvasState.selectedElementId);

  return (
    <Layout
      title="Canvas Editor - Design Platform | Sticker Shuttle"
      description="Professional canvas editor for creating custom designs. Add images, text, shapes and export your creations."
    >
      <div className="h-screen flex flex-col" style={{ backgroundColor: '#030140' }}>
        {/* Top Toolbar */}
        <div className="w-full px-4 py-2 flex items-center justify-between" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginTop: '64px' // Account for header
        }}>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs transition-colors hover:bg-white/10 flex items-center gap-2"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
              Undo
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs transition-colors hover:bg-white/10 flex items-center gap-2"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
              Redo
            </button>
            <div className="w-px h-4 bg-white/20 mx-2"></div>
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs transition-colors hover:bg-white/10 flex items-center gap-2"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs transition-colors hover:bg-white/10 flex items-center gap-2"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs transition-colors hover:bg-white/10 flex items-center gap-2"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">Canvas Editor v1.0</span>
          </div>
        </div>

        {/* Sticker Settings Menu */}
        {stickerMenuOpen && (
          <div 
            className="sticker-menu fixed w-72 p-4 rounded-xl"
            style={{
              left: '120px',
              top: '74px', // Move up by double - much closer to the top toolbar
              zIndex: 999999,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            {/* Top Button Menu */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={stickerifyDesign}
                className="flex-1 px-3 py-2 rounded-lg text-white text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.4) 50%, rgba(34, 197, 94, 0.2) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  boxShadow: 'rgba(34, 197, 94, 0.3) 0px 4px 16px'
                }}
              >
                Apply Custom
              </button>
              
              <button
                onClick={turnIntoSticker}
                className="flex-1 px-3 py-2 rounded-lg text-white text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.6) 0%, rgba(147, 51, 234, 0.4) 50%, rgba(147, 51, 234, 0.2) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(147, 51, 234, 0.5)',
                  boxShadow: 'rgba(147, 51, 234, 0.3) 0px 4px 16px'
                }}
              >
                <span className="text-[10px] font-bold bg-purple-600 rounded-full w-4 h-4 flex items-center justify-center">S</span>
                10px Sticker
              </button>
            </div>

            <h3 className="text-white font-semibold mb-4 text-sm">Custom Border Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-xs mb-2">
                  Border Width: {stickerSettings.borderWidth}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={stickerSettings.borderWidth}
                  onChange={(e) => setStickerSettings(prev => ({ 
                    ...prev, 
                    borderWidth: parseInt(e.target.value) 
                  }))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: 'linear-gradient(to right, #22c55e, #16a34a)'
                  }}
                  title={`Border Width: ${stickerSettings.borderWidth}px`}
                />
              </div>

              <div>
                <label className="block text-white text-xs mb-2">Border Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={stickerSettings.borderColor}
                    onChange={(e) => setStickerSettings(prev => ({ 
                      ...prev, 
                      borderColor: e.target.value 
                    }))}
                    className="w-8 h-8 rounded border-0 cursor-pointer"
                    title={`Border Color: ${stickerSettings.borderColor}`}
                  />
                  <span className="text-gray-300 text-xs flex-1">
                    {stickerSettings.borderColor.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setStickerMenuOpen(false)}
                  className="w-full px-3 py-1.5 rounded-lg text-gray-300 text-xs transition-colors hover:text-white hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Editor - Full Height */}
        <div className="flex-1 flex">
          {/* Left Toolbar */}
          <div className="w-16 p-2 space-y-2 flex flex-col relative" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'visible'
          }}>
            {/* Export Button */}
            <button
              onClick={exportCanvas}
              disabled={canvasState.elements.length === 0}
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
              title="Export PNG"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Stickerfy Button */}
            <div className="relative">
              <button
                onClick={() => setStickerMenuOpen(!stickerMenuOpen)}
                disabled={!canvasState.elements.some(el => el.type === 'image')}
                className={`sticker-button w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-2 ${
                  stickerMenuOpen ? 'scale-105' : ''
                }`}
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: `1px solid rgba(34, 197, 94, ${stickerMenuOpen ? '0.6' : '0.4'})`,
                  boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
                title="Sticker Border Settings"
              >
                <div className="relative">
                  <Brush className="w-5 h-5" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full"></div>
                </div>
              </button>


            </div>


            {/* Tool Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => setActiveTool('select')}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                  activeTool === 'select' ? 'bg-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Select"
              >
                <Move className="w-6 h-6" />
              </button>

              <button
                onClick={addText}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                  activeTool === 'text' ? 'bg-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Add Text"
              >
                <Type className="w-6 h-6" />
              </button>

              <button
                onClick={() => addShape('rectangle')}
                className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Add Rectangle"
              >
                <Square className="w-6 h-6" />
              </button>

              <button
                onClick={() => addShape('circle')}
                className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Add Circle"
              >
                <Circle className="w-6 h-6" />
              </button>

              <button
                onClick={() => addShape('triangle')}
                className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Add Triangle"
              >
                <Triangle className="w-6 h-6" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Upload Image"
              >
                <ImageIcon className="w-6 h-6" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Canvas Area - Full Size */}
          <div className="flex-1 relative overflow-hidden">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              style={{
                cursor: hoveredElementId ? 'pointer' : 'default'
              }}
            />
          </div>

          {/* Right Properties Panel */}
          <div className="w-80 p-6 space-y-6 overflow-y-auto" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            
            {/* Layers Panel */}
            <div className="p-4 rounded-xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Layers ({canvasState.elements.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {canvasState.elements.map((element) => (
                  <div
                    key={element.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      canvasState.selectedElementId === element.id
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-800/30 hover:bg-gray-700/30'
                    }`}
                    onClick={() => setCanvasState(prev => ({ ...prev, selectedElementId: element.id }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {editingLayerId === element.id ? (
                          <input
                            type="text"
                            value={element.name}
                            onChange={(e) => {
                              setCanvasState(prev => ({
                                ...prev,
                                elements: prev.elements.map(el => 
                                  el.id === element.id 
                                    ? { ...el, name: e.target.value }
                                    : el
                                )
                              }));
                            }}
                            onBlur={() => setEditingLayerId(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingLayerId(null);
                              e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/20 text-white px-2 py-1 rounded text-sm flex-1"
                            autoFocus
                            title="Layer name"
                          />
                        ) : (
                          <span 
                            className="text-white text-sm font-medium flex-1 cursor-text"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingLayerId(element.id);
                            }}
                            title="Double-click to rename"
                          >
                            {element.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLayerId(element.id);
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                          title="Rename layer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(element.id, { visible: !element.visible });
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                          title={element.visible ? "Hide" : "Show"}
                        >
                          {element.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {canvasState.elements.length === 0 && (
                  <div className="text-gray-400 text-center py-8 text-sm">
                    No elements yet. Add some content to get started!
                  </div>
                )}
              </div>
            </div>

            {/* Properties Panel */}
            {selectedElement && (
              <div className="p-4 rounded-xl" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Properties
                </h3>
                <div className="space-y-4">
                  {/* Position & Size */}
                  <div className="space-y-2">
                    <label className="block text-white text-sm font-medium">Position & Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-300 text-xs">X</label>
                        <input
                          type="number"
                          value={Math.round(selectedElement.x)}
                          onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-xs">Y</label>
                        <input
                          type="number"
                          value={Math.round(selectedElement.y)}
                          onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-gray-300 text-xs">Size</label>
                          <button
                            onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                            className={`p-1 rounded text-xs transition-colors ${
                              aspectRatioLocked 
                                ? 'text-blue-400 bg-blue-500/20' 
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                            title={aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                          >
                            {aspectRatioLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="number"
                              value={Math.round(selectedElement.width)}
                              onChange={(e) => {
                                const newWidth = parseInt(e.target.value) || 1;
                                if (aspectRatioLocked) {
                                  const aspectRatio = selectedElement.height / selectedElement.width;
                                  const newHeight = newWidth * aspectRatio;
                                  setCanvasState(prev => ({
                                    ...prev,
                                    elements: prev.elements.map(el => 
                                      el.id === selectedElement.id 
                                        ? { ...el, width: newWidth, height: newHeight }
                                        : el
                                    )
                                  }));
                                } else {
                                  updateElement(selectedElement.id, { width: newWidth });
                                }
                              }}
                              className="w-full px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                              placeholder="W"
                              title="Width"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={Math.round(selectedElement.height)}
                              onChange={(e) => {
                                const newHeight = parseInt(e.target.value) || 1;
                                if (aspectRatioLocked) {
                                  const aspectRatio = selectedElement.width / selectedElement.height;
                                  const newWidth = newHeight * aspectRatio;
                                  setCanvasState(prev => ({
                                    ...prev,
                                    elements: prev.elements.map(el => 
                                      el.id === selectedElement.id 
                                        ? { ...el, width: newWidth, height: newHeight }
                                        : el
                                    )
                                  }));
                                } else {
                                  updateElement(selectedElement.id, { height: newHeight });
                                }
                              }}
                              className="w-full px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                              placeholder="H"
                              title="Height"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="block text-white text-sm mb-2">Opacity: {Math.round(selectedElement.opacity * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedElement.opacity}
                      onChange={(e) => updateElement(selectedElement.id, { opacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Text Properties */}
                  {selectedElement.type === 'text' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-white text-sm mb-1">Text</label>
                        <textarea
                          value={selectedElement.text || ''}
                          onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-gray-700 text-white border border-gray-600 rounded resize-none"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm mb-1">Font Size</label>
                        <input
                          type="number"
                          value={selectedElement.fontSize || 24}
                          onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 24 })}
                          className="w-full px-3 py-2 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm mb-1">Text Color</label>
                        <input
                          type="color"
                          value={selectedElement.textColor || '#000000'}
                          onChange={(e) => updateElement(selectedElement.id, { textColor: e.target.value })}
                          className="w-full h-10 border border-gray-600 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Image Properties */}
                  {selectedElement.type === 'image' && (
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedElement.stickerMode || false}
                            onChange={(e) => updateElement(selectedElement.id, { stickerMode: e.target.checked })}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-white text-sm">Sticker Mode</span>
                        </label>
                      </div>
                      
                      {selectedElement.stickerMode && (
                        <>
                          <div>
                            <label className="block text-white text-sm mb-1">Border Width</label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={selectedElement.stickerBorderWidth || 6}
                              onChange={(e) => updateElement(selectedElement.id, { stickerBorderWidth: parseInt(e.target.value) || 6 })}
                              className="w-full px-3 py-2 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-white text-sm mb-1">Border Color</label>
                            <input
                              type="color"
                              value={selectedElement.stickerBorderColor || '#ffffff'}
                              onChange={(e) => updateElement(selectedElement.id, { stickerBorderColor: e.target.value })}
                              className="w-full h-10 border border-gray-600 rounded cursor-pointer"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Shape Properties */}
                  {selectedElement.type === 'shape' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-white text-sm mb-1">Fill Color</label>
                        <input
                          type="color"
                          value={selectedElement.fillColor || '#3b82f6'}
                          onChange={(e) => updateElement(selectedElement.id, { fillColor: e.target.value })}
                          className="w-full h-10 border border-gray-600 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm mb-1">Stroke Color</label>
                        <input
                          type="color"
                          value={selectedElement.strokeColor || '#1e40af'}
                          onChange={(e) => updateElement(selectedElement.id, { strokeColor: e.target.value })}
                          className="w-full h-10 border border-gray-600 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm mb-1">Stroke Width</label>
                        <input
                          type="number"
                          min="0"
                          value={selectedElement.strokeWidth || 0}
                          onChange={(e) => updateElement(selectedElement.id, { strokeWidth: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}