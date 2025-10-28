import { useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import { GET_PAGE_SEO_BY_PATH } from '../lib/seo-mutations';

export interface PageSEOData {
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
}

export function usePageSEO() {
  const router = useRouter();
  const pagePath = router.pathname;
  
  const { data, loading, error } = useQuery(GET_PAGE_SEO_BY_PATH, {
    variables: { pagePath },
    // Skip query if no pathname yet
    skip: !pagePath,
    // Don't show errors in console for missing SEO entries (many pages won't have custom SEO)
    onError: (err) => {
      console.log('SEO fetch for', pagePath, '- no custom SEO found (using defaults)');
    },
    onCompleted: (data) => {
      if (data?.getPageSEOByPath) {
        console.log('✅ Custom SEO loaded for', pagePath, data.getPageSEOByPath);
      }
    },
    // Cache the results
    fetchPolicy: 'cache-first'
  });
  
  const seoData: PageSEOData | null = data?.getPageSEOByPath || null;
  
  return {
    seoData,
    loading,
    error,
    hasCustomSEO: !!seoData
  };
}

