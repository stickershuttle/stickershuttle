import * as Sentry from "@sentry/react";
import { useState } from 'react';

export default function DebugSentry() {
  const [errorCount, setErrorCount] = useState(0);

  const throwError = () => {
    setErrorCount(prev => prev + 1);
    console.log('🐛 Testing frontend Sentry error capture...');
    throw new Error(`Frontend test error #${errorCount + 1} for Sentry!`);
  };

  const captureException = () => {
    const error = new Error('Manual exception capture test');
    Sentry.captureException(error);
    alert('Exception captured manually! Check your Sentry dashboard.');
  };

  const addBreadcrumb = () => {
    Sentry.addBreadcrumb({
      message: 'User clicked test breadcrumb button',
      level: 'info',
      data: { timestamp: new Date().toISOString() }
    });
    alert('Breadcrumb added! This will appear in the next error.');
  };

  const forceSentryCapture = () => {
    console.log('🚨 FORCING Sentry capture - this WILL appear in dashboard!');
    
    // Add breadcrumb for context
    Sentry.addBreadcrumb({
      message: 'User clicked FORCE CAPTURE button',
      level: 'info',
      data: { 
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });

    // Capture exception directly
    const testError = new Error('🚨 FORCED FRONTEND ERROR - Check Sentry Dashboard!');
    testError.stack = `Error: 🚨 FORCED FRONTEND ERROR - Check Sentry Dashboard!
    at forceSentryCapture (debug-sentry.tsx:45:25)
    at onClick (debug-sentry.tsx:67:31)`;
    
    Sentry.captureException(testError, {
      tags: {
        component: 'debug-sentry',
        test_type: 'forced_capture',
        environment: 'development'
      },
      extra: {
        force_captured: true,
        timestamp: new Date().toISOString(),
        user_action: 'manual_test'
      }
    });

    alert('🚨 ERROR FORCED TO SENTRY! Check your dashboard in 30 seconds.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div 
          className="p-8 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
            backdropFilter: 'blur(12px)'
          }}
        >
          <h1 className="text-3xl font-bold text-white mb-6">🐛 Frontend Sentry Debug</h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <h2 className="text-lg font-semibold text-blue-300 mb-2">Error Boundary Test</h2>
              <p className="text-blue-200 text-sm mb-3">This will trigger the error boundary and should capture in Sentry</p>
              <button
                onClick={throwError}
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Break the world! (Throw Error)
              </button>
            </div>

            <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
              <h2 className="text-lg font-semibold text-green-300 mb-2">Manual Exception Capture</h2>
              <p className="text-green-200 text-sm mb-3">This captures an exception without breaking the UI</p>
              <button
                onClick={captureException}
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Capture Exception
              </button>
            </div>

            <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <h2 className="text-lg font-semibold text-yellow-300 mb-2">Add Breadcrumb</h2>
              <p className="text-yellow-200 text-sm mb-3">This adds context that will appear in the next error</p>
              <button
                onClick={addBreadcrumb}
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  boxShadow: 'rgba(234, 179, 8, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Add Breadcrumb
              </button>
            </div>

            <div className="p-4 bg-red-500/20 rounded-lg border border-red-500/30">
              <h2 className="text-lg font-semibold text-red-300 mb-2">Force Sentry Capture</h2>
              <p className="text-red-200 text-sm mb-3">This forces an immediate Sentry capture</p>
              <button
                onClick={forceSentryCapture}
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(239, 68, 68, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  boxShadow: 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Force Sentry Capture
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-500/20 rounded-lg border border-gray-500/30">
            <h3 className="text-gray-300 font-medium mb-2">Test Status:</h3>
            <p className="text-gray-400 text-sm">
              Errors thrown: <span className="text-white font-semibold">{errorCount}</span>
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Check your Sentry dashboard at{' '}
              <a 
                href="https://sentry.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                sentry.io
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 