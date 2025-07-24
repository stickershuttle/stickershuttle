import Layout from "@/components/Layout";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function PostDesign() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    shopName: "",
    basePrice: "",
    material: "",
    tags: "",
    imageUrl: ""
  });
  const [uploading, setUploading] = useState(false);

  // Calculate markup price based on material and base cost
  const calculateMarkupPrice = (basePrice: string, material: string) => {
    const base = parseFloat(basePrice) || 0;
    const markup = 2.5; // 250% markup
    
    // Add material cost
    let materialCost = 0;
    switch (material.toLowerCase()) {
      case 'vinyl':
        materialCost = 1.50;
        break;
      case 'holographic':
      case 'chrome':
      case 'glitter':
        materialCost = 1.80;
        break;
      case 'clear':
        materialCost = 1.50;
        break;
      default:
        materialCost = 1.50;
    }
    
    return ((base + materialCost) * markup).toFixed(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Simulate upload to Cloudinary or file server
    // In a real implementation, you'd upload to your storage service
    setTimeout(() => {
      const mockUrl = `https://res.cloudinary.com/dxcnvqk6b/image/upload/v${Date.now()}/user_design_${Math.random().toString(36).substr(2, 9)}.png`;
      setFormData(prev => ({
        ...prev,
        imageUrl: mockUrl
      }));
      setUploading(false);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.shopName || !formData.basePrice || !formData.material || !formData.imageUrl) {
      alert("Please fill in all required fields and upload an image.");
      return;
    }

    // Calculate final price
    const finalPrice = calculateMarkupPrice(formData.basePrice, formData.material);
    
    // Create new design object (in real app, this would be saved to database)
    const newDesign = {
      id: Date.now(),
      title: formData.title,
      artist: formData.shopName,
      price: parseFloat(finalPrice),
      category: `${formData.material} Stickers`,
      image: formData.imageUrl,
      sales: 0,
      rating: 5.0,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    console.log("New design submitted:", newDesign);
    
    // In a real app, you'd make an API call here to save the design
    alert(`Design "${formData.title}" submitted successfully! Price: $${finalPrice}`);
    
    // Redirect back to marketplace
    router.push('/marketplace');
  };

  const marketplacePrice = calculateMarkupPrice(formData.basePrice, formData.material);

  return (
    <Layout 
      title="Post Your Design - Sticker Shuttle Marketplace"
      description="Submit your custom sticker design to our marketplace and start earning from your creativity."
      ogImage="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749652894/StickerShuttle_Banner_PurpleCustomStickers_zxst8r.webp"
    >
      <Head>
        <link rel="canonical" href="https://stickershuttle.com/post-design" />
      </Head>
      
      <style jsx>{`
        .form-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
          backdrop-filter: blur(12px);
        }
        .input-field {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          transition: all 0.2s ease;
        }
        .input-field:focus {
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .submit-button {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.5) 0%, rgba(34, 197, 94, 0.35) 50%, rgba(34, 197, 94, 0.2) 100%);
          backdrop-filter: blur(25px) saturate(200%);
          border: 1px solid rgba(34, 197, 94, 0.6);
        }
        .back-button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }
        .image-upload-area {
          border: 2px dashed rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.3s ease;
        }
        .image-upload-area:hover {
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(59, 130, 246, 0.05);
        }
        .preview-image {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div className="min-h-screen pt-8 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => router.back()}
                className="back-button p-3 rounded-lg transition-all duration-300 hover:scale-105"
                aria-label="Go back to previous page"
                title="Go back"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Post Your Design</h1>
                <p className="text-gray-400 mt-1">Share your creativity with the Sticker Shuttle community</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="form-container rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Design Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Design Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter your design name..."
                  className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 outline-none"
                  required
                />
              </div>

              {/* Shop Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Shop Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleInputChange}
                  placeholder="Your shop or artist name..."
                  className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">This will be saved to your account for future posts</p>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Design Image <span className="text-red-400">*</span>
                </label>
                
                {formData.imageUrl ? (
                  <div className="preview-image rounded-lg p-4 text-center">
                    <img 
                      src={formData.imageUrl} 
                      alt="Design preview" 
                      className="max-w-full max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                      className="mt-3 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Remove & upload different image
                    </button>
                  </div>
                ) : (
                  <div className="image-upload-area rounded-lg p-8 text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      required
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {uploading ? (
                        <>
                          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                          <p className="text-gray-300">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-gray-300 text-lg mb-2">Click to upload your design</p>
                          <p className="text-gray-500 text-sm">PNG, JPG, SVG up to 10MB</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* Material Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Material <span className="text-red-400">*</span>
                </label>
                <select
                  name="material"
                  value={formData.material}
                  onChange={handleInputChange}
                  className="input-field w-full px-4 py-3 rounded-lg text-white outline-none"
                  aria-label="Select sticker material"
                  required
                >
                  <option value="">Select material...</option>
                  <option value="vinyl">Vinyl Stickers ($1.50 base)</option>
                  <option value="holographic">Holographic Stickers ($1.80 base)</option>
                  <option value="chrome">Chrome Stickers ($1.80 base)</option>
                  <option value="glitter">Glitter Stickers ($1.80 base)</option>
                  <option value="clear">Clear Stickers ($1.50 base)</option>
                </select>
              </div>

              {/* Base Price */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Your Base Price <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  placeholder="0.50"
                  step="0.01"
                  min="0"
                  className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Your profit per sticker (before material costs)</p>
                
                {formData.basePrice && formData.material && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-400">
                      <strong>Marketplace Price: ${marketplacePrice}</strong>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Includes material costs + 250% markup for marketplace fees and profit
                    </p>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="funny, cute, animal, space (separate with commas)"
                  className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Help users find your design with relevant tags</p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 back-button px-6 py-3 rounded-lg font-medium text-gray-300 transition-all duration-200 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 submit-button px-6 py-3 rounded-lg font-medium text-white transition-all duration-300 hover:scale-105"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Post Design"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <FloatingChatWidget />
    </Layout>
  );
} 