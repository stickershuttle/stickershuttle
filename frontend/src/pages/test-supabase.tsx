import { useState } from 'react';
import { getSupabase } from '../lib/supabase';

export default function TestSupabase() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testSupabase = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Test 1: Client creation
      addResult('🔧 Testing Supabase client creation...');
      const supabase = getSupabase();
      addResult('✅ Supabase client created successfully');
      
      // Test 2: Check current session
      addResult('🔍 Checking current session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        addResult(`❌ Session check error: ${sessionError.message}`);
      } else {
        addResult(`📊 Current session: ${sessionData.session ? 'Active' : 'None'}`);
        if (sessionData.session) {
          addResult(`👤 User: ${sessionData.session.user.email}`);
        }
      }
      
      // Test 3: Test auth with wrong credentials
      addResult('🔐 Testing auth with wrong credentials...');
      const { error: wrongAuthError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword123'
      });
      if (wrongAuthError) {
        addResult(`✅ Wrong password correctly rejected: ${wrongAuthError.message}`);
      } else {
        addResult('❌ Wrong password should have failed!');
      }
      
      // Test 4: Check Supabase URL
      addResult('🌐 Checking Supabase configuration...');
      addResult(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
      addResult(`Key length: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0}`);
      
      // Test 5: Test API connectivity
      addResult('📡 Testing API connectivity...');
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
          }
        });
        addResult(`API Response: ${response.status} ${response.statusText}`);
      } catch (fetchError: any) {
        addResult(`❌ API connectivity error: ${fetchError.message}`);
      }
      
    } catch (error: any) {
      addResult(`❌ Test error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <button
        onClick={testSupabase}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>
      
      <div className="bg-gray-800 rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
        {results.length === 0 ? (
          <p className="text-gray-400">Click "Run Tests" to start</p>
        ) : (
          <pre className="text-sm whitespace-pre-wrap">
            {results.join('\n')}
          </pre>
        )}
      </div>
    </div>
  );
} 