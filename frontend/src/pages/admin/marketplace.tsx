import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";
import CreatorManagementModal from "@/components/CreatorManagementModal";
import { getSupabase } from "@/lib/supabase";
import { uploadToCloudinary, validateFile, CloudinaryUploadResult, UploadProgress } from "@/utils/cloudinary";
import { useQuery } from "@apollo/client";
import { GET_CREATOR_BY_USER_ID } from "@/lib/profile-mutations";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [editingCreator, setEditingCreator] = useState(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionTable, setCollectionTable] = useState<'creator_collections' | 'collections'>('collections');
  const [collectionsEnabled, setCollectionsEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchConfig, setBatchConfig] = useState({
    category: "Die-Cut",
    creator_id: "",
    collection_id: "",
    is_active: true,
    is_featured: false,
    stock_quantity: 1000,
    size_pricing: {
      "3": "3.99",
      "4": "4.99", 
      "5": "5.99"
    },
    size_compare_pricing: {
      "3": "4.99",
      "4": "5.99",
      "5": "6.99"
    },
    markup_percentage: ""
  });
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, currentFile: string}>({current: 0, total: 0, currentFile: ""});
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<MarketplaceProduct | null>(null);
  const [duplicateQuantity, setDuplicateQuantity] = useState(1);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [collectionFormData, setCollectionFormData] = useState({
    name: "",
    description: "",
    slug: "",
    image_url: "",
    creator_id: "",
    is_active: true,
    is_featured: false,
    sort_order: 0
  });
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const supabase = getSupabase();

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
  }, []);

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
        category: "Die-Cut",
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

  const fetchCollections = async () => {
    // Collections temporarily disabled per requirements
    setCollections([]);
    setCollectionsEnabled(false);
    setCollectionTable('collections');
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
      // Generate slug from name if not provided
      const slug = collectionFormData.slug.trim() || 
        collectionFormData.name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

      const collectionData = {
        ...collectionFormData,
        slug,
        creator_id: collectionFormData.creator_id || null,
        sort_order: collectionFormData.sort_order || collections.length
      };

      const { data, error } = await supabase
        .from(collectionTable)
        .insert([collectionData])
        .select()
        .single();

      if (error) throw error;

      // Refresh collections list
      await fetchCollections();
      
      // Reset form and close modal
      setCollectionFormData({
        name: "",
        description: "",
        slug: "",
        image_url: "",
        creator_id: "",
        is_active: true,
        is_featured: false,
        sort_order: 0
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

  const handleQuickCreatorChange = async (collectionId: string, newCreatorId: string) => {
    try {
      const { error } = await supabase
        .from('collections')
        .update({ creator_id: newCreatorId || null })
        .eq('id', collectionId);

      if (error) throw error;

      // Update the local state
      setCollections(prev => prev.map(collection => 
        collection.id === collectionId 
          ? { ...collection, creator_id: newCreatorId || null }
          : collection
      ));

      // Show success message
      const creator = creators.find(c => c.id === newCreatorId);
      const collectionName = collections.find(c => c.id === collectionId)?.name;
      if (newCreatorId) {
        alert(`Collection "${collectionName}" assigned to ${creator?.creator_name}`);
      } else {
        alert(`Collection "${collectionName}" unassigned from creator`);
      }
    } catch (error) {
      console.error('Error updating collection creator:', error);
      alert('Error updating creator assignment. Please try again.');
    }
  };

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) return;

    // Validate collection assignment (temporarily optional)
    // if (!batchConfig.collection_id) {
    //   alert('Please select a collection for the batch upload');
    //   return;
    // }

    setBatchUploading(true);
    setBatchProgress({ current: 0, total: batchFiles.length, currentFile: "" });

    try {
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const skipped: string[] = [];

      for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i];
        setBatchProgress({ current: i + 1, total: batchFiles.length, currentFile: file.name });

        // Skip AI files - they are for reference only
        if (file.name.toLowerCase().endsWith('.ai')) {
          skippedCount++;
          skipped.push(file.name);
          continue;
        }

        try {
          // Upload image to Cloudinary
          const imageUrl = await handleFileUpload(file);
          
          // Generate product title from filename
          const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
          const productTitle = fileName
            .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
            .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize each word
            .trim() + ' Sticker'; // Add "Sticker" suffix

          // Generate short description
          const shortDescription = `High-quality ${batchConfig.category.toLowerCase()} sticker design`;

          // Generate full description
          const description = `**${productTitle}**

• High-quality vinyl sticker
• Weather-resistant and durable
• Perfect for laptops, water bottles, cars, and more
• Easy to apply and remove
• Vibrant colors that won't fade

**Available Sizes:**
• 3" - $${batchConfig.size_pricing["3"]}
• 4" - $${batchConfig.size_pricing["4"]}  
• 5" - $${batchConfig.size_pricing["5"]}

Great for personalizing your gear or as a gift!`;

          // Create product data
          const productData = {
            title: productTitle,
            description: description,
            short_description: undefined,
            category: batchConfig.category,
            creator_id: isCreator && !isAdmin ? currentCreatorId : (batchConfig.creator_id || null),
            collection_id: collectionsEnabled ? (batchConfig.collection_id || null) : null,
            price: parseFloat(batchConfig.size_pricing["4"]),
            size_pricing: {
              "3": batchConfig.size_pricing["3"] ? parseFloat(batchConfig.size_pricing["3"]) : null,
              "4": batchConfig.size_pricing["4"] ? parseFloat(batchConfig.size_pricing["4"]) : null,
              "5": batchConfig.size_pricing["5"] ? parseFloat(batchConfig.size_pricing["5"]) : null
            },
            size_compare_pricing: {
              "3": batchConfig.size_compare_pricing?.["3"] ? parseFloat(batchConfig.size_compare_pricing["3"]) : null,
              "4": batchConfig.size_compare_pricing?.["4"] ? parseFloat(batchConfig.size_compare_pricing["4"]) : null,
              "5": batchConfig.size_compare_pricing?.["5"] ? parseFloat(batchConfig.size_compare_pricing["5"]) : null
            },
            images: [imageUrl],
            default_image: imageUrl,
            tags: [batchConfig.category.toLowerCase(), 'vinyl', 'sticker', 'design'],
            is_active: batchConfig.is_active,
            is_featured: batchConfig.is_featured,
            stock_quantity: batchConfig.stock_quantity
          };

          // Insert product into database
          const { error } = await supabase
            .from('marketplace_products')
            .insert([productData]);

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
        message = `Successfully uploaded ${successCount} design${successCount !== 1 ? 's' : ''}!`;
      }
      if (skippedCount > 0) {
        message += `${message ? ' ' : ''}${skippedCount} AI file${skippedCount !== 1 ? 's' : ''} skipped (source files only).`;
      }
      if (errorCount > 0) {
        message += `${message ? ' ' : ''}${errorCount} file${errorCount !== 1 ? 's' : ''} failed.`;
      }
      
      if (message) {
        alert(message);
      } else {
        alert('No files were processed. Please select image files to upload.');
      }

      if (errors.length > 0) {
        console.error('Batch upload errors:', errors);
      }
      if (skipped.length > 0) {
        console.log('Skipped AI files:', skipped);
      }

      // Refresh products and close modal
      await fetchProducts();
      setShowBatchUpload(false);
      setBatchFiles([]);
      setBatchProgress({current: 0, total: 0, currentFile: ""});

    } catch (error) {
      console.error('Batch upload error:', error);
      alert('An error occurred during batch upload. Please try again.');
    } finally {
      setBatchUploading(false);
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

                    {false && collectionsEnabled && collections.length > 0 && (
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Collection</label>
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
                        <p className="text-gray-400 text-xs mt-1">
                          Collections help organize products (will be required once collections are set up)
                        </p>
                      </div>
                    )}

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
                      <span className="text-white text-sm">Featured</span>
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

            {/* Batch Upload Button - Available to both admin and creators */}
            <button
              onClick={() => {
                setBatchFiles([]);
                setShowBatchUpload(true);
              }}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/30 rounded-xl hover:border-orange-400/50 transition-all duration-200 hover:bg-white/5 group"
            >
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3 group-hover:bg-orange-500/30 transition-colors">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Batch Upload</span>
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

            {/* Collections feature toggle - hidden when disabled */}
            {false && collectionsEnabled && (
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
            <div className="flex space-x-1 mb-6 border-b border-white/20">
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
              {false && collectionsEnabled && collections.length > 0 && (
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
          )}

          {/* Filter - Only show for products tab or for creators */}
          {(activeTab === 'products' || !isAdmin) && (
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
          </div>
          )}
        </div>

        {/* Products Tab */}
        {(activeTab === 'products' || !isAdmin) && (
        <div className="container-style rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Products</h3>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12 gap-4">
              {products.map((product) => (
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
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                          ★
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

        {/* Collections Tab - hidden when collections feature disabled */}
        {false && collectionsEnabled && activeTab === 'collections' && (
        <div className="container-style rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Collections</h3>
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <div key={collection.id} className="container-style rounded-xl p-6 hover:scale-105 transition-all duration-200 group">
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
                        <p className="text-gray-400 text-sm">{collection.slug}</p>
                        <p className="text-purple-400 text-xs">
                          {creators.find(c => c.id === collection.creator_id)?.creator_name || 'No Creator Assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {collection.is_featured && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                          Featured
                        </span>
                      )}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        collection.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {collection.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  
                  {collection.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Sort Order:</span>
                      <span className="text-white">{collection.sort_order}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white">
                        {new Date(collection.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Creator Assignment */}
                    <div className="relative">
                      <select
                        value={collection.creator_id || ""}
                        onChange={(e) => handleQuickCreatorChange(collection.id, e.target.value)}
                        className="w-full px-2 py-1 bg-purple-600/80 hover:bg-purple-600 text-white rounded text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer"
                        aria-label={`Change creator for ${collection.name}`}
                      >
                        <option value="" className="bg-gray-800">
                          No Creator
                        </option>
                        {creators.map((creator) => (
                          <option key={creator.id} value={creator.id} className="bg-gray-800">
                            {creator.creator_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors">
                        Edit
                      </button>
                      <button className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors">
                        {collection.is_active ? 'Deactivate' : 'Activate'}
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
                  {/* File Drop Area */}
                  <div 
                    className="border-2 border-dashed border-orange-400/50 rounded-xl p-12 text-center hover:border-orange-400 transition-colors cursor-pointer backdrop-blur-md mb-6"
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files).filter(file => 
                        file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.ai')
                      );
                      setBatchFiles(prev => [...prev, ...files]);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*,.ai';
                      input.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || []).filter(file => 
                          file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.ai')
                        );
                        setBatchFiles(prev => [...prev, ...files]);
                      };
                      input.click();
                    }}
                  >
                    <div className="mb-4">
                      <div className="mb-3 flex justify-center">
                        <svg className="w-16 h-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-white font-medium text-lg mb-2">
                        Drop multiple images here or click to browse
                      </p>
                      <p className="text-white/60 text-sm">
                        Select multiple design files to upload in batch. All image formats and .ai files supported.
                      </p>
                    </div>
                  </div>

                  {/* Selected Files List */}
                  {batchFiles.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">Selected Files ({batchFiles.length})</h3>
                        <button
                          onClick={() => setBatchFiles([])}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto">
                        {batchFiles.map((file, index) => {
                          const isAiFile = file.name.toLowerCase().endsWith('.ai');
                          return (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-white/20 flex items-center justify-center">
                              {isAiFile ? (
                                <div className="text-center p-4">
                                  <svg className="w-12 h-12 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <p className="text-white text-xs font-medium">AI File</p>
                                  <p className="text-purple-400 text-xs">Design Source</p>
                                </div>
                              ) : (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <button
                                onClick={() => setBatchFiles(prev => prev.filter((_, i) => i !== index))}
                                className="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs"
                              >
                                Remove
                              </button>
                            </div>
                            <p className="text-white text-xs mt-2 truncate">{file.name}</p>
                            {isAiFile && (
                              <div className="mt-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs text-center">
                                Source File Only
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI Files Notice */}
                  {batchFiles.some(file => file.name.toLowerCase().endsWith('.ai')) && (
                    <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="text-purple-300 font-medium text-sm mb-1">AI Files Detected</h4>
                          <p className="text-purple-200 text-xs">
                            Adobe Illustrator (.ai) files are included for reference but will be skipped during upload. 
                            Only image files (.png, .jpg, .svg, etc.) will be processed and uploaded to create sticker products.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Batch Configuration */}
                  {batchFiles.length > 0 && (
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

      {/* Create Collection Modal */}
      {false && showCreateCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="container-style rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Collection</h2>
              <button
                onClick={() => setShowCreateCollection(false)}
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Close create collection modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Collection Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={collectionFormData.name}
                  onChange={(e) => setCollectionFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter collection name"
                  required
                  aria-label="Collection name"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Description</label>
                <textarea
                  value={collectionFormData.description}
                  onChange={(e) => setCollectionFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                  placeholder="Describe this collection..."
                  aria-label="Collection description"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Slug (URL-friendly name)
                </label>
                <input
                  type="text"
                  value={collectionFormData.slug}
                  onChange={(e) => setCollectionFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="auto-generated-from-name"
                  aria-label="Collection slug"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Leave empty to auto-generate from collection name
                </p>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Image URL (Optional)</label>
                <input
                  type="url"
                  value={collectionFormData.image_url}
                  onChange={(e) => setCollectionFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/collection-image.jpg"
                  aria-label="Collection image URL"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Assign to Creator (Optional)</label>
                <select
                  value={collectionFormData.creator_id}
                  onChange={(e) => setCollectionFormData(prev => ({ ...prev, creator_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Assign collection to creator"
                >
                  <option value="">No creator assigned</option>
                  {creators.map((creator) => (
                    <option key={creator.id} value={creator.id} className="bg-gray-800">
                      {creator.creator_name} ({creator.email})
                    </option>
                  ))}
                </select>
                <p className="text-gray-400 text-xs mt-1">
                  Assign this collection to a creator for ownership and management
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Sort Order</label>
                  <input
                    type="number"
                    value={collectionFormData.sort_order}
                    onChange={(e) => setCollectionFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                    placeholder="0"
                    aria-label="Sort order"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="collection-active"
                      checked={collectionFormData.is_active}
                      onChange={(e) => setCollectionFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded text-green-500 focus:ring-green-500"
                      aria-label="Collection active status"
                    />
                    <label htmlFor="collection-active" className="text-white text-sm">
                      Active (visible to users)
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="collection-featured"
                      checked={collectionFormData.is_featured}
                      onChange={(e) => setCollectionFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="rounded text-green-500 focus:ring-green-500"
                      aria-label="Collection featured status"
                    />
                    <label htmlFor="collection-featured" className="text-white text-sm">
                      Featured collection
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowCreateCollection(false)}
                className="flex-1 px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/5 transition-all duration-200"
                disabled={isCreatingCollection}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={isCreatingCollection || !collectionFormData.name.trim()}
                className="flex-1 button-style px-6 py-3 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isCreatingCollection ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Collection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 