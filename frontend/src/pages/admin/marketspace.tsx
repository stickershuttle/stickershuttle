import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";
import CreatorManagementModal from "@/components/CreatorManagementModal";
import { getSupabase } from "@/lib/supabase";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from "@/utils/cloudinary";
import { useQuery } from "@apollo/client";
import { GET_CREATOR_BY_USER_ID } from "@/lib/profile-mutations";
import MarketplaceStickerCalculator from "@/components/marketspace-sticker-calculator";

const ADMIN_EMAILS = ['justin@stickershuttle.com'];

interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  creator_id?: string;
  collection_id?: string;
  creator?: {
    id: string;
    creator_name: string;
    email: string;
  };
  price: number;
  original_price?: number;
  markup_percentage?: number;
  size_pricing?: {
    "3": number;
    "4": number;
    "5": number;
  };
  size_compare_pricing?: {
    "3": number;
    "4": number;
    "5": number;
  };
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

export default function CreatorsSpaceAdmin() {
  const router = useRouter();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    short_description: "",
    price: "",
    original_price: "",
    markup_percentage: "",
    size_pricing: {
      "3": "3.99",
      "4": "4.99",
      "5": "5.99"
    },
    size_compare_pricing: {
      "3": "4.99",
      "4": "5.99",
      "5": "6.99"
    } as { "3": string; "4": string; "5": string; },
    images: [] as string[],
    default_image: "",
    categories: ["Die-Cut"] as string[], // Default to Die-Cut
    product_type: "single", // New field for single vs pack
    creator_id: "", // Creator assignment
    collection_id: "", // Collection assignment
    tags: [] as string[],
    is_active: true,
    is_featured: false,
    stock_quantity: 1000
  });

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recently_added");
  const [viewMode, setViewMode] = useState<"card" | "row">("card");
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [editingProductDescription, setEditingProductDescription] = useState<MarketplaceProduct | null>(null);
  const [descriptionText, setDescriptionText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [editingCreator, setEditingCreator] = useState(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionTable, setCollectionTable] = useState<'creator_collections' | 'collections'>('collections');
  const [collectionsEnabled, setCollectionsEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [showEditCollection, setShowEditCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [collectionFormData, setCollectionFormData] = useState({
    name: ""
  });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<MarketplaceProduct | null>(null);
  const [duplicateQuantity, setDuplicateQuantity] = useState(1);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, currentFile: string}>({current: 0, total: 0, currentFile: ""});
  const [batchProductData, setBatchProductData] = useState<{[key: string]: {
    title: string;
    collection_id: string;
    creator_id: string;
    category: string;
    size_pricing: {
      "3": string;
      "4": string;
      "5": string;
    };
  }}>({});

  // Initialize Supabase client only on the client to avoid build/export env checks
  const [supabase, setSupabase] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setSupabase(getSupabase());
      } catch (e) {
        console.error('Supabase init error:', e);
      }
    }
  }, []);

  // Check if user is a creator
  const { data: creatorData } = useQuery(GET_CREATOR_BY_USER_ID, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
  });

  const isCreator = creatorData?.getCreatorByUserId?.isActive || false;
  const currentCreatorId = creatorData?.getCreatorByUserId?.id;

  // Check if user is admin or creator
  useEffect(() => {
    async function checkAccess() {
      try {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Access required');
          return;
        }

        setUser(session.user);

        // Check if user email is in admin list
        if (ADMIN_EMAILS.includes(session.user.email || '')) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        // If not admin, we'll wait for the creator query to complete
        // The loading will be set to false after the creator check
      } catch (error) {
        console.error('Error checking access:', error);
        router.push('/login');
        setLoading(false);
      }
    }
    
    checkAccess();
  }, [supabase]);

  // Handle creator access check
  useEffect(() => {
    if (user && !isAdmin) {
      // Wait a moment for the creator query to complete
      const timer = setTimeout(() => {
        if (!isCreator) {
          router.push('/account/dashboard');
        } else {
          setLoading(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, isAdmin, isCreator]);

  useEffect(() => {
    if (isAdmin || isCreator) {
      fetchProducts();
      fetchCollections();
      if (isAdmin) {
        fetchCreators();
      }
    }
  }, [isAdmin, isCreator]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('marketplace_products')
        .select(`
          *,
          creator:creators(
            id,
            creator_name,
            email
          )
        `);

      // If user is a creator (not admin), only show their products
      if (isCreator && !isAdmin && currentCreatorId) {
        query = query.eq('creator_id', currentCreatorId);
      }

      // Apply category filter
      if (filterCategory !== "all") {
        query = query.eq('category', filterCategory);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw (error as any);
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
    
    // Categories no longer required

    // Validate collection assignment (temporarily optional)
    // if (!formData.collection_id) {
    //   alert('Please assign this product to a collection');
    //   return;
    // }
    
    try {
      // Derive required price from size-based pricing (no standalone fallback field)
      const parseMoney = (v?: string | number | null) => {
        const n = typeof v === 'number' ? v : parseFloat((v || '').toString());
        return Number.isFinite(n) ? n : null;
      };

      const derivedPrice =
        parseMoney(formData.size_pricing['4']) ??
        parseMoney(formData.size_pricing['3']) ??
        parseMoney(formData.size_pricing['5']);

      if (derivedPrice === null) {
        alert('Please enter at least one size price (3\", 4\", or 5\") before saving.');
        return;
      }

      const productData: any = {
        title: ensureStickerSuffix(formData.title),
        description: formData.description,
        short_description: formData.short_description || "",
        category: formData.categories.length > 0 ? formData.categories[0] : "Die-Cut",
        creator_id: isCreator && !isAdmin ? currentCreatorId : (formData.creator_id || null),
        collection_id: collectionsEnabled ? (formData.collection_id || null) : null,
        price: derivedPrice,
        original_price: null,
        markup_percentage: 0,
        size_pricing: {
          "3": formData.size_pricing["3"] ? parseFloat(formData.size_pricing["3"]) : null,
          "4": formData.size_pricing["4"] ? parseFloat(formData.size_pricing["4"]) : null,
          "5": formData.size_pricing["5"] ? parseFloat(formData.size_pricing["5"]) : null
        },
        size_compare_pricing: {
          "3": formData.size_compare_pricing?.["3"] ? parseFloat(formData.size_compare_pricing["3"]) : null,
          "4": formData.size_compare_pricing?.["4"] ? parseFloat(formData.size_compare_pricing["4"]) : null,
          "5": formData.size_compare_pricing?.["5"] ? parseFloat(formData.size_compare_pricing["5"]) : null
        },
        images: formData.images,
        default_image: formData.default_image || (formData.images[0] || null),
        stock_quantity: parseInt(formData.stock_quantity.toString()),
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        is_active: formData.is_active,
        is_featured: formData.is_featured
      };

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
      console.error('Error saving product:', error as any);
      const msg = (error as any)?.message || 'Unknown error';
      alert(`Error saving product: ${msg}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      short_description: "",
      price: "",
      original_price: "",
      markup_percentage: "",
      size_pricing: {
        "3": "3.99",
        "4": "4.99",
        "5": "5.99"
      },
      size_compare_pricing: {
        "3": "4.99",
        "4": "5.99",
        "5": "6.99"
      } as { "3": string; "4": string; "5": string; },
      images: [],
      default_image: "",
      categories: [],
      product_type: "single",
      creator_id: "",
      collection_id: "",
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

  // Ensure all product titles end with " Sticker" exactly once
  const ensureStickerSuffix = (rawTitle: string): string => {
    const baseTitle = (rawTitle || "").trim().replace(/\s+sticker\s*$/i, "").trim();
    return baseTitle ? `${baseTitle} Sticker` : "Sticker";
  };

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
      short_description: product.short_description || "",
      price: product.price.toString(),
      original_price: product.original_price?.toString() || "",
      markup_percentage: product.markup_percentage?.toString() || "",
      size_pricing: {
        "3": product.size_pricing?.["3"]?.toString() || "",
        "4": product.size_pricing?.["4"]?.toString() || "",
        "5": product.size_pricing?.["5"]?.toString() || ""
      },
      size_compare_pricing: {
        "3": product.size_compare_pricing?.["3"]?.toString() || "",
        "4": product.size_compare_pricing?.["4"]?.toString() || "",
        "5": product.size_compare_pricing?.["5"]?.toString() || ""
      },
      images: product.images,
      default_image: product.default_image,
      categories: product.category ? [product.category] : [], // Convert single category to array
      product_type: "single", // Default value, you might want to add this field to the database
      creator_id: product.creator_id || "",
      collection_id: product.collection_id || "",
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

  const addTagsFromCommaSeparated = (text: string) => {
    const parts = text
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, ...parts.filter(p => !prev.tags.includes(p))]
    }));
    setTagInput('');
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

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('id, creator_name, email, is_active, profile_photo_url, profile_photo_public_id, total_products, created_at')
        .order('creator_name', { ascending: true });

      if (error) throw error;
      setCreators(data || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
    }
  };

  // Sorting function
  const sortProducts = (products: MarketplaceProduct[], sortBy: string) => {
    const sorted = [...products];
    switch (sortBy) {
      case "alphabetical":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "recently_added":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "price_low_high":
        return sorted.sort((a, b) => a.price - b.price);
      case "price_high_low":
        return sorted.sort((a, b) => b.price - a.price);
      default:
        return sorted;
    }
  };

  // Description editing functions
  const openDescriptionModal = (product: MarketplaceProduct) => {
    setEditingProductDescription(product);
    setDescriptionText(product.description || "");
    setShowDescriptionModal(true);
  };

  const saveDescription = async () => {
    if (!editingProductDescription) return;

    try {
      const { error } = await supabase
        .from('marketplace_products')
        .update({ description: descriptionText })
        .eq('id', editingProductDescription.id);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === editingProductDescription.id 
          ? { ...p, description: descriptionText }
          : p
      ));

      setShowDescriptionModal(false);
      setEditingProductDescription(null);
      setDescriptionText("");
      
      alert("Description updated successfully!");
    } catch (error) {
      console.error('Error updating description:', error);
      alert("Failed to update description");
    }
  };

  const fetchCollections = async () => {
    try {
      setCollectionTable('creator_collections');
      const response = await fetch('/api/marketspace/collections');
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error?.message || 'Failed to load collections');
      
      // Get additional data for each collection
      const collectionsWithStats = await Promise.all(
        (json.collections || []).map(async (collection: any) => {
          try {
            // Count products in this collection and get assignment dates
            const { data: products, error: countError } = await supabase
              .from('marketplace_products')
              .select('id, created_at, updated_at, price')
              .eq('collection_id', collection.id);

            if (countError) {
              console.error('Error counting products for collection:', collection.id, countError);
              return {
                ...collection,
                stickerCount: 0,
                lastStickerAssigned: null,
                totalRevenue: 0
              };
            }

            const stickerCount = products?.length || 0;
            
            // Use updated_at as proxy for when collection was assigned (when product was last modified)
            // This assumes that assigning to collection updates the updated_at field
            const lastStickerAssigned = products && products.length > 0 
              ? products.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at
              : null;

            // Calculate total revenue from sales of products in this collection
            let totalRevenue = 0;
            if (products && products.length > 0) {
              const productIds = products.map((p: any) => p.id);
              
              // Get order items for these products from paid orders
              const { data: orderItems, error: revenueError } = await supabase
                .from('order_items')
                .select(`
                  total_price,
                  customer_order_id,
                  orders_main!inner(financial_status)
                `)
                .in('product_id', productIds)
                .eq('orders_main.financial_status', 'paid');

              if (!revenueError && orderItems) {
                totalRevenue = orderItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
              }
            }

            return {
              ...collection,
              stickerCount,
              lastStickerAssigned,
              totalRevenue
            };
          } catch (error) {
            console.error('Error fetching stats for collection:', collection.id, error);
            return {
              ...collection,
              stickerCount: 0,
              lastStickerAssigned: null,
              totalRevenue: 0
            };
          }
        })
      );

      setCollections(collectionsWithStats);
      setCollectionsEnabled(collectionsWithStats.length > 0);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setCollections([]);
      setCollectionsEnabled(false);
    }
  };

  const handleCreatorSaved = () => {
    // Refresh creators list and close modal
    fetchCreators();
    setShowCreatorModal(false);
    setEditingCreator(null);
  };

  const handleCreateCollection = async () => {
    if (!collectionFormData.name.trim()) {
      alert('Please enter a collection name');
      return;
    }

    setIsCreatingCollection(true);

    try {
      // Only use name field since that's all the creator_collections table has
      const collectionData = {
        name: collectionFormData.name.trim()
      };

      // Use API route to bypass RLS (service role)
      const response = await fetch('/api/marketspace/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: collectionData.name })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error?.message || 'Create failed');

      // Refresh collections list
      await fetchCollections();
      
      // Reset form and close modal
      setCollectionFormData({
        name: ""
      });
      setShowCreateCollection(false);
      
      alert('Collection created successfully!');
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Error creating collection. Please try again.');
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) return;

    setBatchUploading(true);
    setBatchProgress({ current: 0, total: batchFiles.length, currentFile: "" });

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i];
        const fileKey = `${file.name}-${i}`;
        const productData = batchProductData[fileKey];

        setBatchProgress({ current: i + 1, total: batchFiles.length, currentFile: file.name });

        if (!productData || !productData.title.trim()) {
          errorCount++;
          errors.push(`${file.name}: Missing title`);
          continue;
        }

        try {
          // Upload image to Cloudinary
          const imageUrl = await handleFileUpload(file);
          
          // Generate description
          const description = `**${productData.title}**

• High-quality vinyl sticker
• Weather-resistant and durable
• Perfect for laptops, water bottles, cars, and more
• Easy to apply and remove
• Vibrant colors that won't fade

**Available Sizes:**
• 3" - $${productData.size_pricing["3"]}
• 4" - $${productData.size_pricing["4"]}  
• 5" - $${productData.size_pricing["5"]}

Great for personalizing your gear or as a gift!`;

          // Create product data
          const newProductData = {
            title: productData.title.trim(),
            description: description,
            short_description: undefined,
            category: productData.category,
            creator_id: isCreator && !isAdmin ? currentCreatorId : (productData.creator_id || null),
            collection_id: productData.collection_id || null,
            price: parseFloat(productData.size_pricing["4"]),
            size_pricing: {
              "3": productData.size_pricing["3"] ? parseFloat(productData.size_pricing["3"]) : null,
              "4": productData.size_pricing["4"] ? parseFloat(productData.size_pricing["4"]) : null,
              "5": productData.size_pricing["5"] ? parseFloat(productData.size_pricing["5"]) : null
            },
            images: [imageUrl],
            default_image: imageUrl,
            tags: [productData.category.toLowerCase(), 'vinyl', 'sticker', 'design'],
            is_active: true,
            is_featured: false,
            stock_quantity: 1000
          };

          // Insert product into database
          const { error } = await supabase
            .from('marketplace_products')
            .insert([newProductData]);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          errorCount++;
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Show results
      let message = '';
      if (successCount > 0) {
        message = `Successfully uploaded ${successCount} product${successCount !== 1 ? 's' : ''}!`;
      }
      if (errorCount > 0) {
        message += `${message ? ' ' : ''}${errorCount} product${errorCount !== 1 ? 's' : ''} failed.`;
      }
      
      if (message) {
        alert(message);
      } else {
        alert('No products were processed. Please configure your products.');
      }

      if (errors.length > 0) {
        console.error('Batch upload errors:', errors);
      }

      // Refresh products and close modal if successful
      if (successCount > 0) {
        await fetchProducts();
        setShowBatchUpload(false);
        setBatchFiles([]);
        setBatchProductData({});
      }

    } catch (error) {
      console.error('Batch upload error:', error);
      alert('An error occurred during batch upload. Please try again.');
    } finally {
      setBatchUploading(false);
    }
  };

  const handleQuickCollectionChange = async (productId: string, newCollectionId: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_products')
        .update({ collection_id: newCollectionId })
        .eq('id', productId);

      if (error) throw error;

      // Update the local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, collection_id: newCollectionId }
          : product
      ));

      // Show success message
      const collection = collections.find(c => c.id === newCollectionId);
      alert(`Product moved to "${collection?.name}" collection`);
    } catch (error) {
      console.error('Error updating product collection:', error);
      alert('Error updating collection. Please try again.');
    }
  };



  const handleEditCollection = (collection: any) => {
    setEditingCollection(collection);
    setCollectionFormData({
      name: collection.name || ""
    });
    setShowEditCollection(true);
  };



  const handleSaveCollection = async () => {
    if (!editingCollection) return;

    try {
      const { error } = await supabase
        .from(collectionTable)
        .update({
          name: collectionFormData.name
        })
        .eq('id', editingCollection.id);

      if (error) throw error;

      // Update the local state
      setCollections(prev => prev.map(collection => 
        collection.id === editingCollection.id 
          ? { ...collection, name: collectionFormData.name }
          : collection
      ));

      setShowEditCollection(false);
      setEditingCollection(null);
      alert(`Collection "${collectionFormData.name}" updated successfully`);
    } catch (error) {
      console.error('Error updating collection:', error);
      alert('Error updating collection. Please try again.');
    }
  };

  const handleDeleteCollection = async (collection: any) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the collection "${collection.name}"?\n\nThis action cannot be undone. Any products assigned to this collection will be unassigned.`
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/marketspace/collections?id=${collection.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message || 'Failed to delete collection');
      }

      // Update the local state
      setCollections(prev => prev.filter(c => c.id !== collection.id));

      alert(`Collection "${collection.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Error deleting collection. Please try again.');
    }
  };



  const handleDuplicateProduct = async () => {
    if (!duplicateProduct || duplicateQuantity < 1) return;

    setIsDuplicating(true);

    try {
      const duplicates = [];
      
      for (let i = 1; i <= duplicateQuantity; i++) {
        const duplicateData = {
          title: `${ensureStickerSuffix(duplicateProduct.title)} (Copy ${i})`,
          description: duplicateProduct.description,
          short_description: duplicateProduct.short_description,
          category: duplicateProduct.category,
          creator_id: duplicateProduct.creator_id,
          collection_id: collectionsEnabled ? duplicateProduct.collection_id : null,
          price: duplicateProduct.price,
          size_pricing: duplicateProduct.size_pricing,
          size_compare_pricing: duplicateProduct.size_compare_pricing,
          images: duplicateProduct.images,
          default_image: duplicateProduct.default_image,
          tags: duplicateProduct.tags,
          is_active: duplicateProduct.is_active,
          is_featured: false, // Don't duplicate featured status
          stock_quantity: duplicateProduct.stock_quantity
        };

        duplicates.push(duplicateData);
      }

      const { error } = await supabase
        .from('marketplace_products')
        .insert(duplicates);

      if (error) throw error;

      alert(`Successfully created ${duplicateQuantity} duplicate${duplicateQuantity !== 1 ? 's' : ''} of "${duplicateProduct.title}"`);
      
      // Refresh products and close modal
      await fetchProducts();
      setShowDuplicateModal(false);
      setDuplicateProduct(null);
      setDuplicateQuantity(1);

    } catch (error) {
      console.error('Error duplicating product:', error);
      alert(`Error duplicating product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDuplicating(false);
    }
  };

  const toggleCreatorStatus = async (creator: any) => {
    try {
      const { error } = await supabase
        .from('creators')
        .update({ is_active: !creator.is_active, updated_at: new Date().toISOString() })
        .eq('id', creator.id);

      if (error) throw error;

      // Refresh creators list
      fetchCreators();
    } catch (error) {
      console.error('Error toggling creator status:', error);
      alert('Failed to update creator status. Please try again.');
    }
  };

  if (loading) {
    return (
              <AdminLayout title="Creators Space - Admin Dashboard">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading...</div>
          </div>
        </AdminLayout>
    );
  }

  if (!isAdmin && !isCreator) {
    return (
              <AdminLayout title="Creators Space - Admin Dashboard">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Access Denied</div>
          </div>
        </AdminLayout>
    );
  }

  // If showing add product, render the full viewport
  if (showAddProduct) {
    return (
      <AdminLayout title={editingProduct ? "Edit Product - Creators Space" : "Add Product - Creators Space"}>
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
                        <div className="mb-3 flex justify-center -ml-4">
                          <img 
                            src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/StickerShuttleFileIcon4_gkhsu5.png" 
                            alt="Upload file" 
                            className="w-20 h-20 object-contain"
                          />
                        </div>
                        <p className="text-white font-medium text-base mb-2 hidden md:block">
                          Drag or click to upload your file
                          <span className="text-white/40 ml-2">{formData.title?.trim() ? ensureStickerSuffix(formData.title) : 'Sticker'}</span>
                        </p>
                        <p className="text-white font-medium text-base mb-2 md:hidden">Tap to add file</p>
                        <p className="text-white/80 text-sm">All formats supported. Max file size: 25MB</p>
                      </div>
                    )}
                  </div>

                  {/* Image List */}
                  {formData.images.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">Uploaded Images:</p>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative group">
                            {/* Small 1:1 thumbnail */}
                            <div className="aspect-square rounded-md border border-white/20 overflow-hidden bg-gray-800 w-16 h-16 sm:w-20 sm:h-20">
                              <img
                                src={image}
                                alt={`Product ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                              <div className="flex gap-1">
                                <label className="flex items-center gap-1 text-[10px] text-white bg-white/20 px-1.5 py-0.5 rounded">
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
                                  className="px-1.5 py-0.5 bg-red-600/80 hover:bg-red-600 text-white rounded text-[10px] transition-colors"
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

                {/* Product Information */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Product Information</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Title</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          onBlur={(e) => setFormData(prev => ({ ...prev, title: ensureStickerSuffix(e.target.value) }))}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-28"
                          placeholder="Enter product title"
                          required
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-white/40 pointer-events-none text-sm">
                          {(formData.title || '').match(/\s*sticker\s*$/i) ? '' : ' Sticker'}
                        </span>
                      </div>
                    </div>

                    {/* Short Description removed per request */}

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Collection</label>
                      {collections.length > 0 ? (
                        <select
                          value={formData.collection_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, collection_id: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          aria-label="Assign product to collection"
                        >
                          <option value="">Select a collection</option>
                          {collections.map((collection) => (
                            <option key={collection.id} value={collection.id} className="bg-gray-800">
                              {collection.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-400 text-xs">No collections yet</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setShowCreateCollection(true)}
                              className="emerald-button-style px-3 py-1 rounded-lg text-white text-xs"
                            >
                              Create Collection
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-gray-400 text-xs mt-1">
                        Collections help organize products (will be required once collections are set up)
                      </p>
                    </div>

                    {isAdmin && (
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Assign to Creator (Optional)</label>
                        <select
                          value={formData.creator_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, creator_id: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          aria-label="Assign product to creator"
                        >
                          <option value="">No creator assigned</option>
                          {creators.map((creator) => (
                            <option key={creator.id} value={creator.id} className="bg-gray-800">
                              {creator.creator_name} ({creator.email})
                            </option>
                          ))}
                        </select>
                        <p className="text-gray-400 text-xs mt-1">
                          Assign this product to a creator for commission tracking
                        </p>
                      </div>
                    )}

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
                      onBlur={(e) => {
                        if (e.target.value.includes(',')) {
                          addTagsFromCommaSeparated(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      placeholder="Type tags and press Enter or paste comma-separated list"
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
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">Featured</span>
                        <div className="group relative">
                          <svg className="w-4 h-4 text-gray-400 hover:text-white cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            Featured items appear in the "Most Popular" section when users browse collections
                          </div>
                        </div>
                      </div>
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

                {/* Pricing */}
                <div className="container-style rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>
                  
                  <div className="space-y-4">
                    {/* Size-based Pricing */}
                    <div className="space-y-4">
                      <h3 className="text-white text-sm font-medium">Size-based Pricing</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-white text-xs font-medium mb-2">3" Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.size_pricing["3"]}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              size_pricing: { ...prev.size_pricing, "3": e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white text-xs font-medium mb-2">4" Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.size_pricing["4"]}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              size_pricing: { ...prev.size_pricing, "4": e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white text-xs font-medium mb-2">5" Price ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.size_pricing["5"]}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              size_pricing: { ...prev.size_pricing, "5": e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs">Set individual prices for each sticker size</p>
                    </div>

                    {/* Size-based Compare At Pricing */}
                    <div className="space-y-4">
                      <h3 className="text-white text-sm font-medium">Size-based Compare At Pricing (Optional)</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-white text-xs font-medium mb-2">3" Compare At ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.size_compare_pricing?.["3"] || ""}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              size_compare_pricing: { ...(prev.size_compare_pricing || {}), "3": e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white text-xs font-medium mb-2">4" Compare At ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.size_compare_pricing?.["4"] || ""}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              size_compare_pricing: { ...(prev.size_compare_pricing || {}), "4": e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-white text-xs font-medium mb-2">5" Compare At ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.size_compare_pricing?.["5"] || ""}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              size_compare_pricing: { ...(prev.size_compare_pricing || {}), "5": e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs">Shows as crossed-out price for each size (optional)</p>
                    </div>

                    {/* Fallback Price */}
                    {/* Removed fallback/compare/markup per request */}
                  </div>
                </div>


              </div>
            </div>
          </form>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Creators Space - Admin Dashboard">
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

        {/* Action Buttons */}
        <div className="container-style rounded-2xl p-6 mb-6">
          <div className={`grid ${isAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'} gap-4 mb-6`}>
            <button
              onClick={() => {
                resetForm();
                setEditingProduct(null);
                setShowAddProduct(true);
              }}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-blue-400/50 transition-all duration-200 hover:bg-white/5 group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Add New Sticker</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, product_type: "pack" }));
                setEditingProduct(null);
                setShowAddProduct(true);
              }}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-green-400/50 transition-all duration-200 hover:bg-white/5 group"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3 group-hover:bg-green-500/30 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Add Sticker Pack</span>
            </button>



            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setEditingCreator(null);
                    setShowCreatorModal(true);
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-purple-400/50 transition-all duration-200 hover:bg-white/5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-colors">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-white text-sm font-medium">Add New Creator</span>
                </button>

            {/* Create Collection */}
            {(
              true
            ) && (
            <button
              onClick={() => setShowCreateCollection(true)}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-green-400/50 transition-all duration-200 hover:bg-white/5 group"
              title={collections.length === 0 ? "Collections database not set up yet" : "Create a new collection"}
            >
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3 group-hover:bg-green-500/30 transition-colors">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-white text-sm font-medium">Create Collection</span>
                  {collections.length === 0 && (
                    <span className="text-yellow-400 text-xs mt-1">(Database setup required)</span>
                  )}
            </button>
            )}
              </>
            )}
          </div>

          {/* Tab Navigation */}
          {isAdmin && (
            <div className="flex items-center justify-between mb-6 border-b border-white/20">
              <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === 'products'
                    ? 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                Products ({products.length})
              </button>
              {collections.length > 0 && (
                <button
                  onClick={() => setActiveTab('collections')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                    activeTab === 'collections'
                      ? 'bg-green-500/20 text-green-300 border-b-2 border-green-400'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Collections ({collections.length})
                </button>
              )}
              <button
                onClick={() => setActiveTab('creators')}
                className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === 'creators'
                    ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                Creators ({creators.length})
                </button>
              </div>
              
              {/* Batch Upload Button */}
              <button
                onClick={() => setShowBatchUpload(true)}
                className="px-4 py-2 text-sm font-medium text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-all duration-200 flex items-center gap-2"
                title="Batch Upload Products"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Batch Upload
              </button>
            </div>
          )}

          {/* Filter, Sort, and View Controls - Only show for products tab or for creators */}
          {(activeTab === 'products' || !isAdmin) && (
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
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
              
              <div className="flex items-center gap-2">
                <label className="text-white text-sm font-medium">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="dropdown-style px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Sort products"
                >
                  <option value="recently_added" className="dropdown-option">Recently Added</option>
                  <option value="alphabetical" className="dropdown-option">Alphabetical</option>
                  <option value="price_low_high" className="dropdown-option">Price: Low to High</option>
                  <option value="price_high_low" className="dropdown-option">Price: High to Low</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-white text-sm font-medium">View:</label>
              <div className="flex rounded-lg overflow-hidden border border-white/20">
                <button
                  onClick={() => setViewMode("card")}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === "card" 
                      ? 'bg-blue-500/30 text-blue-300' 
                      : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                  }`}
                  title="Card View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("row")}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    viewMode === "row" 
                      ? 'bg-blue-500/30 text-blue-300' 
                      : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                  }`}
                  title="Row View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Products Tab */}
        {(activeTab === 'products' || !isAdmin) && (
        <div className="container-style rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Products</h3>
          {products.length > 0 ? (
            <>
              {viewMode === "card" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12 gap-4">
                  {sortProducts(products.filter(product => 
                    filterCategory === "all" || product.category === filterCategory
                  ), sortBy).map((product) => (
                <div key={product.id} className="container-style rounded-xl p-4 hover:scale-105 transition-all duration-200 group">
                  {/* Product Image */}
                  <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-800">
                    <img
                      src={product.default_image || product.images[0] || '/placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    {/* Title */}
                    <h3 className="text-white font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                      {product.title}
                    </h3>

                    {/* Creator */}
                    <p className="text-gray-400 text-xs truncate">
                      {product.creator?.creator_name || 'No Creator Assigned'}
                    </p>

                    {/* Collection */}
                    {collections.length > 0 && (
                      <p className="text-green-400 text-xs truncate">
                        {collections.find(c => c.id === product.collection_id)?.name || 'No Collection'}
                      </p>
                    )}

                    {/* Category & Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-xs px-2 py-1 bg-white/10 rounded">
                        {product.category}
                      </span>
                      <span className="text-white font-semibold text-sm">
                        ${product.price}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex gap-1">
                      <span className={`px-2 py-1 rounded text-xs text-center flex-1 ${
                        product.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {product.is_featured && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs flex items-center gap-1" title="Appears in Most Popular section">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Most Popular
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => {
                          handleEdit(product);
                          setShowAddProduct(true);
                        }}
                        className="button-style px-2 py-1 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                      >
                        Edit
                      </button>
                      
                      {/* Collection Assignment */}
                      {collections.length > 0 && (
                        <div className="relative">
                          <select
                            value={product.collection_id || ""}
                            onChange={(e) => handleQuickCollectionChange(product.id, e.target.value)}
                            className="w-full px-2 py-1 bg-green-600/80 hover:bg-green-600 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer"
                            aria-label={`Change collection for ${product.title}`}
                          >
                            <option value="" disabled className="bg-gray-800">
                              Select Collection
                            </option>
                            {collections.map((collection) => (
                              <option key={collection.id} value={collection.id} className="bg-gray-800">
                                {collection.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        onClick={() => openDescriptionModal(product)}
                        className="px-2 py-1 bg-yellow-600/80 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                        title="Edit Description"
                      >
                        Description
                      </button>
                      <button
                        onClick={() => {
                          setDuplicateProduct(product);
                          setShowDuplicateModal(true);
                        }}
                        className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                      >
                        Duplicate
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleActive(product)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex-1 ${
                            product.is_active 
                              ? 'bg-red-600/80 hover:bg-red-600 text-white' 
                              : 'bg-green-600/80 hover:bg-green-600 text-white'
                          }`}
                        >
                          {product.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              ) : (
                // Row View
                <div className="space-y-4">
                  {sortProducts(products.filter(product => 
                    filterCategory === "all" || product.category === filterCategory
                  ), sortBy).map((product) => (
                    <div key={product.id} className="container-style rounded-xl p-4 hover:scale-[1.02] transition-all duration-200 group">
                      <div className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                          <img
                            src={product.default_image || product.images[0] || '/placeholder.png'}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          {/* Title & Creator */}
                          <div className="md:col-span-2">
                            <h3 className="text-white font-medium text-sm line-clamp-1 mb-1">
                              {product.title}
                            </h3>
                            <p className="text-gray-400 text-xs">
                              {product.creator?.creator_name || 'No Creator Assigned'}
                            </p>
                          </div>

                          {/* Collection */}
                          <div className="text-green-400 text-xs">
                            {collections.length > 0 && (
                              collections.find(c => c.id === product.collection_id)?.name || 'No Collection'
                            )}
                          </div>

                          {/* Category */}
                          <div>
                            <span className="text-gray-300 text-xs px-2 py-1 bg-white/10 rounded">
                              {product.category}
                            </span>
                          </div>

                          {/* Price */}
                          <div className="text-white font-semibold text-sm">
                            ${product.price}
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              product.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {product.is_featured && (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs" title="Featured">
                                ⭐
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => {
                              handleEdit(product);
                              setShowAddProduct(true);
                            }}
                            className="button-style px-2 py-1 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDescriptionModal(product)}
                            className="px-2 py-1 bg-yellow-600/80 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                            title="Edit Description"
                          >
                            Desc
                          </button>
                          <button
                            onClick={() => toggleActive(product)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 ${
                              product.is_active 
                                ? 'bg-red-600/80 hover:bg-red-600 text-white' 
                                : 'bg-green-600/80 hover:bg-green-600 text-white'
                            }`}
                            title={product.is_active ? 'Hide' : 'Show'}
                          >
                            {product.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105"
                            title="Delete"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Empty State
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">No Products Yet</h3>
              <p className="text-gray-400 text-sm">Click "Add New Sticker" to create your first creators space product</p>
            </div>
          )}
        </div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
        <div className="container-style rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Collections</h3>
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <div key={collection.id} className="container-style rounded-xl p-6 hover:scale-105 transition-all duration-200 group relative">
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteCollection(collection)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      boxShadow: 'rgba(239, 68, 68, 0.3) 0px 4px 16px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                    title="Delete collection"
                    aria-label={`Delete collection ${collection.name}`}
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-green-500/20 flex items-center justify-center">
                        {collection.image_url ? (
                          <img
                            src={collection.image_url}
                            alt={collection.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{collection.name}</h4>
                        <p className="text-gray-400 text-sm">Collection ID: {collection.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                        {collection.stickerCount || 0} stickers
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Stickers:</span>
                      <span className="text-white font-semibold">{collection.stickerCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last Assigned:</span>
                      <span className="text-white text-xs">
                        {collection.lastStickerAssigned 
                          ? new Date(collection.lastStickerAssigned).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Revenue:</span>
                      <span className="text-green-400 font-semibold">
                        ${(collection.totalRevenue || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Collection ID:</span>
                      <span className="text-white font-mono text-xs">{collection.id}</span>
                    </div>
                  </div>

                  <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditCollection(collection)}
                        className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        Edit Name
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">No Collections Yet</h3>
              <p className="text-gray-400 text-sm">Collections will appear here once created</p>
            </div>
          )}
        </div>
        )}

        {/* Creators Tab */}
        {activeTab === 'creators' && (
        <div className="container-style rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Creators</h3>
          {creators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creators.filter(creator => creator.is_active).map((creator) => (
                <div key={creator.id} className="container-style rounded-xl p-6 hover:scale-105 transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-500/20 flex items-center justify-center">
                        {creator.profile_photo_url ? (
                          <img
                            src={creator.profile_photo_url}
                            alt={creator.creator_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{creator.creator_name}</h4>
                        <p className="text-gray-400 text-sm">{creator.email}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      creator.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {creator.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Products:</span>
                      <span className="text-white">{creator.total_products || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Joined:</span>
                      <span className="text-white">
                        {new Date(creator.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingCreator(creator);
                        setShowCreatorModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleCreatorStatus(creator)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        creator.is_active
                          ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                          : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                      }`}
                    >
                      {creator.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">No Creators Yet</h3>
              <p className="text-gray-400 text-sm">Click "Add New Creator" to assign your first creator</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Creator Management Modal */}
      <CreatorManagementModal
        isOpen={showCreatorModal}
        onClose={() => {
          setShowCreatorModal(false);
          setEditingCreator(null);
        }}
        editingCreator={editingCreator}
        onCreatorSaved={handleCreatorSaved}
      />

      {/* Collection Edit Modal */}
      {showEditCollection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="container-style rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Edit Collection</h2>
                <button
                  onClick={() => {
                    setShowEditCollection(false);
                    setEditingCollection(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close modal"
                  aria-label="Close collection edit modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Collection Name *</label>
                  <input
                    type="text"
                    value={collectionFormData.name}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter collection name"
                    required
                  />
                </div>
                
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>Note:</strong> Currently, only collection names can be edited. Additional features like descriptions, status toggles, and creator assignments require database schema updates.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => {
                    setShowEditCollection(false);
                    setEditingCollection(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCollection}
                  disabled={!collectionFormData.name.trim()}
                  className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateCollection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="container-style rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Collection</h2>
                <button
                  onClick={() => {
                    setShowCreateCollection(false);
                    setCollectionFormData({ name: "" });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close modal"
                  aria-label="Close create collection modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Collection Name *</label>
                  <input
                    type="text"
                    value={collectionFormData.name}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter collection name"
                    required
                    autoFocus
                  />
                </div>
                
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-300 text-sm">
                    <strong>Info:</strong> Collections help organize your products and make them easier for customers to browse. You can assign products to collections when creating or editing them.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => {
                    setShowCreateCollection(false);
                    setCollectionFormData({ name: "" });
                  }}
                  disabled={isCreatingCollection}
                  className="flex-1 px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={!collectionFormData.name.trim() || isCreatingCollection}
                  className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingCollection ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="container-style rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Batch Upload Designs</h2>
                  <p className="text-gray-400">Upload multiple design files to create products automatically</p>
                </div>
                <button
                  onClick={() => {
                    setShowBatchUpload(false);
                    setBatchFiles([]);
                    setBatchProductData({});
                    setBatchProgress({current: 0, total: 0, currentFile: ""});
                  }}
                  disabled={batchUploading}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Close batch upload modal"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!batchUploading ? (
                <>
                  {/* File Drop Area - Styled like vinyl calculator */}
                  <input
                    type="file"
                    id="batch-file-input"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setBatchFiles(prev => [...prev, ...files]);
                    }}
                    className="hidden"
                    aria-label="Upload multiple artwork files"
                  />

                  {batchFiles.length === 0 ? (
                    <div 
                      className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer backdrop-blur-md relative mb-6"
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files).filter(file => 
                          file.type.startsWith('image/')
                      );
                      setBatchFiles(prev => [...prev, ...files]);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                      onClick={() => document.getElementById('batch-file-input')?.click()}
                  >
                    <div className="mb-4">
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-white font-medium text-base mb-2">
                        Drop multiple images here or click to browse
                      </p>
                      <p className="text-white/60 text-sm">
                          Select multiple design files to upload in batch. PNG, JPG, SVG supported.
                      </p>
                    </div>
                  </div>
                  ) : (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">Selected Files ({batchFiles.length})</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => document.getElementById('batch-file-input')?.click()}
                            className="text-purple-400 hover:text-purple-300 text-sm px-3 py-1 rounded border border-purple-400/50 hover:border-purple-300"
                          >
                            Add More
                          </button>
                        <button
                          onClick={() => setBatchFiles([])}
                            className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded border border-red-400/50 hover:border-red-300"
                        >
                          Clear All
                        </button>
                      </div>
                      </div>

                      {/* Bulk Actions */}
                      <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="text-white text-sm font-medium mb-3">Apply to All Products:</h4>
                        
                        {/* Bulk Title Suffix */}
                        <div className="mb-4">
                          <label className="block text-white text-xs font-medium mb-1">Add Word Before "Sticker"</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Vinyl, Die-Cut, Custom"
                              className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const suffix = (e.target as HTMLInputElement).value.trim();
                                  if (suffix) {
                                    setBatchProductData(prev => {
                                      const updated = { ...prev };
                                      batchFiles.forEach((file, index) => {
                                        const fileKey = `${file.name}-${index}`;
                                        const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        const newTitle = `${baseName} ${suffix} Sticker`;
                                        
                                        if (!updated[fileKey]) {
                                          updated[fileKey] = {
                                            title: newTitle,
                                            collection_id: "",
                                            creator_id: "",
                                            category: "Die-Cut",
                                            size_pricing: { "3": "3.99", "4": "4.99", "5": "5.99" }
                                          };
                                        } else {
                                          updated[fileKey] = { ...updated[fileKey], title: newTitle };
                                        }
                                      });
                                      return updated;
                                    });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={(e) => {
                                const input = (e.target as HTMLButtonElement).parentElement?.querySelector('input') as HTMLInputElement;
                                const suffix = input?.value.trim();
                                if (suffix) {
                                  setBatchProductData(prev => {
                                    const updated = { ...prev };
                                    batchFiles.forEach((file, index) => {
                                      const fileKey = `${file.name}-${index}`;
                                      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                      const newTitle = `${baseName} ${suffix} Sticker`;
                                      
                                      if (!updated[fileKey]) {
                                        updated[fileKey] = {
                                          title: newTitle,
                                          collection_id: "",
                                          creator_id: "",
                                          category: "Die-Cut",
                                          size_pricing: { "3": "3.99", "4": "4.99", "5": "5.99" }
                                        };
                                      } else {
                                        updated[fileKey] = { ...updated[fileKey], title: newTitle };
                                      }
                                    });
                                    return updated;
                                  });
                                  input.value = '';
                                }
                              }}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                          <p className="text-gray-400 text-xs mt-1">Press Enter or click Apply to update all titles</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Bulk Collection */}
                          <div>
                            <label className="block text-white text-xs font-medium mb-1">Collection</label>
                            <select
                              onChange={(e) => {
                                const collectionId = e.target.value;
                                if (e.target.selectedIndex === 0) return; // Skip if "Select Collection" is chosen
                                
                                setBatchProductData(prev => {
                                  const updated = { ...prev };
                                  batchFiles.forEach((file, index) => {
                                    const fileKey = `${file.name}-${index}`;
                                    if (!updated[fileKey]) {
                                      updated[fileKey] = {
                                        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Sticker',
                                        collection_id: collectionId,
                                        creator_id: "",
                                        category: "Die-Cut",
                                        size_pricing: { "3": "3.99", "4": "4.99", "5": "5.99" }
                                      };
                                    } else {
                                      updated[fileKey] = { ...updated[fileKey], collection_id: collectionId };
                                    }
                                  });
                                  return updated;
                                });
                                // Reset the select after applying
                                e.target.value = '';
                              }}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">Select Collection</option>
                              <option value="">No Collection</option>
                              {collections.map((collection) => (
                                <option key={collection.id} value={collection.id} className="bg-gray-800">
                                  {collection.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Bulk Creator */}
                          {isAdmin && (
                            <div>
                              <label className="block text-white text-xs font-medium mb-1">Creator</label>
                              <select
                                onChange={(e) => {
                                  const creatorId = e.target.value;
                                  if (e.target.selectedIndex === 0) return; // Skip if "Select Creator" is chosen
                                  
                                  setBatchProductData(prev => {
                                    const updated = { ...prev };
                                    batchFiles.forEach((file, index) => {
                                      const fileKey = `${file.name}-${index}`;
                                      if (!updated[fileKey]) {
                                        updated[fileKey] = {
                                          title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Sticker',
                                          collection_id: "",
                                          creator_id: creatorId,
                                          category: "Die-Cut",
                                          size_pricing: { "3": "3.99", "4": "4.99", "5": "5.99" }
                                        };
                                      } else {
                                        updated[fileKey] = { ...updated[fileKey], creator_id: creatorId };
                                      }
                                    });
                                    return updated;
                                  });
                                  // Reset the select after applying
                                  e.target.value = '';
                                }}
                                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                              >
                                <option value="">Select Creator</option>
                                <option value="">No Creator</option>
                                {creators.map((creator) => (
                                  <option key={creator.id} value={creator.id} className="bg-gray-800">
                                    {creator.creator_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Bulk Shape/Category */}
                          <div>
                            <label className="block text-white text-xs font-medium mb-1">Shape</label>
                            <select
                              onChange={(e) => {
                                const category = e.target.value;
                                if (!category) return;
                                
                                setBatchProductData(prev => {
                                  const updated = { ...prev };
                                  batchFiles.forEach((file, index) => {
                                    const fileKey = `${file.name}-${index}`;
                                    if (!updated[fileKey]) {
                                      updated[fileKey] = {
                                        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Sticker',
                                        collection_id: "",
                                        creator_id: "",
                                        category: category,
                                        size_pricing: { "3": "3.99", "4": "4.99", "5": "5.99" }
                                      };
                                    } else {
                                      updated[fileKey] = { ...updated[fileKey], category: category };
                                    }
                                  });
                                  return updated;
                                });
                                // Reset the select after applying
                                e.target.value = '';
                              }}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">Select Shape</option>
                              {categories.map((category) => (
                                <option key={category} value={category} className="bg-gray-800">
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Configuration Rows */}
                  {batchFiles.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-white font-semibold mb-4">Configure Products</h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {batchFiles.map((file, index) => {
                          const fileKey = `${file.name}-${index}`;
                          const productData = batchProductData[fileKey] || {
                            title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Sticker',
                            collection_id: "",
                            creator_id: "",
                            category: "Die-Cut",
                            size_pricing: {
                              "3": "3.99",
                              "4": "4.99", 
                              "5": "5.99"
                            }
                          };

                          const updateProductData = (field: string, value: any) => {
                            setBatchProductData(prev => ({
                              ...prev,
                              [fileKey]: {
                                ...productData,
                                [field]: value
                              }
                            }));
                          };

                          return (
                            <div key={fileKey} className="container-style rounded-lg p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                                {/* Image Preview */}
                                <div className="lg:col-span-1">
                                  <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-white/20 flex items-center justify-center p-2" style={{ backgroundColor: '#cae0ff' }}>
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                      className="max-w-full max-h-full object-contain"
                                />
                            </div>
                              <button
                                onClick={() => setBatchFiles(prev => prev.filter((_, i) => i !== index))}
                                    className="w-full mt-2 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors"
                              >
                                Remove
                              </button>
                            </div>

                                {/* Product Details */}
                                <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  {/* Title */}
                                  <div>
                                    <label className="block text-white text-xs font-medium mb-1">Title *</label>
                                    <input
                                      type="text"
                                      value={productData.title}
                                      onChange={(e) => updateProductData('title', e.target.value)}
                                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                      placeholder="Product title"
                                    />
                                  </div>

                                  {/* Collection */}
                                  <div>
                                    <label className="block text-white text-xs font-medium mb-1">Collection</label>
                                    <select
                                      value={productData.collection_id}
                                      onChange={(e) => updateProductData('collection_id', e.target.value)}
                                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                      <option value="">No Collection</option>
                                      {collections.map((collection) => (
                                        <option key={collection.id} value={collection.id} className="bg-gray-800">
                                          {collection.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Creator */}
                                  {isAdmin && (
                                    <div>
                                      <label className="block text-white text-xs font-medium mb-1">Creator</label>
                                      <select
                                        value={productData.creator_id}
                                        onChange={(e) => updateProductData('creator_id', e.target.value)}
                                        className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                      >
                                        <option value="">No Creator</option>
                                        {creators.map((creator) => (
                                          <option key={creator.id} value={creator.id} className="bg-gray-800">
                                            {creator.creator_name}
                                          </option>
                                        ))}
                                      </select>
                              </div>
                            )}

                                  {/* Category */}
                                  <div>
                                    <label className="block text-white text-xs font-medium mb-1">Shape</label>
                                    <select
                                      value={productData.category}
                                      onChange={(e) => updateProductData('category', e.target.value)}
                                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                      {categories.map((category) => (
                                        <option key={category} value={category} className="bg-gray-800">
                                          {category}
                                        </option>
                                      ))}
                                    </select>
                          </div>
                      </div>
                    </div>

                              {/* Pricing Row */}
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="grid grid-cols-3 gap-4">
                        <div>
                                    <label className="block text-white text-xs font-medium mb-1">3" Price ($)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={productData.size_pricing["3"]}
                                      onChange={(e) => updateProductData('size_pricing', { ...productData.size_pricing, "3": e.target.value })}
                                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                        </div>
                                  <div>
                                    <label className="block text-white text-xs font-medium mb-1">4" Price ($)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={productData.size_pricing["4"]}
                                      onChange={(e) => updateProductData('size_pricing', { ...productData.size_pricing, "4": e.target.value })}
                                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-white text-xs font-medium mb-1">5" Price ($)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={productData.size_pricing["5"]}
                                      onChange={(e) => updateProductData('size_pricing', { ...productData.size_pricing, "5": e.target.value })}
                                      className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  {batchFiles.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleBatchUpload}
                        disabled={batchUploading}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {batchUploading ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload {batchFiles.length} Product{batchFiles.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Old batch configuration removed */}
                  {false && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Basic Settings */}
                      <div className="space-y-4">
                        <h3 className="text-white font-semibold mb-3">Basic Settings</h3>
                        
                        {collections.length > 0 && (
                          <div>
                            <label className="block text-white text-sm font-medium mb-2">Collection (Optional)</label>
                            <select
                              value={batchConfig.collection_id}
                              onChange={(e) => setBatchConfig(prev => ({ ...prev, collection_id: e.target.value }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              aria-label="Select collection for batch upload"
                            >
                              <option value="">Select a collection</option>
                              {collections.map((collection) => (
                                <option key={collection.id} value={collection.id} className="bg-gray-800">
                                  {collection.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Category</label>
                          <select
                            value={batchConfig.category}
                            onChange={(e) => setBatchConfig(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            aria-label="Select category for batch upload"
                          >
                            {categories.map((category) => (
                              <option key={category} value={category} className="bg-gray-800">
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        {isAdmin && (
                          <div>
                            <label className="block text-white text-sm font-medium mb-2">Assign to Creator</label>
                            <select
                              value={batchConfig.creator_id}
                              onChange={(e) => setBatchConfig(prev => ({ ...prev, creator_id: e.target.value }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              aria-label="Assign to creator"
                            >
                              <option value="" className="bg-gray-800">No creator assigned</option>
                              {creators.map((creator) => (
                                <option key={creator.id} value={creator.id} className="bg-gray-800">
                                  {creator.creator_name} ({creator.email})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-white text-sm font-medium mb-2">Stock Quantity</label>
                          <input
                            type="number"
                            value={batchConfig.stock_quantity}
                            onChange={(e) => setBatchConfig(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            min="-1"
                            aria-label="Stock quantity for batch upload"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setBatchConfig(prev => ({ ...prev, is_active: !prev.is_active }))}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                batchConfig.is_active ? 'bg-blue-600' : 'bg-gray-600'
                              }`}
                              aria-label="Toggle active status for batch upload"
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  batchConfig.is_active ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="text-white text-sm">Active</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setBatchConfig(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                batchConfig.is_featured ? 'bg-yellow-600' : 'bg-gray-600'
                              }`}
                              aria-label="Toggle featured status for batch upload"
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  batchConfig.is_featured ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="text-white text-sm">Featured</span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Settings */}
                      <div className="space-y-4">
                        <h3 className="text-white font-semibold mb-3">Pricing Settings</h3>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-white text-xs font-medium mb-1">3" Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={batchConfig.size_pricing["3"]}
                              onChange={(e) => setBatchConfig(prev => ({ 
                                ...prev, 
                                size_pricing: { ...prev.size_pricing, "3": e.target.value }
                              }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              aria-label="3 inch price for batch upload"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-white text-xs font-medium mb-1">4" Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={batchConfig.size_pricing["4"]}
                              onChange={(e) => setBatchConfig(prev => ({ 
                                ...prev, 
                                size_pricing: { ...prev.size_pricing, "4": e.target.value }
                              }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              aria-label="4 inch price for batch upload"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-white text-xs font-medium mb-1">5" Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={batchConfig.size_pricing["5"]}
                              onChange={(e) => setBatchConfig(prev => ({ 
                                ...prev, 
                                size_pricing: { ...prev.size_pricing, "5": e.target.value }
                              }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              aria-label="5 inch price for batch upload"
                            />
                          </div>

                          <div>
                            <label className="block text-white text-xs font-medium mb-1">Calculator Markup (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="200"
                              value={batchConfig.markup_percentage}
                              onChange={(e) => setBatchConfig(prev => ({ ...prev, markup_percentage: e.target.value }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="0.0"
                              aria-label="Calculator markup percentage for batch upload"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {batchFiles.length > 0 && (
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowBatchUpload(false);
                          setBatchFiles([]);
                        }}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBatchUpload}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Upload {batchFiles.length} Design{batchFiles.length !== 1 ? 's' : ''}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Upload Progress */
                <div className="text-center py-12">
                  <div className="mb-6">
                    <svg className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <h3 className="text-2xl font-bold text-white mb-2">Uploading Designs...</h3>
                    <p className="text-gray-400">
                      Processing {batchProgress.current} of {batchProgress.total} files
                    </p>
                  </div>

                  <div className="max-w-md mx-auto mb-6">
                    <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                      <div 
                        className="bg-orange-400 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-white text-sm">
                      Currently processing: {batchProgress.currentFile}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Product Modal */}
      {showDuplicateModal && duplicateProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="container-style rounded-2xl max-w-md w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Duplicate Product</h2>
                  <p className="text-gray-400 text-sm">Create copies of "{duplicateProduct.title}"</p>
                </div>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setDuplicateProduct(null);
                    setDuplicateQuantity(1);
                  }}
                  disabled={isDuplicating}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Close duplicate modal"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!isDuplicating ? (
                <>
                  {/* Product Preview */}
                  <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center p-2" style={{ backgroundColor: '#cae0ff' }}>
                        <img
                          src={duplicateProduct.default_image || duplicateProduct.images[0]}
                          alt={duplicateProduct.title}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm mb-1">{duplicateProduct.title}</h3>
                        <p className="text-gray-400 text-xs mb-2">{duplicateProduct.category}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-medium text-sm">${duplicateProduct.price}</span>
                          {/* Compare-at price removed */}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-6">
                    <label className="block text-white text-sm font-medium mb-3">Number of Duplicates</label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setDuplicateQuantity(Math.max(1, duplicateQuantity - 1))}
                        className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-colors flex items-center justify-center"
                        disabled={duplicateQuantity <= 1}
                      >
                        -
                      </button>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={duplicateQuantity}
                          onChange={(e) => setDuplicateQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                          aria-label="Number of duplicates"
                        />
                      </div>
                      <button
                        onClick={() => setDuplicateQuantity(Math.min(50, duplicateQuantity + 1))}
                        className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-colors flex items-center justify-center"
                        disabled={duplicateQuantity >= 50}
                      >
                        +
                      </button>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">Maximum 50 duplicates at once</p>
                  </div>

                  {/* Preview of duplicate names */}
                  <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-white text-sm font-medium mb-2">Duplicate Names Preview:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Array.from({ length: Math.min(duplicateQuantity, 5) }, (_, i) => (
                        <div key={i} className="text-gray-300 text-xs">
                          • {ensureStickerSuffix(duplicateProduct.title)} (Copy {i + 1})
                        </div>
                      ))}
                      {duplicateQuantity > 5 && (
                        <div className="text-gray-400 text-xs">
                          ... and {duplicateQuantity - 5} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDuplicateModal(false);
                        setDuplicateProduct(null);
                        setDuplicateQuantity(1);
                      }}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDuplicateProduct}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Create {duplicateQuantity} Duplicate{duplicateQuantity !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              ) : (
                /* Duplicating Progress */
                <div className="text-center py-8">
                  <div className="mb-4">
                    <svg className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <h3 className="text-xl font-bold text-white mb-2">Creating Duplicates...</h3>
                    <p className="text-gray-400">
                      Creating {duplicateQuantity} duplicate{duplicateQuantity !== 1 ? 's' : ''} of "{duplicateProduct.title}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Description Editor Modal */}
      {showDescriptionModal && editingProductDescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="container-style rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Description</h3>
              <button
                onClick={() => {
                  setShowDescriptionModal(false);
                  setEditingProductDescription(null);
                  setDescriptionText("");
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-white font-medium mb-2">Product: {editingProductDescription.title}</p>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src={editingProductDescription.default_image || editingProductDescription.images[0] || '/placeholder.png'}
                  alt={editingProductDescription.title}
                  className="w-12 h-12 rounded-lg object-cover bg-gray-800"
                />
                <div>
                  <p className="text-gray-400 text-sm">{editingProductDescription.creator?.creator_name || 'No Creator'}</p>
                  <p className="text-green-400 text-xs">${editingProductDescription.price}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                className="w-full h-40 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter product description here... You can copy and paste text from anywhere."
                autoFocus
              />
              <p className="text-gray-400 text-xs mt-2">
                Tip: You can copy text from anywhere and paste it here using Ctrl+V (or Cmd+V on Mac)
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDescriptionModal(false);
                  setEditingProductDescription(null);
                  setDescriptionText("");
                }}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={saveDescription}
                className="button-style px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                Save Description
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
} 