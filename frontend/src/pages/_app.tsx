import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { CartProvider } from "@/components/CartContext";
import { ApolloProvider } from '@apollo/client';
import client from '@/lib/apollo-client';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={client}>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </ApolloProvider>
  );
}
