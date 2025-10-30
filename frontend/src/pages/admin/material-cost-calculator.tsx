import React, { useState, useEffect } from 'react';
import { loadRealPricingData, calculateRealPrice, calculateSquareInches, BasePriceRow, QuantityDiscountRow } from '@/utils/real-pricing';
import AdminLayout from '@/components/AdminLayout';

interface CalculationResult {
  totalStickers: number;
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

  // Material specifications
  const ROLL_WIDTH = 54; // inches
  const ROLL_LENGTH = 150; // feet
  const MATERIAL_COST_PER_ROLL = 189; // baseline; actual cost comes from vinylMaterial state
  const LEFT_MARGIN = 1; // inches
  const RIGHT_MARGIN = 1; // inches
  const SPACING = 0.150; // inches between stickers
  const MAX_SECTION_LENGTH = 42; // inches max print length
  const BARCODE_GAP = 4; // inches gap between sections

  const USABLE_WIDTH = 53.25; // inches
  
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
    { label: 'Economy', value: 'economy', price: '149.95' }
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
  }, [stickerWidth, stickerHeight, quantity, vinylMaterial, laminateType]);

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
    const sqIn = calculateSquareInches(w, h);
    const calc = calculateRealPrice(realPricingData.basePricing, realPricingData.quantityDiscounts, sqIn, qty, false);
    setVinylCalculatorTotal(calc.totalPrice);
    setVinylCalculatorPerSticker(calc.finalPricePerSticker);
  }, [realPricingData, stickerWidth, stickerHeight, quantity]);

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

  const calculateCost = () => {
    const width = parseFloat(stickerWidth);
    const height = parseFloat(stickerHeight);
    const qty = parseInt(quantity);

    if (!width || !height || !qty || width <= 0 || height <= 0 || qty <= 0) {
      setResult(null);
      return;
    }

    // Calculate how many stickers fit per row
    // Formula: (usable_width + spacing) / (sticker_width + spacing)
    const stickersPerRow = Math.floor((USABLE_WIDTH + SPACING) / (width + SPACING));

    if (stickersPerRow === 0) {
      setResult(null);
      return;
    }

    // Calculate how many rows fit in a 42" section
    const rowsPerSection = Math.floor((MAX_SECTION_LENGTH + SPACING) / (height + SPACING));
    
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
    
    // Calculate length of each section
    const fullSectionLength = (rowsPerSection * height) + ((rowsPerSection - 1) * SPACING);
    
    // Calculate final partial section length if there are remaining stickers
    let finalSectionLength = 0;
    if (remainingStickers > 0) {
      const finalRows = Math.ceil(remainingStickers / stickersPerRow);
      finalSectionLength = (finalRows * height) + ((finalRows - 1) * SPACING);
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
    const rollsNeeded = Math.ceil(totalLengthInFeet / ROLL_LENGTH);
    
    // Calculate how much of the last roll is used
    const fullRollsUsed = Math.floor(totalLengthInFeet / ROLL_LENGTH);
    const remainingFeetOnLastRoll = totalLengthInFeet - (fullRollsUsed * ROLL_LENGTH);

    // Calculate costs based on actual material used
    const LAMINATE_COST_PER_ROLL = parseFloat(laminateType);
    const SELECTED_MATERIAL_COST_PER_ROLL = parseFloat(vinylMaterial);
    const materialCostPerFoot = SELECTED_MATERIAL_COST_PER_ROLL / ROLL_LENGTH;
    const laminateCostPerFoot = LAMINATE_COST_PER_ROLL / ROLL_LENGTH;
    
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
    <AdminLayout title="Material Cost Calculator | Sticker Shuttle Admin">
      <div className="p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Section */}
            <div 
              className="lg:col-span-4 rounded-xl p-6"
              style={{
                background: 'rgba(3, 1, 64, 0.7)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-5">Input Parameters</h2>
              
              <div className="space-y-6">
                {/* Sticker Type */}
                <div>
                  <label htmlFor="sticker-type" className="block text-sm font-medium text-gray-300 mb-2">
                    Sticker Type
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      id="sticker-type"
                      aria-haspopup="listbox"
                      aria-expanded={isStickerTypeOpen}
                      onClick={() => setIsStickerTypeOpen(!isStickerTypeOpen)}
                      className="w-full px-4 py-3 rounded-lg text-left text-white flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                      style={{
                        background: 'rgba(3, 1, 64, 0.6)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <span>{stickerTypeOptions.find(t => t.value === stickerType)?.label}</span>
                      <svg className={`w-4 h-4 transition-transform ${isStickerTypeOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {isStickerTypeOpen && (
                      <div
                        role="listbox"
                        aria-labelledby="sticker-type"
                        className="absolute z-20 mt-2 w-full rounded-lg overflow-hidden"
                        style={{
                          background: 'rgba(3, 1, 64, 0.85)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        {stickerTypeOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={stickerType === opt.value}
                            onClick={() => { setStickerType(opt.value); setIsStickerTypeOpen(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center justify-between text-white hover:bg-white/10 ${stickerType === opt.value ? 'bg-white/10' : ''}`}
                          >
                            <span>{opt.label}</span>
                            <span className="text-sm text-gray-400">${opt.price}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Calculated Price Display moved to Results section */}

                {/* Size Presets */}
                <div className="mb-2">
                  <div className="mb-2 text-xs text-gray-400">Presets</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[2,3,4,5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => { setStickerWidth(n.toString()); setStickerHeight(n.toString()); }}
                        className="w-full px-3 py-2 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all"
                        style={{
                          background: 'rgba(3, 1, 64, 0.6)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        {n}" × {n}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sticker Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Sticker Size (inches)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Width</label>
                      <input
                        type="number"
                        step="0.1"
                        value={stickerWidth}
                        onChange={(e) => setStickerWidth(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                        style={{
                          background: 'rgba(3, 1, 64, 0.6)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          backdropFilter: 'blur(12px)'
                        }}
                        placeholder="3.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Height</label>
                      <input
                        type="number"
                        step="0.1"
                        value={stickerHeight}
                        onChange={(e) => setStickerHeight(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                        style={{
                          background: 'rgba(3, 1, 64, 0.6)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          backdropFilter: 'blur(12px)'
                        }}
                        placeholder="3.0"
                      />
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                    style={{
                      background: 'rgba(3, 1, 64, 0.6)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      backdropFilter: 'blur(12px)'
                    }}
                    placeholder="100"
                  />
                </div>

                {/* Laminate Type */}
                {/* Vinyl Material */}
                <div>
                  <label htmlFor="vinyl-material" className="block text-sm font-medium text-gray-300 mb-2">
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
                    className="w-full px-4 py-3 rounded-lg text-left text-white flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                    style={{
                        background: 'rgba(3, 1, 64, 0.6)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        backdropFilter: 'blur(12px)'
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
                        className="absolute z-20 mt-2 w-full rounded-lg overflow-hidden"
                        style={{
                          background: 'rgba(3, 1, 64, 0.85)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        {vinylOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={vinylMaterial === opt.value}
                            onClick={() => { setVinylMaterial(opt.value); setIsVinylOpen(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-2 text-white hover:bg-white/10 ${vinylMaterial === opt.value ? 'bg-white/10' : ''}`}
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
                  <label htmlFor="laminate-type" className="block text-sm font-medium text-gray-300 mb-2">
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
                      className="w-full px-4 py-3 rounded-lg text-left text-white flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                      style={{
                        background: 'rgba(3, 1, 64, 0.6)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        backdropFilter: 'blur(12px)'
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
                        className="absolute z-20 mt-2 w-full rounded-lg overflow-hidden"
                        style={{
                          background: 'rgba(3, 1, 64, 0.85)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        {laminateOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={laminateType === opt.value}
                            onClick={() => { setLaminateType(opt.value); setIsLaminateOpen(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-2 text-white hover:bg-white/10 ${laminateType === opt.value ? 'bg-white/10' : ''}`}
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
                <div className="pt-6 border-t border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Material Specifications</h3>
                    <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Roll Size:</span>
                      <span className="text-white">{ROLL_WIDTH}" × {ROLL_LENGTH}ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Usable Width:</span>
                      <span className="text-white">{USABLE_WIDTH}" (1" margins)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spacing:</span>
                      <span className="text-white">{SPACING}"</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Section:</span>
                      <span className="text-white">{MAX_SECTION_LENGTH}" (3" gap after)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vinyl Cost:</span>
                      <span className="text-white">${parseFloat(vinylMaterial).toFixed(2)}/roll</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laminate Cost:</span>
                      <span className="text-white">${parseFloat(laminateType).toFixed(2)}/roll</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div 
              className="lg:col-span-4 rounded-xl p-6"
              style={{
                background: 'rgba(3, 1, 64, 0.7)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-5">Calculation Results</h2>
              
              {result ? (
                <div className="space-y-6">
                  {/* Layout Results */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Layout</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Stickers per Row:</span>
                        <span className="text-2xl font-bold text-white">{result.stickersPerRow}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Rows:</span>
                        <span className="text-2xl font-bold text-white">{result.totalRows}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Sections (42" max):</span>
                        <span className="text-2xl font-bold text-white">{result.sectionsNeeded}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Material Usage</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Material Used:</span>
                        <span className="text-2xl font-bold text-white">
                          {result.totalFeet}ft {result.totalInches}"
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Exact Length:</span>
                        <span className="text-lg font-semibold text-blue-300">
                          {result.totalLengthInFeet.toFixed(2)}ft
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Exact Length (inches):</span>
                        <span className="text-lg font-semibold text-blue-300">
                          {result.totalLengthInches.toFixed(2)}"
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-700/50">
                        <span className="text-gray-400">Rolls Needed:</span>
                        <span className="text-2xl font-bold text-white">
                          {(result.totalLengthInFeet / 150).toFixed(2)} rolls
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        ({((result.totalLengthInFeet / 150) * 100).toFixed(1)}% of total roll capacity)
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-700/50 mt-3">
                        <span className="text-gray-400">Print Time:</span>
                        <span className="text-2xl font-bold text-purple-400">
                          {result.printTimeFormatted}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        (Based on {result.sectionsNeeded} section(s) × 3 min 20 sec each)
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Cost Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Material:</span>
                        <span className="text-xl font-semibold text-white">
                          ${result.materialCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Laminate:</span>
                        <span className="text-xl font-semibold text-white">
                          ${result.laminateCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Ink ({result.inkMlUsed.toFixed(2)} ml):</span>
                        <span className="text-xl font-semibold text-white">
                          ${result.inkCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Packaging:</span>
                        <span className="text-xl font-semibold text-white">
                          ${(result.boxCost || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Promotional Stickers:</span>
                        <span className="text-xl font-semibold text-white">
                          $0.20
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                        <span className="text-gray-300 font-semibold">Total Cost:</span>
                        <span className="text-3xl font-bold text-green-400">
                          ${(result.totalCost + result.inkCost + (result.boxCost || 0) + 0.20).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                        <span className="text-gray-300 font-semibold">Cost per Sticker:</span>
                        <span className="text-2xl font-bold text-blue-400">
                          ${((result.totalCost + result.inkCost + (result.boxCost || 0) + 0.20) / result.totalStickers).toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual representation hint */}
                  <div 
                    className="mt-6 p-4 rounded-lg"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <p className="text-sm text-blue-300">
                      💡 <strong>{result.stickersPerRow}</strong> stickers fit across each row. 
                      You'll need <strong>{result.totalRows}</strong> row(s) across <strong>{result.sectionsNeeded}</strong> section(s) to print <strong>{result.totalStickers}</strong> stickers.
                      {result.sectionsNeeded > 1 && (
                        <> Includes <strong>{result.sectionsNeeded - 1}</strong> × 4" barcode gap(s) between jobs.</>
                      )}
                    </p>
                    <p className="text-sm text-blue-300 mt-2">
                      📏 Uses <strong>{result.totalLengthInFeet.toFixed(2)}ft</strong> of material = <strong>{(result.totalLengthInFeet / 150).toFixed(2)} rolls</strong>.
                    </p>
                  </div>

                  {/* Profit analysis moved to dedicated right column */}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400 text-center">
                    Enter valid sticker dimensions and quantity<br />to see calculation results
                  </p>
                </div>
              )}
            </div>

            {/* Profit Analysis (Right Column) */}
            <div 
              className="lg:col-span-4 rounded-xl p-6"
              style={{
                background: 'rgba(3, 1, 64, 0.7)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-5">Profit Analysis</h2>
              {result ? (
                <div className="space-y-6">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Storefront Price (Vinyl Calculator)</div>
                    <div className="text-3xl font-bold text-green-400">${vinylCalculatorTotal.toFixed(2)}</div>
                    <div className="text-sm text-blue-300">${vinylCalculatorPerSticker.toFixed(3)} / sticker</div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Costs</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Material (vinyl):</span>
                        <span className="text-white">${result.materialCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Laminate:</span>
                        <span className="text-white">${result.laminateCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ink ({result.inkMlUsed.toFixed(2)} ml):</span>
                        <span className="text-white">${result.inkCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Packaging:</span>
                        <span className="text-white">${(result.boxCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Promotional Stickers:</span>
                        <span className="text-white">$0.20</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-300">Estimated COGS:</span>
                        <span className="text-white">${(result.materialCost + result.laminateCost + result.inkCost + (result.boxCost || 0) + 0.20).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">COGS per sticker:</span>
                        <span className="text-gray-300">${((result.materialCost + result.laminateCost + result.inkCost + (result.boxCost || 0) + 0.20) / result.totalStickers).toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Profit</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order Total:</span>
                        <span className="text-2xl font-bold text-green-400">${vinylCalculatorTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Costs:</span>
                        <span className="text-2xl font-bold text-red-400">-${(result.materialCost + result.laminateCost + result.inkCost + (result.boxCost || 0) + 0.20).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gross Profit:</span>
                        <span className="text-2xl font-bold text-emerald-400">${(Math.max(0, vinylCalculatorTotal - (result.materialCost + result.laminateCost + result.inkCost + (result.boxCost || 0) + 0.20))).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-300">Margin:</span>
                        <span className="text-emerald-300">{(vinylCalculatorTotal > 0 ? ((vinylCalculatorTotal - (result.materialCost + result.laminateCost + result.inkCost + (result.boxCost || 0) + 0.20)) / vinylCalculatorTotal) * 100 : 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-300">Profit / sticker:</span>
                        <span className="text-emerald-300">${Math.max(0, (vinylCalculatorPerSticker - ((result.materialCost + result.laminateCost + result.inkCost + (result.boxCost || 0) + 0.20) / result.totalStickers))).toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Job Summary</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex justify-between"><span className="text-gray-400">Qty:</span><span className="text-white">{result.totalStickers}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Size:</span><span className="text-white">{stickerWidth}" × {stickerHeight}"</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Stickers/Row:</span><span className="text-white">{result.stickersPerRow}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Rows:</span><span className="text-white">{result.totalRows}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Sections:</span><span className="text-white">{result.sectionsNeeded}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Material Used:</span><span className="text-white">{result.totalFeet}ft {result.totalInches}"</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Rolls (decimal):</span><span className="text-white">{(result.totalLengthInFeet / 150).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Print Time:</span><span className="text-purple-400 font-semibold">{result.printTimeFormatted}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">Enter size and quantity</div>
              )}
            </div>
          </div>

          {/* Removed large presets block; presets moved above sticker size inputs */}
        </div>
      </div>
    </AdminLayout>
  );
}

