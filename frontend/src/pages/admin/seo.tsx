import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import { Search, Edit, Trash2, Plus, Save, X } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import { Eye } from 'lucide-react';

// GraphQL queries and mutations
const GET_ALL_PAGE_SEO = gql`
  query GetAllPageSEO {
    getAllPageSEO {
      id
      pagePath
      pageName
      title
      description
      keywords
      robots
      ogTitle
      ogDescription
      ogImage
      ogType
      ogUrl
      twitterCard
      twitterTitle
      twitterDescription
      twitterImage
      canonicalUrl
      structuredData
      createdAt
      updatedAt
      createdBy
      updatedBy
    }
  }
`;

const CREATE_PAGE_SEO = gql`
  mutation CreatePageSEO($input: PageSEOInput!) {
    createPageSEO(input: $input) {
      success
      message
      pageSEO {
        id
        pagePath
        pageName
        title
        description
        keywords
        robots
        ogTitle
        ogDescription
        ogImage
        ogType
        ogUrl
        twitterCard
        twitterTitle
        twitterDescription
        twitterImage
        canonicalUrl
        structuredData
      }
      error
    }
  }
`;

const UPDATE_PAGE_SEO = gql`
  mutation UpdatePageSEO($id: ID!, $input: UpdatePageSEOInput!) {
    updatePageSEO(id: $id, input: $input) {
      success
      message
      pageSEO {
        id
        pagePath
        pageName
        title
        description
        keywords
        robots
        ogTitle
        ogDescription
        ogImage
        ogType
        ogUrl
        twitterCard
        twitterTitle
        twitterDescription
        twitterImage
        canonicalUrl
        structuredData
      }
      error
    }
  }
`;

const DELETE_PAGE_SEO = gql`
  mutation DeletePageSEO($id: ID!) {
    deletePageSEO(id: $id) {
      success
      message
      error
    }
  }
`;

const ADMIN_EMAILS = ['justin@stickershuttle.com', 'tommy@bannership.com'];

interface PageSEO {
  id: string;
  pagePath: string;
  pageName: string;
  title?: string;
  description?: string;
  keywords?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  structuredData?: any;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export default function SEOAdmin() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<Partial<PageSEO>>({});
  const [previewPage, setPreviewPage] = useState<PageSEO | null>(null);
  
