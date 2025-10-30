import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { loadRealPricingData, calculateRealPrice, calculateSquareInches, BasePriceRow, QuantityDiscountRow } from '@/utils/real-pricing';

interface CalculationResult {
  totalStickers: number;
  actualStickersPrinted: number;
  stickersPerRow: number;
  totalRows: number;
  sectionsNeeded: number;
  totalFeet: number;
  totalInches: number;
  totalLengthInFeet: number;
  totalLengthInches: number;
  materialCost: number;
  laminateCost: number;
  inkCost: number;
  inkMlUsed: number;
  totalCost: number;
  costPerSticker: number;
  rollsNeeded: number;
  remainingFeetOnLastRoll: number;
  boxCost?: number;
  printTimeMinutes: number;
  printTimeFormatted: string;
}

export default function MaterialCostCalculator() {
  const [stickerType, setStickerType] = useState<string>('vinyl');
  const [stickerWidth, setStickerWidth] = useState<string>('3');
  const [stickerHeight, setStickerHeight] = useState<string>('3');
  const [quantity, setQuantity] = useState<string>('100');
  const [vinylMaterial, setVinylMaterial] = useState<string>('189.95');
  const [laminateType, setLaminateType] = useState<string>('237.50');
  const [isStickerTypeOpen, setIsStickerTypeOpen] = useState<boolean>(false);
  const [isVinylOpen, setIsVinylOpen] = useState<boolean>(false);
  const [isLaminateOpen, setIsLaminateOpen] = useState<boolean>(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [realPricingData, setRealPricingData] = useState<{ basePricing: BasePriceRow[]; quantityDiscounts: QuantityDiscountRow[] } | null>(null);
  const [vinylCalculatorTotal, setVinylCalculatorTotal] = useState<number>(0);
  const [vinylCalculatorPerSticker, setVinylCalculatorPerSticker] = useState<number>(0);

  // Cost toggles
  const [showMaterial, setShowMaterial] = useState<boolean>(true);
  const [showLaminate, setShowLaminate] = useState<boolean>(true);
  const [showInk, setShowInk] = useState<boolean>(true);
  const [showPackaging, setShowPackaging] = useState<boolean>(false);
  const [showPromo, setShowPromo] = useState<boolean>(false);
  const [logoAnimate, setLogoAnimate] = useState<boolean>(false);
  // Simple page password gate
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  // Editable costs (UI overrides)
  const [packagingCustomCost, setPackagingCustomCost] = useState<number | null>(null);
  const [editingPackagingCost, setEditingPackagingCost] = useState<boolean>(false);
  const [tempPackagingCost, setTempPackagingCost] = useState<string>('0.50');
  const [promoCost, setPromoCost] = useState<number>(0.20);
  const [editingPromoCost, setEditingPromoCost] = useState<boolean>(false);
  const [tempPromoCost, setTempPromoCost] = useState<string>('0.20');

  // Material specifications (editable)
  const DEFAULT_ROLL_WIDTH = 54; // inches
  const DEFAULT_ROLL_LENGTH = 150; // feet
  const DEFAULT_SPACING = 0.150; // inches between stickers
  const DEFAULT_MAX_SECTION_LENGTH = 42; // inches max print length
  const DEFAULT_USABLE_WIDTH = 53.25; // inches

  const [rollWidthInches, setRollWidthInches] = useState<number>(DEFAULT_ROLL_WIDTH);
  const [rollLengthFeet, setRollLengthFeet] = useState<number>(DEFAULT_ROLL_LENGTH);
  const [spacingInches, setSpacingInches] = useState<number>(DEFAULT_SPACING);
  const [maxSectionLengthInches, setMaxSectionLengthInches] = useState<number>(DEFAULT_MAX_SECTION_LENGTH);
  const [usableWidthInches, setUsableWidthInches] = useState<number>(DEFAULT_USABLE_WIDTH);
  const [customUsableWidth, setCustomUsableWidth] = useState<boolean>(false);
  // Inline edit UI state
  const [editingRoll, setEditingRoll] = useState<boolean>(false);
  const [tempRollWidth, setTempRollWidth] = useState<string>(String(DEFAULT_ROLL_WIDTH));
  const [tempRollLength, setTempRollLength] = useState<string>(String(DEFAULT_ROLL_LENGTH));
  const [editingUsable, setEditingUsable] = useState<boolean>(false);
  const [tempUsable, setTempUsable] = useState<string>(String(DEFAULT_USABLE_WIDTH));
  const [editingSpacing, setEditingSpacing] = useState<boolean>(false);
  const [tempSpacing, setTempSpacing] = useState<string>(String(DEFAULT_SPACING));
  const [editingMaxSection, setEditingMaxSection] = useState<boolean>(false);
  const [tempMaxSection, setTempMaxSection] = useState<string>(String(DEFAULT_MAX_SECTION_LENGTH));

  const MATERIAL_COST_PER_ROLL = 189; // baseline; actual cost comes from vinylMaterial state
  const LEFT_MARGIN = 1; // inches
  const RIGHT_MARGIN = 1; // inches
  const BARCODE_GAP = 4; // inches gap between sections
  
  // Ink cost calculation
  // 250 stickers at 2"x2" (4 sq in each = 1000 sq in total) use 4.03 ml of ink
  // 4.03 ml should cost $0.77, so cost per ml = $0.77 / 4.03 = $0.191
  const INK_ML_PER_SQ_INCH = 4.03 / 1000; // 0.00403 ml per square inch
  const INK_CARTRIDGE_COST = 286; // dollars
  const INK_CARTRIDGE_SIZE = 1497; // ml (calculated from $0.77 / 4.03ml = $0.191/ml, then $286 / $0.191)
  const INK_COST_PER_ML = INK_CARTRIDGE_COST / INK_CARTRIDGE_SIZE; // ~$0.191 per ml

  // Calculate packaging cost
  const calculatePackagingCost = (quantity: number) => {
    if (quantity <= 300) {
      return 1.18; // Bubble Mailer
    }
    return 0.50; // Box
  };


  const stickerTypeOptions = [
    { label: 'Vinyl (Matte/Gloss)', value: 'vinyl', price: '189.95' },
    { label: 'Holographic', value: 'holo', price: '719.95' },
    { label: 'Clear', value: 'clear', price: '199.95' },
    { label: 'Glitter', value: 'glitter', price: '249.95' },
    { label: 'Economy', value: 'economy', price: '149.95' },
    { label: 'Pro ($39/mo)', value: 'pro', price: '189.95' }
  ];

  const vinylOptions = [
    {
      label: 'Substance 3750 Matte/Gloss Vinyl - $189.95',
      value: '189.95',
      logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761838936/045cad2e-9baa-4ce5-89c5-ce94eab8a80c.png'
    },
    {
      label: 'Substance 2755 Holographic Vinyl - $719.95',
      value: '719.95',
      logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761838936/045cad2e-9baa-4ce5-89c5-ce94eab8a80c.png'
    },
    {
      label: 'Substance 2750 Clear Vinyl - $199.95',
      value: '199.95',
      logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761838936/045cad2e-9baa-4ce5-89c5-ce94eab8a80c.png'
    },
    {
      label: 'Substance EM3 Economy Gloss Vinyl - $149.95',
      value: '149.95',
      logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761838936/045cad2e-9baa-4ce5-89c5-ce94eab8a80c.png'
    }
  ];

  const laminateOptions = [
    {
      label: 'General Formulations 402 Matte - $237.50',
      value: '237.50',
      logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761839140/2181793b-4ea5-4e5f-a798-ddb524f4980d.png'
    },
    {
      label: 'Substance 3150 Matte/Gloss - $199.95',
      value: '199.95',
      logo: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761838936/045cad2e-9baa-4ce5-89c5-ce94eab8a80c.png'
    }
  ];

  useEffect(() => {
    calculateCost();
  }, [stickerWidth, stickerHeight, quantity, vinylMaterial, laminateType, rollWidthInches, rollLengthFeet, spacingInches, maxSectionLengthInches, usableWidthInches, customUsableWidth]);

  // Load persisted settings from localStorage (per-browser, no login)
  useEffect(() => {
    // Auth gate check
    try {
      const rawAuth = typeof window !== 'undefined' ? localStorage.getItem('r2r:auth') : null;
      if (rawAuth) {
        const a = JSON.parse(rawAuth || '{}');
        if (a.expiresAt && Date.now() < Number(a.expiresAt)) {
          setIsAuthed(true);
        }
      }
    } catch {}

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('r2r:settings') : null;
      if (!raw) return;
      const s = JSON.parse(raw || '{}');
      if (s.stickerWidth) setStickerWidth(String(s.stickerWidth));
      if (s.stickerHeight) setStickerHeight(String(s.stickerHeight));
      if (s.quantity) setQuantity(String(s.quantity));
      if (s.vinylMaterial) setVinylMaterial(String(s.vinylMaterial));
      if (s.laminateType) setLaminateType(String(s.laminateType));
      if (typeof s.rollWidthInches === 'number') setRollWidthInches(s.rollWidthInches);
      if (typeof s.rollLengthFeet === 'number') setRollLengthFeet(s.rollLengthFeet);
      if (typeof s.spacingInches === 'number') setSpacingInches(s.spacingInches);
      if (typeof s.maxSectionLengthInches === 'number') setMaxSectionLengthInches(s.maxSectionLengthInches);
      if (typeof s.usableWidthInches === 'number') setUsableWidthInches(s.usableWidthInches);
      if (typeof s.customUsableWidth === 'boolean') setCustomUsableWidth(s.customUsableWidth);
      if (typeof s.showMaterial === 'boolean') setShowMaterial(s.showMaterial);
      if (typeof s.showLaminate === 'boolean') setShowLaminate(s.showLaminate);
      if (typeof s.showInk === 'boolean') setShowInk(s.showInk);
      if (typeof s.showPackaging === 'boolean') setShowPackaging(s.showPackaging);
      if (typeof s.showPromo === 'boolean') setShowPromo(s.showPromo);
      if (typeof s.packagingCustomCost === 'number') setPackagingCustomCost(s.packagingCustomCost);
      if (typeof s.promoCost === 'number') setPromoCost(s.promoCost);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist settings on change
  useEffect(() => {
    try {
      const s = {
        stickerWidth,
        stickerHeight,
        quantity,
        vinylMaterial,
        laminateType,
        rollWidthInches,
        rollLengthFeet,
        spacingInches,
        maxSectionLengthInches,
        usableWidthInches,
        customUsableWidth,
        showMaterial,
        showLaminate,
        showInk,
        showPackaging,
        showPromo,
        packagingCustomCost,
        promoCost,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('r2r:settings', JSON.stringify(s));
      }
    } catch {}
  }, [stickerWidth, stickerHeight, quantity, vinylMaterial, laminateType, rollWidthInches, rollLengthFeet, spacingInches, maxSectionLengthInches, usableWidthInches, customUsableWidth, showMaterial, showLaminate, showInk, showPackaging, showPromo, packagingCustomCost, promoCost]);

  // Update vinyl material price when sticker type changes
  useEffect(() => {
    const selectedType = stickerTypeOptions.find(t => t.value === stickerType);
    if (selectedType) {
      setVinylMaterial(selectedType.price);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickerType]);

  // Load real pricing data once (used by storefront vinyl calculator)
  useEffect(() => {
    let mounted = true;
    loadRealPricingData()
      .then((data) => {
        if (mounted) setRealPricingData(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Recalculate storefront vinyl calculator price for current size/qty
  useEffect(() => {
    if (!realPricingData) return;
    const w = parseFloat(stickerWidth);
    const h = parseFloat(stickerHeight);
    const qty = parseInt(quantity);
    if (!w || !h || !qty || w <= 0 || h <= 0 || qty <= 0) {
      setVinylCalculatorTotal(0);
      setVinylCalculatorPerSticker(0);
      return;
    }
    
    // Pro subscription pricing: $39/mo for 100 3" stickers
    if (stickerType === 'pro') {
      const sqIn = calculateSquareInches(w, h);
      const baseSqIn = 9; // 3" × 3" = 9 sq inches
      const basePrice = 39; // $39/month for 100 stickers
      const baseQty = 100;
      
      // Scale price based on square inches (proportional to size)
      const pricePerSticker = (basePrice / baseQty) * (sqIn / baseSqIn);
      const totalPrice = pricePerSticker * qty;
      
      setVinylCalculatorTotal(totalPrice);
      setVinylCalculatorPerSticker(pricePerSticker);
      return;
    }
    
    const sqIn = calculateSquareInches(w, h);
    const calc = calculateRealPrice(realPricingData.basePricing, realPricingData.quantityDiscounts, sqIn, qty, false);
    
    // Apply multipliers based on sticker type
    let priceMultiplier = 1.0;
    if (stickerType === 'holo' || stickerType === 'glitter' || stickerType === 'clear') {
      priceMultiplier = 1.15; // 15% price increase for holographic, glitter, and clear
    }
    // vinyl and economy use 1.0 (no multiplier)
    
    setVinylCalculatorTotal(calc.totalPrice * priceMultiplier);
    setVinylCalculatorPerSticker(calc.finalPricePerSticker * priceMultiplier);
  }, [realPricingData, stickerWidth, stickerHeight, quantity, stickerType]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[aria-haspopup="listbox"]') && !target.closest('[role="listbox"]')) {
        setIsStickerTypeOpen(false);
        setIsVinylOpen(false);
        setIsLaminateOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logo animation every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLogoAnimate(true);
      setTimeout(() => setLogoAnimate(false), 1000); // Animation lasts 1 second
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update vinyl material cost based on selected roll width
  useEffect(() => {
    const map: Record<number, number> = {
      20: 90.95,
      30: 109.95,
      54: 189.95,
      60: 209.95,
    };
    const cost = map[Math.round(rollWidthInches) as keyof typeof map];
    if (cost) {
      setVinylMaterial(String(cost.toFixed(2)));
    }
  }, [rollWidthInches]);

  const calculateCost = () => {
    const width = parseFloat(stickerWidth);
    const height = parseFloat(stickerHeight);
    const qty = parseInt(quantity);

    if (!width || !height || !qty || width <= 0 || height <= 0 || qty <= 0) {
      setResult(null);
      return;
    }

    // Calculate how many stickers fit per row
    // Use the configured usable width directly
    const effectiveUsableWidth = usableWidthInches;
    // Formula: (usable_width + spacing) / (sticker_width + spacing)
    const stickersPerRow = Math.floor((effectiveUsableWidth + spacingInches) / (width + spacingInches));

    if (stickersPerRow === 0) {
      setResult(null);
      return;
    }

    // Calculate how many rows fit in a max section
    const rowsPerSection = Math.floor((maxSectionLengthInches + spacingInches) / (height + spacingInches));
    
    if (rowsPerSection === 0) {
      setResult(null);
      return;
    }

    // Calculate stickers per section and how many sections needed
    const stickersPerSection = stickersPerRow * rowsPerSection;
    const fullSections = Math.floor(qty / stickersPerSection);
    const remainingStickers = qty % stickersPerSection;
    
    // Calculate total rows and sections
    const totalRows = Math.ceil(qty / stickersPerRow);
    const sectionsNeeded = fullSections + (remainingStickers > 0 ? 1 : 0);
    
    // Calculate actual stickers printed (since we print full rows)
    const actualStickersPrinted = totalRows * stickersPerRow;
    
    // Calculate length of each section
    const fullSectionLength = (rowsPerSection * height) + ((rowsPerSection - 1) * spacingInches);
    
    // Calculate final partial section length if there are remaining stickers
    let finalSectionLength = 0;
    if (remainingStickers > 0) {
      const finalRows = Math.ceil(remainingStickers / stickersPerRow);
      finalSectionLength = (finalRows * height) + ((finalRows - 1) * spacingInches);
    }
    
    // Calculate base length (with barcode gaps between jobs)
    const numberOfGaps = sectionsNeeded > 1 ? sectionsNeeded - 1 : 0;
    const baseLengthInches = (fullSections * fullSectionLength) + finalSectionLength + (numberOfGaps * BARCODE_GAP);
    
    // Add flat 8" to all lengths for barcode space
    const totalLengthInches = baseLengthInches + 4;
    
    const totalFeet = Math.floor(totalLengthInches / 12);
    const remainingInches = totalLengthInches % 12;

    // Calculate rolls needed
    const totalLengthInFeet = totalLengthInches / 12;
    const rollsNeeded = Math.ceil(totalLengthInFeet / rollLengthFeet);
    
    // Calculate how much of the last roll is used
    const fullRollsUsed = Math.floor(totalLengthInFeet / rollLengthFeet);
    const remainingFeetOnLastRoll = totalLengthInFeet - (fullRollsUsed * rollLengthFeet);

    // Calculate costs based on actual material used
    const LAMINATE_COST_PER_ROLL = parseFloat(laminateType);
    const SELECTED_MATERIAL_COST_PER_ROLL = parseFloat(vinylMaterial);
    const materialCostPerFoot = SELECTED_MATERIAL_COST_PER_ROLL / rollLengthFeet;
    const laminateCostPerFoot = LAMINATE_COST_PER_ROLL / rollLengthFeet;
    
    const materialCost = totalLengthInFeet * materialCostPerFoot;
    const laminateCost = totalLengthInFeet * laminateCostPerFoot;
    
    // Calculate ink cost (increased by 20% for overhead/waste)
    const totalSquareInches = width * height * qty;
    const inkMlNeeded = totalSquareInches * INK_ML_PER_SQ_INCH;
    const inkCost = inkMlNeeded * INK_COST_PER_ML * 1.2;
    
    const totalCost = materialCost + laminateCost;
    const costPerSticker = totalCost / qty;

    // Calculate packaging cost
    const packagingCost = calculatePackagingCost(qty);

    // Calculate print time (3 min 20 sec per 42" section = 200 seconds per section)
    const printTimeSeconds = sectionsNeeded * 200;
    const printTimeMinutes = printTimeSeconds / 60;
    
    // Format time as "X hr Y min" or "X min Y sec"
    const hours = Math.floor(printTimeMinutes / 60);
    const minutes = Math.floor(printTimeMinutes % 60);
    const seconds = Math.round(printTimeSeconds % 60);
    
    let printTimeFormatted = '';
    if (hours > 0) {
      printTimeFormatted = `${hours} hr ${minutes} min`;
    } else if (minutes > 0) {
      printTimeFormatted = `${minutes} min ${seconds} sec`;
    } else {
      printTimeFormatted = `${seconds} sec`;
    }

    setResult({
      totalStickers: qty,
      actualStickersPrinted,
      stickersPerRow,
      totalRows,
      sectionsNeeded,
      totalFeet,
      totalInches: parseFloat(remainingInches.toFixed(2)),
      totalLengthInFeet,
      totalLengthInches,
      materialCost,
      laminateCost,
      inkCost,
      inkMlUsed: inkMlNeeded,
      totalCost,
      costPerSticker,
      rollsNeeded,
      remainingFeetOnLastRoll,
      boxCost: packagingCost,
      printTimeMinutes,
      printTimeFormatted
    });
  };

  return (
    <>
      <Head>
        <title>r2r - Roll to Roll Calculator</title>
        <meta property="og:title" content="r2r - Roll to Roll Calculator" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761858013/r2rlogo_hjdg7f.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="r2r - Roll to Roll Calculator" />
        <meta name="twitter:image" content="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761858013/r2rlogo_hjdg7f.jpg" />
      </Head>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          background: #FFF8F0;
        }
        
        @keyframes logo-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        .logo-animate {
          animation: logo-pulse 1s ease-in-out;
        }
      `}</style>
      {!isAuthed ? (
        <div className="min-h-screen" style={{ background: '#FFF8F0', margin: 0, padding: 0 }}>
      <div className="p-6">
            <div className="max-w-[480px] mx-auto mt-16">
              <div className="mb-6 flex items-center justify-center">
                <img
                  src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761853379/r2rlogo_wlsj6i.svg"
                  alt="R2R Logo"
                  className={`h-16 transition-transform ${logoAnimate ? 'logo-animate' : ''}`}
                />
              </div>
              <div className="rounded-xl p-6" style={{ background: '#F5EDE3', border: '1px solid rgba(139, 117, 93, 0.2)', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 16px' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all"
                  style={{ background: '#EAE0D5', border: '1px solid rgba(139, 117, 93, 0.3)' }}
                  placeholder="Password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (passwordInput === 'SubstanceRox67!') {
                        setIsAuthed(true);
                        try {
                          localStorage.setItem('r2r:auth', JSON.stringify({ expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
                        } catch {}
                      }
                    }
                  }}
                />
                    <button
                      type="button"
                  className="mt-4 w-full px-4 py-2 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-100 text-sm"
                  onClick={() => {
                    if (passwordInput === 'SubstanceRox67!') {
                      setIsAuthed(true);
                      try {
                        localStorage.setItem('r2r:auth', JSON.stringify({ expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
                      } catch {}
                    }
                  }}
                >
                  Unlock
                    </button>
                <p className="mt-3 text-xs text-gray-500">Access is remembered for 30 days in this browser.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="min-h-screen" style={{ background: '#FFF8F0', margin: 0, padding: 0 }}>
      <div className="p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Logo + Reset */}
          <div className="mb-6 flex items-center justify-between">
            <img 
              src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761853379/r2rlogo_wlsj6i.svg" 
              alt="R2R Logo" 
              className={`h-16 transition-transform ${logoAnimate ? 'logo-animate' : ''}`}
            />
                          <button
                            type="button"
              className="px-4 py-2 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-100 text-sm"
              onClick={() => {
                try {
                  if (typeof window !== 'undefined') localStorage.removeItem('r2r:settings');
                } catch {}
                // Reset states to defaults
                setStickerWidth('3');
                setStickerHeight('3');
                setQuantity('100');
                setRollWidthInches(DEFAULT_ROLL_WIDTH);
                setRollLengthFeet(DEFAULT_ROLL_LENGTH);
                setSpacingInches(DEFAULT_SPACING);
                setMaxSectionLengthInches(DEFAULT_MAX_SECTION_LENGTH);
                setUsableWidthInches(DEFAULT_USABLE_WIDTH);
                setCustomUsableWidth(false);
                setShowMaterial(true);
                setShowLaminate(true);
                setShowInk(true);
                setShowPackaging(false);
                setShowPromo(false);
                setPackagingCustomCost(null);
                setPromoCost(0.20);
              }}
            >
              Reset to defaults
                          </button>
                </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
                      <div
              className="rounded-xl p-6"
                        style={{
                background: '#F5EDE3',
                border: '1px solid rgba(139, 117, 93, 0.2)',
                boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 16px'
              }}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-5">Input Parameters</h2>
              
              <div className="space-y-6">
                {/* Size Presets */}
                <div className="mb-2">
                  <div className="mb-2 text-xs text-gray-600 font-medium">Presets</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[2,3,4,5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => { setStickerWidth(n.toString()); setStickerHeight(n.toString()); }}
                        className="w-full px-3 py-2 rounded-md text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all hover:bg-amber-100"
                        style={{
                          background: '#EAE0D5',
                          border: '1px solid rgba(139, 117, 93, 0.3)'
                        }}
                      >
                        {n}" × {n}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sticker Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Sticker Size (inches)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-2">Width</label>
                      <input
                        type="number"
                        step="0.1"
                        value={stickerWidth}
                        onChange={(e) => setStickerWidth(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all"
                        style={{
                          background: '#EAE0D5',
                          border: '1px solid rgba(139, 117, 93, 0.3)'
                        }}
                        placeholder="3.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-2">Height</label>
                      <input
                        type="number"
                        step="0.1"
                        value={stickerHeight}
                        onChange={(e) => setStickerHeight(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all"
                        style={{
                          background: '#EAE0D5',
                          border: '1px solid rgba(139, 117, 93, 0.3)'
                        }}
                        placeholder="3.0"
                      />
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all"
                    style={{
                      background: '#EAE0D5',
                      border: '1px solid rgba(139, 117, 93, 0.3)'
                    }}
                    placeholder="100"
                  />
                </div>

                {/* Laminate Type */}
                {/* Vinyl Material */}
                <div>
                  <label htmlFor="vinyl-material" className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="inline-flex items-center gap-2">
                      <img
                        src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1761838936/045cad2e-9baa-4ce5-89c5-ce94eab8a80c.png"
                        alt="Substance"
                        className="h-5 w-5 object-contain"
                      />
                      <span>Vinyl Material</span>
                    </span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      id="vinyl-material"
                      aria-haspopup="listbox"
                      aria-expanded={isVinylOpen}
                      onClick={() => setIsVinylOpen(!isVinylOpen)}
                    className="w-full px-4 py-3 rounded-lg text-left text-gray-800 flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all hover:bg-amber-50"
                    style={{
                        background: '#EAE0D5',
                        border: '1px solid rgba(139, 117, 93, 0.3)'
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <img src={vinylOptions.find(v => v.value === vinylMaterial)?.logo || ''} alt="" className="h-5 w-5 object-contain" />
                        <span>{vinylOptions.find(v => v.value === vinylMaterial)?.label}</span>
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${isVinylOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {isVinylOpen && (
                      <div
                        role="listbox"
                        aria-labelledby="vinyl-material"
                        className="absolute z-20 mt-2 w-full rounded-lg overflow-hidden shadow-lg"
                        style={{
                          background: '#F5EDE3',
                          border: '1px solid rgba(139, 117, 93, 0.3)'
                        }}
                      >
                        {vinylOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={vinylMaterial === opt.value}
                            onClick={() => { setVinylMaterial(opt.value); setIsVinylOpen(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-2 text-gray-800 hover:bg-amber-100 ${vinylMaterial === opt.value ? 'bg-amber-100' : ''}`}
                          >
                            <img src={opt.logo} alt="" className="h-5 w-5 object-contain" />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Laminate Type */}
                <div>
                  <label htmlFor="laminate-type" className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={laminateOptions.find(l => l.value === laminateType)?.logo || ''}
                        alt="Laminate"
                        className="h-5 w-5 object-contain"
                      />
                      <span>Lamination</span>
                    </span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      id="laminate-type"
                      aria-haspopup="listbox"
                      aria-expanded={isLaminateOpen}
                      onClick={() => setIsLaminateOpen(!isLaminateOpen)}
                      className="w-full px-4 py-3 rounded-lg text-left text-gray-800 flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all hover:bg-amber-50"
                      style={{
                        background: '#EAE0D5',
                        border: '1px solid rgba(139, 117, 93, 0.3)'
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <img src={laminateOptions.find(l => l.value === laminateType)?.logo || ''} alt="" className="h-5 w-5 object-contain" />
                        <span>{laminateOptions.find(l => l.value === laminateType)?.label}</span>
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${isLaminateOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {isLaminateOpen && (
                      <div
                        role="listbox"
                        aria-labelledby="laminate-type"
                        className="absolute z-20 mt-2 w-full rounded-lg overflow-hidden shadow-lg"
                        style={{
                          background: '#F5EDE3',
                          border: '1px solid rgba(139, 117, 93, 0.3)'
                        }}
                      >
                        {laminateOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={laminateType === opt.value}
                            onClick={() => { setLaminateType(opt.value); setIsLaminateOpen(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-2 text-gray-800 hover:bg-amber-100 ${laminateType === opt.value ? 'bg-amber-100' : ''}`}
                          >
                            <img src={opt.logo} alt="" className="h-5 w-5 object-contain" />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Material Specs */}
                <div className="pt-6 border-t border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 inline-flex items-center gap-2">
                    Material Specifications
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-amber-700 border border-amber-300 cursor-help"
                      title={
                        'Roll Size: Total roll width (inches) and length (feet) used for jobs.\n' +
                        'Usable Width: Printable width after side margins.\n' +
                        'Spacing: Gap between stickers across rows/columns.\n' +
                        'Max Section: Longest continuous print length before a new section is started.'
                      }
                    >
                      i
                    </span>
                  </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                    {/* Roll Size */}
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center gap-2">
                      <span>Roll Size:</span>
                      </span>
                      {editingRoll ? (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <select
                            value={tempRollWidth}
                            onChange={(e) => setTempRollWidth(e.target.value)}
                            className="px-2 py-1 rounded border border-amber-300 text-gray-800 bg-white"
                          >
                            {['30','48','54','60','64'].map(opt => (
                              <option key={opt} value={opt}>{opt}"</option>
                            ))}
                          </select>
                          <span>×</span>
                          <select
                            value={tempRollLength}
                            onChange={(e) => setTempRollLength(e.target.value)}
                            className="px-2 py-1 rounded border border-amber-300 text-gray-800 bg-white"
                          >
                            {['75','150','300'].map(opt => (
                              <option key={opt} value={opt}>{opt}ft</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="ml-2 text-amber-700 hover:text-amber-800"
                            aria-label="Save roll size"
                            onClick={() => {
                              const w = parseFloat(tempRollWidth);
                              const l = parseFloat(tempRollLength);
                              if (!isNaN(w)) setRollWidthInches(w);
                              if (!isNaN(l)) setRollLengthFeet(l);
                              setEditingRoll(false);
                            }}
                          >✓</button>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Cancel roll size edit"
                            onClick={() => setEditingRoll(false)}
                          >✕</button>
                        </span>
                      ) : (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <span>{rollWidthInches}" × {rollLengthFeet}ft</span>
                        </span>
                      )}
                    </div>
                    {/* Usable Width */}
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center gap-2">
                      <span>Usable Width:</span>
                      </span>
                      {editingUsable ? (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={tempUsable}
                            onChange={(e) => setTempUsable(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-amber-300 text-gray-800"
                          />
                          <span>"</span>
                          <button
                            type="button"
                            className="ml-2 text-amber-700 hover:text-amber-800"
                            aria-label="Save usable width"
                            onClick={() => {
                              const v = parseFloat(tempUsable);
                              if (!isNaN(v)) {
                                setUsableWidthInches(v);
                                setCustomUsableWidth(true);
                              }
                              setEditingUsable(false);
                            }}
                          >✓</button>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Cancel usable width edit"
                            onClick={() => setEditingUsable(false)}
                          >✕</button>
                        </span>
                      ) : (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <span>{usableWidthInches}"</span>
                          <button
                            type="button"
                            aria-label="Edit usable width"
                            className="w-5 h-5 rounded hover:bg-amber-100 flex items-center justify-center"
                            onClick={() => {
                              setEditingUsable(true);
                              setTempUsable(String(usableWidthInches));
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-700"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </button>
                        </span>
                      )}
                    </div>
                    {/* Spacing */}
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center gap-2">
                      <span>Spacing:</span>
                      </span>
                      {editingSpacing ? (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <input
                            type="number"
                            step="0.001"
                            value={tempSpacing}
                            onChange={(e) => setTempSpacing(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-amber-300 text-gray-800"
                          />
                          <span>"</span>
                          <button
                            type="button"
                            className="ml-2 text-amber-700 hover:text-amber-800"
                            aria-label="Save spacing"
                            onClick={() => {
                              const v = parseFloat(tempSpacing);
                              if (!isNaN(v)) setSpacingInches(v);
                              setEditingSpacing(false);
                            }}
                          >✓</button>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Cancel spacing edit"
                            onClick={() => setEditingSpacing(false)}
                          >✕</button>
                        </span>
                      ) : (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <span>{spacingInches}"</span>
                          <button
                            type="button"
                            aria-label="Edit spacing"
                            className="w-5 h-5 rounded hover:bg-amber-100 flex items-center justify-center"
                            onClick={() => {
                              setEditingSpacing(true);
                              setTempSpacing(String(spacingInches));
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-700"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </button>
                        </span>
                      )}
                    </div>
                    {/* Max Section */}
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center gap-2">
                      <span>Max Section:</span>
                      </span>
                      {editingMaxSection ? (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={tempMaxSection}
                            onChange={(e) => setTempMaxSection(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-amber-300 text-gray-800"
                          />
                          <span>"</span>
                          <button
                            type="button"
                            className="ml-2 text-amber-700 hover:text-amber-800"
                            aria-label="Save max section"
                            onClick={() => {
                              const v = parseFloat(tempMaxSection);
                              if (!isNaN(v)) setMaxSectionLengthInches(v);
                              setEditingMaxSection(false);
                            }}
                          >✓</button>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Cancel max section edit"
                            onClick={() => setEditingMaxSection(false)}
                          >✕</button>
                        </span>
                      ) : (
                        <span className="text-gray-800 font-medium inline-flex items-center gap-2">
                          <span>{maxSectionLengthInches}"</span>
                          <button
                            type="button"
                            aria-label="Edit max section length"
                            className="w-5 h-5 rounded hover:bg-amber-100 flex items-center justify-center"
                            onClick={() => {
                              setEditingMaxSection(true);
                              setTempMaxSection(String(maxSectionLengthInches));
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-700"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </button>
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Vinyl Cost:</span>
                      <span className="text-gray-800 font-medium">${parseFloat(vinylMaterial).toFixed(2)}/roll</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laminate Cost:</span>
                      <span className="text-gray-800 font-medium">${parseFloat(laminateType).toFixed(2)}/roll</span>
                    </div>
                  </div>
                </div>

                {/* Job Summary */}
                {result && (
                  <div className="pt-6 border-t border-gray-300">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Job Summary</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Qty:</span>
                        <span className="text-gray-800 font-medium">{result.totalStickers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span className="text-gray-800 font-medium">{stickerWidth}" × {stickerHeight}"</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stickers/Row:</span>
                        <span className="text-gray-800 font-medium">{result.stickersPerRow}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rows:</span>
                        <span className="text-gray-800 font-medium">{result.totalRows}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sections:</span>
                        <span className="text-gray-800 font-medium">{result.sectionsNeeded}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Print Time:</span>
                        <span className="text-purple-600 font-semibold">{result.printTimeFormatted}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results & Cost Analysis Section */}
            <div 
              className="rounded-xl p-6"
              style={{
                background: '#F5EDE3',
                border: '1px solid rgba(139, 117, 93, 0.2)',
                boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 16px'
              }}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-5">Results & Cost Analysis</h2>
              
              {result ? (
                <div className="space-y-6">
                  {/* Layout Results */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Layout</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Stickers Printed:</span>
                        <span className="text-2xl font-bold text-gray-800">{result.actualStickersPrinted}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Stickers per Row:</span>
                        <span className="text-2xl font-bold text-gray-800">{result.stickersPerRow}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Rows:</span>
                        <span className="text-2xl font-bold text-gray-800">{result.totalRows}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sections (42" max):</span>
                        <span className="text-2xl font-bold text-gray-800">{result.sectionsNeeded}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Material Usage</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Material Used:</span>
                        <span className="text-2xl font-bold text-gray-800">
                          {result.totalFeet}ft {result.totalInches}"
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Exact Length:</span>
                        <span className="text-lg font-semibold text-amber-700">
                          {result.totalLengthInFeet.toFixed(2)}ft
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Exact Length (inches):</span>
                        <span className="text-lg font-semibold text-amber-700">
                          {result.totalLengthInches.toFixed(2)}"
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                        <span className="text-gray-600">Rolls Needed:</span>
                        <span className="text-2xl font-bold text-gray-800">
                          {(result.totalLengthInFeet / 150).toFixed(2)} rolls
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        ({((result.totalLengthInFeet / 150) * 100).toFixed(1)}% of total roll capacity)
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-300 mt-3">
                        <span className="text-gray-600">Print Time:</span>
                        <span className="text-2xl font-bold text-purple-600">
                          {result.printTimeFormatted}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        (Based on {result.sectionsNeeded} section(s) × 3 min 20 sec each)
                      </div>
                      <div className="text-xs text-gray-500 italic mt-1">
                        *Does not include cleaning cycles between jobs
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Cost Breakdown</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowMaterial(!showMaterial)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showMaterial ? 'bg-amber-600' : 'bg-gray-300'}`}
                            aria-label="Toggle material cost"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showMaterial ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-gray-600">Material:</span>
                        </div>
                        <span className={`text-xl font-semibold ${showMaterial ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          ${result.materialCost.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowLaminate(!showLaminate)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showLaminate ? 'bg-amber-600' : 'bg-gray-300'}`}
                            aria-label="Toggle laminate cost"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showLaminate ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-gray-600">Laminate:</span>
                        </div>
                        <span className={`text-xl font-semibold ${showLaminate ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          ${result.laminateCost.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowInk(!showInk)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showInk ? 'bg-amber-600' : 'bg-gray-300'}`}
                            aria-label="Toggle ink cost"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showInk ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-gray-600">Ink ({result.inkMlUsed.toFixed(2)} ml):</span>
                        </div>
                        <span className={`text-xl font-semibold ${showInk ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          ${result.inkCost.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowPackaging(!showPackaging)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showPackaging ? 'bg-amber-600' : 'bg-gray-300'}`}
                            aria-label="Toggle packaging cost"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPackaging ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-gray-600">Packaging:</span>
                        </div>
                        <span className={`text-xl font-semibold ${showPackaging ? 'text-gray-800' : 'text-gray-400 line-through'} inline-flex items-center gap-2`}>
                          <button
                            type="button"
                            aria-label="Edit packaging cost"
                            className="w-5 h-5 rounded hover:bg-amber-100 flex items-center justify-center"
                            onClick={() => {
                              setEditingPackagingCost(true);
                              setTempPackagingCost(String(packagingCustomCost ?? (result.boxCost || 0)));
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-700"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </button>
                          {editingPackagingCost ? (
                            <span className="inline-flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={tempPackagingCost}
                                onChange={(e) => setTempPackagingCost(e.target.value)}
                                className="w-24 px-2 py-1 rounded border border-amber-300 text-gray-800"
                              />
                              <button
                                type="button"
                                className="text-amber-700 hover:text-amber-800"
                                aria-label="Save packaging cost"
                                onClick={() => {
                                  const v = parseFloat(tempPackagingCost);
                                  if (!isNaN(v)) setPackagingCustomCost(v);
                                  setEditingPackagingCost(false);
                                }}
                              >✓</button>
                              <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Cancel packaging cost edit"
                                onClick={() => setEditingPackagingCost(false)}
                              >✕</button>
                            </span>
                          ) : (
                            <span>${(packagingCustomCost ?? (result.boxCost || 0)).toFixed(2)}</span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowPromo(!showPromo)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showPromo ? 'bg-amber-600' : 'bg-gray-300'}`}
                            aria-label="Toggle promotional stickers cost"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPromo ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-gray-600">Promotional Stickers:</span>
                        </div>
                        <span className={`text-xl font-semibold ${showPromo ? 'text-gray-800' : 'text-gray-400 line-through'} inline-flex items-center gap-2`}>
                          <button
                            type="button"
                            aria-label="Edit promotional stickers cost"
                            className="w-5 h-5 rounded hover:bg-amber-100 flex items-center justify-center"
                            onClick={() => {
                              setEditingPromoCost(true);
                              setTempPromoCost(String(promoCost));
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-700"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </button>
                          {editingPromoCost ? (
                            <span className="inline-flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={tempPromoCost}
                                onChange={(e) => setTempPromoCost(e.target.value)}
                                className="w-24 px-2 py-1 rounded border border-amber-300 text-gray-800"
                              />
                              <button
                                type="button"
                                className="text-amber-700 hover:text-amber-800"
                                aria-label="Save promotional stickers cost"
                                onClick={() => {
                                  const v = parseFloat(tempPromoCost);
                                  if (!isNaN(v)) setPromoCost(v);
                                  setEditingPromoCost(false);
                                }}
                              >✓</button>
                              <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Cancel promotional stickers cost edit"
                                onClick={() => setEditingPromoCost(false)}
                              >✕</button>
                            </span>
                          ) : (
                            <span>${promoCost.toFixed(2)}</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                        <span className="text-gray-700 font-semibold">Total Cost:</span>
                        <span className="text-3xl font-bold text-green-700">
                          ${((showMaterial ? result.materialCost : 0) + (showLaminate ? result.laminateCost : 0) + (showInk ? result.inkCost : 0) + (showPackaging ? (packagingCustomCost ?? (result.boxCost || 0)) : 0) + (showPromo ? promoCost : 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                        <span className="text-gray-700 font-semibold">Cost per Sticker:</span>
                        <span className="text-2xl font-bold text-amber-700">
                          ${(((showMaterial ? result.materialCost : 0) + (showLaminate ? result.laminateCost : 0) + (showInk ? result.inkCost : 0) + (showPackaging ? (packagingCustomCost ?? (result.boxCost || 0)) : 0) + (showPromo ? promoCost : 0)) / result.totalStickers).toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual representation hint */}
                  <div 
                    className="mt-6 p-4 rounded-lg"
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(217, 119, 6, 0.3)'
                    }}
                  >
                    <p className="text-sm text-amber-800">
                      💡 <strong>{result.stickersPerRow}</strong> stickers fit across each row. 
                      You'll need <strong>{result.totalRows}</strong> row(s) across <strong>{result.sectionsNeeded}</strong> section(s) to print <strong>{result.totalStickers}</strong> stickers.
                      {result.sectionsNeeded > 1 && (
                        <> Includes <strong>{result.sectionsNeeded - 1}</strong> × 4" barcode gap(s) between jobs.</>
                      )}
                    </p>
                    <p className="text-sm text-amber-800 mt-2">
                      📏 Uses <strong>{result.totalLengthInFeet.toFixed(2)}ft</strong> of material = <strong>{(result.totalLengthInFeet / 150).toFixed(2)} rolls</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-600 text-center">
                    Enter valid sticker dimensions and quantity<br />to see calculation results
                  </p>
                </div>
              )}
            </div>
                  </div>

          {/* Removed large presets block; presets moved above sticker size inputs */}
                      </div>
                      </div>
                      </div>
      )}
    </>
  );
}

