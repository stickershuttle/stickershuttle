import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from "@/components/Layout";
import Link from "next/link";
import { getSupabase } from '../../lib/supabase';

// Sample order data to make the dashboard look realistic
const sampleOrders = [
  {
    id: 'ORD-2025-004',
    date: '2025-06-10',
    status: 'Proof Review Needed',
    total: 65.99,
    trackingNumber: null,
    proofUrl: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749682741/NR_Sticker_ThirdChance_iittdl.png',
    items: [
      {
        id: 7,
        name: 'Custom Logo Stickers',
        quantity: 75,
        size: '3" x 3"',
        material: 'Premium Vinyl',
        design: 'Third Chance Logo',
        price: 65.99,
        image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749682741/NR_Sticker_ThirdChance_iittdl.png'
      }
    ]
  },
  {
    id: 'ORD-2025-002',
    date: '2025-06-04',
    status: 'In Production',
    total: 89.99,
    trackingNumber: null,
    items: [
      {
        id: 3,
        name: 'Die Cut Vinyl Stickers',
        quantity: 100,
        size: '4" x 2"',
        material: 'Premium Vinyl',
        design: 'Business Logo',
        price: 59.99,
        image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
      },
      {
        id: 4,
        name: 'Chrome Stickers',
        quantity: 50,
        size: '3" x 1.5"',
        material: 'Chrome Vinyl',
        design: 'Mirror Finish',
        price: 30.00,
        image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593619/GreyAlien_StickerShuttle_ChromeIcon_jkekzp.png'
      }
    ]
  },
  {
    id: 'ORD-2025-001',
    date: '2025-05-27',
    status: 'Delivered',
    total: 47.99,
    trackingNumber: 'SS1Z999AA1234567890',
    items: [
      {
        id: 1,
        name: 'Custom Vinyl Stickers',
        quantity: 50,
        size: '3" x 3"',
        material: 'Premium Vinyl',
        design: 'Custom Logo Design',
        price: 32.99,
        image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
      },
      {
        id: 2,
        name: 'Holographic Stickers',
        quantity: 25,
        size: '2" x 2"',
        material: 'Holographic Vinyl',
        design: 'Rainbow Effect',
        price: 15.00,
        image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593621/PurpleAlien_StickerShuttle_HolographicIcon_ukdotq.png'
      }
    ]
  },
  {
    id: 'ORD-2025-003',
    date: '2025-05-15',
    status: 'Delivered',
    total: 124.99,
    trackingNumber: 'SS1Z999AA0987654321',
    items: [
      {
        id: 5,
        name: 'Outdoor Vinyl Stickers',
        quantity: 200,
        size: '2.5" x 2.5"',
        material: 'Weather Resistant Vinyl',
        design: 'Event Promotion',
        price: 89.99,
        image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593599/Alien_Rocket_mkwlag.png'
      },
      {
        id: 6,
        name: 'Glitter Stickers',
        quantity: 75,
        size: '3.5" x 2"',
        material: 'Glitter Vinyl',
        design: 'Sparkly Finish',
        price: 35.00,
        image: 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749593602/BlueAlien_StickerShuttle_GlitterIcon_rocwpi.png'
      }
    ]
  }
];

