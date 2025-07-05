import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { CartProvider } from "@/components/CartContext";
import { ApolloProvider } from '@apollo/client';
import client from '@/lib/apollo-client';
import { PostHogProvider } from '@/providers/posthog';
import { SpeedInsights } from "@vercel/speed-insights/next";

// Initialize Sentry error monitoring
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://b20128a8ef04bdd3743cea128c41332a@o4509531474821120.ingest.us.sentry.io/4509589094268928",
  environment: process.env.NODE_ENV || 'development',
  // Setting this option to true will send default PII data to Sentry
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Session replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  // Error filtering - Re-enabled for production
  beforeSend(event) {
    // In production, always send errors
    if (process.env.NODE_ENV === 'production') {
      return event;
    }
    // In development, send errors if SENTRY_DEBUG is enabled, otherwise send all (for testing)
    return event; // Changed: now allows development errors for testing
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </Head>
      <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-300 text-sm mb-6">
              We've been notified about this error and will fix it soon.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )} showDialog>
      <PostHogProvider>
        <ApolloProvider client={client}>
          <CartProvider>
            <Component {...pageProps} />
          </CartProvider>
        </ApolloProvider>
        <SpeedInsights />
      </PostHogProvider>
    </Sentry.ErrorBoundary>
    </>
  );
}
