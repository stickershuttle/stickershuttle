const { ApolloServer, gql } = require('apollo-server');

// 1. Schema
const typeDefs = gql`
  type Query {
    hello: String
  }
`;

// 2. Resolvers
const resolvers = {
  Query: {
    hello: () => 'Hello, Sticker Shuttle!'
  }
};

// 3. Server setup
const server = new ApolloServer({ typeDefs, resolvers });

// 4. Start server
server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 GraphQL running at ${url}`);
});