type DashboardView = 'default' | 'all-orders' | 'active-orders' | 'financial' | 'items-analysis' | 'design-vault' | 'proofs';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('default');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    relatedOrder: ''
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [proofAction, setProofAction] = useState<string | null>(null);
  const [proofComments, setProofComments] = useState('');
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [highlightComments, setHighlightComments] = useState(false);
  const [actionNotification, setActionNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [recordingMode, setRecordingMode] = useState(false);

  // Add custom styles for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes liquid-flow {
        0% {
          background-position: 0% 50%;
          transform: scale(1) rotate(0deg);
        }
        25% {
          background-position: 100% 50%;
          transform: scale(1.05) rotate(1deg);
        }
        50% {
          background-position: 100% 100%;
          transform: scale(1) rotate(0deg);
        }
        75% {
          background-position: 0% 100%;
          transform: scale(1.05) rotate(-1deg);
        }
        100% {
          background-position: 0% 50%;
          transform: scale(1) rotate(0deg);
        }
      }
      
      .animate-liquid-flow {
        background-size: 400% 400%;
        animation: liquid-flow 8s ease-in-out infinite;
      }
      
      .bg-noise {
        background-image: 
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0);
        background-size: 20px 20px;
        animation: noise-move 3s linear infinite;
      }
      
      @keyframes noise-move {
        0% { transform: translate(0, 0); }
        25% { transform: translate(-2px, 2px); }
        50% { transform: translate(2px, -2px); }
        75% { transform: translate(-1px, -1px); }
        100% { transform: translate(0, 0); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOrderDropdown) {
        const target = event.target as Element;
        if (!target.closest('.order-dropdown')) {
          setShowOrderDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrderDropdown]);

  // Recording mode toggle with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        setRecordingMode(!recordingMode);
        console.log('Recording mode:', !recordingMode ? 'ON' : 'OFF');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [recordingMode]);

  const checkUser = async () => {
    try {
      const supabase = await getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login?message=Please log in to access your dashboard');
        return;
      }

      setUser(session.user);
      
      // Fetch profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!error && profileData) {
        setProfile(profileData);
      }

      // Auto-fill contact form with user data
      const displayName = profileData?.first_name || 
                         session.user?.user_metadata?.first_name || 
                         session.user?.email?.split('@')[0] || '';
      
      const userEmail = session.user?.email || '';

      setContactFormData(prev => ({
        ...prev,
        name: displayName,
        email: userEmail
      }));
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    }
  };

  const handleProfilePictureClick = () => {
    // TODO: Implement profile picture upload
    alert('Profile picture upload coming soon! You\'ll need to add a profile_picture_url column to your Supabase profiles table and set up file storage.');
  };

  const getUserDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Astronaut';
  };

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    
    // Simulate API call
    setTimeout(() => {
      alert(`Order ${orderId} has been added to your cart for reordering!`);
      setReorderingId(null);
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-500';
      case 'In Production':
      case 'in-production':
        return 'bg-blue-500';
      case 'Processing':
        return 'bg-yellow-500';
      case 'Shipped':
        return 'bg-purple-500';
      case 'Proof Review Needed':
        return 'bg-orange-500';
      case 'Reviewing Changes':
      case 'request-changes':
        return 'bg-amber-500';
      case 'deny':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'In Production':
      case 'in-production':
        return 'Printing';
      case 'request-changes':
        return 'Reviewing Requests';
      default:
        return status;
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmittingContact(false);
      setContactSubmitted(true);
      // Reset form after 3 seconds
      setTimeout(() => {
        setContactSubmitted(false);
        setShowContactForm(false);
        setContactFormData(prev => ({
          ...prev,
          subject: '',
          message: '',
          relatedOrder: ''
        }));
      }, 3000);
    }, 1500);
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactFormData({
      ...contactFormData,
      [name]: value
    });
  };

  const handleGetSupport = () => {
    setShowContactForm(true);
  };

  const handleRaiseConcern = () => {
    setContactFormData(prev => ({
      ...prev,
      subject: 'concern'
    }));
    setShowContactForm(true);
  };

  const handleLogout = async () => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
        return;
      }

      // Redirect to login page
      router.push('/login?message=You have been logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Error logging out. Please try again.');
    }
  };



  const handleProofAction = async (action: string, orderId?: string) => {
    // Require comments for certain actions
    if ((action === 'changes' || action === 'deny' || action === 'upload') && !proofComments.trim()) {
      setHighlightComments(true);
      setTimeout(() => setHighlightComments(false), 3000);
      return;
    }
    
    setProofAction(action);
    
    // Simulate API call
    setTimeout(() => {
      let message = '';
      
      // Update order status based on action
      const orderIndex = sampleOrders.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        switch (action) {
          case 'approve':
            sampleOrders[orderIndex].status = 'In Production';
            message = `Proof approved! Order ${orderId} is now in production.`;
            break;
          case 'deny':
            sampleOrders[orderIndex].status = 'deny';
            message = `Proof denied. Our design team will create a new proof based on your feedback.`;
            break;
          case 'changes':
            sampleOrders[orderIndex].status = 'request-changes';
            message = `Change request submitted. Our design team is reviewing your feedback.`;
            break;
          case 'upload':
            message = `File upload initiated. Please upload your corrected design file.`;
            break;
        }
      }
      
      setActionNotification({ message, type: 'success' });
      setTimeout(() => setActionNotification(null), 4000);
      setProofAction('');
      setProofComments('');
      setShowApprovalConfirm(false);
      
      // Force re-render
      setCurrentView('proofs');
    }, 1500);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'all-orders':
        return renderAllOrdersView();
      case 'active-orders':
        return renderActiveOrdersView();
      case 'financial':
        return renderFinancialView();
      case 'items-analysis':
        return renderItemsAnalysisView();
      case 'design-vault':
        return renderDesignVaultView();
      case 'proofs':
        return renderProofsView();
      default:
        return renderDefaultView();
    }
  };

  const renderAllOrdersView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">📋 All Orders</h2>
        <button 
          onClick={() => setCurrentView('default')}
          className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="grid gap-4">
        {sampleOrders.map((order) => (
          <div key={order.id} className="rounded-xl p-6 shadow-xl"
               style={{
                 backgroundColor: 'rgba(255, 255, 255, 0.08)',
                 backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(255, 255, 255, 0.15)'
               }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white text-lg">Mission {order.id}</h3>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)}`}></div>
                      <span className="text-sm text-gray-300 font-medium">
                        {getStatusDisplayText(order.status)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReorder(order.id)}
                    disabled={reorderingId === order.id}
                    className="button-interactive relative px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md hover:bg-yellow-400/20 border-yellow-400/40 text-white/90 font-normal cursor-pointer hover:scale-[1.02] duration-300 shadow-lg"
                    style={{
                      backgroundColor: reorderingId === order.id ? '#666' : '#ffd713',
                      color: '#030140',
                      boxShadow: reorderingId === order.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                      border: 'solid',
                      borderWidth: '0.03125rem',
                      borderColor: reorderingId === order.id ? '#666' : '#e6c211'
                    }}
                  >
                    {reorderingId === order.id ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div>
                          <div className="font-medium text-gray-800">Adding...</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-black group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                        <div>
                          <div className="font-medium text-gray-800">Reorder</div>
                        </div>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-gray-400 mb-3">{new Date(order.date).toLocaleDateString()} • {order.items.length} items • ${order.total}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg"
                         style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-300">Qty: {item.quantity} • ${item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {order.status === 'Proof Review Needed' && (
                  <div className="mt-4 p-4 rounded-lg border-2 border-orange-500/30 bg-orange-500/10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                      <span className="text-orange-300 font-semibold text-sm">⚠️ Proof Review Required</span>
                    </div>
                    <p className="text-orange-200 text-sm mb-4">
                      Your design proof is ready for review. Please approve, request changes, or upload a new file.
                    </p>
                    <button
                      onClick={() => setCurrentView('proofs')}
                      className="button-interactive relative px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md hover:bg-white/10 border-white/20 text-white/80 font-normal cursor-pointer hover:scale-[1.02] duration-300"
                      style={{
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        borderColor: 'rgba(249, 115, 22, 0.3)'
                      }}
                    >
                      <span className="text-orange-400 group-hover:scale-110 transition-transform duration-300">🔍</span>
                      <div>
                        <div className="font-medium text-white">Review Proof</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActiveOrdersView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">⚡ Active Orders</h2>
        <button 
          onClick={() => setCurrentView('default')}
          className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="grid gap-4">
        {sampleOrders.filter(order => order.status !== 'Delivered').map((order) => (
          <div key={order.id} className="rounded-xl p-6 shadow-xl"
               style={{
                 backgroundColor: 'rgba(255, 255, 255, 0.08)',
                 backdropFilter: 'blur(20px)',
                 border: '2px solid rgba(245, 158, 11, 0.3)',
                 boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'
               }}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-semibold text-white text-lg">Mission {order.id}</h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-sm text-orange-300 font-medium">
                  {getStatusDisplayText(order.status)}
                </span>
              </div>
            </div>
            <p className="text-gray-400 mb-3">{new Date(order.date).toLocaleDateString()} • {order.items.length} items • ${order.total}</p>
            {order.status !== 'Proof Review Needed' && order.status !== 'Reviewing Changes' && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                <p className="text-orange-300 text-sm">🔄 This order is currently being processed. You'll receive tracking information once it ships!</p>
              </div>
            )}
            {order.status === 'Proof Review Needed' && (
              <div className="mt-4 p-4 rounded-lg border-2 border-orange-500/30 bg-orange-500/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                  <span className="text-orange-300 font-semibold text-sm">⚠️ Proof Review Required</span>
                </div>
                <p className="text-orange-200 text-sm mb-4">
                  Your design proof is ready for review. Please approve, request changes, or upload a new file.
                </p>
                <button
                  onClick={() => setCurrentView('proofs')}
                  className="button-interactive relative px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md hover:bg-white/10 border-white/20 text-white/80 font-normal"
                  style={{
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderColor: 'rgba(249, 115, 22, 0.3)'
                  }}
                >
                  <span className="text-orange-400">🔍</span>
                  <div>
                    <div className="font-medium text-white">Review Proof</div>
                  </div>
                </button>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => handleReorder(order.id)}
                disabled={reorderingId === order.id}
                className="px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  backgroundColor: reorderingId === order.id ? '#666' : '#ffd713',
                  color: '#030140',
                  boxShadow: reorderingId === order.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                  border: 'solid',
                  borderWidth: '0.03125rem',
                  borderColor: reorderingId === order.id ? '#666' : '#e6c211'
                }}
              >
                {reorderingId === order.id ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                    Reorder
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFinancialView = () => {
    const totalSpent = sampleOrders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalSpent / sampleOrders.length;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">💰 Financial Overview</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center"
               style={{
                 backgroundColor: 'rgba(59, 130, 246, 0.1)',
                 border: '1px solid rgba(59, 130, 246, 0.3)'
               }}>
            <h3 className="text-blue-300 text-sm font-medium">Total Spent</h3>
            <p className="text-white text-2xl font-bold">${totalSpent.toFixed(2)}</p>
          </div>
          <div className="rounded-xl p-4 text-center"
               style={{
                 backgroundColor: 'rgba(16, 185, 129, 0.1)',
                 border: '1px solid rgba(16, 185, 129, 0.3)'
               }}>
            <h3 className="text-green-300 text-sm font-medium">Average Order</h3>
            <p className="text-white text-2xl font-bold">${avgOrderValue.toFixed(2)}</p>
          </div>
          <div className="rounded-xl p-4 text-center"
               style={{
                 backgroundColor: 'rgba(139, 92, 246, 0.1)',
                 border: '1px solid rgba(139, 92, 246, 0.3)'
               }}>
            <h3 className="text-purple-300 text-sm font-medium">Total Orders</h3>
            <p className="text-white text-2xl font-bold">{sampleOrders.length}</p>
          </div>
        </div>

        <div className="grid gap-4">
          {sampleOrders.map((order) => (
            <div key={order.id} className="rounded-xl p-6 shadow-xl"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.08)',
                   backdropFilter: 'blur(20px)',
                   border: '1px solid rgba(255, 255, 255, 0.15)'
                 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Mission {order.id}</h3>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">${order.total}</p>
                  <p className="text-xs text-gray-400">{new Date(order.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 rounded"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <span className="text-white text-sm">{item.name} (x{item.quantity})</span>
                    <span className="text-green-300 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleReorder(order.id)}
                  disabled={reorderingId === order.id}
                  className="px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background: reorderingId === order.id ? '#666' : 'linear-gradient(135deg, #ffd713, #ffed4e)',
                    color: '#030140',
                    boxShadow: '0 0 20px rgba(255, 215, 19, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {reorderingId === order.id ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                      Reorder
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderItemsAnalysisView = () => {
    // Calculate item popularity
    const itemCounts: { [key: string]: number } = {};
    sampleOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.name;
        itemCounts[key] = (itemCounts[key] || 0) + item.quantity;
      });
    });
    
    const sortedItems = Object.entries(itemCounts).sort((a, b) => (b[1] as number) - (a[1] as number));
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">📊 Items Analysis</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div className="rounded-xl p-6 shadow-xl mb-6"
             style={{
               backgroundColor: 'rgba(255, 255, 255, 0.08)',
               backdropFilter: 'blur(20px)',
               border: '1px solid rgba(255, 255, 255, 0.15)'
             }}>
          <h3 className="text-xl font-bold text-white mb-4">🏆 Most Popular Items</h3>
          <div className="space-y-3">
            {sortedItems.slice(0, 5).map(([itemName, count], index) => (
              <div key={itemName} className="flex items-center justify-between p-3 rounded-lg"
                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                  <span className="text-white font-medium">{itemName}</span>
                </div>
                <span className="text-purple-300 font-bold">{count} ordered</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {sampleOrders.map((order) => (
            <div key={order.id} className="rounded-xl p-6 shadow-xl"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.08)',
                   backdropFilter: 'blur(20px)',
                   border: '1px solid rgba(255, 255, 255, 0.15)'
                 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-lg">Mission {order.id}</h3>
                <p className="text-gray-400">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items total</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{item.name}</p>
                      <p className="text-xs text-purple-300">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleReorder(order.id)}
                  disabled={reorderingId === order.id}
                  className="px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    backgroundColor: reorderingId === order.id ? '#666' : '#ffd713',
                    color: '#030140',
                    boxShadow: reorderingId === order.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                    border: 'solid',
                    borderWidth: '0.03125rem',
                    borderColor: reorderingId === order.id ? '#666' : '#e6c211'
                  }}
                >
                  {reorderingId === order.id ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                      Reorder
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDesignVaultView = () => {
    // Extract unique designs from orders
    const designs: Array<{
      id: number;
      name: string;
      image: string;
      design: string;
      timesOrdered: number;
      lastOrderId: string;
    }> = [];
    sampleOrders.forEach(order => {
      order.items.forEach(item => {
        if (!designs.find(d => d.name === item.name)) {
          designs.push({
            id: item.id,
            name: item.name,
            image: item.image,
            design: item.design,
            timesOrdered: sampleOrders.reduce((count, o) => 
              count + o.items.filter(i => i.name === item.name).reduce((sum, i) => sum + i.quantity, 0), 0
            ),
            lastOrderId: order.id
          });
        }
      });
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🎨 Design Vault</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <div className="rounded-xl p-6 shadow-xl mb-6"
             style={{
               backgroundColor: 'rgba(255, 255, 255, 0.08)',
               backdropFilter: 'blur(20px)',
               border: '1px solid rgba(255, 255, 255, 0.15)'
             }}>
          <p className="text-gray-300 text-center">☁️ Your cloud library of custom designs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <div key={design.id} className="rounded-xl p-6 shadow-xl group hover:scale-105 transition-all duration-300"
                 style={{
                   backgroundColor: 'rgba(255, 255, 255, 0.08)',
                   backdropFilter: 'blur(20px)',
                   border: '1px solid rgba(255, 255, 255, 0.15)'
                 }}>
              <div className="aspect-square mb-4 rounded-lg overflow-hidden"
                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <img 
                  src={design.image} 
                  alt={design.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>
              <h3 className="font-semibold text-white mb-2">{design.name}</h3>
              <p className="text-xs text-gray-400 mb-4">{design.design} • Ordered {design.timesOrdered} times</p>
              
              <div className="space-y-2">
                <button className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white transition-all duration-300 hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                        }}>
                  📥 Download
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2 px-3 rounded-lg text-xs font-medium text-white transition-all duration-300 hover:scale-105"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}>
                    🔗 Share
                  </button>
                  <button
                    onClick={() => handleReorder(design.lastOrderId)}
                    disabled={reorderingId === design.lastOrderId}
                    className="py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                    style={{
                      backgroundColor: reorderingId === design.lastOrderId ? '#666' : '#ffd713',
                      color: '#030140',
                      boxShadow: reorderingId === design.lastOrderId ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                      border: 'solid',
                      borderWidth: '0.03125rem',
                      borderColor: reorderingId === design.lastOrderId ? '#666' : '#e6c211'
                    }}
                  >
                    {reorderingId === design.lastOrderId ? (
                      <>
                        <svg className="animate-spin w-3 h-3 text-gray-600 inline mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 text-black inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                        Reorder
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProofsView = () => {
    const proofsToReview = sampleOrders.filter(order => 
      order.status === 'Proof Review Needed'
    );
    
    const inProduction = sampleOrders.filter(order => 
      order.status === 'in-production' && order.proofUrl
    );
    
    const requestChanges = sampleOrders.filter(order => 
      order.status === 'request-changes' && order.proofUrl
    );
    
    const pastProofs = sampleOrders.filter(order => 
      order.proofUrl && (order.status === 'In Production' || order.status === 'Delivered')
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">🔍 Proof Review Center</h2>
          <button 
            onClick={() => setCurrentView('default')}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Current Proofs Needing Review */}
        {proofsToReview.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              ⚠️ Requires Your Review
              <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full animate-pulse">
                {proofsToReview.length} pending
              </span>
            </h3>
            
            {proofsToReview.map((order) => (
              <div key={order.id} 
                   className="rounded-xl p-6 shadow-xl border-2 border-orange-500/30"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.08)',
                     backdropFilter: 'blur(20px)',
                     boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)'
                   }}>
                
                {/* Order Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white">Mission {order.id}</h4>
                    <p className="text-sm text-gray-300">
                      {new Date(order.date).toLocaleDateString()} • ${order.total} • {order.items[0].name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)} animate-pulse`}></div>
                      <span className="text-sm text-orange-300 font-medium">{getStatusDisplayText(order.status)}</span>
                    </div>
                  </div>
                </div>

                {/* Proof Display */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                     {/* Proof Image */}
                   <div>
                     <h5 className="text-md font-semibold text-white mb-3">Design Proof</h5>
                     <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '7/5' }}>
                       <img 
                         src={order.proofUrl} 
                         alt="Design Proof"
                         className="w-full h-full object-cover"
                       />
                     </div>
                     <div className="mt-3 flex justify-center">
                       <div className="px-4 py-2 rounded-full text-xs text-gray-300 text-center backdrop-blur-md border"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.15)'
                            }}>
                         ✨ This is how your stickers will look when printed
                       </div>
                     </div>
                   </div>

                  {/* Action Panel */}
                  <div className="space-y-4">
                    <h5 className="text-md font-semibold text-white">Review Actions</h5>
                    
                    {/* Action Notification */}
                    {actionNotification && (
                      <div className="relative mb-4">
                        <div className="absolute top-0 left-0 right-0 z-10 animate-in slide-in-from-top-2 duration-300">
                          <div className={`px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg ${
                            actionNotification.type === 'success' 
                              ? 'bg-green-500/10 border-green-400/30 text-green-300' 
                              : actionNotification.type === 'error'
                              ? 'bg-red-500/10 border-red-400/30 text-red-300'
                              : 'bg-blue-500/10 border-blue-400/30 text-blue-300'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {actionNotification.type === 'success' && '✅'}
                                {actionNotification.type === 'error' && '❌'}
                                {actionNotification.type === 'info' && 'ℹ️'}
                              </span>
                              <p className="text-sm font-medium">{actionNotification.message}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons with Liquid Glass Style */}
                    <div className="space-y-3">
                      {!showApprovalConfirm ? (
                        <button
                          onClick={() => setShowApprovalConfirm(true)}
                          disabled={proofAction === 'approve'}
                          className="button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 border backdrop-blur-md hover:bg-green-500/10 hover:border-green-400/40 hover:scale-[1.02] border-white/20 text-white/80 font-normal group cursor-pointer"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          <span className="text-green-400 group-hover:scale-110 transition-transform duration-300">✅</span>
                          <div>
                            <div className="font-medium text-white group-hover:text-green-100 transition-colors duration-300">Approve Proof</div>
                            <div className="text-xs text-gray-300 group-hover:text-green-200 transition-colors duration-300">Proceed to production</div>
                          </div>
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="px-4 py-3 rounded-xl border border-green-400/30 bg-green-500/10">
                            <p className="text-green-300 font-medium text-sm">You're sure?</p>
                            <p className="text-green-200 text-xs">This will send the order to production</p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowApprovalConfirm(false)}
                              className="flex-1 px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 hover:scale-[1.02]"
                            >
                              Cancel
                            </button>
                            <div className="relative">
                              <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl blur opacity-30 animate-pulse"></div>
                              <button
                                onClick={() => {
                                  handleProofAction('approve', order.id);
                                  setShowApprovalConfirm(false);
                                }}
                                disabled={proofAction === 'approve'}
                                className="relative flex-1 w-full px-4 py-3 rounded-xl border border-green-400/50 bg-green-500/20 text-green-200 hover:bg-green-500/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
                              >
                              {proofAction === 'approve' ? (
                                <>
                                  <svg className="animate-spin w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </>
                              ) : (
                                'Yes, Continue'
                              )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                         onClick={() => handleProofAction('changes', order.id)}
                         disabled={proofAction === 'changes'}
                         className="button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 border backdrop-blur-md hover:bg-amber-500/10 hover:border-amber-400/40 hover:scale-[1.02] border-white/20 text-white/80 font-normal group cursor-pointer"
                         style={{
                           backgroundColor: proofAction === 'changes' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                           borderColor: proofAction === 'changes' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.2)'
                         }}
                       >
                        {proofAction === 'changes' ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Requesting...
                          </>
                        ) : (
                          <>
                            <span className="text-amber-400 group-hover:scale-110 transition-transform duration-300">🔄</span>
                            <div>
                              <div className="font-medium text-white group-hover:text-amber-100 transition-colors duration-300">Request Changes</div>
                              <div className="text-xs text-gray-300 group-hover:text-amber-200 transition-colors duration-300">Ask for revisions</div>
                            </div>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleProofAction('deny')}
                        disabled={proofAction === 'deny'}
                                                 className="button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 border backdrop-blur-md hover:bg-red-500/10 hover:border-red-400/40 hover:scale-[1.02] border-white/20 text-white/80 font-normal group cursor-pointer"
                        style={{
                          backgroundColor: proofAction === 'deny' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          borderColor: proofAction === 'deny' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        {proofAction === 'deny' ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Denying...
                          </>
                        ) : (
                          <>
                            <span className="text-red-400 group-hover:scale-110 transition-transform duration-300">❌</span>
                            <div>
                              <div className="font-medium text-white group-hover:text-red-100 transition-colors duration-300">Deny Proof</div>
                              <div className="text-xs text-gray-300 group-hover:text-red-200 transition-colors duration-300">Start over</div>
                            </div>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleProofAction('upload')}
                        disabled={proofAction === 'upload'}
                                                 className="button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 border backdrop-blur-md hover:bg-purple-500/10 hover:border-purple-400/40 hover:scale-[1.02] border-white/20 text-white/80 font-normal group cursor-pointer"
                        style={{
                          backgroundColor: proofAction === 'upload' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          borderColor: proofAction === 'upload' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        {proofAction === 'upload' ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <span className="text-purple-400 group-hover:scale-110 transition-transform duration-300">📁</span>
                            <div>
                              <div className="font-medium text-white group-hover:text-purple-100 transition-colors duration-300">Upload New File</div>
                              <div className="text-xs text-gray-300 group-hover:text-purple-200 transition-colors duration-300">Replace design</div>
                            </div>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Comments Section */}
                    <div className={`mt-6 transition-all duration-500 ${highlightComments ? 'animate-pulse' : ''}`}>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-500 ${highlightComments ? 'text-orange-300' : 'text-gray-300'}`}>
                        Comments <span className={`transition-colors duration-500 ${highlightComments ? 'text-orange-200' : 'text-orange-400'}`}>(Required for changes, deny, or upload)</span>
                      </label>
                      <textarea
                        value={proofComments}
                        onChange={(e) => setProofComments(e.target.value)}
                        rows={3}
                        className={`w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none backdrop-blur-md border transition-all duration-500 ${highlightComments ? 'ring-2 ring-orange-400 border-orange-400/50' : ''}`}
                        style={{
                          backgroundColor: highlightComments ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                          borderColor: highlightComments ? 'rgba(249, 115, 22, 0.5)' : 'rgba(255, 255, 255, 0.2)'
                        }}
                        placeholder="Add specific feedback or instructions..."
                      />
                      {highlightComments && (
                        <p className="text-orange-300 text-xs mt-2 animate-bounce">
                          ⚠️ Please add comments before proceeding with this action
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* In Production Orders */}
        {inProduction.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              🏭 In Production
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                {inProduction.length} printing
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProduction.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-blue-400/30"
                     style={{
                       backgroundColor: 'rgba(59, 130, 246, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {order.id}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-xs text-blue-300">Printing</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3" style={{ aspectRatio: '7/5' }}>
                    <img 
                      src={order.proofUrl} 
                      alt="Approved Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mb-3">
                    <p className="text-blue-300 text-xs font-medium">✅ Proof Approved</p>
                    <p className="text-blue-200 text-xs">Your stickers are being printed!</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Changes Orders */}
        {requestChanges.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              🔄 Changes Being Reviewed
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                {requestChanges.length} pending
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requestChanges.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl border border-amber-400/30"
                     style={{
                       backgroundColor: 'rgba(245, 158, 11, 0.08)',
                       backdropFilter: 'blur(20px)',
                       boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {order.id}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-xs text-amber-300">Under Review</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden mb-3" style={{ aspectRatio: '7/5' }}>
                    <img 
                      src={order.proofUrl} 
                      alt="Original Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 mb-3">
                    <p className="text-amber-300 text-xs font-medium">🔄 Changes Requested</p>
                    <p className="text-amber-200 text-xs">Your changes are being reviewed</p>
                  </div>
                  
                  <p className="text-xs text-gray-300 text-center">
                    There's nothing you need to do right now
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Proofs */}
        {pastProofs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              📋 Past Proofs
              <span className="text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded-full">
                {pastProofs.length} completed
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastProofs.map((order) => (
                <div key={order.id} 
                     className="rounded-xl p-4 shadow-xl"
                     style={{
                       backgroundColor: 'rgba(255, 255, 255, 0.08)',
                       backdropFilter: 'blur(20px)',
                       border: '1px solid rgba(255, 255, 255, 0.15)'
                     }}>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">Mission {order.id}</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                      <span className="text-xs text-gray-300">{getStatusDisplayText(order.status)}</span>
                    </div>
                  </div>
                  
                                     <div className="rounded-lg overflow-hidden mb-3" style={{ aspectRatio: '7/5' }}>
                     <img 
                       src={order.proofUrl} 
                       alt="Past Proof"
                       className="w-full h-full object-cover"
                     />
                   </div>
                  
                  <p className="text-xs text-gray-400 mb-2">
                    {new Date(order.date).toLocaleDateString()} • ${order.total}
                  </p>
                  
                  <button className="w-full py-2 px-3 rounded-lg text-xs font-medium text-white transition-all duration-300 hover:scale-105 backdrop-blur-md border"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          }}>
                    📥 Download Proof
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {proofsToReview.length === 0 && inProduction.length === 0 && requestChanges.length === 0 && pastProofs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Proofs Available</h3>
            <p className="text-gray-400 mb-6">
              When you place an order, design proofs will appear here for your review.
            </p>
            <Link 
              href="/products"
              className="inline-block px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                color: 'white'
              }}
            >
              🚀 Start New Mission
            </Link>
          </div>
        )}
      </div>
    );
  };

  const renderDefaultView = () => (
    <>
      {/* Current Deals - Priority Display */}
      <div 
        className="rounded-xl p-6 shadow-xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            🎯 Current Deals
            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
              Limited Time
            </span>
          </h2>
          <p className="text-sm text-gray-400">Exclusive offers just for you</p>
        </div>
        
        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 gap-4">
          {/* Deal 1 - Reorder Discount */}
          <div className="rounded-lg p-4 border border-yellow-400/30"
               style={{ backgroundColor: 'rgba(255, 215, 19, 0.1)' }}>
            <div className="text-center">
              <div className="text-xs font-bold px-3 py-1 rounded mb-3 inline-block"
                   style={{ background: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' }}>
                10% OFF
              </div>
              <p className="text-sm font-semibold text-white mb-1">🔄 Reorder Special</p>
              <p className="text-xs text-gray-300">10% off any repeat order</p>
            </div>
          </div>

          {/* Deal 2 - Free Shipping */}
          <div className="rounded-lg p-4 border border-green-400/30"
               style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <div className="text-center">
              <div className="text-xs font-bold px-3 py-1 rounded text-white mb-3 inline-block"
                   style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                FREE
              </div>
              <p className="text-sm font-semibold text-white mb-1">🚚 Free Shipping</p>
              <p className="text-xs text-gray-300">Orders over $50</p>
            </div>
          </div>

          {/* Deal 3 - Bulk Discount */}
          <div className="rounded-lg p-4 border border-purple-400/30"
               style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
            <div className="text-center">
              <div className="text-xs font-bold px-3 py-1 rounded text-white mb-3 inline-block"
                   style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                15% OFF
              </div>
              <p className="text-sm font-semibold text-white mb-1">📦 Bulk Orders</p>
              <p className="text-xs text-gray-300">15% off 500+ stickers</p>
            </div>
          </div>
        </div>

        {/* Mobile Swipeable Carousel */}
        <div className="md:hidden">
          <div 
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {/* Create infinite scroll effect by repeating deals */}
            {[
              { emoji: '🔄', title: 'Reorder Special', desc: '10% off any repeat order', discount: '10% OFF', bg: 'rgba(255, 215, 19, 0.1)', border: 'border-yellow-400/30', gradient: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' },
              { emoji: '🚚', title: 'Free Shipping', desc: 'Orders over $50', discount: 'FREE', bg: 'rgba(16, 185, 129, 0.1)', border: 'border-green-400/30', gradient: 'linear-gradient(135deg, #10b981, #34d399)', color: 'white' },
              { emoji: '📦', title: 'Bulk Orders', desc: '15% off 500+ stickers', discount: '15% OFF', bg: 'rgba(139, 92, 246, 0.1)', border: 'border-purple-400/30', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white' },
              { emoji: '🔄', title: 'Reorder Special', desc: '10% off any repeat order', discount: '10% OFF', bg: 'rgba(255, 215, 19, 0.1)', border: 'border-yellow-400/30', gradient: 'linear-gradient(135deg, #ffd713, #ffed4e)', color: '#030140' },
              { emoji: '🚚', title: 'Free Shipping', desc: 'Orders over $50', discount: 'FREE', bg: 'rgba(16, 185, 129, 0.1)', border: 'border-green-400/30', gradient: 'linear-gradient(135deg, #10b981, #34d399)', color: 'white' },
              { emoji: '📦', title: 'Bulk Orders', desc: '15% off 500+ stickers', discount: '15% OFF', bg: 'rgba(139, 92, 246, 0.1)', border: 'border-purple-400/30', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white' }
            ].map((deal, index) => (
              <div 
                key={index}
                className={`flex-none w-64 rounded-lg p-4 border ${deal.border} snap-start`}
                style={{ backgroundColor: deal.bg }}
              >
                <div className="text-center">
                  <div className="text-xs font-bold px-3 py-1 rounded mb-3 inline-block"
                       style={{ background: deal.gradient, color: deal.color }}>
                    {deal.discount}
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">{deal.emoji} {deal.title}</p>
                  <p className="text-xs text-gray-300">{deal.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Missions - PRIORITY 1 with Glow */}
      {sampleOrders.filter(order => order.status === 'Proof Review Needed' || order.status === 'In Production' || order.status === 'Reviewing Changes').length > 0 && (
        <div 
          className="rounded-xl shadow-xl overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '2px dashed rgba(249, 115, 22, 0.6)',
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.3), 0 0 40px rgba(249, 115, 22, 0.1), inset 0 0 20px rgba(249, 115, 22, 0.1)'
          }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🚀 Current Missions
              </h2>
              <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full whitespace-nowrap">
                {sampleOrders.filter(order => order.status === 'Proof Review Needed' || order.status === 'In Production' || order.status === 'Reviewing Changes').length} Active
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {sampleOrders.filter(order => order.status === 'Proof Review Needed' || order.status === 'In Production' || order.status === 'Reviewing Changes').map((order) => (
              <div key={order.id} className="rounded-lg p-4"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)'
                   }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">Mission {order.id}</h3>
                    <p className="text-sm text-gray-300">{order.items.length} items • ${order.total}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)} ${order.status === 'Proof Review Needed' ? 'animate-pulse' : ''}`}></div>
                      <span className="text-xs text-orange-300">
                        {order.status === 'Proof Review Needed' ? 'Awaiting Your Review' : 
                         order.status === 'In Production' ? 'Printing' : 
                         order.status === 'Reviewing Changes' ? 'Reviewing Your Requests' : getStatusDisplayText(order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-orange-200 mt-2">
                      {order.status === 'Proof Review Needed' ? 'Your design proof is ready. Please review and approve or request changes.' :
                       order.status === 'In Production' ? 'Your order is currently being printed and will ship soon.' :
                       order.status === 'Reviewing Changes' ? 'We are reviewing your requested changes and will send an updated proof soon.' :
                       'Order is being processed.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.status === 'Proof Review Needed' ? (
                      <button
                        onClick={() => setCurrentView('proofs')}
                        className="button-interactive relative px-4 py-3 rounded-xl flex items-center gap-3 transition-all border backdrop-blur-md hover:bg-white/10 border-white/20 text-white/80 font-normal cursor-pointer hover:scale-[1.02] duration-300"
                        style={{
                          backgroundColor: 'rgba(249, 115, 22, 0.1)',
                          borderColor: 'rgba(249, 115, 22, 0.3)'
                        }}
                      >
                        <span className="text-orange-400 group-hover:scale-110 transition-transform duration-300">🔍</span>
                        <div>
                          <div className="font-medium text-white">Review Proof</div>
                        </div>
                      </button>
                    ) : (
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-sm text-orange-300 font-medium">
                          {order.status === 'In Production' ? '🖨️ In Production' : 
                           order.status === 'Reviewing Changes' ? '🔄 Reviewing Changes' : 
                           getStatusDisplayText(order.status)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Quick Reorder - PRIORITY 2 */}
      {(() => {
        const lastDeliveredOrder = sampleOrders.filter(order => order.status === 'Delivered')[0];
        return lastDeliveredOrder ? (
          <div 
            className="rounded-xl shadow-xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">🔄 Quick Reorder</h2>
                <div className="text-xs font-bold px-3 py-1 rounded-full"
                     style={{
                       background: 'linear-gradient(135deg, #ffd713, #ffed4e)',
                       color: '#030140'
                     }}>
                  10% OFF
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-lg p-4"
                   style={{
                     backgroundColor: 'rgba(255, 255, 255, 0.05)',
                     border: '1px solid rgba(255, 255, 255, 0.1)'
                   }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">Your Last Order - Mission {lastDeliveredOrder.id}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lastDeliveredOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{item.name}</p>
                            <p className="text-xs text-gray-300">Qty: {item.quantity} • ${item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <p className="text-sm text-gray-300">
                        Original: <span className="line-through">${lastDeliveredOrder.total}</span>
                      </p>
                      <p className="text-sm font-bold text-white">
                        With 10% off: <span style={{ color: '#ffd713' }}>${(lastDeliveredOrder.total * 0.9).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleReorder(lastDeliveredOrder.id)}
                      disabled={reorderingId === lastDeliveredOrder.id}
                      className="px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                      style={{
                        backgroundColor: reorderingId === lastDeliveredOrder.id ? '#666' : '#ffd713',
                        color: '#030140',
                        boxShadow: reorderingId === lastDeliveredOrder.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                        border: 'solid',
                        borderWidth: '0.03125rem',
                        borderColor: reorderingId === lastDeliveredOrder.id ? '#666' : '#e6c211'
                      }}
                    >
                      {reorderingId === lastDeliveredOrder.id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          🔄 Reorder Now
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-400 text-center">Save 10% • Same Great Quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Recent Orders History */}
      <div 
        className="rounded-xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">📋 Mission History</h2>
            <button 
              onClick={() => setCurrentView('all-orders')}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 text-sm"
            >
              View All →
            </button>
          </div>
        </div>
        <div className="divide-y divide-white/10">
          {sampleOrders.slice(0, 3).map((order) => (
            <div key={order.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">Mission {order.id}</h3>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                      <span className="text-xs text-gray-300">
                        {getStatusDisplayText(order.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">{new Date(order.date).toLocaleDateString()} • {order.items.length} items • ${order.total}</p>
                  {order.trackingNumber && (
                    <p className="text-xs text-purple-300 mt-1">
                      📦 Tracking: {order.trackingNumber}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Desktop: Show tracking info separately */}
                  {order.trackingNumber && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Tracking</p>
                      <p className="text-xs text-purple-300 font-mono">{order.trackingNumber}</p>
                    </div>
                  )}
                  
                  {/* Buttons - Full width on mobile, flex on desktop */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link 
                      href={`/account/orders/${order.id}`}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-xs sm:text-sm text-white text-center"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      📋 Details
                    </Link>
                    {order.status === 'Delivered' && (
                      <>
                        <Link 
                          href={`https://www.ups.com/track?tracknum=${order.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-xs sm:text-sm text-white text-center"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                          }}
                        >
                          📍 Track
                        </Link>
                        <button
                          onClick={() => handleReorder(order.id)}
                          disabled={reorderingId === order.id}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 text-xs sm:text-sm text-center"
                          style={{
                            backgroundColor: reorderingId === order.id ? '#666' : '#ffd713',
                            color: '#030140',
                            boxShadow: reorderingId === order.id ? 'none' : '2px 2px #cfaf13, 0 0 20px rgba(255, 215, 19, 0.3)',
                            border: 'solid',
                            borderWidth: '0.03125rem',
                            borderColor: reorderingId === order.id ? '#666' : '#e6c211'
                          }}
                        >
                          {reorderingId === order.id ? 'Adding...' : '🔄 Reorder'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


    </>
  );

  if (loading) {
    return (
      <Layout title="Dashboard - Sticker Shuttle">
        <div className="min-h-screen flex items-center justify-center"
             style={{
               background: '#030140',
               position: 'relative'
             }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Screen Recording Optimizations */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        
        /* Disable problematic effects during screen recording */
        .recording-mode * {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          animation: none !important;
          transition: none !important;
          transform: none !important;
          box-shadow: none !important;
        }
        
        /* Fallback for backdrop-filter issues */
        @supports not (backdrop-filter: blur(1px)) {
          [style*="backdrop-filter"] {
            background-color: rgba(3, 1, 64, 0.95) !important;
          }
        }
        
        /* Reduce GPU-intensive effects */
        .screen-record-safe {
          will-change: auto !important;
          transform: translateZ(0) !important;
          backface-visibility: hidden !important;
        }
      `}</style>
      <Layout title="Dashboard - Sticker Shuttle">
      <div className={`min-h-screen ${recordingMode ? 'recording-mode' : ''}`}
           style={{
             background: '#030140',
             position: 'relative'
           }}>
        
        <div className="w-full relative z-10">
          {/* Recording Mode Indicator */}
          {recordingMode && (
            <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              🔴 RECORDING MODE
            </div>
          )}
          {/* Header Section */}
          <div className="pt-6 pb-6">
            <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto max-w-sm sm:max-w-md md:max-w-full">
              {/* Header - Mission Control */}
              <div 
                className="relative rounded-xl p-4 md:p-6 shadow-xl mb-6 overflow-hidden"
                style={{
                  backgroundImage: 'url(https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591761/Banner-Homepage_s0zlpx.jpg)',
                  backgroundSize: '120%',
                  backgroundPosition: 'right 10%',
                  backgroundRepeat: 'no-repeat',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    {/* Profile Picture Circle */}
                    <div 
                      className="w-16 h-16 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                      }}
                      onClick={handleProfilePictureClick}
                    >
                      {profile?.profile_picture_url ? (
                        <img 
                          src={profile.profile_picture_url} 
                          alt="Profile" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="text-white text-xl font-bold">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1"
                          style={{ fontFamily: 'Rubik, Inter, system-ui, -apple-system, sans-serif' }}>
                        Greetings, {getUserDisplayName()}
                      </h1>
                      <p className="text-sm text-gray-400">
                        Mission Control Dashboard
                      </p>
                    </div>
                  </div>
                  
                  {/* Settings Gear - Top Right */}
                  <Link 
                    href="/account/settings"
                    className="absolute top-0 right-0 p-2 rounded-lg transition-all duration-200 transform hover:scale-110 text-white"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                    title="Settings"
                  >
                    ⚙️
                  </Link>
                </div>
              </div>

              {/* Proof Alert Banner */}
              {sampleOrders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length > 0 && (
                <div 
                  className="rounded-xl p-4 shadow-xl mb-6 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(249, 115, 22, 0.3)',
                    boxShadow: '0 0 20px rgba(249, 115, 22, 0.2)'
                  }}
                  onClick={() => setCurrentView('proofs')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      <div>
                        <h3 className="text-orange-300 font-semibold text-sm">
                          ⚠️ Alert! You have {sampleOrders.filter(order => order.status === 'Proof Review Needed').length} proof(s) to approve
                        </h3>
                        <p className="text-orange-200 text-xs">
                          Click here to approve or request changes
                        </p>
                      </div>
                    </div>
                    <div className="text-orange-300 text-xl">
                      →
                    </div>
                  </div>
                </div>
              )}

              {/* Main Layout - Sidebar + Content */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar - Stats & Quick Actions */}
                <div className="lg:col-span-1 space-y-3">
                  {/* Primary Action - Start New Mission */}
                  <Link 
                    href="/products"
                    className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                      boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">🚀 Start New Mission</h4>
                        <p className="text-xs text-white/80">Create custom stickers</p>
                      </div>
                    </div>
                  </Link>

                  {/* Dashboard Button */}
                  <button 
                    onClick={() => setCurrentView('default')}
                    className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                    style={{
                      backgroundColor: currentView === 'default' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(20px)',
                      border: currentView === 'default' ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg"
                           style={{
                             background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                             boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
                           }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">📊 Dashboard</h4>
                        <p className="text-xs text-gray-300">Mission overview</p>
                      </div>
                    </div>
                  </button>

                  {/* Stats - Grid Layout for Mobile, Vertical for Desktop */}
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    <button 
                      onClick={() => setCurrentView('all-orders')}
                      className="block rounded-lg p-3 lg:p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left w-full"
                      style={{
                        backgroundColor: currentView === 'all-orders' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'all-orders' ? '2px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #10b981, #34d399)',
                               boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                             }}>
                          <svg className="w-4 lg:w-5 h-4 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Total Orders</h4>
                          <p className="text-xs text-gray-300">{sampleOrders.length} completed</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setCurrentView('active-orders')}
                      className="block rounded-lg p-3 lg:p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left w-full"
                      style={{
                        backgroundColor: currentView === 'active-orders' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'active-orders' ? '2px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                               boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
                             }}>
                          <svg className="w-4 lg:w-5 h-4 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Active Orders</h4>
                          <p className="text-xs text-gray-300">{sampleOrders.filter(order => order.status !== 'Delivered').length} in progress</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setCurrentView('financial')}
                      className="block rounded-lg p-3 lg:p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left w-full"
                      style={{
                        backgroundColor: currentView === 'financial' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'financial' ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                               boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                             }}>
                          <svg className="w-4 lg:w-5 h-4 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Total Spent</h4>
                          <p className="text-xs text-gray-300">${sampleOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)} invested</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setCurrentView('items-analysis')}
                      className="block rounded-lg p-3 lg:p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left w-full"
                      style={{
                        backgroundColor: currentView === 'items-analysis' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'items-analysis' ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="p-1.5 lg:p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                               boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
                             }}>
                          <svg className="w-4 lg:w-5 h-4 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs lg:text-sm truncate">Total Items</h4>
                          <p className="text-xs text-gray-300">{sampleOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)} stickers</p>
                        </div>
                      </div>
                    </button>

                    {/* Mobile Proof Review Button */}
                    <button 
                      onClick={() => setCurrentView('proofs')}
                      className="lg:hidden block rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left w-full relative"
                      style={{
                        backgroundColor: currentView === 'proofs' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'proofs' ? '2px solid rgba(249, 115, 22, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #f97316, #fb923c)',
                               boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)'
                             }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs truncate">Proof Review</h4>
                          <p className="text-xs text-gray-300">
                            {sampleOrders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length} pending
                          </p>
                        </div>
                      </div>
                      {sampleOrders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length > 0 && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  </div>

                  {/* Secondary Actions - Hidden on mobile, shown at bottom */}
                  <div className="hidden lg:block space-y-3">
                    <button 
                      onClick={() => setCurrentView('design-vault')}
                      className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                      style={{
                        backgroundColor: currentView === 'design-vault' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'design-vault' ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                               boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                             }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">🎨 Design Vault</h4>
                          <p className="text-xs text-gray-300">Manage designs</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={() => setCurrentView('proofs')}
                      className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                      style={{
                        backgroundColor: currentView === 'proofs' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'proofs' ? '2px solid rgba(249, 115, 22, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #f97316, #fb923c)',
                               boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)'
                             }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">🔍 Proofs</h4>
                          <p className="text-xs text-gray-300">Review designs</p>
                        </div>
                      </div>
                      {sampleOrders.filter(order => order.status === 'Proof Review Needed' || order.status === 'Reviewing Changes').length > 0 && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </button>

                    <button 
                      onClick={handleGetSupport}
                      className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #10b981, #34d399)',
                               boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                             }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">🛟 Get Support</h4>
                          <p className="text-xs text-gray-300">Contact ground crew</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={handleRaiseConcern}
                      className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #ef4444, #f87171)',
                               boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                             }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">⚠️ Raise a Concern</h4>
                          <p className="text-xs text-gray-300">Report an issue</p>
                        </div>
                      </div>
                    </button>

                    {/* Logout Button */}
                    <button 
                      onClick={handleLogout}
                      className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left mt-4 border-t border-white/10 pt-6"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #6b7280, #9ca3af)',
                               boxShadow: '0 4px 16px rgba(107, 114, 128, 0.3)'
                             }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">🚪 Log Out</h4>
                          <p className="text-xs text-gray-300">End session</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">
                  {renderMainContent()}
                </div>

                {/* Mobile Action Buttons - Bottom of page */}
                <div className="lg:hidden mt-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setCurrentView('design-vault')}
                      className="block rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                      style={{
                        backgroundColor: currentView === 'design-vault' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: currentView === 'design-vault' ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                               boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                             }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs whitespace-nowrap">🎨 Design Vault</h4>
                          <p className="text-xs text-gray-300 truncate">Manage designs</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      onClick={handleGetSupport}
                      className="block rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg"
                             style={{
                               background: 'linear-gradient(135deg, #10b981, #34d399)',
                               boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                             }}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs whitespace-nowrap">🛟 Get Support</h4>
                          <p className="text-xs text-gray-300 truncate">Contact ground crew</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <button 
                    onClick={handleRaiseConcern}
                    className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg"
                           style={{
                             background: 'linear-gradient(135deg, #ef4444, #f87171)',
                             boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
                           }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">⚠️ Raise a Concern</h4>
                        <p className="text-xs text-gray-300">Report an issue</p>
                      </div>
                    </div>
                  </button>

                  {/* Mobile Logout Button */}
                  <button 
                    onClick={handleLogout}
                    className="block rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full text-left mt-4 border-t border-white/10 pt-6"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg"
                           style={{
                             background: 'linear-gradient(135deg, #6b7280, #9ca3af)',
                             boxShadow: '0 4px 16px rgba(107, 114, 128, 0.3)'
                           }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">🚪 Log Out</h4>
                        <p className="text-xs text-gray-300">End session</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
               style={{
                 backgroundColor: 'rgba(3, 1, 64, 0.95)',
                 backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(255, 255, 255, 0.15)'
               }}>
            {contactSubmitted ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-2xl font-bold text-white mb-4">Message Sent!</h2>
                <p className="text-gray-300 mb-6">
                  Thanks for reaching out! Our ground crew will get back to you within 24 hours.
                </p>
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-gray-300">Closing automatically...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-2xl font-bold text-white">🛟 Ground Control Support</h2>
                  <button
                    onClick={() => setShowContactForm(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Close contact form"
                  >
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleContactSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={contactFormData.name}
                        onChange={handleContactChange}
                        required
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={contactFormData.email}
                        onChange={handleContactChange}
                        required
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={contactFormData.subject}
                      onChange={handleContactChange}
                      required
                      className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    >
                      <option value="" style={{ backgroundColor: '#030140', color: 'white' }}>Select a topic</option>
                      <option value="concern" style={{ backgroundColor: '#030140', color: 'white' }}>Raise a Concern</option>
                      <option value="order-issue" style={{ backgroundColor: '#030140', color: 'white' }}>Order Issue</option>
                      <option value="design-help" style={{ backgroundColor: '#030140', color: 'white' }}>Design Help</option>
                      <option value="shipping" style={{ backgroundColor: '#030140', color: 'white' }}>Shipping Question</option>
                      <option value="billing" style={{ backgroundColor: '#030140', color: 'white' }}>Billing Question</option>
                      <option value="technical" style={{ backgroundColor: '#030140', color: 'white' }}>Technical Support</option>
                      <option value="other" style={{ backgroundColor: '#030140', color: 'white' }}>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Related Order (Optional)
                    </label>
                    <div className="relative order-dropdown">
                      <button
                        type="button"
                        onClick={() => setShowOrderDropdown(!showOrderDropdown)}
                        className="w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <span className="text-left">
                          {contactFormData.relatedOrder ? 
                            (() => {
                              const selectedOrder = sampleOrders.find(order => order.id === contactFormData.relatedOrder);
                              return selectedOrder ? `${selectedOrder.id} - ${new Date(selectedOrder.date).toLocaleDateString()} - $${selectedOrder.total}` : 'Select an order (optional)';
                            })() : 
                            'Select an order (optional)'
                          }
                        </span>
                        <svg className={`w-5 h-5 transition-transform ${showOrderDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showOrderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto"
                             style={{
                               backgroundColor: 'rgba(3, 1, 64, 0.95)',
                               backdropFilter: 'blur(20px)',
                               border: '1px solid rgba(255, 255, 255, 0.15)'
                             }}>
                          <div className="p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setContactFormData(prev => ({ ...prev, relatedOrder: '' }));
                                setShowOrderDropdown(false);
                              }}
                              className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors"
                            >
                              <span className="text-gray-300">No specific order</span>
                            </button>
                            
                            {sampleOrders.map((order) => (
                              <button
                                key={order.id}
                                type="button"
                                onClick={() => {
                                  setContactFormData(prev => ({ ...prev, relatedOrder: order.id }));
                                  setShowOrderDropdown(false);
                                }}
                                className="w-full p-3 rounded-lg text-left hover:bg-white/10 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <img 
                                      src={order.items[0].image} 
                                      alt={order.items[0].name}
                                      className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-semibold text-white text-sm truncate">{order.id}</h4>
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                                        <span className="text-xs text-gray-300">{getStatusDisplayText(order.status)}</span>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-300 mb-1">
                                      {new Date(order.date).toLocaleDateString()} • ${order.total}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                      {order.items[0].name}
                                      {order.items.length > 1 && ` +${order.items.length - 1} more`}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={contactFormData.message}
                      onChange={handleContactChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                      placeholder="Tell us how we can help..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{
                        background: isSubmittingContact ? '#666' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        color: 'white'
                      }}
                    >
                      {isSubmittingContact ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          🚀 Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
    </>
  );
} 