  const { data, loading, error, refetch } = useQuery(GET_ALL_PAGE_SEO, {
    onError: (err) => {
      console.error('GraphQL Error fetching page SEO:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
    }
  });
  
  const [createPageSEO] = useMutation(CREATE_PAGE_SEO, {
    onCompleted: () => {
      refetch();
      setShowCreateForm(false);
      setFormData({});
    },
    onError: (err) => {
      console.error('GraphQL Error creating page SEO:', err);
      alert('Error: ' + err.message);
    }
  });
  
  const [updatePageSEO] = useMutation(UPDATE_PAGE_SEO, {
    onCompleted: () => {
      refetch();
      setEditingId(null);
      setFormData({});
    },
    onError: (err) => {
      console.error('GraphQL Error updating page SEO:', err);
      alert('Error: ' + err.message);
    }
  });
  
  const [deletePageSEO] = useMutation(DELETE_PAGE_SEO, {
    onCompleted: () => refetch(),
    onError: (err) => {
      console.error('GraphQL Error deleting page SEO:', err);
      alert('Error: ' + err.message);
    }
  });

  // Check admin authentication
  React.useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }
        
        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
          router.push('/account/dashboard');
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      }
    }
    
    checkAdmin();
  }, [router]);
  
  const pages = data?.getAllPageSEO || [];
  
  const filteredPages = pages.filter((page: PageSEO) =>
    page.pagePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.pageName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const startEdit = (page: PageSEO) => {
    setEditingId(page.id);
    setFormData({
      pagePath: page.pagePath,
      pageName: page.pageName,
      title: page.title,
      description: page.description,
      keywords: page.keywords,
      robots: page.robots,
      ogTitle: page.ogTitle,
      ogDescription: page.ogDescription,
      ogImage: page.ogImage,
      ogType: page.ogType,
      ogUrl: page.ogUrl,
      twitterCard: page.twitterCard,
      twitterTitle: page.twitterTitle,
      twitterDescription: page.twitterDescription,
      twitterImage: page.twitterImage,
      canonicalUrl: page.canonicalUrl
    });
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };
  
  const saveEdit = () => {
    if (!editingId) return;
    // Exclude pagePath from update (it's immutable)
    const { pagePath, id, createdAt, updatedAt, createdBy, updatedBy, ...updateInput } = formData as any;
    updatePageSEO({
      variables: {
        id: editingId,
        input: updateInput
      }
    });
  };
  
  const handleCreate = () => {
    if (!formData.pagePath || !formData.pageName) {
      alert('Page path and page name are required');
      return;
    }
    createPageSEO({
      variables: {
        input: {
          pagePath: formData.pagePath,
          pageName: formData.pageName,
          title: formData.title,
          description: formData.description,
          keywords: formData.keywords,
          robots: formData.robots,
          ogTitle: formData.ogTitle,
          ogDescription: formData.ogDescription,
          ogImage: formData.ogImage,
          ogType: formData.ogType,
          ogUrl: formData.ogUrl,
          twitterCard: formData.twitterCard,
          twitterTitle: formData.twitterTitle,
          twitterDescription: formData.twitterDescription,
          twitterImage: formData.twitterImage,
          canonicalUrl: formData.canonicalUrl
        }
      }
    });
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SEO entry?')) return;
    deletePageSEO({ variables: { id } });
  };
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <AdminLayout title="SEO Management - Admin">
      <Head>
        <title>SEO Management - Admin Dashboard</title>
      </Head>
      
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">SEO Management</h1>
          <p className="text-gray-400">Manage SEO metadata for all pages on your site</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
            }}
          >
            <Plus className="w-5 h-5" />
            Add New Page
          </button>
        </div>
        
        {showCreateForm && (
          <div className="mb-6 p-6 rounded-2xl" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}>
            <h3 className="text-xl font-semibold text-white mb-4">Create New Page SEO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Page Path (e.g., /products/vinyl-stickers)"
                value={formData.pagePath || ''}
                onChange={(e) => setFormData({ ...formData, pagePath: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Page Name"
                value={formData.pageName || ''}
                onChange={(e) => setFormData({ ...formData, pageName: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Open Graph Image</label>
              <ImageUpload
                value={formData.ogImage || ''}
                onChange={(url) => setFormData({ ...formData, ogImage: url })}
                folder="seo-images"
                placeholder="Upload OG Image"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                <Save className="w-5 h-5" />
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {loading && <div className="text-center text-gray-400 py-8">Loading SEO data...</div>}
        {error && (
          <div className="p-6 rounded-2xl mb-6" style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            boxShadow: 'rgba(255, 0, 0, 0.2) 0px 8px 32px',
            backdropFilter: 'blur(12px)'
          }}>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Database Error</h3>
            <p className="text-red-300 text-sm mb-2">{error.message}</p>
            <p className="text-gray-400 text-xs">
              Make sure the page_seo table exists in Supabase. Run the SQL migration first:
              <code className="block mt-2 p-2 bg-black/30 rounded">supabase/sql/create_page_seo_table.sql</code>
            </p>
          </div>
        )}
        
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPages.map((page: PageSEO) => (
              <div
                key={page.id}
                className="p-6 rounded-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={() => setPreviewPage(page)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Preview Social Share"
                        aria-label="Preview Social Share"
                      >
                        <Eye className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => startEdit(page)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Edit SEO"
                        aria-label="Edit SEO"
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Delete SEO"
                        aria-label="Delete SEO"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    <div className="pr-12">
                      <h3 className="text-lg font-semibold text-white mb-1">{page.pageName}</h3>
                      <p className="text-xs text-gray-400 font-mono mb-3">{page.pagePath}</p>
                    </div>
                    {editingId === page.id ? (
                      <EditForm
                        formData={formData}
                        setFormData={setFormData}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                      />
                    ) : (
                      <SEODataDisplay page={page} />
                    )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Social Sharing Preview Modal */}
      {previewPage && (
        <div className="fixed inset-0 bg-black/80 z-50 p-4 overflow-y-auto" onClick={() => setPreviewPage(null)}>
          <div className="container-style rounded-2xl p-8 max-w-4xl mx-auto mb-20" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Social Sharing Preview</h2>
              <button
                onClick={() => setPreviewPage(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close Preview"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            {/* Facebook Preview */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Facebook / LinkedIn Preview</h3>
              <div className="border border-white/20 rounded-lg overflow-hidden bg-white">
                <img
                  src={previewPage.ogImage || previewPage.twitterImage || 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'}
                  alt="Social share"
                  className="w-full h-96 object-cover"
                />
                <div className="p-3 bg-white">
                  <p className="text-xs text-gray-500 mb-1">stickershuttle.com</p>
                  <h4 className="text-sm font-semibold text-black mb-1 line-clamp-2">
                    {previewPage.ogTitle || previewPage.title || 'No title'}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {previewPage.ogDescription || previewPage.description || 'No description'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Twitter Preview */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Twitter Preview</h3>
              <div className="bg-gray-900 border border-white/20 rounded-lg overflow-hidden">
                <div className="p-3 flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">Sticker Shuttle</span>
                      <span className="text-xs text-gray-400">@stickershuttle · Now</span>
                    </div>
                    <div className="mt-2 border border-white/20 rounded-lg overflow-hidden bg-white">
                      <img
                        src={previewPage.twitterImage || previewPage.ogImage || 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'}
                        alt="Social share"
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        <p className="text-xs text-gray-500 mb-1">stickershuttle.com</p>
                        <h4 className="text-sm font-semibold text-black mb-1 line-clamp-1">
                          {previewPage.twitterTitle || previewPage.ogTitle || previewPage.title || 'No title'}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {previewPage.twitterDescription || previewPage.ogDescription || previewPage.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function EditForm({ formData, setFormData, onSave, onCancel }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Page Name</label>
          <input
            type="text"
            value={formData.pageName || ''}
            onChange={(e) => setFormData({ ...formData, pageName: e.target.value })}
            placeholder="Enter page name"
            aria-label="Page Name"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter title"
            aria-label="Title"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Meta Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          placeholder="Enter meta description"
          aria-label="Meta Description"
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Keywords</label>
        <input
          type="text"
          value={formData.keywords || ''}
          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
          placeholder="Enter keywords"
          aria-label="Keywords"
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Open Graph Title</label>
          <input
            type="text"
            value={formData.ogTitle || ''}
            onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
            placeholder="Enter OG title"
            aria-label="Open Graph Title"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Open Graph Image</label>
          <ImageUpload
            value={formData.ogImage || ''}
            onChange={(url) => setFormData({ ...formData, ogImage: url })}
            folder="seo-images"
            placeholder="Upload OG Image"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Open Graph Description</label>
        <textarea
          value={formData.ogDescription || ''}
          onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
          rows={2}
          placeholder="Enter OG description"
          aria-label="Open Graph Description"
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
            backdropFilter: 'blur(25px) saturate(180%)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
          }}
        >
          <Save className="w-5 h-5" />
          Save Changes
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
      </div>
    </div>
  );
}

function SEODataDisplay({ page }: { page: PageSEO }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-gray-400 mb-1">Title</p>
        <p className="text-white line-clamp-1">{page.title || 'Not set'}</p>
      </div>
      <div>
        <p className="text-gray-400 mb-1">Description</p>
        <p className="text-white line-clamp-2 text-xs">{page.description || 'Not set'}</p>
      </div>
      {page.ogImage && (
        <div>
          <p className="text-gray-400 mb-2">OG Image</p>
          <img src={page.ogImage} alt="OG" className="w-full h-32 object-cover rounded-lg border border-white/10" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
        {page.robots && (
          <div>
            <p className="text-gray-400 mb-1 text-xs">Robots</p>
            <p className="text-white text-xs">{page.robots}</p>
          </div>
        )}
        {page.keywords && (
          <div>
            <p className="text-gray-400 mb-1 text-xs">Keywords</p>
            <p className="text-white text-xs line-clamp-1">{page.keywords}</p>
          </div>
        )}
      </div>
    </div>
  );
}

