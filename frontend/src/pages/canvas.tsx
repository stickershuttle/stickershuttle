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
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@apollo/client';
import { GET_USER_CREDIT_BALANCE } from '@/lib/credit-mutations';
import CartIndicator from '../components/CartIndicator';
import SEOHead from '../components/SEOHead';
import { useCart } from '@/components/CartContext';
import { generateCartItemId } from '@/types/product';
import { 
  BasePriceRow, 
  QuantityDiscountRow, 
  calculateRealPrice, 
  PRESET_SIZES,
  calculateSquareInches 
} from "@/utils/real-pricing"

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
  smoothEdges?: boolean;
  fillHoles?: boolean;
  originalWidth?: number;
  originalHeight?: number;
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
  const router = useRouter();
  const { addToCart, isRushOrder } = useCart();

  // User and auth state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditBalanceLoaded, setCreditBalanceLoaded] = useState<boolean>(false);
  const [initialAuthCheck, setInitialAuthCheck] = useState<boolean>(false);

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
  const [aspectRatioLocked, setAspectRatioLocked] = useState<boolean>(true);
  const [stickerSettings, setStickerSettings] = useState({
    borderWidth: 12, // Changed default to 12px
    borderColor: '#ffffff', 
    fillHoles: false
  });

  // Calculator states
  const [selectedCut, setSelectedCut] = useState("Custom Shape");
  const [selectedMaterial, setSelectedMaterial] = useState("Matte");
  const [selectedSize, setSelectedSize] = useState('Medium (3")');
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("100");
  const [customQuantity, setCustomQuantity] = useState("");
  const [sendProof, setSendProof] = useState(true);
  const [selectedStickerType, setSelectedStickerType] = useState("vinyl");

  // Keep loaded images in cache for better performance
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Helper function to convert pixels to inches (96 DPI standard)
  const pxToInches = (px: number) => (px / 96).toFixed(3);
  const inchesToPx = (inches: number) => Math.round(inches * 96);

  // Calculate area based on size
  const calculateArea = (size: string, customW = "", customH = "") => {
    if (!size || typeof size !== 'string') {
      return PRESET_SIZES?.medium?.sqInches || 9;
    }
    
    if (size === "Custom size") {
      const w = Number.parseFloat(customW) || 0
      const h = Number.parseFloat(customH) || 0
      return calculateSquareInches(w, h)
    }
    
    if (size.includes('Small')) return PRESET_SIZES?.small?.sqInches || 4
    if (size.includes('Medium')) return PRESET_SIZES?.medium?.sqInches || 9
    if (size.includes('Large') && !size.includes('X-Large')) return PRESET_SIZES?.large?.sqInches || 16
    if (size.includes('X-Large')) return PRESET_SIZES?.xlarge?.sqInches || 25
    
    return 9; // Default
  }

  // Calculate price for canvas artwork
  const calculateCanvasPrice = (qty: number, area: number, rushOrder: boolean) => {
    const basePrice = 1.36
    const baseArea = 9
    const scaledBasePrice = basePrice * (area / baseArea)
    
    const discountMap: { [key: number]: number } = {
      50: 1.0,
      100: 0.647,
      200: 0.463,
      300: 0.39,
      500: 0.324,
      750: 0.24,
      1000: 0.19,
      2500: 0.213,
    }

    let applicableQuantity = 50;
    const quantityTiers = [50, 100, 200, 300, 500, 750, 1000, 2500];
    
    for (const tier of quantityTiers) {
      if (qty >= tier) {
        applicableQuantity = tier;
      } else {
        break;
      }
    }

    const discountMultiplier = discountMap[applicableQuantity] || 1.0
    let pricePerSticker = scaledBasePrice * discountMultiplier
    let totalPrice = pricePerSticker * qty

    if (rushOrder) {
      totalPrice *= 1.4
      pricePerSticker *= 1.4
    }

    return { total: totalPrice, perSticker: pricePerSticker }
  }

  // Export canvas as image for cart
  const exportCanvasAsDataURL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }, []);

  // Helper function to auto-crop image to remove transparent edges
  const autoCropImage = useCallback((imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Find bounds of non-transparent pixels
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 0) { // Non-transparent pixel
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // Check if we found any non-transparent pixels
        if (minX >= canvas.width || minY >= canvas.height) {
          resolve(imageSrc); // No content found, return original
          return;
        }

        // Calculate crop dimensions
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;

        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) {
          resolve(imageSrc);
          return;
        }

        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;

        // Draw cropped image
        croppedCtx.drawImage(
          img,
          minX, minY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        // Convert to data URL
        resolve(croppedCanvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }, []);

  // GraphQL query for credit balance
  const { data: creditData, refetch: refetchCreditBalance } = useQuery(GET_USER_CREDIT_BALANCE, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onCompleted: (data) => {
      if (data?.getUserCreditBalance) {
        setCreditBalance(data.getUserCreditBalance.balance || 0);
        setCreditBalanceLoaded(true);
      }
    },
    onError: (error) => {
      console.warn('Credit balance fetch failed (non-critical):', error);
      setCreditBalance(0);
      setCreditBalanceLoaded(true);
    }
  });

  // Initialize user auth
  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const supabase = getSupabase();
        
        authSubscription = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
          if (!isMounted) return;
          
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            setShowProfileDropdown(false);
            setCreditBalance(0);
            setCreditBalanceLoaded(false);
            setInitialAuthCheck(true);
            return;
          }
          
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
            setUser(session.user);
            setInitialAuthCheck(true);
            
            const cachedPhoto = localStorage.getItem('userProfilePhoto');
            if (cachedPhoto) {
              setProfile({ profile_photo_url: cachedPhoto });
            }
            return;
          }
        });

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setInitialAuthCheck(true);
          return;
        }

        if (session?.user && isMounted) {
          setUser(session.user);
          setInitialAuthCheck(true);
          
          const cachedPhoto = localStorage.getItem('userProfilePhoto');
          if (cachedPhoto) {
            setProfile({ profile_photo_url: cachedPhoto });
          }
        } else if (isMounted) {
          setInitialAuthCheck(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setInitialAuthCheck(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  // Listen for profile updates to sync profile photos
  useEffect(() => {
    const handleProfileUpdate = (event: any) => {
      const { profile_photo_url } = event.detail;
      
      if (profile_photo_url) {
        setProfile(prevProfile => ({
          ...prevProfile,
          profile_photo_url: profile_photo_url
        }));
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Refetch credit balance when user changes
  useEffect(() => {
    if (user?.id && refetchCreditBalance) {
      refetchCreditBalance();
    }
  }, [user?.id, refetchCreditBalance]);

  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Astronaut';
  };

  const handleSignOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setShowProfileDropdown(false);
      setCreditBalance(0);
      setCreditBalanceLoaded(false);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const showAccountDashboard = user && initialAuthCheck;
  const showLoginSignupButtons = !showAccountDashboard && initialAuthCheck;

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctxRef.current = ctx;
    
    // Set canvas to fill available space with high-DPI support
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        // Set actual size in memory (scaled up for high-DPI)
        canvas.width = rect.width * devicePixelRatio;
        canvas.height = rect.height * devicePixelRatio;
        
        // Scale canvas back down using CSS
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        // Scale the drawing context so everything draws at the correct size
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
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
      // Enable high-quality image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
            // Draw border if in sticker mode
      if (element.stickerMode) {
        const borderWidth = element.stickerBorderWidth || 6;
        const borderColor = element.stickerBorderColor || '#ffffff';
        
        ctx.save();
        
        // Create smooth border using multiple shadow layers - much more efficient
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 0; // No blur for hard edges
        
        // Create border by drawing the image multiple times with offsets - always smooth
        const steps = 16; // Always use smooth borders
        
        for (let i = 0; i < steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          ctx.shadowOffsetX = Math.cos(angle) * borderWidth;
          ctx.shadowOffsetY = Math.sin(angle) * borderWidth;
          ctx.drawImage(img, 0, 0, element.width, element.height);
        }
        
        // Fill holes if requested - draw solid background within image bounds
        if (element.fillHoles) {
          ctx.shadowColor = 'transparent';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.globalCompositeOperation = 'destination-over';
          
          // Create a temporary canvas to get the image bounds
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCanvas.width = element.width;
            tempCanvas.height = element.height;
            tempCtx.drawImage(img, 0, 0, element.width, element.height);
            
            // Fill the entire bounding box with border color
            ctx.fillStyle = borderColor;
            ctx.fillRect(0, 0, element.width, element.height);
          }
          
          ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.restore();
      }
      
      // Draw the main image on top
      ctx.drawImage(img, 0, 0, element.width, element.height);
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
    
    // For images and other elements, use exact dimensions
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height
    };
  };

  const renderSelectionOutline = (ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    ctx.save();
    
    // Don't reset transform - use the same coordinate system as the rendered content
    // Calculate actual visual bounds including any effects like sticker borders
    let x = element.x;
    let y = element.y;
    let width = element.width;
    let height = element.height;
    
    // Images now have their borders as separate elements, so no adjustment needed
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / (window.devicePixelRatio || 1); // Adjust line width for DPI scaling
    ctx.setLineDash([5 / (window.devicePixelRatio || 1), 5 / (window.devicePixelRatio || 1)]);
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    
    // Render resize handles
    const handleSize = 8 / (window.devicePixelRatio || 1); // Adjust handle size for DPI scaling
    const handles = [
      { x: x - handleSize/2, y: y - handleSize/2 }, // top-left
      { x: x + width - handleSize/2, y: y - handleSize/2 }, // top-right
      { x: x - handleSize/2, y: y + height - handleSize/2 }, // bottom-left
      { x: x + width - handleSize/2, y: y + height - handleSize/2 }, // bottom-right
    ];
    
    ctx.fillStyle = '#3b82f6';
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
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

  // Handle file upload - optimized for highest quality
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      
      // Auto-crop the image to remove transparent edges
      const croppedSrc = await autoCropImage(src);
      
      // Create image to get dimensions - preserve original quality
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        
        // Automatically scale images to 3 inches (most common size)
        const targetInches = 3;
        const targetPixels = inchesToPx(targetInches); // 3 inches = 288 pixels
        
        // Calculate display size maintaining aspect ratio, with 3" as the target
        let displayWidth, displayHeight;
        
        if (aspectRatio >= 1) {
          // Landscape or square - set width to 3 inches
          displayWidth = targetPixels;
          displayHeight = targetPixels / aspectRatio;
        } else {
          // Portrait - set height to 3 inches
          displayHeight = targetPixels;
          displayWidth = targetPixels * aspectRatio;
        }

        // Center the image on canvas (account for high-DPI scaling and potential borders)
        const canvas = canvasRef.current;
        let centerX = 100;
        let centerY = 100;
        
        if (canvas) {
          // Get the actual display dimensions (not the scaled canvas dimensions)
          const rect = canvas.getBoundingClientRect();
          const displayWidthCanvas = rect.width;
          const displayHeightCanvas = rect.height;
          
          // Reserve space for potential sticker borders (max 20px on each side)
          const borderReserve = 40; // 20px on each side
          const availableWidth = displayWidthCanvas - borderReserve;
          const availableHeight = displayHeightCanvas - borderReserve;
          
          centerX = (availableWidth / 2) - (displayWidth / 2) + (borderReserve / 2);
          centerY = (availableHeight / 2) - (displayHeight / 2) + (borderReserve / 2);
          
          // Ensure minimum margins
          centerX = Math.max(centerX, borderReserve / 2);
          centerY = Math.max(centerY, borderReserve / 2);
        }

        addElement('image', {
          src: croppedSrc, // Use auto-cropped image for tighter bounds
          width: displayWidth,
          height: displayHeight,
          name: file.name,
          x: centerX,
          y: centerY,
          stickerMode: false,
          stickerBorderWidth: 6,
          stickerBorderColor: '#ffffff',
          smoothEdges: true,
          fillHoles: false,
          // Store original dimensions for quality reference
          originalWidth: img.width,
          originalHeight: img.height
        });
      };
      
      // Set crossOrigin to preserve quality
      img.crossOrigin = 'anonymous';
      img.src = croppedSrc;
    };
    
    // Use readAsDataURL to preserve original quality
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
    
    // For images, check if image is loaded and use its actual visual bounds
    if (element.type === 'image' && element.src) {
      const img = imageCache.current.get(element.src);
      if (img && img.complete && img.naturalHeight !== 0) {
        return x >= element.x && x <= element.x + element.width && 
               y >= element.y && y <= element.y + element.height;
      }
    }
    
    // Additional hit detection logic can be added here for future element types
    
    // For other elements, use full bounds
    return x >= element.x && x <= element.x + element.width && 
           y >= element.y && y <= element.y + element.height;
  };

  // Canvas mouse events
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Account for high-DPI scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
    const y = (event.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);

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
    // Account for high-DPI scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
    const y = (event.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);

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

  // Modified Stickerfy function - applies 12px border to all images
  const stickerifyDesign = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.map(element => 
        element.type === 'image' 
          ? {
              ...element,
              stickerMode: true,
              stickerBorderWidth: 12, // Changed to 12px default
              stickerBorderColor: '#ffffff',
              fillHoles: false
            }
          : element
      )
    }));
  }, []);

  // Turn into Sticker function - applies 6px white border to all images
  const turnIntoSticker = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.map(element =>
        element.type === 'image'
          ? {
              ...element,
              stickerMode: true,
              stickerBorderWidth: 6,
              stickerBorderColor: '#ffffff',
              fillHoles: false
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
    <>
      <SEOHead 
        title="Canvas Editor - Design Platform | Sticker Shuttle"
        description="Professional canvas editor for creating custom designs. Add images, text, shapes and export your creations."
      />
      
      <div className="min-h-screen text-white" style={{ backgroundColor: '#030140', fontFamily: 'Inter, sans-serif' }}>
        {/* Custom Header for Canvas Page */}
        <header className="w-full fixed top-0 z-50" style={{ backgroundColor: '#030140' }}>
          <div className="w-full py-3 px-6">
            <div className="flex items-center justify-between relative">
              {/* Left Side - Logo + Tools */}
              <div className="flex items-center gap-4">
                {/* Logo */}
                <Link href="/">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                      alt="Sticker Shuttle Logo" 
                      className="h-10 w-auto object-contain cursor-pointer"
                    />
                    
                  </div>
                </Link>
                
                <div className="w-px h-6 bg-white/20"></div>
                
                {/* Tools */}
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
              </div>

              {/* Right Side - User Elements */}
              <div className="flex items-center gap-3">
                {/* Deals Button - hidden for wholesale (header handles profile lookup and redirect guards page) */}
                {/* Removed to avoid showing to wholesale users */}

                {/* Store Credit Balance - Show if logged in */}
                {showAccountDashboard && (
                  <Link 
                    href="/account/dashboard?view=financial"
                    className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 50%, rgba(255, 215, 0, 0.05) 100%)',
                      border: '1px solid rgba(255, 215, 0, 0.4)',
                      boxShadow: '0 8px 32px rgba(255, 215, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(12px)',
                      minHeight: '40px'
                    }}
                  >
                    <img 
                      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1753923671/StickerShuttle_CoinIcon_aperue.png" 
                      alt="Credits" 
                      className="w-5 h-5 object-contain"
                    />
                    {creditBalanceLoaded ? (
                      <span className="text-yellow-200 leading-5">${creditBalance.toFixed(2)}</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div 
                          className="bg-yellow-300/30 rounded animate-pulse leading-5"
                          style={{ width: '12px', height: '20px' }}
                        ></div>
                        <div 
                          className="bg-yellow-300/30 rounded animate-pulse leading-5"
                          style={{ width: '28px', height: '20px' }}
                        ></div>
                      </div>
                    )}
                  </Link>
                )}

                {/* Authentication - Show Profile Dropdown or Login/Signup */}
                {showAccountDashboard ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center gap-2 font-medium text-white transition-all duration-200 transform hover:scale-105"
                      style={{ background: 'transparent', border: 'none' }}
                      onBlur={() => setTimeout(() => setShowProfileDropdown(false), 200)}
                    >
                      {/* Profile Picture */}
                      <div className="w-10 h-10 aspect-square rounded-full overflow-hidden border border-white/15 transition-all duration-200 hover:border-white/40 hover:brightness-75">
                        {profile?.profile_photo_url ? (
                          <img 
                            src={profile.profile_photo_url} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-base font-bold rounded-full">
                            {getUserDisplayName().charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Dropdown Arrow */}
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Profile Dropdown */}
                    {showProfileDropdown && (
                      <div 
                        className="absolute top-full right-0 mt-2 w-64 rounded-xl shadow-2xl z-50"
                        style={{
                          backgroundColor: 'rgba(3, 1, 64, 0.95)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}
                      >
                        <div className="p-4">
                          {/* Profile Header */}
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                            <div className="w-12 h-12 aspect-square rounded-full overflow-hidden">
                              {profile?.profile_photo_url ? (
                                <img 
                                  src={profile.profile_photo_url} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold rounded-full">
                                  {getUserDisplayName().charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">{getUserDisplayName()}</h3>
                              <p className="text-gray-300 text-sm">{user?.email}</p>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="space-y-2">
                            <Link 
                              href="/account/dashboard"
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
                              onClick={() => setShowProfileDropdown(false)}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#8b5cf6' }}>
                                <rect x="3" y="3" width="8" height="5" rx="2"/>
                                <rect x="13" y="3" width="8" height="11" rx="2"/>
                                <rect x="3" y="10" width="8" height="11" rx="2"/>
                                <rect x="13" y="16" width="8" height="5" rx="2"/>
                              </svg>
                              <span>Dashboard</span>
                            </Link>

                            <button 
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white text-left"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
                                <path d="M16 17l-4-4V8.83c0-1.11-.9-2-2-2s-2 .89-2 2V13l-4 4v1.17c0 1.11.9 2 2 2h8c1.1 0 2-.89 2-2V17z"/>
                              </svg>
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  showLoginSignupButtons && (
                    <div className="flex items-center gap-3">
                      <Link 
                        href="/signup"
                        className="px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-white"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        Signup
                      </Link>
                      
                      <Link 
                        href="/login"
                        className="text-white transition-all duration-200 transform hover:scale-105"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </Link>
                    </div>
                  )
                )}

                {/* Cart */}
                <CartIndicator />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Moved up */}
        <div className="pt-16 h-screen flex flex-col" style={{ backgroundColor: '#030140' }}>

        {/* Main Editor - Full Height */}
        <div className="flex-1 flex">
          {/* Left Sidebar - Layers and Properties */}
          <div className="w-80 p-4 space-y-4 overflow-y-auto" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
          }}>
            {/* Top Action Buttons */}
            <div className="space-y-2 mb-6">
              {/* Full-width Stickerfy Button - Modified to auto-apply 12px border */}
              <button
                onClick={stickerifyDesign}
                disabled={!canvasState.elements.some(el => el.type === 'image')}
                className="sticker-button w-full h-12 rounded-lg flex items-center justify-center gap-2 text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
                title="Apply 12px white border to all images"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
                </svg>
                <span className="font-semibold">Stickerfy</span>
              </button>

              {/* Secondary buttons in grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* Export Button */}
                <button
                  onClick={exportCanvas}
                  disabled={canvasState.elements.length === 0}
                  className="h-12 rounded-lg flex items-center justify-center text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Select Tool Button */}
                <button
                  onClick={() => setActiveTool('select')}
                  className={`h-12 rounded-lg flex items-center justify-center transition-colors ${
                    activeTool === 'select' ? 'bg-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Select"
                >
                  <Move className="w-5 h-5" />
                </button>

                {/* Text Tool Button */}
                <button
                  onClick={addText}
                  className={`h-12 rounded-lg flex items-center justify-center transition-colors ${
                    activeTool === 'text' ? 'bg-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Add Text"
                >
                  <Type className="w-5 h-5" />
                </button>
              </div>
            </div>

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
                        <span className="text-white text-sm font-medium flex-1">
                          {element.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
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
            {(() => {
              const selectedElement = canvasState.elements.find(el => el.id === canvasState.selectedElementId);
              return selectedElement && (
                <div 
                  className="p-4 rounded-xl" 
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Properties
                  </h3>
                  <div className="space-y-4">
                    {/* Position & Size */}
                    <div className="space-y-3">
                      <div className="mb-2 p-2 rounded" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                        <div className="text-white text-xs">
                          {selectedElement.type === 'image' && selectedElement.stickerMode ? (
                            <>
                              {/* Show both image size and total sticker size with border */}
                              <div className="flex justify-between">
                                <span>Image:</span>
                                <span>{pxToInches(selectedElement.width)}" × {pxToInches(selectedElement.height)}"</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span>Sticker:</span>
                                <span>{pxToInches(selectedElement.width + (selectedElement.stickerBorderWidth || 12) * 2)}" × {pxToInches(selectedElement.height + (selectedElement.stickerBorderWidth || 12) * 2)}"</span>
                              </div>
                              <div className="flex justify-between mt-1 pt-1 border-t border-white/10">
                                <span className="font-medium">Total Size:</span>
                                <span className="font-medium">{pxToInches(selectedElement.width + (selectedElement.stickerBorderWidth || 12) * 2)}" × {pxToInches(selectedElement.height + (selectedElement.stickerBorderWidth || 12) * 2)}"</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span>{pxToInches(selectedElement.width)}" × {pxToInches(selectedElement.height)}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Manual Size Input with Aspect Ratio Linking */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm font-medium">Size (inches)</label>
                          <button
                            onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                            className="p-1 rounded text-gray-400 hover:text-white transition-colors"
                            title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                          >
                            {aspectRatioLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="number"
                              step="0.125"
                              min="0.1"
                              value={parseFloat(pxToInches(selectedElement.width))}
                              onChange={(e) => {
                                const newInches = parseFloat(e.target.value) || 0.1;
                                const newWidth = inchesToPx(newInches);
                                
                                if (aspectRatioLocked) {
                                  // Maintain aspect ratio
                                  const aspectRatio = selectedElement.width / selectedElement.height;
                                  const newHeight = newWidth / aspectRatio;
                                  updateElement(selectedElement.id, { width: newWidth, height: newHeight });
                                } else {
                                  updateElement(selectedElement.id, { width: newWidth });
                                }
                              }}
                              className="w-full px-3 py-2 text-sm text-white border border-gray-600 rounded"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(12px)'
                              }}
                              placeholder="W"
                              title="Width in inches"
                            />
                            <div className="text-xs text-gray-400 text-center mt-1">W"</div>
                          </div>
                          <span className="text-gray-400 text-sm font-medium">×</span>
                          <div className="flex-1">
                            <input
                              type="number"
                              step="0.125"
                              min="0.1"
                              value={parseFloat(pxToInches(selectedElement.height))}
                              onChange={(e) => {
                                const newInches = parseFloat(e.target.value) || 0.1;
                                const newHeight = inchesToPx(newInches);
                                
                                if (aspectRatioLocked) {
                                  // Maintain aspect ratio
                                  const aspectRatio = selectedElement.width / selectedElement.height;
                                  const newWidth = newHeight * aspectRatio;
                                  updateElement(selectedElement.id, { width: newWidth, height: newHeight });
                                } else {
                                  updateElement(selectedElement.id, { height: newHeight });
                                }
                              }}
                              className="w-full px-3 py-2 text-sm text-white border border-gray-600 rounded"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(12px)'
                              }}
                              placeholder="H"
                              title="Height in inches"
                            />
                            <div className="text-xs text-gray-400 text-center mt-1">H"</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text Properties */}
                    {selectedElement.type === 'text' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-white text-sm mb-1">Text</label>
                          <textarea
                             value={selectedElement.text || ''}
                             onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                             className="w-full px-3 py-2 text-sm text-white border border-gray-600 rounded resize-none"
                             style={{
                               background: 'rgba(255, 255, 255, 0.05)',
                               backdropFilter: 'blur(12px)'
                             }}
                             rows={3}
                             title="Edit text content"
                           />
                         </div>
                         <div>
                           <label className="block text-white text-sm mb-1">Font Size</label>
                           <input
                             type="number"
                             value={selectedElement.fontSize || 24}
                             onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 24 })}
                             className="w-full px-3 py-2 text-sm text-white border border-gray-600 rounded"
                             style={{
                               background: 'rgba(255, 255, 255, 0.05)',
                               backdropFilter: 'blur(12px)'
                             }}
                             title="Set font size in pixels"
                           />
                         </div>
                         <div>
                           <label className="block text-white text-sm mb-1">Text Color</label>
                           <input
                             type="color"
                             value={selectedElement.textColor || '#000000'}
                             onChange={(e) => updateElement(selectedElement.id, { textColor: e.target.value })}
                             className="w-full h-10 border border-gray-600 rounded cursor-pointer"
                             title="Choose text color"
                           />
                        </div>
                      </div>
                    )}

                    {/* Image Properties */}
                    {selectedElement.type === 'image' && selectedElement.stickerMode && (
                      <div className="space-y-4">
                        {/* Border Width Slider */}
                        <div>
                          <label className="block text-white text-sm mb-2">
                            Border Width: {selectedElement.stickerBorderWidth || 12}px ({pxToInches(selectedElement.stickerBorderWidth || 12)}")
                          </label>
                          <div className="relative">
                            <input
                              type="range"
                              min="5"
                              max="25"
                              value={selectedElement.stickerBorderWidth || 12}
                              onChange={(e) => {
                                const newWidth = parseInt(e.target.value);
                                updateElement(selectedElement.id, { stickerBorderWidth: newWidth });
                              }}
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer border-width-slider"
                              style={{
                                background: `linear-gradient(to right, 
                                  rgba(34, 197, 94, 0.6) 0%, 
                                  rgba(34, 197, 94, 0.4) ${(((selectedElement.stickerBorderWidth || 12) - 5) / 20) * 100}%, 
                                  rgba(255, 255, 255, 0.15) ${(((selectedElement.stickerBorderWidth || 12) - 5) / 20) * 100}%, 
                                  rgba(255, 255, 255, 0.1) 100%)`,
                                outline: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                              }}
                              title={`Border Width: ${selectedElement.stickerBorderWidth || 12}px (${pxToInches(selectedElement.stickerBorderWidth || 12)}")`}
                            />
                            <style jsx>{`
                              .border-width-slider::-webkit-slider-thumb {
                                appearance: none;
                                width: 18px;
                                height: 18px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(34, 197, 94, 1) 100%);
                                cursor: pointer;
                                border: 2px solid rgba(255, 255, 255, 0.4);
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(34, 197, 94, 0.3);
                              }
                              .border-width-slider::-moz-range-thumb {
                                width: 18px;
                                height: 18px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(34, 197, 94, 1) 100%);
                                cursor: pointer;
                                border: 2px solid rgba(255, 255, 255, 0.4);
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                              }
                              .border-width-slider::-webkit-slider-track {
                                height: 8px;
                                border-radius: 4px;
                              }
                              .border-width-slider::-moz-range-track {
                                height: 8px;
                                border-radius: 4px;
                                border: none;
                              }
                            `}</style>
                          </div>
                        </div>

                        {/* Border Color - Custom Hex Input */}
                        <div>
                          <label className="block text-white text-sm mb-2">Border Color</label>
                          <div className="space-y-2">
                            <input
                              type="color"
                              value={selectedElement.stickerBorderColor || '#ffffff'}
                              onChange={(e) => updateElement(selectedElement.id, { stickerBorderColor: e.target.value })}
                              className="w-full h-12 border border-gray-600 rounded cursor-pointer"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(12px)'
                              }}
                              title="Choose border color"
                            />
                            <input
                              type="text"
                              value={selectedElement.stickerBorderColor || '#ffffff'}
                              onChange={(e) => {
                                const hexValue = e.target.value;
                                // Simple hex validation
                                if (/^#[0-9A-F]{6}$/i.test(hexValue) || hexValue === '') {
                                  updateElement(selectedElement.id, { stickerBorderColor: hexValue || '#ffffff' });
                                }
                              }}
                              className="w-full px-3 py-2 text-sm text-white border border-gray-600 rounded font-mono"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(12px)'
                              }}
                              placeholder="#ffffff"
                              title="Enter hex color code"
                            />
                            <div className="text-gray-400 text-xs">
                              Enter custom hex color (e.g., #ffffff for white)
                            </div>
                          </div>
                        </div>
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
                             style={{
                               background: 'rgba(255, 255, 255, 0.05)',
                               backdropFilter: 'blur(12px)'
                             }}
                             title="Choose shape fill color"
                           />
                         </div>
                         <div>
                           <label className="block text-white text-sm mb-1">Stroke Color</label>
                           <input
                             type="color"
                             value={selectedElement.strokeColor || '#1e40af'}
                             onChange={(e) => updateElement(selectedElement.id, { strokeColor: e.target.value })}
                             className="w-full h-10 border border-gray-600 rounded cursor-pointer"
                             style={{
                               background: 'rgba(255, 255, 255, 0.05)',
                               backdropFilter: 'blur(12px)'
                             }}
                             title="Choose shape stroke color"
                           />
                         </div>
                         <div>
                           <label className="block text-white text-sm mb-1">Stroke Width</label>
                           <input
                             type="number"
                             min="0"
                             value={selectedElement.strokeWidth || 0}
                             onChange={(e) => updateElement(selectedElement.id, { strokeWidth: parseInt(e.target.value) || 0 })}
                             className="w-full px-3 py-2 text-sm text-white border border-gray-600 rounded"
                             style={{
                               background: 'rgba(255, 255, 255, 0.05)',
                               backdropFilter: 'blur(12px)'
                             }}
                             title="Set stroke width in pixels"
                           />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Canvas Area - Center */}
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
            
            {/* Centered Upload Area - Show when no images exist */}
            {canvasState.elements.filter(el => el.type === 'image').length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.ai,.svg,.eps,.png,.jpg,.jpeg,.psd,.pdf"
                    onChange={handleImageUpload}
                    className="hidden"
                    aria-label="Upload artwork file"
                  />
                  
                  <div 
                    className="border-2 border-dashed border-white/30 rounded-xl p-16 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(12px)',
                      minWidth: '500px',
                      minHeight: '300px'
                    }}
                  >
                    <div className="mb-6">
                      <div className="mb-4 flex justify-center">
                        <img 
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                          alt="Upload file" 
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                      <p className="text-white font-medium text-xl mb-3">Click to upload your image</p>
                      <p className="text-white/80 text-base">
                        All formats supported • Max file size: 25MB
                        <br />
                        Supports: PNG, JPG, SVG, AI, PSD, PDF, EPS
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Floating Calculator */}
          <div className="w-[360px] p-4 relative">
            <div className="sticky top-4 space-y-4">
              {/* Floating Vinyl Sticker Calculator */}
              <div className="rounded-xl p-6" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}>
                                <div className="mb-6">
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        const stickerTypes = ["vinyl", "holographic", "glitter", "chrome", "clear"];
                        const currentIndex = stickerTypes.indexOf(selectedStickerType);
                        const nextIndex = (currentIndex + 1) % stickerTypes.length;
                        setSelectedStickerType(stickerTypes[nextIndex]);
                      }}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                      title="Click to change sticker type"
                    >
                      {(() => {
                        const stickerTypes = {
                          vinyl: {
                            name: "Vinyl Stickers",
                            icon: "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png"
                          },
                          holographic: {
                            name: "Holographic Stickers", 
                            icon: "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png"
                          },
                          glitter: {
                            name: "Glitter Stickers",
                            icon: "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png"
                          },
                          chrome: {
                            name: "Chrome Stickers",
                            icon: "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593680/yELLOWAlien_StickerShuttle_ChromeIcon_nut4el.png"
                          },
                          clear: {
                            name: "Clear Stickers",
                            icon: "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749849590/StickerShuttle_ClearIcon_zxjnqc.svg"
                          }
                        };
                        const currentType = stickerTypes[selectedStickerType as keyof typeof stickerTypes];
                        return (
                          <>
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                              <img 
                                src={currentType.icon} 
                                alt={currentType.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <h3 className="text-white font-semibold">{currentType.name} Calculator</h3>
                            <svg className="w-4 h-4 text-white ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </>
                        );
                      })()}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Shape Dropdown */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Shape</label>
                                                              <select
                       value={selectedCut}
                       onChange={(e) => setSelectedCut(e.target.value)}
                       className="w-full px-3 py-2 rounded-lg text-white border border-white/20 focus:outline-none focus:border-purple-400 transition-colors"
                       style={{
                         background: 'rgba(255, 255, 255, 0.1)',
                         backdropFilter: 'blur(12px)',
                         color: 'white'
                       }}
                       title="Select shape for your stickers"
                     >
                       <option value="Custom Shape" className="bg-gray-800 text-white">Custom Shape</option>
                       <option value="Circle" className="bg-gray-800 text-white">Circle</option>
                       <option value="Oval" className="bg-gray-800 text-white">Oval</option>
                       <option value="Rectangle" className="bg-gray-800 text-white">Rectangle</option>
                       <option value="Square" className="bg-gray-800 text-white">Square</option>
                     </select>
                  </div>

                  {/* Material Dropdown */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Material</label>
                                         <select
                       value={selectedMaterial}
                       onChange={(e) => setSelectedMaterial(e.target.value)}
                       className="w-full px-3 py-2 rounded-lg text-white border border-white/20 focus:outline-none focus:border-purple-400 transition-colors"
                       style={{
                         background: 'rgba(255, 255, 255, 0.1)',
                         backdropFilter: 'blur(12px)',
                         color: 'white'
                       }}
                       title="Select material finish for your stickers"
                     >
                       <option value="Matte" className="bg-gray-800 text-white">Matte</option>
                       <option value="Gloss" className="bg-gray-800 text-white">Gloss</option>
                       <option value="Shimmer Gloss" className="bg-gray-800 text-white">Shimmer Gloss</option>
                     </select>
                   </div>

                   {/* Size Selection */}
                   <div>
                     <label className="block text-white text-sm font-medium mb-2">Size</label>
                                           <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-white border border-white/20 focus:outline-none focus:border-purple-400 transition-colors"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px)',
                          color: 'white'
                        }}
                        title="Select size for your stickers"
                      >
                        <option value='Small (2")' className="bg-gray-800 text-white">Small (2")</option>
                        <option value='Medium (3")' className="bg-gray-800 text-white">Medium (3")</option>
                        <option value='Large (4")' className="bg-gray-800 text-white">Large (4")</option>
                        <option value='X-Large (5")' className="bg-gray-800 text-white">X-Large (5")</option>
                        <option value="Custom size" className="bg-gray-800 text-white">Custom size</option>
                      </select>
                    
                    {selectedSize === "Custom size" && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="number"
                          placeholder="Width"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-white border border-white/20 focus:outline-none focus:border-purple-400"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(12px)'
                          }}
                        />
                        <input
                          type="number"
                          placeholder="Height"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-white border border-white/20 focus:outline-none focus:border-purple-400"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(12px)'
                          }}
                        />
                      </div>
                    )}
                  </div>

                                     {/* Quantity Selection */}
                   <div>
                     <label className="block text-white text-sm font-medium mb-3">Select a quantity</label>
                     <div className="space-y-2">
                       {["50", "100", "200", "300", "500", "1,000", "2,500", "Custom"].map((amount) => {
                         const numericAmount = Number.parseInt(amount.replace(",", ""))
                         const area = calculateArea(selectedSize, customWidth, customHeight)
                         const isSelected = (selectedQuantity === numericAmount.toString()) || (selectedQuantity === "Custom" && amount === "Custom")
                         const isGoldTier = numericAmount >= 1000 && amount !== "Custom"

                         // Get pricing for current size
                         let pricePerEach = ""
                         let totalPrice = ""
                         let percentOff = ""

                         if (area > 0 && amount !== "Custom") {
                           const currentPricing = calculateCanvasPrice(numericAmount, area, false)
                           const { total, perSticker } = currentPricing
                           
                           totalPrice = `$${total.toFixed(2)}`
                           pricePerEach = `$${perSticker.toFixed(2)}/ea.`
                           
                           // Calculate discount percentage (simplified)
                           if (numericAmount > 50) {
                             const basePrice = calculateCanvasPrice(50, area, false).perSticker
                             const discount = ((basePrice - perSticker) / basePrice) * 100
                             if (discount > 0.5) {
                               percentOff = `${Math.round(discount)}% off`
                             }
                           }
                         }

                         return (
                           <div key={amount} className="relative">
                             <button
                               onClick={() => {
                                 const quantityValue = amount === "Custom" ? "Custom" : numericAmount.toString()
                                 setSelectedQuantity(quantityValue)
                                 if (amount !== "Custom") {
                                   setCustomQuantity("")
                                 }
                               }}
                               className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all border backdrop-blur-md text-sm ${
                                 isSelected
                                   ? isGoldTier
                                     ? "bg-gradient-to-r from-yellow-500/30 via-amber-400/30 to-yellow-600/30 text-yellow-100 font-medium border-yellow-400/60"
                                     : "bg-green-500/20 text-green-200 font-medium border-green-400/50"
                                   : "hover:bg-white/10 border-white/20 text-white/80"
                               }`}
                             >
                               <div className="flex items-center gap-2">
                                 <span className="font-medium">{amount}</span>
                                 {isGoldTier && <span className="text-yellow-400">👑</span>}
                               </div>

                               <div className="flex items-center gap-2">
                                 {totalPrice && amount !== "Custom" && (
                                   <span className="px-2 py-1 text-xs font-medium rounded border text-green-200"
                                         style={{
                                           background: 'rgba(34, 197, 94, 0.2)',
                                           border: '1px solid rgba(34, 197, 94, 0.4)'
                                         }}>
                                     {totalPrice}
                                   </span>
                                 )}
                                 {pricePerEach && amount !== "Custom" && (
                                   <span className="px-2 py-1 text-xs font-medium rounded border text-purple-200"
                                         style={{
                                           background: 'rgba(147, 51, 234, 0.2)',
                                           border: '1px solid rgba(147, 51, 234, 0.4)'
                                         }}>
                                     {pricePerEach}
                                   </span>
                                 )}
                                 {percentOff && (
                                   <span className="text-xs font-medium text-green-300">
                                     {percentOff}
                                   </span>
                                 )}
                               </div>
                             </button>
                           </div>
                         )
                       })}
                     </div>
                     
                     {selectedQuantity === "Custom" && (
                       <div className="mt-3">
                         <input
                           type="number"
                           placeholder="Enter custom quantity (min 15)"
                           value={customQuantity}
                           onChange={(e) => setCustomQuantity(e.target.value)}
                           className="w-full px-3 py-2 rounded-lg text-white border border-white/20 focus:outline-none focus:border-yellow-400"
                           style={{
                             background: 'rgba(255, 255, 255, 0.1)',
                             backdropFilter: 'blur(12px)',
                             color: 'white'
                           }}
                         />
                         {customQuantity && Number.parseInt(customQuantity) < 15 && (
                           <div className="text-red-400 text-xs mt-1">
                             15 is the minimum order quantity
                           </div>
                         )}
                       </div>
                     )}
                   </div>

                  {/* Proof Option */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="sendProof"
                      checked={sendProof}
                      onChange={(e) => setSendProof(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sendProof" className="text-white text-sm">
                      Send FREE Proof
                    </label>
                  </div>

                  {/* Pricing Display */}
                  {(() => {
                    const area = calculateArea(selectedSize, customWidth, customHeight);
                    const quantity = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity);
                    
                    if (area > 0 && quantity >= 15) {
                      const { total, perSticker } = calculateCanvasPrice(quantity, area, isRushOrder);
                      
                      return (
                        <div className="mt-6 p-4 rounded-lg" style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium">Total:</span>
                            <span className="text-green-300 font-bold text-lg">${total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-white/80">Per sticker:</span>
                            <span className="text-green-300">${perSticker.toFixed(2)}</span>
                          </div>
                          {isRushOrder && (
                            <div className="text-xs text-orange-300 mt-2">
                              *Rush order fee applied (+40%)
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="mt-6 p-4 rounded-lg text-center" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <span className="text-white/60 text-sm">Configure options to see pricing</span>
                      </div>
                    );
                  })()}

                  {/* Add to Cart Button */}
                                     <button
                     onClick={() => {
                       const area = calculateArea(selectedSize, customWidth, customHeight);
                       const quantity = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity);
                       
                       if (area > 0 && quantity >= 15 && canvasState.elements.length > 0) {
                         const { total, perSticker } = calculateCanvasPrice(quantity, area, isRushOrder);
                         const canvasImage = exportCanvasAsDataURL();
                         
                         if (canvasImage) {
                           const cartItem = {
                             id: generateCartItemId(),
                             product: {
                               id: "vinyl-stickers",
                               sku: "SS-VS-CANVAS",
                               name: "Canvas Design - Vinyl Stickers",
                               category: "vinyl-stickers" as const,
                               description: "Custom vinyl stickers created from canvas design",
                               shortDescription: "Canvas design vinyl stickers",
                               basePrice: perSticker,
                               pricingModel: "per-unit" as const,
                               images: [],
                               defaultImage: "",
                               features: [],
                               attributes: [],
                               customizable: true,
                               isActive: true,
                               createdAt: new Date().toISOString(),
                               updatedAt: new Date().toISOString(),
                             },
                             customization: {
                               productId: "vinyl-stickers",
                               selections: {
                                 cut: { type: "shape" as const, value: selectedCut, displayValue: selectedCut, priceImpact: 0 },
                                 material: { type: "finish" as const, value: selectedMaterial, displayValue: selectedMaterial, priceImpact: 0 },
                                 size: { 
                                   type: "size-preset" as const, 
                                   value: selectedSize === "Custom size" ? `${customWidth}"x${customHeight}"` : selectedSize,
                                   displayValue: selectedSize === "Custom size" ? `${customWidth}"x${customHeight}"` : selectedSize,
                                   priceImpact: 0 
                                 },
                                 proof: { type: "finish" as const, value: sendProof, displayValue: sendProof ? "Send Proof" : "No Proof", priceImpact: 0 },
                                 rush: { type: "finish" as const, value: isRushOrder, displayValue: isRushOrder ? "Rush Order" : "Standard", priceImpact: isRushOrder ? total * 0.4 : 0 },
                               },
                               totalPrice: total,
                               customFiles: [canvasImage],
                               notes: "Canvas design created in design editor",
                               additionalInfo: {
                                 uploadLater: false
                               }
                             },
                             quantity: quantity,
                             unitPrice: perSticker,
                             totalPrice: total,
                             addedAt: new Date().toISOString()
                           };
                           
                           addToCart(cartItem);
                           router.push('/cart');
                         }
                       }
                     }}
                     disabled={(() => {
                       const area = calculateArea(selectedSize, customWidth, customHeight);
                       const quantity = selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity);
                       return !(area > 0 && quantity >= 15 && canvasState.elements.length > 0);
                     })()}
                     className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     style={{
                       background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                       backdropFilter: 'blur(25px) saturate(180%)',
                       border: '1px solid rgba(59, 130, 246, 0.4)',
                       boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                       color: 'white'
                     }}
                   >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                     </svg>
                     Add to Cart
                   </button>
                  
                  {canvasState.elements.length === 0 && (
                    <div className="text-center text-white/60 text-xs mt-2">
                      Add elements to your canvas to enable ordering
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}