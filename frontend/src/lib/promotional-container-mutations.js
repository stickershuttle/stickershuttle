import { gql } from '@apollo/client';

// Query to get all promotional containers
export const GET_PROMOTIONAL_CONTAINERS = gql`
  query GetPromotionalContainers {
    getPromotionalContainers {
      id
      position
      title
      subtitle
      description
      price
      originalPrice
      collectionId
      creatorId
      linkText
      backgroundImage
      backgroundGradient
      badgeText
      badgeColor
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Mutation to update a promotional container
export const UPDATE_PROMOTIONAL_CONTAINER = gql`
  mutation UpdatePromotionalContainer($id: ID!, $input: PromotionalContainerInput!) {
    updatePromotionalContainer(id: $id, input: $input) {
      id
      position
      title
      subtitle
      description
      price
      originalPrice
      collectionId
      creatorId
      linkText
      backgroundImage
      backgroundGradient
      badgeText
      badgeColor
      isActive
      createdAt
      updatedAt
    }
  }
`;
