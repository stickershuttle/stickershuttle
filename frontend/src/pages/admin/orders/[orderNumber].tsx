import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { getSupabase } from '../../../lib/supabase';

// Admin check - add your admin email(s) here
const ADMIN_EMAILS = ['justin@stickershuttle.com']; // Add all admin emails here

// This component will redirect to the main orders page but with the order selected
export default function OrderDetail() {
  const router = useRouter();
  const { orderNumber } = router.query;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }

        // Check if user email is in admin list
        if (!ADMIN_EMAILS.includes(session.user.email || '')) {
          router.push('/account/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router]);

  // Redirect to main orders page with order selected
  useEffect(() => {
    if (orderNumber && isAdmin && !loading) {
      // Redirect to the main orders page, which will handle the order selection
      router.replace(`/admin/orders?selectedOrder=${orderNumber}`);
    }
  }, [orderNumber, isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </Layout>
    );
  }

  return null; // This component will redirect, so no need to render anything
} 