import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client';
import Layout from '../../components/Layout';
import Link from 'next/link';
import Head from 'next/head';
import { GET_BLOG_POST_BY_SLUG, GET_RELATED_POSTS, INCREMENT_BLOG_VIEWS } from '../../lib/blog-mutations';
import { format } from 'date-fns';
import { fixBlogContent } from '../../utils/fix-blog-content';

export default function BlogPost() {
  const router = useRouter();
  const { slug } = router.query;

  // Fetch the blog post
  const { data, loading, error } = useQuery(GET_BLOG_POST_BY_SLUG, {
    variables: { slug },
    skip: !slug
  });

  const post = data?.blog_posts?.[0];

  // Fetch related posts
  const { data: relatedData } = useQuery(GET_RELATED_POSTS, {
    variables: {
      category: post?.category,
      currentSlug: slug,
      limit: 3
    },
    skip: !post?.category
  });

  // Increment views
  const [incrementViews] = useMutation(INCREMENT_BLOG_VIEWS);

  useEffect(() => {
    if (post && slug) {
      incrementViews({ variables: { slug } });
    }
  }, [post, slug]);

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout title="Post Not Found">
        <div className="text-center py-20">
          <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-gray-300 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link href="/blog">
            <button 
              className="px-6 py-3 rounded-lg text-white font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(25px) saturate(180%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
              }}
            >
              Back to Blog
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt || post.meta_description,
    "image": post.og_image || post.featured_image,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Person",
      "name": post.author_name
    },
    "publisher": {
      "@type": "Organization",
      "name": "Sticker Shuttle",
      "logo": {
        "@type": "ImageObject",
        "url": "https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png"
      }
    }
  };

  return (
    <Layout title={`${post.title} - Sticker Shuttle Blog`}>
      <Head>
        <meta name="description" content={post.meta_description || post.excerpt} />
        <meta property="og:title" content={post.meta_title || post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://stickershuttle.com/blog/${post.slug}`} />
        <meta property="og:image" content={post.og_image || post.featured_image || 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png'} />
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:modified_time" content={post.updated_at} />
        <meta property="article:author" content={post.author_name} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`https://stickershuttle.com/blog/${post.slug}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      {/* Welcome Banner for v3.0 post */}
      {slug === 'welcome-to-sticker-shuttle-v3' && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 text-center">
          <p className="text-sm font-medium">
            🎉 Welcome to Sticker Shuttle v3.0! Explore our new features and improvements.
          </p>
        </div>
      )}

      <article>
        {/* Hero Section with Featured Image */}
        {post.featured_image && (
          <section className="relative h-96 overflow-hidden">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030140] via-transparent to-transparent"></div>
          </section>
        )}

        {/* Content Container */}
        <section className="py-12">
          <div className="w-[95%] md:w-[90%] lg:w-[70%] xl:w-[60%] 2xl:w-[50%] mx-auto px-6 md:px-4">
            {/* Header */}
            <header className="mb-8">
              {/* Breadcrumb */}
              <nav className="mb-6">
                <ol className="flex items-center text-sm text-gray-400">
                  <li>
                    <Link href="/" className="hover:text-white transition-colors">
                      Home
                    </Link>
                  </li>
                  <li className="mx-2">/</li>
                  <li>
                    <Link href="/blog" className="hover:text-white transition-colors">
                      Blog
                    </Link>
                  </li>
                  <li className="mx-2">/</li>
                  <li className="text-white">{post.title}</li>
                </ol>
              </nav>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {post.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {post.author_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {format(new Date(post.published_at), 'MMMM d, yyyy')}
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {post.read_time_minutes} min read
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {post.views} views
                </span>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs font-medium text-purple-300 bg-purple-900/30 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Article Content */}
            <div 
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: fixBlogContent(post.content) }}
            />

            {/* Share Section */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Share this post</h3>
              <div className="flex gap-4">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://stickershuttle.com/blog/${post.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  Twitter
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://stickershuttle.com/blog/${post.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  Facebook
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://stickershuttle.com/blog/${post.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {relatedData?.blog_posts?.length > 0 && (
          <section className="py-12 bg-black/20">
            <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-6 md:px-4">
              <h2 className="text-3xl font-bold text-white mb-8">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedData.blog_posts.map((relatedPost: any) => (
                  <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                    <div 
                      className="rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      {relatedPost.featured_image && (
                        <img
                          src={relatedPost.featured_image}
                          alt={relatedPost.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                          {relatedPost.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{format(new Date(relatedPost.published_at), 'MMM d, yyyy')}</span>
                          <span>{relatedPost.read_time_minutes} min read</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
} 