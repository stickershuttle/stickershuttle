"use client"

import { useState, useEffect, useCallback } from "react"

interface BasePricing {
  sqInches: number
  price: number
}

interface StickerCalculatorProps {
  initialBasePricing: BasePricing[]
}

export default function StickerCalculator({ initialBasePricing }: StickerCalculatorProps) {
  const [basePricing, setBasePricing] = useState<BasePricing[]>(initialBasePricing)
  const [selectedCut, setSelectedCut] = useState("Custom Shape")
  const [selectedMaterial, setSelectedMaterial] = useState("Matte")
  const [selectedSize, setSelectedSize] = useState('Medium (3")')
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [selectedQuantity, setSelectedQuantity] = useState("100")
  const [customQuantity, setCustomQuantity] = useState("")
  const [sendProof, setSendProof] = useState(true)
  const [uploadLater, setUploadLater] = useState(false)
  const [rushOrder, setRushOrder] = useState(false)
  const [totalPrice, setTotalPrice] = useState("")
  const [costPerSticker, setCostPerSticker] = useState("")

  const [postToInstagram, setPostToInstagram] = useState(false)
  const [instagramHandle, setInstagramHandle] = useState("")

  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [selectedTooltipQty, setSelectedTooltipQty] = useState<number | null>(null)
  const [tooltipAnimating, setTooltipAnimating] = useState(false)

  // Pricing data for different sizes
  const getPriceDataForSize = (sizeInches: number) => {
    // Base pricing for 3" stickers
    const basePriceData = {
      50: { total: 67.98, perEach: 1.36 },
      100: { total: 87.99, perEach: 0.88 },
      200: { total: 125.97, perEach: 0.63 },
      300: { total: 158.95, perEach: 0.53 },
      500: { total: 219.92, perEach: 0.44 },
      750: { total: 329.9, perEach: 0.44 },
      1000: { total: 349.85, perEach: 0.35 },
      2500: { total: 724.65, perEach: 0.29 },
    }

    // Calculate area multiplier (3" = 9 sq inches is our base)
    const baseArea = 9 // 3" x 3"
    const currentArea = sizeInches * sizeInches
    const areaMultiplier = currentArea / baseArea

    // Scale pricing based on area
    const scaledPriceData: { [key: number]: { total: number; perEach: number } } = {}

    Object.entries(basePriceData).forEach(([qty, data]) => {
      scaledPriceData[Number.parseInt(qty)] = {
        total: data.total * areaMultiplier,
        perEach: data.perEach * areaMultiplier,
      }
    })

    return scaledPriceData
  }

  // Extract size in inches from size string
  const getSizeInInches = (sizeString: string) => {
    if (sizeString === "Custom size") return 0
    const match = sizeString.match(/$$(\d+)"$$/)
    return match ? Number.parseInt(match[1]) : 3
  }

  const updatePricing = useCallback(() => {
    const area = calculateArea(selectedSize, customWidth, customHeight)
    const quantity =
      selectedQuantity === "Custom" ? Number.parseInt(customQuantity) || 0 : Number.parseInt(selectedQuantity)

    console.log(`\n--- Pricing Update ---`)
    console.log(`Size: ${selectedSize}, Custom Width: ${customWidth}, Custom Height: ${customHeight}`)
    console.log(`Calculated Area: ${area.toFixed(2)} sq inches`)
    console.log(`Quantity: ${quantity}`)

    if (area > 0 && quantity > 0) {
      const { total, perSticker } = calculatePrice(quantity, area, rushOrder)
      console.log(`Total Price: $${total.toFixed(2)}`)
      console.log(`Price Per Sticker: $${perSticker.toFixed(2)}`)
      setTotalPrice(`$${total.toFixed(2)}`)
      setCostPerSticker(`$${perSticker.toFixed(2)}/ea.`)
    } else {
      console.log("Invalid area or quantity, pricing not calculated")
      setTotalPrice("")
      setCostPerSticker("")
    }
  }, [selectedSize, customWidth, customHeight, selectedQuantity, customQuantity, rushOrder])

  useEffect(() => {
    console.log("Recalculating price due to size or quantity change")
    updatePricing()
  }, [updatePricing])

  // Calculate area based on size
  const calculateArea = (size: string, customW = "", customH = "") => {
    if (size === "Custom size") {
      const w = Number.parseFloat(customW) || 0
      const h = Number.parseFloat(customH) || 0
      const area = w * h // Square inches
      console.log(`Custom size: ${w}" x ${h}", Area: ${area.toFixed(2)} sq inches`)
      return area
    }
    const sizeInches = getSizeInInches(size)
    const area = sizeInches * sizeInches // Square inches
    console.log(`Standard size: ${sizeInches}", Area: ${area.toFixed(2)} sq inches`)
    return area
  }

  const calculatePrice = (qty: number, area: number, rushOrder: boolean) => {
    let totalPrice = 0
    let pricePerSticker = 0

    // Use proportional pricing based on area
    const basePrice = 1.36 // Base price per sticker for 3" (9 sq inches)
    const baseArea = 9 // 3" x 3" = 9 sq inches

    // Scale base price by area
    const scaledBasePrice = basePrice * (area / baseArea)

    // Apply quantity discounts (same discount structure for all sizes)
    const discountMap: { [key: number]: number } = {
      50: 1.0, // No discount
      100: 0.647, // 35.3% discount
      200: 0.463, // 53.7% discount
      300: 0.39, // 61% discount
      500: 0.324, // 67.6% discount
      750: 0.324, // 67.6% discount
      1000: 0.257, // 74.3% discount
      2500: 0.213, // 78.7% discount
    }

    const discountMultiplier = discountMap[qty] || 1.0
    pricePerSticker = scaledBasePrice * discountMultiplier
    totalPrice = pricePerSticker * qty

    if (rushOrder) {
      totalPrice *= 1.4 // Add 40% for rush orders
      pricePerSticker *= 1.4
    }

    console.log(
      `Quantity: ${qty}, Area: ${area}, Total price: $${totalPrice.toFixed(2)}, Price per sticker: $${pricePerSticker.toFixed(2)}`,
    )

    return {
      total: totalPrice,
      perSticker: pricePerSticker,
    }
  }

  const handleSizeChange = (size: string) => {
    setSelectedSize(size)
    if (size !== "Custom size") {
      setCustomWidth("")
      setCustomHeight("")
    }
  }

  const handleCustomSizeChange = (dimension: "width" | "height", value: string) => {
    if (dimension === "width") {
      setCustomWidth(value)
    } else {
      setCustomHeight(value)
    }
  }

  const handleQuantityChange = (amount: string) => {
    setSelectedQuantity(amount)
    if (amount !== "Custom") {
      setCustomQuantity("")
    }
  }

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value)
  }

  // Function to handle tooltip display
  const handleTooltip = (numericAmount: number) => {
    // If clicking on a quantity that's not 1000 or 2500, close any open tooltip
    if (numericAmount < 1000) {
      if (tooltipVisible) {
        setTooltipAnimating(false)
        setTimeout(() => {
          setTooltipVisible(false)
          setSelectedTooltipQty(null)
        }, 300)
      }
      return
    }

    // Show tooltip for 1000+ quantities
    setTooltipVisible(true)
    setTooltipAnimating(true)
    setSelectedTooltipQty(numericAmount)

    // Auto-hide tooltip after 3 seconds
    setTimeout(() => {
      setTooltipAnimating(false)
      setTimeout(() => {
        setTooltipVisible(false)
        setSelectedTooltipQty(null)
      }, 300)
    }, 3000)
  }

  return (
    <div className="transition-colors duration-200">
      <style jsx>{`
  @keyframes bounce-in {
    0% {
      opacity: 0;
      transform: translateX(-50%) translateY(20px) scale(0.5);
    }
    60% {
      opacity: 1;
      transform: translateX(-50%) translateY(-10px) scale(1.1);
    }
    100% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }
  
  @keyframes fade-out {
    0% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px) scale(0.8);
    }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }
  

  
  .animate-bounce-in {
    animation: bounce-in 0.4s ease-out;
  }
  
  .animate-fade-out {
    animation: fade-out 0.3s ease-in forwards;
  }
  
  .animate-glow-purple {
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4), 0 0 25px rgba(168, 85, 247, 0.2);
  }
  
  .animate-glow-green {
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 0 25px rgba(34, 197, 94, 0.2);
  }
  
  .animate-glow-yellow {
    box-shadow: 0 0 15px rgba(234, 179, 8, 0.4), 0 0 25px rgba(234, 179, 8, 0.2);
  }
  
  .animate-glow-red {
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), 0 0 25px rgba(239, 68, 68, 0.2);
  }

  .animate-glow-blue {
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), 0 0 25px rgba(59, 130, 246, 0.2);
  }
  
  .animate-glow-orange {
    box-shadow: 0 0 15px rgba(249, 115, 22, 0.4), 0 0 25px rgba(249, 115, 22, 0.2);
  }

  .container-style {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    border-radius: 16px;
  }
  
  .button-interactive {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .button-interactive:hover {
    transform: translateY(-1px);
  }
  
  .button-interactive:active {
    transform: translateY(0) scale(0.98);
  }
  
  .button-selected {
    position: relative;
  }
  

`}</style>
              <div className="">
          {/* Main Container */}
        <div className="rounded-3xl">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-18 gap-6 mb-6">
            {/* Cut Selection */}
            <div className="md:col-span-4 container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span className="text-purple-400">✂️</span>
                Select a Cut
              </h2>
              <div className="space-y-3">
                {["Custom Shape", "Circle", "Oval", "Rectangle", "Square"].map((cut) => (
                  <button
                    key={cut}
                    onClick={() => setSelectedCut(cut)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md
                      ${
                        selectedCut === cut
                          ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                          : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    {cut}
                    {cut === "Custom Shape" && (
                      <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">Most Popular</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Selection */}
            <div className="md:col-span-4 container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span role="img" aria-label="material" className="text-green-400">
                  🧻
                </span>
                Material
              </h2>
              <div className="space-y-3">
                {["Matte", "Gloss", "Removable (Matte)", "Floor", "Wall"].map((material) => (
                  <button
                    key={material}
                    onClick={() => setSelectedMaterial(material)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md
                      ${
                        selectedMaterial === material
                          ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                          : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    {material}
                    {material === "Matte" && (
                      <span className="absolute top-1 right-2 text-[10px] text-green-300 font-medium">
                        Most Popular
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="md:col-span-4 container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span role="img" aria-label="ruler" className="text-purple-400">
                  📏
                </span>
                Select a size
              </h2>
              <div className="space-y-3">
                {['Small (2")', 'Medium (3")', 'Large (4")', 'XL (5")', "Custom size"].map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                      ${
                        selectedSize === size
                          ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                          : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    <span>{size}</span>
                    {size === 'Medium (3")' && (
                      <span className="absolute top-1 right-2 text-[10px] text-purple-300 font-medium">
                        Most Popular
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {selectedSize === "Custom size" && (
                <div className="mt-3 flex gap-3">
                  <input
                    type="text"
                    placeholder="W"
                    value={customWidth}
                    onChange={(e) => handleCustomSizeChange("width", e.target.value)}
                    className="w-1/2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 backdrop-blur-md button-interactive"
                  />
                  <input
                    type="text"
                    placeholder="H"
                    value={customHeight}
                    onChange={(e) => handleCustomSizeChange("height", e.target.value)}
                    className="w-1/2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 backdrop-blur-md button-interactive"
                  />
                </div>
              )}
            </div>

            {/* Quantity Selection */}
            <div className="md:col-span-6 container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white">
                <span className="flex items-center gap-2">
                  <span className="text-green-400">#️⃣</span>
                  Select a quantity
                </span>
              </h2>
              <div className="space-y-2 relative">
                {["50", "100", "200", "300", "500", "750", "1,000", "2,500", "Custom"].map((amount) => {
                  const numericAmount = Number.parseInt(amount.replace(",", ""))
                  const area = calculateArea(selectedSize, customWidth, customHeight)

                  // Get pricing for current size
                  let pricePerEach = ""
                  let percentOff = ""

                  if (area > 0 && amount !== "Custom") {
                    const { perSticker } = calculatePrice(numericAmount, area, false)
                    const basePrice = calculatePrice(50, area, false).perSticker // Base price for 50 qty
                    const discount = ((basePrice - perSticker) / basePrice) * 100

                    pricePerEach = `$${perSticker.toFixed(2)}/ea.`
                    if (discount > 0) {
                      percentOff = `${Math.round(discount)}% off`
                    }
                  }

                  const showTooltip = tooltipVisible && selectedTooltipQty === numericAmount

                  return (
                    <div key={amount} className="relative">
                      <button
                        onClick={() => {
                          const quantityValue = amount === "Custom" ? "Custom" : numericAmount.toString()
                          handleQuantityChange(quantityValue)
                          handleTooltip(numericAmount)
                        }}
                        className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border group backdrop-blur-md
                          ${
                            (selectedQuantity === numericAmount.toString()) ||
                            (selectedQuantity === "Custom" && amount === "Custom")
                              ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                              : "hover:bg-white/10 border-white/20 text-white/80"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{amount}</span>
                          {amount === "100" && <span className="text-green-400">⭐</span>}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {area > 0 && amount !== "Custom" && (
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full border backdrop-blur-md relative z-10
                                ${
                                  (selectedQuantity === numericAmount.toString()) ||
                                  (selectedQuantity === "Custom" && amount === "Custom")
                                    ? "bg-green-500/30 text-white border-green-400/50"
                                    : "bg-green-500/20 text-green-200 border-green-400/30"
                                }`}
                              >
                                ${calculatePrice(numericAmount, area, false).total.toFixed(2)}
                              </span>
                            )}
                            {pricePerEach && amount !== "Custom" && (
                              <span
                                className="px-2 py-1 text-xs font-medium rounded-full border backdrop-blur-md bg-purple-500/20 text-purple-200 border-purple-400/50 relative z-10"
                              >
                                {pricePerEach}
                              </span>
                            )}
                          </div>
                          <div className="min-w-[60px] text-right">
                            {percentOff && (
                              <span
                                className={`text-sm font-medium
                                ${(selectedQuantity === numericAmount.toString()) || (selectedQuantity === "Custom" && amount === "Custom") ? "text-green-300" : "text-green-300"}`}
                              >
                                {percentOff}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Enhanced Liquid Glass Tooltip */}
                      {showTooltip && (
                        <div
                          className={`absolute -top-24 left-1/2 transform -translate-x-1/2 z-50 ${
                            tooltipAnimating ? "animate-bounce-in" : "animate-fade-out"
                          }`}
                        >
                          <div className="relative bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-2xl min-w-[280px] animate-glow-yellow">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-2xl"></div>
                            <div className="relative text-sm font-medium text-white text-center">
                              <div className="text-base mb-1">🎉 Congrats! You get FREE Overnight Shipping!</div>
                              <div className="text-xs text-white/80 leading-relaxed">
                                All orders 1,000+ stickers get upgraded to Overnight Shipping.
                              </div>
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white/20"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {selectedQuantity === "Custom" && (
                <div className="mt-3 space-y-2">
                  <input
                    type="number"
                    placeholder="Enter custom quantity"
                    value={customQuantity}
                    onChange={(e) => handleCustomQuantityChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-yellow-400 backdrop-blur-md button-interactive"
                  />
                </div>
              )}
              {totalPrice && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-purple-300">Total: {totalPrice}</span>
                    <span className="text-sm text-white/80">{costPerSticker}</span>
                  </div>
                  {rushOrder && <div className="text-xs text-red-300 font-medium">*Rush Order Fee Applied</div>}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Artwork Upload */}
            <div className="container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">📁 Artwork Upload *</h2>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md">
                <div className="mb-4">
                  <div className="text-4xl mb-3">📁</div>
                  <p className="text-white font-medium text-base mb-2 hidden md:block">Drag or click to upload your file</p>
                  <p className="text-white font-medium text-base mb-2 md:hidden">Tap to add file</p>
                  <p className="text-white/70 text-sm">Supported formats:</p>
                  <p className="text-white/80 text-sm font-mono">.ai, .svg, .eps, .png, .jpg, .psd</p>
                </div>
              </div>
              <div className="mt-4 flex items-center bg-purple-500/20 backdrop-blur-md p-3 rounded-lg border border-purple-400/50">
                <input
                  type="checkbox"
                  id="uploadLater"
                  checked={uploadLater}
                  onChange={() => setUploadLater(!uploadLater)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                />
                <label htmlFor="uploadLater" className="ml-2 text-sm font-medium text-white">
                  Upload Artwork Later
                </label>
              </div>
              {uploadLater && (
                <div className="mt-2 text-white/80 text-sm italic flex items-center">
                  <span role="img" aria-label="caution" className="mr-1">
                    ⚠️
                  </span>
                  Note: Please try to have your artwork submitted within 48hrs of placing an order.
                </div>
              )}
            </div>

            {/* Proof Options */}
            <div className="container-style p-6 transition-colors duration-200">
              <div className="space-y-3">
                <button
                  onClick={() => setSendProof(true)}
                  className={`button-interactive w-full px-4 py-3 rounded-xl flex items-center justify-center gap-3 transition-all border backdrop-blur-md
                    ${
                      sendProof
                        ? "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected animate-glow-green"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                                  >
                   ✅ Send FREE Proof
                  </button>
                  <button
                    onClick={() => setSendProof(false)}
                    className={`button-interactive w-full px-4 py-3 rounded-xl flex items-center justify-center gap-3 transition-all border backdrop-blur-md
                      ${
                                              !sendProof
                        ? "bg-red-500/20 text-red-200 font-medium border-red-400/50 button-selected animate-glow-red"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    ❌ Don't Send Proof (Faster)
                  </button>
                  <button
                    onClick={() => setRushOrder(!rushOrder)}
                    className={`button-interactive w-full px-4 py-3 rounded-xl flex items-center justify-center gap-3 transition-all border backdrop-blur-md
                      ${
                                              rushOrder
                        ? "bg-red-500/20 text-red-200 font-medium border-red-400/50 button-selected animate-glow-red"
                        : "hover:bg-white/10 border-white/20 text-white/80"
                      }`}
                  >
                    🚀 Rush Order (+40%)
                </button>
              </div>
            </div>

            {/* Additional Instructions */}
            <div className="container-style p-6 transition-colors duration-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <span role="img" aria-label="pencil">
                  ✏️
                </span>
                Additional Instructions:
              </h2>
              <textarea
                className="w-full h-[100px] rounded-xl border border-white/20 p-3 resize-none bg-white/10 text-white placeholder-white/60 backdrop-blur-md focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                placeholder="Enter any additional instructions here..."
              />

              {/* Instagram Post Option */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center bg-purple-500/20 backdrop-blur-md p-3 rounded-lg border border-purple-400/50">
                  <input
                    type="checkbox"
                    id="postToInstagram"
                    checked={postToInstagram}
                    onChange={() => setPostToInstagram(!postToInstagram)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <label htmlFor="postToInstagram" className="ml-2 text-sm font-medium text-white">
                    Post my order to Instagram
                  </label>
                </div>
                {postToInstagram && (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-white text-xl mr-2">@</span>
                      <input
                        type="text"
                        placeholder="Enter your Instagram handle"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        className="flex-grow px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-purple-400 backdrop-blur-md"
                      />
                    </div>
                    <div className="text-xs text-white/70 italic">
                      *Most reels are posted within a week or two of your order being delivered. We may reach out to post it sooner.
                    </div>
                    <div className="text-xs">
                      <a 
                        href="https://www.instagram.com/stickershuttle/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-300 hover:text-purple-200 underline"
                      >
                        Follow @stickershuttle
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Order Button */}
          <a href="/products" className="w-full bg-yellow-400 text-black font-semibold py-4 px-6 rounded-xl text-lg hover:bg-yellow-300 transition-all duration-300 mb-4 shadow-[0_0_15px_rgba(255,234,55,0.5)] button-interactive hover:shadow-[0_0_25px_rgba(255,234,55,0.7)] hover:scale-105 relative overflow-hidden group block">
            <span className="relative z-10 flex items-center justify-center gap-2">
              Order Stickers →
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </a>
        </div>
      </div>
    </div>
  )
}
