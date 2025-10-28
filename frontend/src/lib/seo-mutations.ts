import { gql } from '@apollo/client';

export const GET_PAGE_SEO_BY_PATH = gql`
  query GetPageSEOByPath($pagePath: String!) {
    getPageSEOByPath(pagePath: $pagePath) {
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
  }
`;

export const GET_ALL_PAGE_SEO = gql`
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

