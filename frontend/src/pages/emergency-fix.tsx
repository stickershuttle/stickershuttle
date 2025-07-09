import { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { resetSupabaseClient } from '../utils/supabase/client';

export default function EmergencyFix() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');

  const addResult = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📊';
    const fullMessage = `${timestamp} ${prefix} ${message}`;
    console.log(fullMessage);
    setResults(prev => [...prev, fullMessage]);
  };

  const clearLocalStorage = () => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        addResult(`Removed localStorage key: ${key}`, 'info');
      });
      addResult('Local storage cleared!', 'success');
    } catch (error: any) {
      addResult(`Failed to clear localStorage: ${error.message}`, 'error');
    }
  };

  const resetClient = () => {
    try {
      resetSupabaseClient();
      addResult('Supabase client reset!', 'success');
    } catch (error: any) {
      addResult(`Failed to reset client: ${error.message}`, 'error');
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test 1: Basic connectivity
      addResult('Testing Supabase connectivity...', 'info');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        }
      });
      addResult(`API Response: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');

      // Test 2: Auth health check
      addResult('Testing auth endpoint...', 'info');
      const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        }
      });
      const authHealth = await authResponse.text();
      addResult(`Auth health: ${authResponse.status} - ${authHealth}`, authResponse.ok ? 'success' : 'error');

    } catch (error: any) {
      addResult(`Connection test failed: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  const testLogin = async () => {
    if (!testEmail || !testPassword) {
      addResult('Please enter test credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      addResult(`Testing login for: ${testEmail}`, 'info');
      
      const supabase = getSupabase();
      const startTime = Date.now();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      const duration = Date.now() - startTime;
      addResult(`Login took ${duration}ms`, 'info');

      if (error) {
        addResult(`Login failed: ${error.message}`, 'error');
      } else if (data?.user) {
        addResult(`Login successful! User ID: ${data.user.id}`, 'success');
        addResult(`Session exists: ${!!data.session}`, 'success');
        
        // Sign out immediately to not affect current state
        await supabase.auth.signOut();
        addResult('Signed out test user', 'info');
      }
    } catch (error: any) {
      addResult(`Login test error: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  const checkEnvironment = () => {
    addResult('Checking environment variables...', 'info');
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    Object.entries(env).forEach(([key, value]) => {
      if (value) {
        const displayValue = key.includes('KEY') ? `${value.substring(0, 20)}...` : value;
        addResult(`${key}: ${displayValue}`, 'success');
      } else {
        addResult(`${key}: NOT SET`, 'error');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🚨 Emergency Login Fix</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={clearLocalStorage}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              🧹 Clear Auth Storage
            </button>
            <button
              onClick={resetClient}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded"
            >
              🔄 Reset Supabase Client
            </button>
            <button
              onClick={testConnection}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              🌐 Test Connection
            </button>
            <button
              onClick={checkEnvironment}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            >
              🔍 Check Environment
            </button>
          </div>
        </div>

        {/* Test Login */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Login</h2>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Test email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
            <input
              type="password"
              placeholder="Test password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
            <button
              onClick={testLogin}
              disabled={loading || !testEmail || !testPassword}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
            >
              🔐 Test Login
            </button>
          </div>
        </div>
      </div>

      {/* Fix Instructions */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">🛠️ Manual Fix Steps</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Click "Clear Auth Storage" to remove any stuck sessions</li>
          <li>Click "Reset Supabase Client" to recreate the connection</li>
          <li>Click "Test Connection" to verify Supabase is reachable</li>
          <li>Try logging in again on the main login page</li>
          <li>If still not working, check the results below for errors</li>
        </ol>
      </div>

      {/* Results */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Results:</h2>
        {results.length === 0 ? (
          <p className="text-gray-400">No results yet. Click a button above to start.</p>
        ) : (
          <pre className="text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
            {results.join('\n')}
          </pre>
        )}
      </div>

      {/* Back to Login */}
      <div className="mt-8 text-center">
        <a 
          href="/login" 
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
        >
          ← Back to Login
        </a>
      </div>
    </div>
  );
} 