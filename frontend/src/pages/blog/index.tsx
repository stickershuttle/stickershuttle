import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Head from 'next/head';
import { GET_PUBLISHED_BLOG_POSTS, GET_BLOG_POSTS_BY_CATEGORY, GET_BLOG_CATEGORIES, SEARCH_BLOG_POSTS } from '../../lib/blog-mutations';
import { format } from 'date-fns';

export default function Blog() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const postsPerPage = 9;

  // Fetch all published posts - no category filtering or search
  const { data: postsData, loading: postsLoading } = useQuery(GET_PUBLISHED_BLOG_POSTS, {
    variables: {
      limit: postsPerPage,
      offset: (currentPage - 1) * postsPerPage
    }
  });

  const posts = postsData?.blog_posts;
  const totalPosts = postsData?.blog_posts_aggregate?.aggregate?.count || 0;
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // Add custom styles for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes stellar-drift {
        0% {
          background-position: 0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%;
        }
        20% {
          background-position: 30% 40%, 50% 10%, 70% 60%, 90% 80%, 20% 100%, 40% 50%;
        }
        40% {
          background-position: 60% 70%, 80% 50%, 90% 30%, 20% 90%, 40% 20%, 70% 10%;
        }
        60% {
          background-position: 80% 100%, 100% 80%, 30% 40%, 50% 60%, 70% 50%, 90% 70%;
        }
        80% {
          background-position: 100% 50%, 30% 70%, 50% 100%, 70% 30%, 90% 90%, 60% 60%;
        }
        100% {
          background-position: 0% 0%, 20% 20%, 40% 60%, 60% 40%, 80% 80%, 10% 30%;
        }
      }
      
      @keyframes nebula-pulse {
        0%, 100% {
          opacity: 0.3;
        }
        50% {
          opacity: 0.6;
        }
      }
      
      @keyframes star-twinkle {
        0%, 100% {
          opacity: 0.1;
        }
        50% {
          opacity: 0.3;
        }
      }
      
      .stellar-void-animation {
        position: relative;
        overflow: hidden;
      }
      
      .stellar-void-animation::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 25% 30%, rgba(139, 92, 246, 0.4) 0%, transparent 60%);
        animation: nebula-pulse 4s ease-in-out infinite;
      }
      
      .stellar-void-animation::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 75% 70%, rgba(124, 58, 237, 0.3) 0%, transparent 50%);
        animation: nebula-pulse 4s ease-in-out infinite 2s;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Layout title="Blog - Sticker Shuttle | Company Updates & Design Tips">
      <Head>
        <meta name="description" content="Stay updated with the latest news from Sticker Shuttle. Read about company updates, design tips, product tutorials, and customer success stories." />
        <meta property="og:title" content="Blog - Sticker Shuttle | Company Updates & Design Tips" />
        <meta property="og:description" content="Stay updated with the latest news from Sticker Shuttle. Read about company updates, design tips, product tutorials, and customer success stories." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stickershuttle.com/blog" />
        <meta property="og:image" content="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" />
        <link rel="canonical" href="https://stickershuttle.com/blog" />
      </Head>

      {/* Hero Section with Stellar Void Template */}
      <section className="pt-[20px] pb-8">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          <div 
            className="rounded-2xl p-12 text-center stellar-void-animation"
            style={{
              background: `
                linear-gradient(135deg, #1e3a8a, #3b82f6),
                radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.1) 0%, transparent 60%),
                radial-gradient(circle at 90% 10%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
                radial-gradient(circle at 20% 70%, rgba(124, 58, 237, 0.1) 0%, transparent 40%)
              `,
              backgroundSize: '100% 100%, 60% 60%, 50% 50%, 70% 70%, 40% 40%, 45% 45%',
              animation: 'stellar-drift 20s ease-in-out infinite',
              boxShadow: '0 4px 16px rgba(30, 58, 138, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              backdropFilter: 'blur(12px)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Stars */}
            <div 
              className="absolute w-1 h-1 bg-white rounded-full opacity-60"
              style={{
                left: '20%',
                top: '15%',
                animation: 'star-twinkle 3s ease-in-out infinite'
              }}
            />
            <div 
              className="absolute w-1.5 h-1.5 bg-purple-200 rounded-full opacity-50"
              style={{
                left: '80%',
                top: '25%',
                animation: 'star-twinkle 3s ease-in-out infinite',
                animationDelay: '1s'
              }}
            />
            <div 
              className="absolute w-1 h-1 bg-blue-200 rounded-full opacity-40"
              style={{
                left: '15%',
                top: '60%',
                animation: 'star-twinkle 3s ease-in-out infinite',
                animationDelay: '2s'
              }}
            />
            <div 
              className="absolute w-2 h-2 bg-white rounded-full opacity-30"
              style={{
                left: '90%',
                top: '80%',
                animation: 'star-twinkle 3s ease-in-out infinite',
                animationDelay: '1.5s'
              }}
            />
            <div 
              className="absolute w-1 h-1 bg-purple-300 rounded-full opacity-50"
              style={{
                left: '35%',
                top: '85%',
                animation: 'star-twinkle 3s ease-in-out infinite',
                animationDelay: '3s'
              }}
            />
            <div 
              className="absolute w-1.5 h-1.5 bg-purple-300 rounded-full opacity-60"
              style={{
                left: '70%',
                top: '30%',
                animation: 'star-twinkle 9s ease-in-out infinite',
                animationDelay: '6s'
              }}
            />
            <div 
              className="absolute w-1 h-1 bg-white rounded-full opacity-50"
              style={{
                left: '85%',
                top: '70%',
                animation: 'star-twinkle 9s ease-in-out infinite',
                animationDelay: '1.5s'
              }}
            />
            <div 
              className="absolute w-1 h-1 bg-purple-200 rounded-full opacity-40"
              style={{
                left: '50%',
                top: '80%',
                animation: 'star-twinkle 9s ease-in-out infinite',
                animationDelay: '4.5s'
              }}
            />
            
            {/* Content */}
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Sticker Shuttle Blog
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Your source for sticker industry insights, design tips, and company updates
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="pb-12">
        <div className="w-[95%] md:w-[90%] xl:w-[95%] 2xl:w-[75%] mx-auto px-4">
          {postsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : posts?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-400">
                No blog posts available yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts?.map((post: any) => (
                  <article key={post.id}>
                    <Link href={`/blog/${post.slug}`}>
                      <div 
                        className="h-full rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}
                      >
                        {/* Featured Image */}
                        {post.featured_image && (
                          <div className="aspect-w-16 aspect-h-9 overflow-hidden">
                            <img
                              src={post.featured_image}
                              alt={post.title}
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="p-6">
                          {/* Title */}
                          <h2 className="text-xl font-bold text-white mb-2 line-clamp-2">
                            {post.title}
                          </h2>
                          
                          {/* Excerpt */}
                          <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                          
                          {/* Meta */}
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center gap-4">
                              <span>{post.author_name}</span>
                              <span>•</span>
                              <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{post.read_time_minutes} min read</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                  >
                    Previous
                  </button>
                  
                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          currentPage === i + 1
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        style={currentPage === i + 1 ? {} : {
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
} 
