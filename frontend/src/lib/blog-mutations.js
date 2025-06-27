import { gql } from '@apollo/client';

// Queries
export const GET_BLOG_POSTS = gql`
  query GetBlogPosts($limit: Int, $offset: Int) {
    blog_posts(
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      title
      slug
      excerpt
      featured_image
      author_name
      category
      tags
      published
      published_at
      created_at
      views
      read_time_minutes
    }
    blog_posts_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const GET_PUBLISHED_BLOG_POSTS = gql`
  query GetPublishedBlogPosts($limit: Int, $offset: Int) {
    blog_posts(
      limit: $limit
      offset: $offset
      where: {
        published: { _eq: true }
      }
      order_by: { published_at: desc }
    ) {
      id
      title
      slug
      excerpt
      featured_image
      author_name
      category
      tags
      published
      published_at
      created_at
      views
      read_time_minutes
    }
    blog_posts_aggregate(
      where: {
        published: { _eq: true }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_BLOG_POSTS_BY_CATEGORY = gql`
  query GetBlogPostsByCategory($limit: Int, $offset: Int, $category: String!) {
    blog_posts(
      limit: $limit
      offset: $offset
      where: {
        published: { _eq: true }
        category: { _eq: $category }
      }
      order_by: { published_at: desc }
    ) {
      id
      title
      slug
      excerpt
      featured_image
      author_name
      category
      tags
      published
      published_at
      created_at
      views
      read_time_minutes
    }
    blog_posts_aggregate(
      where: {
        published: { _eq: true }
        category: { _eq: $category }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_BLOG_POST_BY_SLUG = gql`
  query GetBlogPostBySlug($slug: String!) {
    blog_posts(where: { slug: { _eq: $slug }, published: { _eq: true } }) {
      id
      title
      slug
      excerpt
      content
      featured_image
      author_name
      category
      tags
      meta_title
      meta_description
      og_image
      published
      published_at
      created_at
      updated_at
      views
      read_time_minutes
    }
  }
`;

export const GET_BLOG_POST_ADMIN = gql`
  query GetBlogPostAdmin($id: ID!) {
    blog_posts_by_pk(id: $id) {
      id
      title
      slug
      excerpt
      content
      featured_image
      author_id
      author_name
      category
      tags
      meta_title
      meta_description
      og_image
      published
      published_at
      created_at
      updated_at
      views
      read_time_minutes
    }
  }
`;

export const GET_BLOG_CATEGORIES = gql`
  query GetBlogCategories {
    blog_categories(order_by: { name: asc }) {
      id
      name
      slug
      description
      created_at
    }
  }
`;

export const GET_RELATED_POSTS = gql`
  query GetRelatedPosts($category: String!, $currentSlug: String!, $limit: Int) {
    blog_posts(
      where: {
        _and: [
          { published: { _eq: true } }
          { category: { _eq: $category } }
          { slug: { _neq: $currentSlug } }
        ]
      }
      order_by: { published_at: desc }
      limit: $limit
    ) {
      id
      title
      slug
      excerpt
      featured_image
      author_name
      published_at
      read_time_minutes
    }
  }
`;

export const SEARCH_BLOG_POSTS = gql`
  query SearchBlogPosts($searchTerm: String!) {
    blog_posts(
      where: {
        _and: [
          { published: { _eq: true } }
          {
            _or: [
              { title: { _ilike: $searchTerm } }
              { excerpt: { _ilike: $searchTerm } }
              { content: { _ilike: $searchTerm } }
              { tags: { _contains: $searchTerm } }
            ]
          }
        ]
      }
      order_by: { published_at: desc }
    ) {
      id
      title
      slug
      excerpt
      featured_image
      author_name
      category
      published_at
      read_time_minutes
    }
  }
`;

// Mutations
export const CREATE_BLOG_POST = gql`
  mutation CreateBlogPost(
    $title: String!
    $slug: String!
    $excerpt: String
    $content: String!
    $featured_image: String
    $author_id: ID
    $author_name: String
    $category: String
    $tags: [String]
    $meta_title: String
    $meta_description: String
    $og_image: String
    $published: Boolean
    $published_at: String
    $read_time_minutes: Int
  ) {
    insert_blog_posts_one(object: {
      title: $title
      slug: $slug
      excerpt: $excerpt
      content: $content
      featured_image: $featured_image
      author_id: $author_id
      author_name: $author_name
      category: $category
      tags: $tags
      meta_title: $meta_title
      meta_description: $meta_description
      og_image: $og_image
      published: $published
      published_at: $published_at
      read_time_minutes: $read_time_minutes
    }) {
      id
      slug
      title
      published
    }
  }
`;

export const UPDATE_BLOG_POST = gql`
  mutation UpdateBlogPost(
    $id: ID!
    $title: String
    $slug: String
    $excerpt: String
    $content: String
    $featured_image: String
    $author_id: ID
    $author_name: String
    $category: String
    $tags: [String]
    $meta_title: String
    $meta_description: String
    $og_image: String
    $published: Boolean
    $read_time_minutes: Int
  ) {
    update_blog_posts_by_pk(
      pk_columns: { id: $id }
      _set: {
        title: $title
        slug: $slug
        excerpt: $excerpt
        content: $content
        featured_image: $featured_image
        author_id: $author_id
        author_name: $author_name
        category: $category
        tags: $tags
        meta_title: $meta_title
        meta_description: $meta_description
        og_image: $og_image
        published: $published
        read_time_minutes: $read_time_minutes
      }
    ) {
      id
      slug
      title
      published
    }
  }
`;

export const DELETE_BLOG_POST = gql`
  mutation DeleteBlogPost($id: ID!) {
    delete_blog_posts_by_pk(id: $id) {
      id
    }
  }
`;

export const PUBLISH_BLOG_POST = gql`
  mutation PublishBlogPost($id: ID!, $published_at: String) {
    update_blog_posts_by_pk(
      pk_columns: { id: $id }
      _set: { published: true, published_at: $published_at }
    ) {
      id
      published
      published_at
    }
  }
`;

export const UNPUBLISH_BLOG_POST = gql`
  mutation UnpublishBlogPost($id: ID!) {
    update_blog_posts_by_pk(
      pk_columns: { id: $id }
      _set: { published: false }
    ) {
      id
      published
      published_at
    }
  }
`;

export const INCREMENT_BLOG_VIEWS = gql`
  mutation IncrementBlogViews($slug: String!) {
    increment_blog_views(args: { post_slug: $slug }) {
      success
    }
  }
`;

// Category mutations
export const CREATE_BLOG_CATEGORY = gql`
  mutation CreateBlogCategory(
    $name: String!
    $slug: String!
    $description: String
  ) {
    insert_blog_categories_one(object: {
      name: $name
      slug: $slug
      description: $description
    }) {
      id
      slug
      name
    }
  }
`;

export const UPDATE_BLOG_CATEGORY = gql`
  mutation UpdateBlogCategory(
    $id: ID!
    $name: String
    $slug: String
    $description: String
  ) {
    update_blog_categories_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        slug: $slug
        description: $description
      }
    ) {
      id
      slug
      name
    }
  }
`;

export const DELETE_BLOG_CATEGORY = gql`
  mutation DeleteBlogCategory($id: ID!) {
    delete_blog_categories_by_pk(id: $id) {
      id
    }
  }
`; 