import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import AdminLayout from '../../components/AdminLayout';
import ImageUpload from '../../components/ImageUpload';
import { 
  GET_BLOG_POSTS,
  GET_BLOG_POSTS_BY_CATEGORY, 
  GET_BLOG_CATEGORIES,
  CREATE_BLOG_POST,
  UPDATE_BLOG_POST,
  DELETE_BLOG_POST,
  PUBLISH_BLOG_POST,
  UNPUBLISH_BLOG_POST,
  GET_BLOG_POST_ADMIN
} from '../../lib/blog-mutations';
import { format } from 'date-fns';
import { getSupabase } from '../../lib/supabase';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  author_name: string;
  category: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
  og_image: string;
  published: boolean;
  published_at: string;
  created_at: string;
  views: number;
  read_time_minutes: number;
}

export default function AdminBlogs() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category: 'company-updates',
    tags: [] as string[],
    meta_title: '',
    meta_description: '',
    og_image: '',
    published: false
  });
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Safe date formatting function
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch blog posts - get all posts
  const { data: postsData, loading, refetch } = useQuery(GET_BLOG_POSTS, {
    variables: { 
      limit: 100
    }
  });

  // Fetch categories
  const { data: categoriesData } = useQuery(GET_BLOG_CATEGORIES);

  // Mutations
  const [createPost] = useMutation(CREATE_BLOG_POST);
  const [updatePost] = useMutation(UPDATE_BLOG_POST);
  const [deletePost] = useMutation(DELETE_BLOG_POST);
  const [publishPost] = useMutation(PUBLISH_BLOG_POST);
  const [unpublishPost] = useMutation(UNPUBLISH_BLOG_POST);

  // Calculate blog statistics
  const blogStats = {
    totalBlogs: postsData?.blog_posts?.length || 0,
    totalViews: postsData?.blog_posts?.reduce((sum: number, post: BlogPost) => sum + (post.views || 0), 0) || 0,
    dateRange: (() => {
      if (!postsData?.blog_posts?.length) return 'No posts yet';
      const dates = postsData.blog_posts
        .map((post: BlogPost) => new Date(post.created_at))
        .filter((date: Date) => !isNaN(date.getTime()));
      if (dates.length === 0) return 'No valid dates';
      const earliest = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
      const latest = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
      return `${format(earliest, 'MMM d, yyyy')} - ${format(latest, 'MMM d, yyyy')}`;
    })()
  };

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Handle form change
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate slug from title
    if (field === 'title' && !editingPost) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value)
      }));
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      if (editingPost) {
        // Update existing post - only include fields that UPDATE_BLOG_POST accepts
        await updatePost({
          variables: {
            id: editingPost.id,
            title: formData.title,
            slug: formData.slug,
            excerpt: formData.excerpt,
            content: formData.content,
            featured_image: formData.featured_image,
            author_id: currentUser?.id,
            author_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Admin',
            category: formData.category,
            tags: formData.tags,
            meta_title: formData.meta_title || formData.title,
            meta_description: formData.meta_description,
            og_image: formData.og_image || formData.featured_image,
            published: formData.published,
            read_time_minutes: Math.max(1, Math.ceil(formData.content.split(' ').length / 200))
          }
        });
      } else {
        // Create new post - include all fields including published_at
        await createPost({
          variables: {
            title: formData.title,
            slug: formData.slug,
            excerpt: formData.excerpt,
            content: formData.content,
            featured_image: formData.featured_image,
            author_id: currentUser?.id,
            author_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Admin',
            category: formData.category,
            tags: formData.tags,
            meta_title: formData.meta_title || formData.title,
            meta_description: formData.meta_description,
            og_image: formData.og_image || formData.featured_image,
            published: formData.published,
            published_at: formData.published ? new Date().toISOString() : null,
            read_time_minutes: Math.max(1, Math.ceil(formData.content.split(' ').length / 200))
          }
        });
      }

      setShowEditor(false);
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featured_image: '',
        category: 'company-updates',
        tags: [],
        meta_title: '',
        meta_description: '',
        og_image: '',
        published: false
      });
      refetch();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Error saving post. Please try again.');
    }
  };

  // Handle edit
  const handleEdit = (post: BlogPost) => {
    console.log('Edit clicked for post:', post.id);
    try {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content || '',
        featured_image: post.featured_image || '',
        category: post.category || 'company-updates',
        tags: post.tags || [],
        meta_title: post.meta_title || '',
        meta_description: post.meta_description || '',
        og_image: post.og_image || '',
        published: post.published || false
      });
      setShowEditor(true);
      console.log('Edit form data set successfully');
    } catch (error) {
      console.error('Error in handleEdit:', error);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      try {
        await deletePost({ variables: { id } });
        refetch();
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post. Please try again.');
      }
    }
  };

  // Handle publish/unpublish
  const handleTogglePublish = async (post: BlogPost) => {
    try {
      if (post.published) {
        await unpublishPost({ variables: { id: post.id } });
      } else {
        await publishPost({ 
          variables: { 
            id: post.id,
            published_at: new Date().toISOString()
          } 
        });
      }
      refetch();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      alert('Error updating publish status. Please try again.');
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Blog Stats Section */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Posts Stat */}
            <div 
              className="rounded-xl p-6 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{blogStats.totalBlogs}</h3>
              <p className="text-sm text-gray-400">Total Blog Posts</p>
            </div>

            {/* Total Views Stat */}
            <div 
              className="rounded-xl p-6 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{blogStats.totalViews.toLocaleString()}</h3>
              <p className="text-sm text-gray-400">Total Views</p>
            </div>

            {/* Date Range Stat */}
            <div 
              className="rounded-xl p-6 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Blog Activity Range</p>
              <p className="text-xs text-gray-300">{blogStats.dateRange}</p>
            </div>
          </div>
        </div>

        {/* Create New Post Button */}
        {!showEditor && (
          <div className="mb-6">
            <button
              onClick={() => setShowEditor(true)}
              className="px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.25) 50%, rgba(139, 92, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                boxShadow: 'rgba(139, 92, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Post
            </button>
          </div>
        )}

        {/* Blog Editor */}
        {showEditor && (
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingPost ? 'Edit Blog Post' : 'Create New Blog Post'}
            </h2>

            {/* Two Column Layout with Separate Containers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Main Content */}
              <div 
                className="rounded-xl p-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-6">Content</h3>
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                      placeholder="Enter blog post title"
                    />
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Excerpt</label>
                    <p className="text-xs text-gray-400 mb-2">Add a summary of the post to appear on your home page or blog.</p>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => handleFormChange('excerpt', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                      placeholder="Brief description of the blog post"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                    <div className="mb-2 flex flex-wrap gap-2 p-3 border-b border-white/20 bg-white/5 rounded-t-lg">
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const before = text.substring(0, start);
                            const selected = text.substring(start, end);
                            const after = text.substring(end);
                            
                            if (selected) {
                              textarea.value = before + `<b>${selected}</b>` + after;
                              handleFormChange('content', textarea.value);
                            }
                          }
                        }}
                        className="px-3 py-1 rounded text-white text-sm font-bold transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const before = text.substring(0, start);
                            const selected = text.substring(start, end);
                            const after = text.substring(end);
                            
                            if (selected) {
                              textarea.value = before + `<i>${selected}</i>` + after;
                              handleFormChange('content', textarea.value);
                            }
                          }
                        }}
                        className="px-3 py-1 rounded text-white text-sm italic transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        I
                      </button>
                      <div className="w-px h-6 bg-white/20 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const before = text.substring(0, start);
                            const selected = text.substring(start, end);
                            const after = text.substring(end);
                            
                            if (selected) {
                              textarea.value = before + `<h2>${selected}</h2>` + after;
                              handleFormChange('content', textarea.value);
                            }
                          }
                        }}
                        className="px-3 py-1 rounded text-white text-sm font-bold transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const before = text.substring(0, start);
                            const selected = text.substring(start, end);
                            const after = text.substring(end);
                            
                            if (selected) {
                              textarea.value = before + `<h3>${selected}</h3>` + after;
                              handleFormChange('content', textarea.value);
                            }
                          }
                        }}
                        className="px-3 py-1 rounded text-white text-sm font-bold transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        H3
                      </button>
                      <div className="w-px h-6 bg-white/20 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            textarea.value += '\n\n';
                            handleFormChange('content', textarea.value);
                          }
                        }}
                        className="px-3 py-1 rounded text-white text-sm transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        ¶
                      </button>
                    </div>
                    <textarea
                      id="content-editor"
                      value={formData.content}
                      onChange={(e) => handleFormChange('content', e.target.value)}
                      onPaste={(e) => {
                        e.preventDefault();
                        const clipboardData = e.clipboardData;
                        const htmlData = clipboardData.getData('text/html');
                        const textData = clipboardData.getData('text/plain');
                        
                        if (htmlData) {
                          // Parse HTML and keep basic formatting
                          const parser = new DOMParser();
                          const doc = parser.parseFromString(htmlData, 'text/html');
                          
                          // Convert to simplified HTML
                          let simplifiedHtml = '';
                          const processNode = (node: Node) => {
                            if (node.nodeType === Node.TEXT_NODE) {
                              simplifiedHtml += node.textContent;
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                              const element = node as Element;
                              const tagName = element.tagName.toLowerCase();
                              
                              // Handle different tags
                              if (tagName === 'p' || tagName === 'div') {
                                if (simplifiedHtml && !simplifiedHtml.endsWith('\n\n')) {
                                  simplifiedHtml += '\n\n';
                                }
                                element.childNodes.forEach(processNode);
                                simplifiedHtml += '\n\n';
                              } else if (tagName === 'br') {
                                simplifiedHtml += '\n';
                              } else if (tagName === 'b' || tagName === 'strong') {
                                simplifiedHtml += '<b>';
                                element.childNodes.forEach(processNode);
                                simplifiedHtml += '</b>';
                              } else if (tagName === 'i' || tagName === 'em') {
                                simplifiedHtml += '<i>';
                                element.childNodes.forEach(processNode);
                                simplifiedHtml += '</i>';
                              } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
                                simplifiedHtml += `<${tagName}>`;
                                element.childNodes.forEach(processNode);
                                simplifiedHtml += `</${tagName}>\n\n`;
                              } else {
                                element.childNodes.forEach(processNode);
                              }
                            }
                          };
                          
                          doc.body.childNodes.forEach(processNode);
                          
                          // Clean up extra line breaks
                          simplifiedHtml = simplifiedHtml.replace(/\n{3,}/g, '\n\n').trim();
                          
                          // Insert at cursor position
                          const textarea = e.target as HTMLTextAreaElement;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = textarea.value;
                          const newValue = text.substring(0, start) + simplifiedHtml + text.substring(end);
                          
                          handleFormChange('content', newValue);
                        } else {
                          // Plain text paste - preserve line breaks
                          const textarea = e.target as HTMLTextAreaElement;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = textarea.value;
                          const newValue = text.substring(0, start) + textData + text.substring(end);
                          
                          handleFormChange('content', newValue);
                        }
                      }}
                      rows={15}
                      className="w-full px-4 py-3 rounded-b-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono text-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)',
                        resize: 'vertical'
                      }}
                      placeholder="Write your blog post content...&#10;&#10;You can use HTML tags like <b>bold</b>, <i>italic</i>, <h2>headings</h2>, <h3>subheadings</h3>&#10;&#10;Paste content from other sources to preserve formatting."
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Supports HTML: &lt;b&gt;, &lt;i&gt;, &lt;h2&gt;, &lt;h3&gt;. Use the buttons above to format selected text. Formatting is preserved when pasting.
                    </p>
                  </div>

                  {/* Live Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
                    <div 
                      className="prose prose-invert max-w-none px-4 py-3 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: formData.content
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/^/, '<p>')
                          .replace(/$/, '</p>')
                          .replace(/<p><\/p>/g, '')
                          .replace(/<p>(<h[1-3]>)/g, '$1')
                          .replace(/(<\/h[1-3]>)<\/p>/g, '$1')
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Settings & Meta */}
              <div className="space-y-6">
                {/* Settings Container */}
                <div 
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Settings</h3>
                  <div className="space-y-6">
                    {/* Visibility */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Visibility</label>
                      <div className="space-y-2">
                        <label className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors">
                          <input
                            type="radio"
                            name="visibility"
                            checked={formData.published}
                            onChange={() => handleFormChange('published', true)}
                            className="mr-3"
                          />
                          <div>
                            <p className="text-white font-medium">Visible</p>
                            <p className="text-xs text-gray-400">Post will be published immediately</p>
                          </div>
                        </label>
                        <label className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors">
                          <input
                            type="radio"
                            name="visibility"
                            checked={!formData.published}
                            onChange={() => handleFormChange('published', false)}
                            className="mr-3"
                          />
                          <div>
                            <p className="text-white font-medium">Hidden</p>
                            <p className="text-xs text-gray-400">Save as draft</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Featured Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Featured Image</label>
                      <ImageUpload
                        value={formData.featured_image}
                        onChange={(url) => handleFormChange('featured_image', url)}
                        placeholder="Upload featured image"
                      />
                    </div>

                    {/* Author */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Author</label>
                      <div className="px-4 py-3 rounded-lg border border-white/20 bg-white/10">
                        <p className="text-white font-medium">
                          {currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Admin'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SEO Container */}
                <div 
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <h3 className="text-lg font-semibold text-white mb-6">Search Engine Listing</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Page title</label>
                      <input
                        type="text"
                        value={formData.meta_title || formData.title}
                        onChange={(e) => handleFormChange('meta_title', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}
                        placeholder="Custom title for search engines"
                      />
                      <p className="text-xs text-gray-400 mt-1">{(formData.meta_title || formData.title).length} of 70 characters used</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Meta description</label>
                      <textarea
                        value={formData.meta_description}
                        onChange={(e) => handleFormChange('meta_description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}
                        placeholder="Description for search engine results"
                      />
                      <p className="text-xs text-gray-400 mt-1">{formData.meta_description.length} of 160 characters used</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">URL handle</label>
                      <div className="flex items-center">
                        <span className="text-gray-400 text-sm mr-1">blog/</span>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => handleFormChange('slug', e.target.value)}
                          className="flex-1 px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                            backdropFilter: 'blur(12px)'
                          }}
                          placeholder="url-slug"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        https://stickershuttle.com/blog/{formData.slug || 'url-slug'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Full Width Below Columns */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSave}
                className="px-6 py-3 rounded-lg text-white font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                {editingPost ? 'Update Post' : 'Create Post'}
              </button>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setEditingPost(null);
                  setFormData({
                    title: '',
                    slug: '',
                    excerpt: '',
                    content: '',
                    featured_image: '',
                    category: 'company-updates',
                    tags: [],
                    meta_title: '',
                    meta_description: '',
                    og_image: '',
                    published: false
                  });
                }}
                className="px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Blog Posts List */}
        {!showEditor && (
          <div 
            className="rounded-xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Image</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Title</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Category</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Views</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-gray-400">
                        Loading blog posts...
                      </td>
                    </tr>
                  ) : postsData?.blog_posts?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-gray-400">
                        No blog posts yet. Create your first post!
                      </td>
                    </tr>
                  ) : (
                    postsData?.blog_posts?.map((post: BlogPost) => {
                      if (!post || !post.id) return null; // Skip invalid posts
                      return (
                        <tr key={post.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-4">
                            {post.featured_image ? (
                              <img 
                                src={post.featured_image} 
                                alt={post.title}
                                className="w-16 h-12 object-cover rounded-lg"
                                style={{
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              />
                            ) : (
                              <div 
                                className="w-16 h-12 rounded-lg flex items-center justify-center"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-white font-medium">{post.title || 'Untitled'}</p>
                              {post.excerpt && (
                                <p 
                                  className="text-sm text-gray-400 mt-1 line-clamp-2"
                                  dangerouslySetInnerHTML={{ __html: post.excerpt }}
                                />
                              )}
                              <p className="text-xs text-gray-500 mt-1">blog/{post.slug || 'no-slug'}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-300">
                              {categoriesData?.blog_categories?.find((c: any) => c.slug === post.category)?.name || post.category || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              post.published 
                                ? 'bg-green-900/30 text-green-300' 
                                : 'bg-yellow-900/30 text-yellow-300'
                            }`}>
                              {post.published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-300">{post.views || 0}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-300">
                              {formatDate(post.created_at)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(post)}
                                className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                  color: 'white'
                                }}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleTogglePublish(post)}
                                className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                                style={{
                                  background: post.published
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(245, 158, 11, 0.1) 100%)'
                                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: post.published
                                    ? '1px solid rgba(245, 158, 11, 0.4)'
                                    : '1px solid rgba(34, 197, 94, 0.4)',
                                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                  color: 'white'
                                }}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  {post.published ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  )}
                                </svg>
                                {post.published ? 'Unpublish' : 'Publish'}
                              </button>
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.25) 50%, rgba(139, 92, 246, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(139, 92, 246, 0.4)',
                                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                  color: 'white'
                                }}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View
                              </a>
                              <button
                                onClick={() => handleDelete(post.id)}
                                className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                  color: 'white'
                                }}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}