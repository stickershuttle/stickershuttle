import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";
import { getSupabase } from "@/lib/supabase";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from "@/utils/cloudinary";

const ADMIN_EMAILS = ['justin@stickershuttle.com'];

interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  short_description: string;
  price: number;
  original_price?: number;
  images: string[];
  default_image: string;
  category: string;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number;
  sold_quantity: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export default function MarketplaceAdmin() {
  const router = useRouter();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    short_description: "",
    price: "",
    original_price: "",
    images: [] as string[],
    default_image: "",
    categories: [] as string[], // Changed to array for multiple selection
    product_type: "single", // New field for single vs pack
    tags: [] as string[],
    is_active: true,
    is_featured: false,
    stock_quantity: 1000
  });

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const supabase = getSupabase();

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }

        // Check if user email is in admin list
        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
          router.push('/account/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('marketplace_products')
        .select('*');

      // Apply category filter
      if (filterCategory !== "all") {
        query = query.eq('category', filterCategory);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Refetch when filter changes
  useEffect(() => {
    if (!loading) {
      fetchProducts();
    }
  }, [filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate categories
    if (formData.categories.length === 0) {
      alert('Please select at least one category');
      return;
    }
    
    try {
      const productData = {
        ...formData,
        category: formData.categories[0] || "Die-Cut", // Use first category for now, until we update DB schema
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock_quantity: parseInt(formData.stock_quantity.toString()),
        tags: formData.tags.filter(tag => tag.trim() !== '')
      };
      
      // Remove the categories and product_type fields since they're not in the DB yet
      delete productData.categories;
      delete productData.product_type;

      if (editingProduct) {
        const { error } = await supabase
          .from('marketplace_products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketplace_products')
          .insert([productData]);

        if (error) throw error;
      }
      setShowAddProduct(false);
      setEditingProduct(null);
      resetForm();
      await fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(`Error saving product: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      short_description: "",
      price: "",
      original_price: "",
      images: [],
      default_image: "",
      categories: [],
      product_type: "single",
      tags: [],
      is_active: true,
      is_featured: false,
      stock_quantity: 1000
    });
  };

  const categories = [
    "Die-Cut",
    "Circle", 
    "Rectangle",
    "Square",
    "Oval"
  ];

  const handleFileUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(null);
    
    try {
      // Validate file using the utility function
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Upload using the same function as calculators
      const result: CloudinaryUploadResult = await uploadToCloudinary(
        file,
        undefined, // No metadata needed for marketplace images
        (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
        'marketplace' // folder
      );

      return result.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleEdit = (product: MarketplaceProduct) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      short_description: product.short_description,
      price: product.price.toString(),
      original_price: product.original_price?.toString() || "",
      images: product.images,
      default_image: product.default_image,
      categories: product.category ? [product.category] : [], // Convert single category to array
      product_type: "single", // Default value, you might want to add this field to the database
      tags: product.tags,
      is_active: product.is_active,
      is_featured: product.is_featured,
      stock_quantity: product.stock_quantity
    });
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('marketplace_products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Delete error:', error);
        alert('Failed to delete product. Please try again.');
        return;
      }
      
      // Refresh the products list
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const toggleActive = async (product: MarketplaceProduct) => {
    try {
      const { error } = await supabase
        .from('marketplace_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const toggleFeatured = async (product: MarketplaceProduct) => {
    try {
      const { error } = await supabase
        .from('marketplace_products')
        .update({ is_featured: !product.is_featured })
        .eq('id', product.id);

      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await handleFileUpload(file);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl],
        default_image: prev.default_image || imageUrl
      }));
      // Reset the input so the same file can be selected again
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      try {
        const imageUrl = await handleFileUpload(file);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, imageUrl],
          default_image: prev.default_image || imageUrl
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const addImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url],
        default_image: prev.default_image || url
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      default_image: prev.default_image === prev.images[index] ? "" : prev.default_image
    }));
  };

  const [tagInput, setTagInput] = useState('');
  const [editorToolbar, setEditorToolbar] = useState(false);

  const addTag = (tagToAdd?: string) => {
    const tag = tagToAdd || tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => {
      const currentCategories = prev.categories;
      const maxCategories = prev.product_type === 'pack' ? 5 : 2;
      
      if (currentCategories.includes(category)) {
        // Remove category
        return {
          ...prev,
          categories: currentCategories.filter(c => c !== category)
        };
      } else if (currentCategories.length < maxCategories) {
        // Add category (max depends on product type)
        return {
          ...prev,
          categories: [...currentCategories, category]
        };
      }
      return prev; // Don't add if already at max
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Marketplace - Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Marketplace - Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Access Denied</div>
        </div>
      </AdminLayout>
    );
  }

  // If showing add product, render the full viewport
  if (showAddProduct) {
    return (
      <AdminLayout title={editingProduct ? "Edit Product - Admin Dashboard" : "Add Product - Admin Dashboard"}>
        <style jsx>{`
          .container-style {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
          }
          .button-style {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%);
            backdrop-filter: blur(25px) saturate(180%);
            border: 1px solid rgba(59, 130, 246, 0.4);
            box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
          }
          .emerald-button-style {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.25) 50%, rgba(16, 185, 129, 0.1) 100%);
            backdrop-filter: blur(25px) saturate(180%);
            border: 1px solid rgba(16, 185, 129, 0.4);
            box-shadow: rgba(16, 185, 129, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
          }
        `}</style>
        
        <div className="p-6">
          {/* Header */}
          <div className="container-style rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)'
                  }}
                  title="Back to Products"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {editingProduct ? 'Edit Product' : 'Add Product'}
                  </h1>
                  <p className="text-gray-400">
                    {editingProduct ? 'Update product information' : 'Create a new marketplace product'}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="product-form"
                  disabled={isUploading}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isUploading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isUploading ? 'Uploading...' : editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </div>
          </div>

          <form id="product-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Product Information */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Product Information</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Enter product title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Short Description</label>
                      <input
                        type="text"
                        value={formData.short_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Brief product description"
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Description</label>
                      <div className="relative">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-2 bg-white/5 border-b border-white/10 rounded-t-lg">
                          <button
                            type="button"
                            onClick={() => {
                              const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const selectedText = formData.description.substring(start, end);
                              const newText = formData.description.substring(0, start) + `**${selectedText || 'bold text'}**` + formData.description.substring(end);
                              setFormData(prev => ({ ...prev, description: newText }));
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-white text-sm font-bold"
                            title="Bold"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const selectedText = formData.description.substring(start, end);
                              const newText = formData.description.substring(0, start) + `*${selectedText || 'italic text'}*` + formData.description.substring(end);
                              setFormData(prev => ({ ...prev, description: newText }));
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-white text-sm italic"
                            title="Italic"
                          >
                            I
                          </button>
                          <div className="w-px h-4 bg-white/20 mx-1"></div>
                          <button
                            type="button"
                            onClick={() => {
                              const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                              const start = textarea.selectionStart;
                              const newText = formData.description.substring(0, start) + '• ' + formData.description.substring(start);
                              setFormData(prev => ({ ...prev, description: newText }));
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-white text-sm"
                            title="Bullet Point"
                          >
                            •
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const textarea = document.getElementById('description-textarea') as HTMLTextAreaElement;
                              const start = textarea.selectionStart;
                              const newText = formData.description.substring(0, start) + '\n\n' + formData.description.substring(start);
                              setFormData(prev => ({ ...prev, description: newText }));
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-white text-sm"
                            title="Line Break"
                          >
                            ↵
                          </button>
                        </div>
                        
                        {/* Textarea */}
                        <textarea
                          id="description-textarea"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-3 bg-white/10 border border-white/20 border-t-0 rounded-b-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 resize-none font-mono text-sm"
                          placeholder="Detailed product description... Use **bold**, *italic*, • for bullets"
                        />
                      </div>
                      <p className="text-gray-400 text-xs mt-2">
                        Use **bold**, *italic*, • for bullets. Line breaks will be preserved.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Images */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Product Images</h2>
                  
                  {/* Hidden file input */}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                    aria-label="Upload product image"
                  />

                  {/* Upload Area */}
                  <div 
                    className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md relative mb-6"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {isUploading ? (
                      <div className="mb-4">
                        <div className="text-4xl mb-3">⏳</div>
                        <p className="text-white font-medium text-base mb-2">Uploading...</p>
                        {uploadProgress && (
                          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                            <div 
                              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.percentage}%` }}
                            ></div>
                          </div>
                        )}
                        {uploadProgress && (
                          <p className="text-white/80 text-sm">{uploadProgress.percentage}% complete</p>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="mb-3 flex justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                            alt="Upload file" 
                            className="w-20 h-20 object-contain"
                          />
                        </div>
                        <p className="text-white font-medium text-base mb-2">
                          Drop image here or click to upload
                        </p>
                        <p className="text-white/60 text-sm">
                          All formats supported. Max file size: 25MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Image List */}
                  {formData.images.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">Uploaded Images:</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative group">
                            {/* 1:1 aspect ratio container without background */}
                            <div className="aspect-square rounded-lg border border-white/20 overflow-hidden bg-gray-800">
                              <img
                                src={image}
                                alt={`Product ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <div className="flex gap-2">
                                <label className="flex items-center gap-1 text-xs text-white bg-white/20 px-2 py-1 rounded">
                                  <input
                                    type="radio"
                                    name="default_image"
                                    checked={formData.default_image === image}
                                    onChange={() => setFormData(prev => ({ ...prev, default_image: image }))}
                                    className="w-3 h-3"
                                    aria-label={`Set as default image`}
                                  />
                                  Default
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Product Organization */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Product Organization</h2>
                  
                  {/* Product Type Selector */}
                  <div className="mb-6">
                    <label className="block text-white text-sm font-medium mb-3">Product Type</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, product_type: "single" }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          formData.product_type === "single"
                            ? 'bg-blue-600/40 text-white border border-blue-500/50'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        Single Sticker
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, product_type: "pack" }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          formData.product_type === "pack"
                            ? 'bg-blue-600/40 text-white border border-blue-500/50'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        Sticker Pack
                      </button>
                    </div>
                  </div>

                  {/* Categories Selector */}
                              <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-3">
                Categories (Select up to {formData.product_type === 'pack' ? '5' : '2'})
                <span className="text-gray-400 text-xs ml-2">
                  {formData.categories.length}/{formData.product_type === 'pack' ? '5' : '2'} selected
                </span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {categories.map((category) => {
                  const maxCategories = formData.product_type === 'pack' ? 5 : 2;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      disabled={!formData.categories.includes(category) && formData.categories.length >= maxCategories}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        formData.categories.includes(category)
                          ? 'bg-blue-600/40 text-white border border-blue-500/50'
                          : formData.categories.length >= maxCategories
                          ? 'bg-gray-600/50 text-gray-500 cursor-not-allowed border border-gray-500/30'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
              {formData.categories.length === 0 && (
                <p className="text-red-400 text-xs mt-2">Please select at least one category</p>
              )}
            </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Stock Quantity</label>
                    <input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="1000"
                      min="-1"
                    />
                    <p className="text-gray-400 text-xs mt-1">Set to -1 for unlimited stock</p>
                  </div>

                  {/* Tags */}
                  <div className="mt-4">
                    <label className="block text-white text-sm font-medium mb-2">Tags</label>
                    
                    {/* Tags Display */}
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.tags.map((tag, index) => (
                          <span key={index} className="bg-white/10 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(index)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold transition-colors"
                              aria-label={`Remove tag ${tag}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Tag Input */}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      placeholder="Type a tag and press Enter"
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-gray-400 text-xs mt-2">Press Enter to add tags</p>
                  </div>
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                
                {/* Product Status */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Product Status</h2>
                  
                  <div className="space-y-4">
                    {/* Active Toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.is_active ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                        aria-label="Toggle product active status"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-white text-sm">Active</span>
                    </div>
                    
                    {/* Featured Toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.is_featured ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}
                        aria-label="Toggle product featured status"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.is_featured ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-white text-sm">Featured</span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Compare at Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.original_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00"
                      />
                      <p className="text-gray-400 text-xs mt-1">Optional - shows as crossed out price</p>
                    </div>
                  </div>
                </div>

                                {/* Social Sharing Preview */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Social Sharing Preview</h2>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    {/* Social Card Preview */}
                    <div className="space-y-3">
                      {/* Image Preview with 1:1 aspect ratio and background */}
                      <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden relative">
                        {/* Background Image */}
                        <img
                          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1754091658/BGSquare_eai516.png"
                          alt="Background"
                          className="w-full h-full object-cover absolute inset-0"
                        />
                        
                        {/* Sticker Design Overlay */}
                        {formData.default_image || formData.images[0] ? (
                          <div className="absolute inset-0 flex items-center justify-center p-16">
                            <img
                              src={formData.default_image || formData.images[0]}
                              alt="Sticker design"
                              className="max-w-full max-h-full object-contain drop-shadow-lg"
                            />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white/80">
                            <div className="text-center">
                              <div className="text-2xl mb-2">🖼️</div>
                              <p className="text-sm">Upload an image to see preview</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Title and Description */}
                      <div>
                        <h3 className="text-white font-medium text-sm line-clamp-2">
                          {formData.title
                            ? `${formData.title} on the Sticker Shuttle Marketplace`
                            : 'Product Title on the Sticker Shuttle Marketplace'
                          }
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                          {formData.short_description || formData.description || 'Product description will appear here'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">stickershuttle.com</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs mt-3">
                    This is how your product will appear when shared on social media platforms.
                  </p>
                </div>


              </div>
            </div>
          </form>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Marketplace - Admin Dashboard">
      <style jsx>{`
        .container-style {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
          backdrop-filter: blur(12px);
        }
        .button-style {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(59, 130, 246, 0.4);
          box-shadow: rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
        }
        .emerald-button-style {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.25) 50%, rgba(16, 185, 129, 0.1) 100%);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(16, 185, 129, 0.4);
          box-shadow: rgba(16, 185, 129, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset;
        }
        .modal-style {
          background: rgba(3, 1, 64, 0.95);
        }
        .dropdown-style {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .dropdown-option {
          background: #1f2937;
          color: white;
        }
      `}</style>
      
      <div className="p-6">

        {/* Filter and Add Product */}
        <div className="container-style rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center gap-4">
              <label className="text-white text-sm font-medium">Filter by Shape:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="dropdown-style px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Filter products by shape"
              >
                <option value="all" className="dropdown-option">All Shapes</option>
                {categories.map((category) => (
                  <option key={category} value={category} className="dropdown-option">
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <button
                          onClick={() => {
              resetForm();
              setEditingProduct(null);
              setShowAddProduct(true);
            }}
              className="emerald-button-style px-6 py-3 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Add New Product
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Add Product Placeholder Card */}
          <div
            onClick={() => {
              resetForm();
              setEditingProduct(null);
              setShowAddProduct(true);
            }}
            className="container-style border-2 border-dashed border-white/20 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 hover:bg-white/10 transition-all duration-200 flex flex-col items-center justify-center min-h-[400px]"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Add New Product</h3>
              <p className="text-gray-400 text-sm">Click to create a new marketplace product</p>
            </div>
          </div>

          {products.map((product) => (
            <div
              key={product.id}
              className="container-style rounded-2xl p-4"
            >
              {/* Product Image */}
              <div className="aspect-square mb-4 rounded-lg overflow-hidden">
                <img
                  src={product.default_image || product.images[0] || '/placeholder.png'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold truncate">{product.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{product.short_description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">${product.price}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {product.is_featured && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Views: {product.views_count}</span>
                  <span>Sold: {product.sold_quantity}</span>
                </div>

                                 {/* Actions */}
                 <div className="flex flex-wrap items-center gap-2 pt-2">
                   <button
                     onClick={() => {
                       handleEdit(product);
                       setShowAddProduct(true);
                     }}
                     className="button-style px-3 py-1 text-white rounded text-sm font-medium transition-all duration-200 hover:scale-105"
                   >
                     Edit
                   </button>
                   <button
                     onClick={() => toggleActive(product)}
                     className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 hover:scale-105 ${
                       product.is_active 
                         ? 'bg-red-600/80 hover:bg-red-600 text-white border border-red-500/50' 
                         : 'bg-green-600/80 hover:bg-green-600 text-white border border-green-500/50'
                     }`}
                   >
                     {product.is_active ? 'Deactivate' : 'Activate'}
                   </button>
                   <button
                     onClick={() => toggleFeatured(product)}
                     className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 hover:scale-105 ${
                       product.is_featured 
                         ? 'bg-gray-600/80 hover:bg-gray-600 text-white border border-gray-500/50' 
                         : 'bg-yellow-600/80 hover:bg-yellow-600 text-white border border-yellow-500/50'
                     }`}
                   >
                     {product.is_featured ? 'Unfeature' : 'Feature'}
                   </button>
                   <button
                     onClick={() => handleDelete(product.id)}
                     className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-sm font-medium transition-all duration-200 hover:scale-105 border border-red-500/50"
                   >
                     Delete
                   </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
} 