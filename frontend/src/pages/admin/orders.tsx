import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import ProofUpload from '@/components/ProofUpload';
import ItemSpecificProofUpload from '@/components/ItemSpecificProofUpload';
import AIFileImage from '@/components/AIFileImage';
import EasyPostShipping from '@/components/EasyPostShipping';
import ShipOrderModal from '@/components/ShipOrderModal';
import AdditionalPaymentLink from '@/components/AdditionalPaymentLink';
import useInvoiceGenerator from '@/components/InvoiceGenerator';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import { CREATE_EASYPOST_SHIPMENT, BUY_EASYPOST_LABEL, GET_EASYPOST_LABEL } from '../../lib/easypost-mutations';
import { UPDATE_ORDER_SHIPPING_ADDRESS, MARK_ORDER_READY_FOR_PICKUP, MARK_ORDER_PICKED_UP } from '../../lib/order-mutations';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { GET_USER_PROFILE } from '../../lib/profile-mutations';


// GraphQL query to get all orders for admin
const GET_ALL_ORDERS = gql`
  query GetAllOrders {
    getAllOrders {
      id
      userId
      guestEmail
      stripePaymentIntentId
      stripeCheckoutSessionId
      orderNumber
      orderStatus
      fulfillmentStatus
      financialStatus
      trackingNumber
      trackingCompany
      trackingUrl
      subtotalPrice
      totalTax
      totalPrice
      currency
      customerFirstName
      customerLastName
      customerEmail
      customerPhone
      shippingAddress
      billingAddress
      shipping_method
      is_express_shipping
      is_rush_order
      is_blind_shipment
      orderTags
      orderNote
      orderCreatedAt
      orderUpdatedAt
      createdAt
      updatedAt
      proof_status
      proof_sent_at
      proof_link
      items {
        id
        customerOrderId
        stripeLineItemId
        productId
        productName
        productCategory
        sku
        quantity
        unitPrice
        totalPrice
        calculatorSelections
        customFiles
        customerNotes
        instagramHandle
        instagramOptIn
        fulfillmentStatus
        createdAt
        updatedAt
        customerReplacementFile
        customerReplacementFileName
        customerReplacementAt
        is_additional_payment
      }
      proofs {
        id
        orderItemId
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        status
        customerNotes
        adminNotes
        replaced
        replacedAt
        originalFileName
      }
    }
  }
`;

// Mutation to update order status
const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: ID!, $statusUpdate: OrderStatusInput!) {
    updateOrderStatus(orderId: $orderId, statusUpdate: $statusUpdate) {
      id
      orderStatus
      fulfillmentStatus
      financialStatus
      trackingNumber
      trackingCompany
      trackingUrl
    }
  }
`;

// Mutation to send proofs
const SEND_PROOFS = gql`
  mutation SendProofs($orderId: ID!) {
    sendProofs(orderId: $orderId) {
      id
      proof_status
      proof_sent_at
      proofs {
        id
        status
      }
    }
  }
`;

// Mutation to mark order as delivered
const MARK_ORDER_AS_DELIVERED = gql`
  mutation MarkOrderAsDelivered($orderId: ID!) {
    markOrderAsDelivered(orderId: $orderId) {
      id
      orderStatus
      fulfillmentStatus
      proof_status
      orderUpdatedAt
    }
  }
`;

// Admin check - add your admin email(s) here
const ADMIN_EMAILS = ['justin@stickershuttle.com']; // Add all admin emails here

// Helper function to check if an item is a sample pack
const isSamplePackItem = (item: any) => {
  return item.productId === 'sample-pack' || 
         item.sku === 'SS-Sample' ||
         item.productName?.toLowerCase().includes('sample pack') ||
         item.productCategory?.toLowerCase().includes('sample');
};

// Helper function to check if an order contains sample packs
const isSamplePackOrder = (order: Order) => {
  return order.items?.some(item => isSamplePackItem(item));
};

// Helper function to get product image with sample pack support
const getProductImage = (item: any) => {
  // Check for sample pack first
  if (isSamplePackItem(item)) {
    return 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750890354/Sample-Pack_jsy2yf.png';
  }
  
  // Check for custom files
  if (item.customFiles?.[0]) {
    return item.customFiles[0];
  }
  
  // No image available
  return null;
};

interface Order {
  id: string;
  userId?: string;
  guestEmail?: string;
  orderNumber?: string;
  orderStatus: string;
  fulfillmentStatus: string;
  financialStatus: string;
  trackingNumber?: string;
  trackingCompany?: string;
  trackingUrl?: string;
  easypostTrackerId?: string;
  estimatedDeliveryDate?: string;
  trackingDetails?: any;
  subtotalPrice?: number;
  totalTax?: number;
  totalPrice: number;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: any;
  billingAddress?: any;
  shipping_method?: string;
  is_express_shipping?: boolean;
  is_rush_order?: boolean;
  is_blind_shipment?: boolean;
  orderCreatedAt?: string;
  createdAt?: string;
  orderNote?: string;
  proof_status?: string;
  proof_sent_at?: string;
  proof_link?: string;
  items: Array<{
    id: string;
    productName: string;
    productCategory?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    calculatorSelections?: any;
    customFiles?: string[];
    customerNotes?: string;
    instagramHandle?: string;
    instagramOptIn?: boolean;
    customerReplacementFile?: string;
    customerReplacementFileName?: string;
    customerReplacementAt?: string;
    is_additional_payment?: boolean;
  }>;
  proofs?: Array<{
    id: string;
    orderItemId?: string;
    proofUrl: string;
    proofPublicId: string;
    proofTitle: string;
    uploadedAt: string;
    uploadedBy: string;
    status: string;
    customerNotes?: string;
    adminNotes?: string;
    replaced?: boolean;
    replacedAt?: string;
    originalFileName?: string;
  }>;
}

// Define column configuration
const defaultColumns = [
  { id: 'status', name: 'Status', width: 'pl-2 pr-3', align: 'left' }, // Reduced from pl-6
  { id: 'image', name: 'Image', width: 'px-2', align: 'left' }, // Reduced from px-3
  { id: 'total', name: 'Total', width: 'px-2', align: 'left' }, // Reduced from px-3
  { id: 'order', name: 'Order', width: 'px-2', align: 'left' }, // Reduced from px-3
  { id: 'customer', name: 'Customer', width: 'px-2', align: 'left' }, // Reduced from px-3
  { id: 'qty', name: 'QTY', width: 'px-2', align: 'left' }, // Reduced from px-3
  { id: 'items', name: 'Items', width: 'pl-2 pr-2', align: 'left' }, // Reduced from pl-4
  { id: 'shape', name: 'Shape', width: 'px-2', align: 'left' },
  { id: 'material', name: 'Material', width: 'px-2', align: 'left' },
  { id: 'size', name: 'Size', width: 'px-2', align: 'left' },
  { id: 'location', name: 'Location', width: 'px-2', align: 'left' },
  { id: 'shipping', name: 'Shipping', width: 'px-2', align: 'left' },
  { id: 'actions', name: 'Actions', width: 'px-4', align: 'center' } // Reduced from px-6
];

export default function AdminOrders() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [columns, setColumns] = useState(defaultColumns);
  const [timeFilter, setTimeFilter] = useState('mtd');  // '1' = today, '7' = last 7 days, 'mtd' = month to date, '30' = last 30 days, etc.
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('all');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: null as Date | null, end: null as Date | null });
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sendingProofs, setSendingProofs] = useState(false);
  const [proofsSent, setProofsSent] = useState<{ [key: string]: boolean }>({});
  const [newProofsCount, setNewProofsCount] = useState<{ [key: string]: number }>({});
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  const [showEasyPostModal, setShowEasyPostModal] = useState(false);
  const [easyPostOrder, setEasyPostOrder] = useState<Order | null>(null);
  const [ordersWithLabels, setOrdersWithLabels] = useState<Set<string>>(new Set());
  const [orderLabelUrls, setOrderLabelUrls] = useState<Map<string, string>>(new Map());
  const [customerProfiles, setCustomerProfiles] = useState<{[key: string]: any}>({});
  
  // Shipping address editing states
  const [editingShippingAddress, setEditingShippingAddress] = useState<Order | null>(null);
  const [shippingAddressForm, setShippingAddressForm] = useState({
    first_name: '',
    last_name: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: ''
  });
  const [shippingAddressLoading, setShippingAddressLoading] = useState(false);
  const [shippingAddressError, setShippingAddressError] = useState<string | null>(null);
  const [shippingAddressSuccess, setShippingAddressSuccess] = useState(false);

  // Ship order modal state
  const [showShipOrderModal, setShowShipOrderModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 25;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortColumn, sortDirection]);

  // Helper function to select an order and update URL
  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    const orderNumber = order.orderNumber || order.id.split('-')[0].toUpperCase();
    router.push(`/admin/orders/${orderNumber}`, undefined, { shallow: true });
  };

  // Helper function to go back to orders list
  const goBackToOrders = () => {
    setSelectedOrder(null);
    router.push('/admin/orders', undefined, { shallow: true });
  };

  // Get search term from URL params (set by header search)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const search = searchParams.get('search');
    if (search) {
      setSearchTerm(search);
    }
  }, []);

  const { data, loading: ordersLoading, error, refetch } = useQuery(GET_ALL_ORDERS);

  // Function to fetch customer profile
  const fetchCustomerProfile = async (userId: string) => {
    if (!userId || customerProfiles[userId]) return;
    
    try {
      const supabase = await getSupabase();
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileData && !error) {
        setCustomerProfiles(prev => ({
          ...prev,
          [userId]: profileData
        }));
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error);
    }
  };

  // Fetch customer profiles for selected order
  useEffect(() => {
    if (selectedOrder?.userId) {
      fetchCustomerProfile(selectedOrder.userId);
    }
  }, [selectedOrder?.userId]);

  // Handle selectedOrder parameter after data is loaded
  useEffect(() => {
    if (data?.getAllOrders) {
      const searchParams = new URLSearchParams(window.location.search);
      const selectedOrderParam = searchParams.get('selectedOrder');
      if (selectedOrderParam) {
        const order = data.getAllOrders.find((o: Order) => 
          (o.orderNumber && o.orderNumber === selectedOrderParam) || 
          o.id.split('-')[0].toUpperCase() === selectedOrderParam
        );
        if (order) {
          setSelectedOrder(order);
        }
      }
    }
  }, [data]);

  // Handle URL-based order selection when data loads
  useEffect(() => {
    if (data?.getAllOrders && !selectedOrder) {
      const pathSegments = router.asPath.split('/');
      const ordersIndex = pathSegments.indexOf('orders');
      if (ordersIndex !== -1 && pathSegments[ordersIndex + 1]) {
        const orderNumber = pathSegments[ordersIndex + 1];
        const order = data.getAllOrders.find((o: Order) => 
          (o.orderNumber && o.orderNumber === orderNumber) || 
          o.id.split('-')[0].toUpperCase() === orderNumber
        );
        if (order) {
          setSelectedOrder(order);
        }
      }
    }
  }, [data, router.asPath, selectedOrder]);
  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
  const [sendProofs] = useMutation(SEND_PROOFS);
  const [getEasyPostLabel] = useMutation(GET_EASYPOST_LABEL);
  const [markOrderAsDelivered, { loading: markingDelivered }] = useMutation(MARK_ORDER_AS_DELIVERED);
  const [markOrderReadyForPickup, { loading: markingReadyForPickup }] = useMutation(MARK_ORDER_READY_FOR_PICKUP);
  const [markOrderPickedUp, { loading: markingPickedUp }] = useMutation(MARK_ORDER_PICKED_UP);
  const [updateOrderShippingAddress] = useMutation(UPDATE_ORDER_SHIPPING_ADDRESS);

  // Calculate customer statistics
  const getCustomerStats = (customerEmail: string | undefined) => {
    if (!customerEmail || !data?.getAllOrders) {
      return { orderCount: 0, lifetimeValue: 0 };
    }

    const customerOrders = data.getAllOrders.filter((order: Order) => 
      order.customerEmail === customerEmail && order.financialStatus === 'paid'
    );

    const lifetimeValue = customerOrders.reduce((sum: number, order: Order) => 
      sum + order.totalPrice, 0
    );

    return {
      orderCount: customerOrders.length,
      lifetimeValue
    };
  };

  // Get order position for a customer
  const getOrderPosition = (order: Order) => {
    if (!order.customerEmail || !data?.getAllOrders) return 1;
    
    const customerOrders = data.getAllOrders
      .filter((o: Order) => o.customerEmail === order.customerEmail && o.financialStatus === 'paid')
      .sort((a: Order, b: Order) => {
        const dateA = new Date(a.orderCreatedAt || a.createdAt || '').getTime();
        const dateB = new Date(b.orderCreatedAt || b.createdAt || '').getTime();
        return dateA - dateB;
      });
    
    const position = customerOrders.findIndex((o: Order) => o.id === order.id) + 1;
    return position || 1;
  };

  // Parse shipping address to get city/state in format "Columbus, OH"
  const getShippingLocation = (shippingAddress: any) => {
    if (!shippingAddress) return 'N/A';
    
    try {
      // Handle both object and string formats
      let addressObj;
      if (typeof shippingAddress === 'string') {
        addressObj = JSON.parse(shippingAddress);
      } else {
        addressObj = shippingAddress;
      }
      
      const city = addressObj.city || addressObj.locality || '';
      const state = addressObj.state || addressObj.province || addressObj.region || '';
      
      if (city && state) {
        return `${city}, ${state.toUpperCase()}`;
      } else if (city) {
        return city;
      } else if (state) {
        return state.toUpperCase();
      }
      
      return 'N/A';
    } catch (error) {
      console.warn('Error parsing shipping address:', error);
      return 'N/A';
    }
  };





  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = getSupabase();
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
  }, []); // Remove router dependency to prevent loops

  // Filter and sort orders
  const allFilteredOrders = React.useMemo(() => {
    if (!data?.getAllOrders) return [];

    let orders = [...data.getAllOrders];

    // Filter to only show paid orders
    orders = orders.filter(order => order.financialStatus === 'paid');

    // Apply status filter
    if (filterStatus !== 'all') {
      orders = orders.filter(order => {
        switch (filterStatus) {
          case 'building':
            return !order.proof_status || order.proof_status === 'building' || order.proof_status === 'pending';
          case 'awaiting':
            return order.proof_status === 'awaiting_approval';
          case 'changes-requested':
            return order.proof_status === 'changes_requested';
          case 'printing':
            return order.orderStatus === 'Printing' || order.proof_status === 'approved';
          case 'approved':
            return order.proof_status === 'approved' || order.orderStatus === 'Printing';
          case 'label-printed':
            return order.proof_status === 'label_printed';
          case 'shipped':
            return order.proof_status === 'shipped' || (order.fulfillmentStatus === 'partial' && order.trackingNumber);
          case 'out-for-delivery':
            return order.orderStatus === 'Out for Delivery' || order.fulfillmentStatus === 'out_for_delivery';
          case 'delivered':
            return order.orderStatus === 'Delivered' || order.fulfillmentStatus === 'fulfilled';
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      orders = orders.filter(order =>
        order.orderNumber?.toLowerCase().includes(search) ||
        order.customerEmail?.toLowerCase().includes(search) ||
        order.customerFirstName?.toLowerCase().includes(search) ||
        order.customerLastName?.toLowerCase().includes(search) ||
        order.id.toLowerCase().includes(search)
      );
    }

    // Sort orders
    orders.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.orderCreatedAt || a.createdAt).getTime() -
            new Date(b.orderCreatedAt || b.createdAt).getTime();
          break;
        case 'status':
          comparison = getProofStatus(a).localeCompare(getProofStatus(b));
          break;
        case 'total':
          comparison = a.totalPrice - b.totalPrice;
          break;
        case 'order':
          const aOrderNum = a.orderNumber || a.id;
          const bOrderNum = b.orderNumber || b.id;
          comparison = aOrderNum.localeCompare(bOrderNum);
          break;
        case 'customer':
          const aCustomer = `${a.customerFirstName} ${a.customerLastName}`;
          const bCustomer = `${b.customerFirstName} ${b.customerLastName}`;
          comparison = aCustomer.localeCompare(bCustomer);
          break;
        case 'qty':
          const aQty = a.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          const bQty = b.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          comparison = aQty - bQty;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return orders;
  }, [data, filterStatus, searchTerm, sortBy, sortOrder]);

  // Calculate pagination values
  const totalOrders = allFilteredOrders.length;
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const filteredOrders = allFilteredOrders.slice(startIndex, endIndex);

  // Handle order status update
  const handleStatusUpdate = async (orderId: string, statusType: string, value: string) => {
    try {
      const statusUpdate: any = {};
      statusUpdate[statusType] = value;

      await updateOrderStatus({
        variables: {
          orderId: orderId,
          statusUpdate
        }
      });

      // Refetch orders to update the list
      refetch();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };



  // Format date with relative formatting
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Reset time to start of day for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    
    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return `Today at ${timeString}`;
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return `Yesterday at ${timeString}`;
    } else {
      // For all other dates, show the full date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'fulfilled':
      case 'complete':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'pending':
      case 'unfulfilled':
      case 'processing':
        return 'bg-yellow-900 bg-opacity-40 text-yellow-300';
      case 'cancelled':
      case 'failed':
        return 'bg-red-900 bg-opacity-40 text-red-300';
      default:
        return 'bg-gray-800 bg-opacity-40 text-gray-300';
    }
  };

  // Download file - Enhanced to force download with descriptive filename
  const handleDownloadFile = async (fileUrl: string, customerName?: string, productName?: string, quantity?: number, originalFileName?: string) => {
    try {
      // Extract original filename from URL if not provided
      const urlFileName = fileUrl.split('/').pop()?.split('?')[0] || 'design';
      const originalFile = originalFileName || urlFileName;
      
      // Get file extension
      const fileExtension = originalFile.includes('.') ? originalFile.split('.').pop() : 'jpg';
      
      // Create descriptive filename: CustomerName_ProductName_QTY_Source_OriginalFileName
      let descriptiveFileName = '';
      
      if (customerName) {
        // Clean customer name (remove spaces, special chars)
        const cleanCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '');
        descriptiveFileName += cleanCustomerName + '_';
      }
      
      if (productName) {
        // Clean product name (remove spaces, special chars)
        const cleanProductName = productName.replace(/[^a-zA-Z0-9]/g, '');
        descriptiveFileName += cleanProductName + '_';
      }
      
      if (quantity) {
        descriptiveFileName += quantity + '_';
      }
      
      descriptiveFileName += 'Source_';
      
      // Add original filename (without extension first, then add extension)
      const originalNameWithoutExt = originalFile.includes('.') ? originalFile.substring(0, originalFile.lastIndexOf('.')) : originalFile;
      const cleanOriginalName = originalNameWithoutExt.replace(/[^a-zA-Z0-9]/g, '');
      descriptiveFileName += cleanOriginalName;
      
      // Add extension
      if (fileExtension) {
        descriptiveFileName += '.' + fileExtension;
      }
      
      // For Cloudinary URLs, we can add fl_attachment to force download
      let downloadUrl = fileUrl;
      if (fileUrl.includes('cloudinary.com')) {
        // Add fl_attachment flag to force download
        downloadUrl = fileUrl.replace('/image/upload/', '/image/upload/fl_attachment/');
      }

      // Fetch the file as a blob to ensure download
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create blob URL and download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = descriptiveFileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
    } catch (error) {
      console.error('Download failed:', error);
      
      // Fallback to simple download method with descriptive name
      const fallbackFileName = originalFileName || fileUrl.split('/').pop()?.split('?')[0] || 'download';
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fallbackFileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => {
        setCopiedEmail(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Copy tracking info to clipboard
  const copyTrackingToClipboard = async (text: string, type: 'number' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTracking(type);
      setTimeout(() => {
        setCopiedTracking(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Helper function to guess carrier from tracking number format
  const guessCarrierFromTrackingNumber = (trackingNumber: string) => {
    const cleanTracking = trackingNumber.replace(/\s/g, '').toUpperCase();
    
    // UPS tracking patterns
    if (/^1Z[0-9A-Z]{16}$/.test(cleanTracking) || 
        /^[0-9]{18}$/.test(cleanTracking) ||
        /^T[0-9A-Z]{10}$/.test(cleanTracking)) {
      return 'UPS';
    }
    
    // FedEx tracking patterns
    if (/^[0-9]{12}$/.test(cleanTracking) ||
        /^[0-9]{14}$/.test(cleanTracking) ||
        /^[0-9]{15}$/.test(cleanTracking) ||
        /^[0-9]{20}$/.test(cleanTracking)) {
      return 'FEDEX';
    }
    
    // USPS tracking patterns
    if (/^[0-9]{20}$/.test(cleanTracking) ||
        /^[0-9]{13}$/.test(cleanTracking) ||
        /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(cleanTracking) ||
        /^[0-9A-Z]{13}$/.test(cleanTracking)) {
      return 'USPS';
    }
    
    return null;
  };

  // Create tracking URL based on carrier
  const getTrackingUrl = (trackingNumber: string, carrier?: string) => {
    const carrierGuess = carrier || guessCarrierFromTrackingNumber(trackingNumber);
    
    switch (carrierGuess?.toUpperCase()) {
      case 'UPS':
      case 'UPSDAP':
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      case 'FEDEX':
      case 'FEDEXDEFAULT':
        return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      case 'USPS':
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
      default:
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    }
  };

  // Handle view tracking
  const handleViewTracking = (order: Order) => {
    if (!order.trackingNumber) return;
    
    // Show tracking modal for selected order
    if (selectedOrder && selectedOrder.id === order.id) {
      setShowTrackingModal(true);
    } else {
      // For orders in the list, directly open tracking URL
      const trackingUrl = getTrackingUrl(order.trackingNumber, order.trackingCompany);
      if (trackingUrl) {
        window.open(trackingUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Handle track on carrier site
  const handleTrackOnCarrierSite = (order: Order) => {
    if (!order.trackingNumber) return;
    
    const trackingUrl = getTrackingUrl(order.trackingNumber, order.trackingCompany);
    if (trackingUrl) {
      window.open(trackingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Helper function to calculate additional payment amount
  const calculateAdditionalPaymentAmount = (order: Order) => {
    if (!order.items) return 0;
    
    return order.items
      .filter(item => item.is_additional_payment)
      .reduce((total, item) => total + (item.totalPrice || 0), 0);
  };

  // Helper function to get additional payment items
  const getAdditionalPaymentItems = (order: Order) => {
    if (!order.items) return [];
    
    return order.items.filter(item => item.is_additional_payment);
  };

  // Helper function to get original order items
  const getOriginalOrderItems = (order: Order) => {
    if (!order.items) return [];
    
    return order.items.filter(item => !item.is_additional_payment);
  };

  // Handle print order slip
  const handlePrintOrderSlip = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const orderNumber = order.orderNumber || order.id.split('-')[0].toUpperCase();
    const orderDate = formatDate(order.orderCreatedAt);
    const customerName = `${order.customerFirstName || ''} ${order.customerLastName || ''}`.trim();
    const customerEmail = order.customerEmail || '';
    
         // Calculate totals
     const subtotal = order.subtotalPrice || order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
     const taxAmount = order.totalTax || 0;
     const total = order.totalPrice || (subtotal + taxAmount);
    
         // Format address
     const formatAddress = (address: any) => {
       if (!address) return 'N/A';
       
       // Parse address if it's a JSON string
       let addressObj;
       try {
         if (typeof address === 'string') {
           addressObj = JSON.parse(address);
         } else {
           addressObj = address;
         }
       } catch (error) {
         console.warn('Error parsing address:', error);
         return 'N/A';
       }
       
       const parts = [];
       
       // Name
       if (addressObj.first_name || addressObj.last_name) {
         parts.push(`${addressObj.first_name || ''} ${addressObj.last_name || ''}`.trim());
       }
       
       // Company
       if (addressObj.company) parts.push(addressObj.company);
       
       // Address lines
       if (addressObj.address1) parts.push(addressObj.address1);
       if (addressObj.address2) parts.push(addressObj.address2);
       
       // City, state, zip
       const cityStateZip = [];
       if (addressObj.city) cityStateZip.push(addressObj.city);
       if (addressObj.state || addressObj.province) cityStateZip.push(addressObj.state || addressObj.province);
       if (addressObj.zip || addressObj.postal_code) cityStateZip.push(addressObj.zip || addressObj.postal_code);
       if (cityStateZip.length > 0) {
         parts.push(cityStateZip.join(', '));
       }
       
       // Country
       if (addressObj.country) parts.push(addressObj.country);
       
       // Phone
       if (addressObj.phone) parts.push(`Phone: ${addressObj.phone}`);
       
       return parts.filter(part => part && part.trim()).join('<br>');
     };
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Slip - ${orderNumber}</title>
                     <style>
             body {
               font-family: Arial, sans-serif;
               margin: 0;
               padding: 30px;
               line-height: 1.3;
               color: #333;
               font-size: 14px;
             }
             .header {
               text-align: center;
               border-bottom: 2px solid #333;
               padding-bottom: 15px;
               margin-bottom: 20px;
             }
             .company-name {
               font-size: 20px;
               font-weight: bold;
               color: #000;
             }
             .order-info {
               display: flex;
               justify-content: space-between;
               margin-bottom: 20px;
             }
             .order-details, .customer-info {
               flex: 1;
             }
             .order-details {
               margin-right: 20px;
             }
             .section-title {
               font-size: 14px;
               font-weight: bold;
               margin-bottom: 8px;
               color: #000;
               text-transform: uppercase;
               border-bottom: 1px solid #ddd;
               padding-bottom: 3px;
             }
             .items-table {
               width: 100%;
               border-collapse: collapse;
               margin: 15px 0;
               font-size: 12px;
             }
             .items-table th,
             .items-table td {
               border: 1px solid #ddd;
               padding: 6px;
               text-align: left;
               vertical-align: top;
             }
             .items-table th {
               background-color: #f5f5f5;
               font-weight: bold;
             }
             .totals {
               float: right;
               width: 250px;
               margin-top: 15px;
             }
             .total-line {
               display: flex;
               justify-content: space-between;
               padding: 4px 0;
               border-bottom: 1px solid #eee;
             }
             .total-line.final {
               font-weight: bold;
               font-size: 14px;
               border-bottom: 2px solid #333;
               border-top: 2px solid #333;
               margin-top: 8px;
               padding-top: 8px;
             }
             .addresses {
               display: flex;
               justify-content: space-between;
               margin-top: 20px;
             }
             .address-section {
               flex: 1;
               margin-right: 20px;
             }
             .address-section:last-child {
               margin-right: 0;
             }
             
             /* 8.5x11 Letter size */
             @media print {
               body { 
                 margin: 0; 
                 padding: 0.5in;
                 font-size: 12px;
               }
               .no-print { display: none; }
               .header {
                 margin-bottom: 15px;
                 padding-bottom: 10px;
               }
               .company-name {
                 font-size: 18px;
               }
               .order-info {
                 margin-bottom: 15px;
               }
               .items-table {
                 font-size: 10px;
                 margin: 10px 0;
               }
               .items-table th,
               .items-table td {
                 padding: 4px;
               }
               .totals {
                 width: 200px;
                 margin-top: 10px;
               }
               .addresses {
                 margin-top: 15px;
               }
             }
             
             /* 4x6 Photo/Postcard size */
             @media print and (max-width: 6in) and (max-height: 4.5in) {
               body { 
                 padding: 0.15in;
                 font-size: 7px;
                 line-height: 1.0;
               }
               .header {
                 margin-bottom: 4px;
                 padding-bottom: 3px;
                 border-bottom: 1px solid #333;
               }
               .company-name {
                 font-size: 10px;
               }
               .order-info {
                 margin-bottom: 4px;
                 display: block;
               }
               .order-details {
                 margin-right: 0;
                 margin-bottom: 4px;
               }
               .customer-info {
                 margin-bottom: 4px;
               }
               .section-title {
                 font-size: 8px;
                 margin-bottom: 2px;
                 padding-bottom: 1px;
                 border-bottom: 1px solid #ccc;
               }
               .items-table {
                 font-size: 6px;
                 margin: 3px 0;
               }
               .items-table th,
               .items-table td {
                 padding: 1px 2px;
                 border: 1px solid #ccc;
               }
               .items-table th {
                 font-size: 6px;
               }
               .totals {
                 width: 100%;
                 margin-top: 3px;
                 font-size: 7px;
                 clear: both;
                 float: none;
               }
               .total-line {
                 padding: 1px 0;
                 border-bottom: 1px solid #ddd;
               }
               .total-line.final {
                 font-size: 8px;
                 margin-top: 2px;
                 padding-top: 2px;
                 border-top: 1px solid #333;
                 border-bottom: 1px solid #333;
               }
               .addresses {
                 margin-top: 4px;
                 display: block;
               }
               .address-section {
                 margin-right: 0;
                 margin-bottom: 3px;
                 display: block;
               }
               .address-section .section-title {
                 font-size: 7px;
                 margin-bottom: 1px;
               }
               .address-section div {
                 font-size: 6px;
                 line-height: 1.1;
               }
               p {
                 margin: 1px 0;
                 font-size: 6px;
               }
               strong {
                 font-size: 6px;
               }
               /* Hide some elements to save space on 4x6 */
               .order-info p:nth-child(n+4) {
                 display: none;
               }
             }
           </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Sticker Shuttle</div>
            <div>Order Slip</div>
          </div>
          
          <div class="order-info">
            <div class="order-details">
                             <div class="section-title">Order Information</div>
               <p><strong>Order Number:</strong> ${orderNumber}</p>
               <p><strong>Order Date:</strong> ${orderDate}</p>
               ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
               ${order.trackingCompany ? `<p><strong>Carrier:</strong> ${order.trackingCompany}</p>` : ''}
            </div>
            
            <div class="customer-info">
              <div class="section-title">Customer Information</div>
              <p><strong>Name:</strong> ${customerName}</p>
              <p><strong>Email:</strong> ${customerEmail}</p>
              ${order.customerPhone ? `<p><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
            </div>
          </div>
          
          <div class="section-title">Order Items</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Specifications</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
                             ${order.items.map(item => {
                 const selections = item.calculatorSelections || {};
                 const extractValue = (key: string) => {
                   const value = selections[key];
                   return value && typeof value === 'object' ? value.label || value.value : value;
                 };
                 
                 return `
                 <tr>
                   <td>${item.productName}${item.is_additional_payment ? ' <span style="color: #fbbf24; font-weight: bold;">(Additional Payment)</span>' : ''}</td>
                   <td>
                     ${extractValue('size') ? `Size: ${extractValue('size')}<br>` : ''}
                     ${extractValue('material') ? `Material: ${extractValue('material')}<br>` : ''}
                     ${extractValue('finish') ? `Finish: ${extractValue('finish')}<br>` : ''}
                     ${extractValue('shape') ? `Shape: ${extractValue('shape')}<br>` : ''}
                     ${extractValue('cut') ? `Cut: ${extractValue('cut')}<br>` : ''}
                     ${item.customerNotes ? `Notes: ${item.customerNotes}` : ''}
                   </td>
                   <td>${item.quantity}</td>
                   <td>$${item.unitPrice.toFixed(2)}</td>
                   <td>$${item.totalPrice.toFixed(2)}</td>
                 </tr>
                 `;
               }).join('')}
            </tbody>
          </table>
          
          <div class="totals">
                         <div class="total-line">
               <span>Subtotal:</span>
               <span>$${subtotal.toFixed(2)}</span>
             </div>
             ${taxAmount > 0 ? `
               <div class="total-line">
                 <span>Tax:</span>
                 <span>$${taxAmount.toFixed(2)}</span>
               </div>
             ` : ''}
             <div class="total-line final">
               <span>Total:</span>
               <span>$${total.toFixed(2)}</span>
             </div>
          </div>
          
          <div style="clear: both;"></div>
          
          <div class="addresses">
            <div class="address-section">
              <div class="section-title">Billing Address</div>
              <div>${formatAddress(order.billingAddress)}</div>
            </div>
            
            <div class="address-section">
              <div class="section-title">Shipping Address</div>
              <div>${formatAddress(order.shippingAddress)}</div>
            </div>
          </div>
          
          
          
          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Print after content loads
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  // Get proof status (updated with shipping statuses)
  const getProofStatus = (order: Order) => {
    // Check if this is a sample pack order (skip proof system)
    if (isSamplePackOrder(order)) {
      if (order.orderStatus === 'Assume Delivered' || order.fulfillmentStatus === 'fulfilled') {
        return 'Delivered';
      }
      if (order.orderStatus === 'Shipped' || order.proof_status === 'shipped' || (order.fulfillmentStatus === 'partial' && order.trackingNumber)) {
        return 'Shipped';
      }
      // Default sample pack status is packaging
      return 'Packaging';
    }

    // Regular orders (non-sample pack) - existing proof system
    // Check for orders that skip proofs and go directly to printing
    if (order.orderStatus === 'Printing') {
      return 'Printing';
    }
    // Check the actual proof_status from the database
    if (order.proof_status === 'awaiting_approval') {
      return 'Awaiting Approval';
    }
    if (order.proof_status === 'approved') {
      // Check if label has been created
      if (order.trackingNumber && !order.proof_status?.includes('shipped')) {
        return 'Label Printed';
      }
      return 'Printing';
    }
    if (order.proof_status === 'label_printed') {
      return 'Label Printed';
    }
    if (order.proof_status === 'shipped' || (order.fulfillmentStatus === 'partial' && order.trackingNumber)) {
      return 'Shipped';
    }
    if (order.proof_status === 'delivered' || order.orderStatus === 'Delivered' || order.fulfillmentStatus === 'fulfilled') {
      return 'Delivered';
    }
    if (order.orderStatus === 'Out for Delivery' || order.fulfillmentStatus === 'out_for_delivery') {
      return 'Out for Delivery';
    }
    if (order.proof_status === 'changes_requested') {
      return 'Changes Requested';
    }
    // Default to building proof
    return 'Building Proof';
  };

  // Get proof status color
  const getProofStatusColor = (status: string) => {
    switch (status) {
      case 'Building Proof':
        return 'bg-yellow-900 bg-opacity-40 text-yellow-300';
      case 'Awaiting Approval':
        return 'bg-orange-900 bg-opacity-40 text-orange-300';
      case 'Printing':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'Packaging':
        return 'bg-blue-900 bg-opacity-40 text-blue-300';
      case 'Proof Approved':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'Label Printed':
        return 'bg-blue-900 bg-opacity-40 text-blue-300';
      case 'Shipped':
        return 'bg-purple-900 bg-opacity-40 text-purple-300';
      case 'Out for Delivery':
        return 'bg-indigo-900 bg-opacity-40 text-indigo-300';
      case 'Delivered':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'Changes Requested':
        return 'bg-amber-900 bg-opacity-40 text-amber-300';
      default:
        return 'bg-gray-800 bg-opacity-40 text-gray-300';
    }
  };

  // Get LED glow color for status indicators
  const getLEDGlowColor = (status: string) => {
    switch (status) {
      case 'Building Proof':
        return '#fcd34d'; // yellow-300
      case 'Awaiting Approval':
        return '#fdba74'; // orange-300
      case 'Printing':
        return '#86efac'; // green-300
      case 'Packaging':
        return '#93c5fd'; // blue-300
      case 'Proof Approved':
        return '#86efac'; // green-300
      case 'Label Printed':
        return '#93c5fd'; // blue-300
      case 'Shipped':
        return '#c4b5fd'; // purple-300
      case 'Out for Delivery':
        return '#a5b4fc'; // indigo-300
      case 'Delivered':
        return '#86efac'; // green-300
      case 'Changes Requested':
        return '#fcd34d'; // amber-300
      default:
        return '#d1d5db'; // gray-300
    }
  };

  // Convert hex color to 5% opacity rgba for row background
  const getRowBackgroundColor = (status: string) => {
    const hexColor = getLEDGlowColor(status);
    
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Return rgba with 5% opacity
    return `rgba(${r}, ${g}, ${b}, 0.07)`;
  };

  const getStatusBorderColor = (status: string) => {
    return getLEDGlowColor(status);
  };

  const isDeliveredOrder = (status: string) => {
    return status === 'Delivered' || status === 'Shipped' || status === 'Label Printed';
  };



  // Group items by product name and sum quantities
  const groupItemsByProduct = (items: Order['items']) => {
    const grouped = items.reduce((acc, item) => {
      const key = item.productName;
      if (!acc[key]) {
        acc[key] = { ...item, totalQuantity: 0, hasAdditionalPayment: false };
      }
      acc[key].totalQuantity += item.quantity;
      // If any item in this group is an additional payment, mark the group
      if (item.is_additional_payment) {
        acc[key].hasAdditionalPayment = true;
      }
      return acc;
    }, {} as Record<string, Order['items'][0] & { totalQuantity: number; hasAdditionalPayment: boolean }>);
    
    return Object.values(grouped);
  };

  // Handle column sorting
  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Handle send proofs
  const handleSendProofs = async (orderId: string) => {
    setSendingProofs(true);
    try {
      await sendProofs({
        variables: { orderId: orderId }
      });
      
      // Update state to show proofs were sent
      setProofsSent(prev => ({ ...prev, [orderId]: true }));
      
      // Reset new proofs count since they've been sent
      setNewProofsCount(prev => ({ ...prev, [orderId]: 0 }));
      
      // Refetch to update proof status
      refetch();
      
    } catch (error) {
      console.error('Error sending proofs:', error);
      alert('Failed to send proofs. Please try again.');
    } finally {
      setSendingProofs(false);
    }
  };

  // Handle mark as delivered
  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      await markOrderAsDelivered({
        variables: { orderId: orderId }
      });
      
      // Refetch to update order status
      refetch();
      
      // Show success message
      alert('Order marked as delivered successfully! Customer will receive an email notification.');
      
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      alert('Failed to mark order as delivered. Please try again.');
    }
  };

  // Handle mark as ready for pickup
  const handleMarkAsReadyForPickup = async (orderId: string) => {
    try {
      await markOrderReadyForPickup({
        variables: { orderId: orderId }
      });
      
      // Refetch to update order status
      refetch();
      
      // Show success message
      alert('Order marked as ready for pickup! Customer will receive an email notification with pickup instructions.');
      
    } catch (error) {
      console.error('Error marking order as ready for pickup:', error);
      alert('Failed to mark order as ready for pickup. Please try again.');
    }
  };

  // Handle mark as picked up
  const handleMarkAsPickedUp = async (orderId: string) => {
    try {
      await markOrderPickedUp({
        variables: { orderId: orderId }
      });
      
      // Refetch to update order status
      refetch();
      
      // Show success message
      alert('Order marked as picked up! Customer will receive a pickup confirmation email.');
      
    } catch (error) {
      console.error('Error marking order as picked up:', error);
      alert('Failed to mark order as picked up. Please try again.');
    }
  };

  // Handle opening shipping address edit modal
  const handleEditShippingAddress = (order: Order) => {
    setEditingShippingAddress(order);
    
    // Pre-populate form with existing address data
    const shippingAddr = order.shippingAddress || {};
    setShippingAddressForm({
      first_name: shippingAddr.first_name || order.customerFirstName || '',
      last_name: shippingAddr.last_name || order.customerLastName || '',
      company: shippingAddr.company || '',
      address1: shippingAddr.address1 || shippingAddr.line1 || '',
      address2: shippingAddr.address2 || shippingAddr.line2 || '',
      city: shippingAddr.city || '',
      state: shippingAddr.state || shippingAddr.province || '',
      zip: shippingAddr.zip || shippingAddr.postal_code || '',
      country: shippingAddr.country || 'US',
      phone: shippingAddr.phone || order.customerPhone || ''
    });
    
    setShippingAddressError(null);
    setShippingAddressSuccess(false);
  };

  // Handle saving shipping address
  const handleSaveShippingAddress = async () => {
    if (!editingShippingAddress) return;

    setShippingAddressLoading(true);
    setShippingAddressError(null);

    try {
      const result = await updateOrderShippingAddress({
        variables: {
          orderId: editingShippingAddress.id,
          shippingAddress: shippingAddressForm
        }
      });

      if (result.data?.updateOrderShippingAddress?.success) {
        setShippingAddressSuccess(true);
        // Refresh the orders list to show updated address
        await refetch();
        
        // Close modal after a short delay to show success
        setTimeout(() => {
          setEditingShippingAddress(null);
          setShippingAddressSuccess(false);
        }, 1000);
      } else {
        setShippingAddressError(result.data?.updateOrderShippingAddress?.message || 'Failed to update shipping address');
      }
    } catch (error) {
      console.error('Error updating shipping address:', error);
      setShippingAddressError('An error occurred while updating the shipping address');
    } finally {
      setShippingAddressLoading(false);
    }
  };

  // Handle closing shipping address edit modal
  const handleCloseShippingModal = () => {
    setEditingShippingAddress(null);
    setShippingAddressForm({
      first_name: '',
      last_name: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      phone: ''
    });
    setShippingAddressError(null);
    setShippingAddressSuccess(false);
  };



  // Get filtered orders based on time range
  const getFilteredOrdersByTime = (orders: Order[], days: string) => {
    if (!orders) return [];
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (days) {
      case '1':
        // Today
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case '7':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'mtd':
        // Month to date - first day of current month
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case '30':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '365':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return orders;
    }
    
    return orders.filter(order => {
      const orderDate = new Date(order.orderCreatedAt || order.createdAt || '');
      return orderDate >= cutoffDate;
    });
  };

  // Generate chart data
  const generateChartData = (orders: Order[], days: string) => {
    if (!orders.length) return [];

    let startDate: Date;
    let endDate = new Date();
    
    if (days === 'mtd') {
      // Start from the first day of the current month
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    } else {
      // For other time periods, calculate based on days
      const daysNum = parseInt(days);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - (daysNum - 1));
      startDate.setHours(0, 0, 0, 0);
    }

    // Create array of dates from start to end
    const dateArray = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Map dates to sales data
    return dateArray.map(date => {
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.orderCreatedAt || order.createdAt || '');
        return orderDate.toDateString() === date.toDateString();
      });

      const totalSales = dayOrders.reduce((sum, order) => sum + order.totalPrice, 0);

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: totalSales
      };
    });
  };

  // Get time filter label
  const getTimeFilterLabel = (days: string) => {
    switch (days) {
      case '1': return 'Today';
      case '7': return 'Last 7 days';
      case 'mtd': return 'Month to date';
      case '30': return 'Last 30 days';
      case '90': return 'Last 90 days';
      case '365': return 'Last 365 days';
      default: return 'All time';
    }
  };

  // Calculate analytics for time-filtered data
  const timeFilteredAnalytics = useMemo(() => {
    if (!data?.getAllOrders) return null;
    
    const allOrders = data.getAllOrders.filter((order: Order) => order.financialStatus === 'paid');
    const filteredOrders = getFilteredOrdersByTime(allOrders, timeFilter);
    
    const totalSales = filteredOrders.reduce((sum: number, order: Order) => sum + order.totalPrice, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalStickers = filteredOrders.reduce((total: number, order: any) => 
      total + (order.items?.reduce((itemTotal: number, item: any) => itemTotal + (item.quantity || 0), 0) || 0), 0
    );
    
    const chartData = generateChartData(allOrders, timeFilter);
    
    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      totalStickers,
      chartData
    };
  }, [data, timeFilter]);



    if (loading || !isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <style jsx global>{`
        .table-row-hover {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .table-row-hover:hover {
          background-color: rgba(3, 1, 64, 0.6) !important;
        }
        
        .sort-indicator {
          transition: all 0.2s ease;
        }
        
        .filter-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        
        details summary::-webkit-details-marker {
          display: none;
        }
        
        details summary {
          list-style: none;
        }
        
        details summary::after {
          content: '';
          display: inline-block;
          width: 0.5rem;
          height: 0.5rem;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: rotate(45deg);
          transition: transform 0.2s;
          margin-left: 0.5rem;
        }
        
        details[open] summary::after {
          transform: rotate(-135deg);
        }
        
        /* Hide scrollbar for filter pills */
        .filter-pills-container {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        
        .filter-pills-container::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
        
        @media (max-width: 768px) {
          .mobile-order-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset;
            backdrop-filter: blur(12px);
          }
          
          .mobile-order-card:active {
            transform: scale(0.98);
          }
        }
      `}</style>
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        {/* Main Content */}
        <div className="pt-8 pb-8">
          <div className="w-full pl-2 pr-8"> {/* Reduced left padding, keep right padding */}
            {!selectedOrder ? (
              // Orders List View
              <>
                {/* Time Filter Buttons/Dropdown */}
                <div className="mb-6">
                  {/* Desktop Filter Buttons */}
                  <div className="hidden lg:flex flex-wrap gap-2 justify-center lg:justify-start">
                    <button
                      onClick={() => setTimeFilter('1')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeFilter === '1'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: timeFilter === '1' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${timeFilter === '1' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: timeFilter === '1' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setTimeFilter('7')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeFilter === '7'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: timeFilter === '7' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${timeFilter === '7' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: timeFilter === '7' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Last 7 days
                    </button>
                    <button
                      onClick={() => setTimeFilter('mtd')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeFilter === 'mtd'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: timeFilter === 'mtd' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${timeFilter === 'mtd' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: timeFilter === 'mtd' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Month to date
                    </button>
                    <button
                      onClick={() => setTimeFilter('30')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeFilter === '30'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: timeFilter === '30' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${timeFilter === '30' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: timeFilter === '30' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Last 30 days
                    </button>
                    <button
                      onClick={() => setTimeFilter('90')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeFilter === '90'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: timeFilter === '90' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${timeFilter === '90' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: timeFilter === '90' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Last 90 days
                    </button>
                    <button
                      onClick={() => setTimeFilter('365')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeFilter === '365'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: timeFilter === '365' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${timeFilter === '365' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: timeFilter === '365' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Last year
                    </button>
                  </div>
                  
                  {/* Mobile Filter Dropdown */}
                  <div className="lg:hidden relative">
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="w-full px-4 py-3 pr-10 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                      aria-label="Select time filter"
                    >
                      <option value="1" style={{ backgroundColor: '#030140' }}>Today</option>
                      <option value="7" style={{ backgroundColor: '#030140' }}>Last 7 days</option>
                      <option value="mtd" style={{ backgroundColor: '#030140' }}>Month to date</option>
                      <option value="30" style={{ backgroundColor: '#030140' }}>Last 30 days</option>
                      <option value="90" style={{ backgroundColor: '#030140' }}>Last 90 days</option>
                      <option value="365" style={{ backgroundColor: '#030140' }}>Last year</option>
                    </select>
                    <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Analytics Cards - Mobile: 2x2 Grid, Desktop: 1x4 Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4">
                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total Sales</span>
                      </div>
                      <div className="text-sm lg:text-xl font-bold mb-1" style={{ color: '#86efac' }}>
                        {formatCurrency(timeFilteredAnalytics?.totalSales || 0)}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Revenue generated</div>
                    </div>

                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Average Order</span>
                      </div>
                      <div className="text-sm lg:text-xl font-bold text-white mb-1">
                        {formatCurrency(timeFilteredAnalytics?.avgOrderValue || 0)}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Per order value</div>
                    </div>

                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Orders</span>
                      </div>
                      <div className="text-sm lg:text-xl font-bold text-white mb-1">
                        {timeFilteredAnalytics?.totalOrders || 0}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Total orders placed</div>
                    </div>

                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Stickers</span>
                      </div>
                      <div className="text-sm lg:text-xl font-bold text-white mb-1">
                        {(timeFilteredAnalytics?.totalStickers || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Stickers produced</div>
                    </div>
                  </div>

                {/* Mobile/Tablet Filters */}
                <div className="xl:hidden mb-3">
                  <div 
                    className="p-3 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {/* Filter pills */}
                    <div className="flex gap-2 overflow-x-auto pb-2 filter-pills-container">
                    <button 
                      onClick={() => setFilterStatus('all')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'all' 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setFilterStatus('building')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'building' 
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Building
                    </button>
                    <button 
                      onClick={() => setFilterStatus('awaiting')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'awaiting' 
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Awaiting
                    </button>
                    <button 
                      onClick={() => setFilterStatus('changes-requested')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'changes-requested' 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Changes Requested
                    </button>
                    <button 
                      onClick={() => setFilterStatus('printing')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'printing' 
                          ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Printing
                    </button>
                    <button 
                      onClick={() => setFilterStatus('approved')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'approved' 
                          ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Approved
                    </button>
                    <button 
                      onClick={() => setFilterStatus('label-printed')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'label-printed' 
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Label Printed
                    </button>
                    <button 
                      onClick={() => setFilterStatus('shipped')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'shipped' 
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Shipped
                    </button>
                    <button 
                      onClick={() => setFilterStatus('out-for-delivery')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'out-for-delivery' 
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Out for Delivery
                    </button>
                    <button 
                      onClick={() => setFilterStatus('delivered')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'delivered' 
                          ? 'bg-green-600/20 text-green-400 border-green-600/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Delivered
                    </button>
                    </div>
                  </div>
                </div>

                {/* Desktop Compact Filters */}
                <div className="hidden xl:flex justify-end items-center gap-3 mb-3">
                  {/* Status Filter Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === 'all'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: filterStatus === 'all' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${filterStatus === 'all' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: filterStatus === 'all' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterStatus('building')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === 'building'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: filterStatus === 'building' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${filterStatus === 'building' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: filterStatus === 'building' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Building
                    </button>
                    <button
                      onClick={() => setFilterStatus('awaiting')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === 'awaiting'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: filterStatus === 'awaiting' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${filterStatus === 'awaiting' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: filterStatus === 'awaiting' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Awaiting
                    </button>
                    <button
                      onClick={() => setFilterStatus('changes-requested')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === 'changes-requested'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: filterStatus === 'changes-requested' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${filterStatus === 'changes-requested' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: filterStatus === 'changes-requested' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Changes Requested
                    </button>
                    <button
                      onClick={() => setFilterStatus('printing')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === 'printing'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: filterStatus === 'printing' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${filterStatus === 'printing' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: filterStatus === 'printing' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Printing
                    </button>
                    <button
                      onClick={() => setFilterStatus('shipped')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === 'shipped'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      style={{
                        background: filterStatus === 'shipped' 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: `1px solid ${filterStatus === 'shipped' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: filterStatus === 'shipped' 
                          ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                          : 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset'
                      }}
                    >
                      Shipped
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent border border-white/20 rounded-xl px-4 py-2 pl-10 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
                      style={{ minWidth: '200px' }}
                    />
                    <svg className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Mobile/Tablet Orders List */}
                <div className="xl:hidden">
                  {/* Date Groups */}
                  {(() => {
                    // Group orders by date
                    const ordersByDate = filteredOrders.reduce((groups: any, order: Order) => {
                      const date = new Date(order.orderCreatedAt || order.createdAt || '');
                      const dateKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                      if (!groups[dateKey]) groups[dateKey] = [];
                      groups[dateKey].push(order);
                      return groups;
                    }, {});

                    return Object.entries(ordersByDate).map(([date, orders]: [string, any]) => (
                      <div key={date}>
                        <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">{date}</h3>
                        <div className="bg-black/20 border-y border-gray-700/50">
                          {orders.map((order: Order, orderIndex: number) => {
                            const firstItem = order.items[0] || {};
                            const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                            const itemImage = getProductImage(firstItem);
                            const proofStatus = getProofStatus(order);
                            
                            return (
                              <div
                                key={order.id}
                                onClick={() => selectOrder(order)}
                                className="flex items-center px-4 py-4 cursor-pointer active:bg-white/5 transition-colors"
                                style={{
                                  borderBottom: orderIndex < orders.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                                  borderLeft: `4px solid ${getStatusBorderColor(getProofStatus(order))}`,
                                  backgroundColor: isDeliveredOrder(getProofStatus(order)) ? 'rgba(0, 0, 0, 0.6)' : 'transparent'
                                }}
                              >
                                {/* Design Image */}
                                <div className="flex-shrink-0 mr-3">
                                  <div
                                    className="rounded-lg overflow-hidden flex items-center justify-center"
                                    style={{
                                      width: '64px',
                                      height: '64px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                  >
                                    {itemImage ? (
                                      <img
                                        src={itemImage}
                                        alt="Design preview"
                                        className="w-full h-full object-contain p-2"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Order Info */}
                                <div className="flex-1 min-w-0">
                                  {/* First Row: Order Number & Amount */}
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-base font-semibold text-white truncate mr-2">
                                      #{order.orderNumber || order.id.split('-')[0].toUpperCase()}
                                    </span>
                                    <span className="text-lg font-bold flex-shrink-0" style={{ color: '#86efac' }}>
                                      {formatCurrency(order.totalPrice)}
                                    </span>
                                  </div>
                                  
                                  {/* Second Row: Customer & Details */}
                                  <div className="flex items-center text-sm text-gray-300 mb-2 flex-wrap">
                                    <span className="truncate mr-1">
                                      {order.customerFirstName} {order.customerLastName}
                                    </span>
                                    <span className="text-gray-500 mx-1">•</span>
                                    <span className="text-gray-400 whitespace-nowrap">
                                      {totalQuantity} item{totalQuantity !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-gray-500 mx-1">•</span>
                                    <span className="text-gray-400 whitespace-nowrap">
                                      {new Date(order.orderCreatedAt || order.createdAt || '').toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                      })}
                                    </span>
                                  </div>
                                  
                                  {/* Third Row: Status & Action */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProofStatusColor(proofStatus)}`}>
                                        {proofStatus}
                                      </span>
                                    </div>
                                    

                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                  
                  {/* Empty State */}
                  {filteredOrders.length === 0 && (
                    <div className="text-center py-12 px-4">
                      <div className="text-gray-400">
                        <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h3 className="text-lg font-medium text-white mb-1">No orders found</h3>
                        <p className="text-sm">Try adjusting your filters or search terms</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Orders Table */}
                <div className="hidden xl:block rounded-2xl overflow-hidden glass-container">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead
                        className="border-b border-gray-700 sticky top-0 z-20"
                        style={{
                          background: 'rgba(3, 1, 64, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <tr>
                          <th
                            onClick={() => handleColumnSort('status')}
                            className="pl-6 pr-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              Status
                              {sortColumn === 'status' && (
                                <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </div>
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Image
                          </th>
                          <th
                            onClick={() => handleColumnSort('order')}
                            className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              Order
                              {sortColumn === 'order' && (
                                <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleColumnSort('customer')}
                            className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              Customer
                              {sortColumn === 'customer' && (
                                <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleColumnSort('total')}
                            className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              Total
                              {sortColumn === 'total' && (
                                <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleColumnSort('qty')}
                            className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              QTY
                              {sortColumn === 'qty' && (
                                <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </div>
                          </th>
                          <th className="pl-4 pr-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Shape
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider max-w-32">
                            Material
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Shipping
                          </th>

                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          // Get first item's image for preview with sample pack support
                          const firstItemImage = getProductImage(order.items[0]);
                          const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

                          // Get first item's selections for columns
                          const firstItem = order.items[0] || {};
                          const firstItemSelections = firstItem.calculatorSelections || {};
                          const firstItemSize = firstItemSelections.size || firstItemSelections.sizePreset || {};

                          return (
                            <tr
                              key={order.id}
                              className="cursor-pointer table-row-hover"
                              style={{
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeft: `4px solid ${getStatusBorderColor(getProofStatus(order))}`,
                                backgroundColor: isDeliveredOrder(getProofStatus(order)) ? 'rgba(0, 0, 0, 0.25)' : 'transparent'
                              }}
                              onClick={() => selectOrder(order)}
                            >
                              {/* Status */}
                              <td className="pl-6 pr-3 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="rounded-full"
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      minWidth: '8px',
                                      minHeight: '8px',
                                      backgroundColor: getLEDGlowColor(getProofStatus(order)),
                                      position: 'relative',
                                      zIndex: 10
                                    }}
                                  ></div>
                                  <span className="text-xs text-gray-300 font-medium">{getProofStatus(order)}</span>
                                </div>
                              </td>
                              {/* Image Preview */}
                              <td className="px-3 py-4">
                                <div className="flex gap-2">
                                  {order.items.slice(0, 2).map((item: {
                                    id: string;
                                    productName: string;
                                    productCategory?: string;
                                    sku?: string;
                                    quantity: number;
                                    unitPrice: number;
                                    totalPrice: number;
                                    calculatorSelections?: any;
                                    customFiles?: string[];
                                    customerNotes?: string;
                                    instagramHandle?: string;
                                    instagramOptIn?: boolean;
                                    customerReplacementFile?: string;
                                    customerReplacementFileName?: string;
                                    customerReplacementAt?: string;
                                  }, index: number) => {
                                    // Get the full item data with images using helper function
                                    const itemImage = getProductImage(item);
                                    
                                    return (
                                      <div key={`preview-${item.id}-${index}`} className="flex-shrink-0">
                                        <div
                                          className="rounded-lg relative overflow-hidden flex items-center justify-center"
                                          style={{
                                            width: '40px',
                                            height: '40px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)'
                                          }}
                                        >
                                          {itemImage ? (
                                            <AIFileImage
                                              src={itemImage}
                                              filename={itemImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                              alt="Design preview"
                                              className="w-full h-full object-contain p-2"
                                              size="thumbnail"
                                              showFileType={false}
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                              <span className="text-gray-500 text-xs">📄</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {/* Only show additional count if there are more than 2 items */}
                                  {order.items.length > 2 && (
                                    <div 
                                      className="flex items-center justify-center rounded-lg text-gray-400 text-xs font-medium"
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                      }}
                                    >
                                      +{order.items.length - 2}
                                    </div>
                                  )}
                                </div>
                              </td>
                              {/* Order Info */}
                              <td className="px-3 py-4">
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    {order.orderNumber || `#${order.id.split('-')[0].toUpperCase()}`}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {formatDate(order.orderCreatedAt)}
                                  </div>
                                </div>
                              </td>
                              {/* Customer Info */}
                              <td className="px-3 py-4">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {order.customerFirstName} {order.customerLastName}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 relative">
                                    <span className="text-xs text-gray-400">{order.customerEmail}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(order.customerEmail || '');
                                      }}
                                      className="text-gray-400 hover:text-white transition-colors"
                                      title="Copy email"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                    {copiedEmail === order.customerEmail && (
                                      <span
                                        className="absolute left-0 bottom-full mb-1 text-xs text-green-400 bg-gray-900 px-2 py-1 rounded"
                                        style={{
                                          opacity: 0.9,
                                          transition: 'opacity 0.3s ease-in-out',
                                          pointerEvents: 'none'
                                        }}
                                      >
                                        Copied
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* Total */}
                              <td className="px-3 py-4">
                                <div className="text-base font-semibold" style={{ color: '#86efac' }}>
                                  {formatCurrency(order.totalPrice)}
                                </div>
                              </td>
                              {/* Quantity */}
                              <td className="px-3 py-4">
                                <div className="text-base text-white">
                                  {totalQuantity}
                                </div>
                              </td>
                              {/* Items */}
                              <td className="pl-4 pr-2 py-4">
                                <div className="space-y-1">
                                  {groupItemsByProduct(order.items).map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-purple-300"
                                        style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                                        {item.productName} {item.totalQuantity > 1 ? `x${item.totalQuantity}` : ''}
                                      </span>
                                      {/* Show additional payment badge if any items in this group are additional payments */}
                                      {item.hasAdditionalPayment && (
                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30">
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                          </svg>
                                          +$
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              {/* Shape */}
                              <td className="px-2 py-4">
                                {firstItemSelections.cut?.displayValue ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-300"
                                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                    {firstItemSelections.cut.displayValue}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              {/* Material */}
                              <td className="px-2 py-4 max-w-32">
                                {firstItemSelections.material?.displayValue ? (
                                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-green-300 break-words"
                                    style={{ backgroundColor: 'rgba(145, 200, 72, 0.2)', border: '1px solid rgba(145, 200, 72, 0.3)' }}>
                                    {firstItemSelections.material.displayValue}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              {/* Size */}
                              <td className="px-2 py-4">
                                {firstItemSize.width && firstItemSize.height || firstItemSize.displayValue ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-orange-300"
                                    style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                                    {firstItemSize.width && firstItemSize.height
                                      ? `${firstItemSize.width}" × ${firstItemSize.height}"`
                                      : firstItemSize.displayValue}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              {/* Location */}
                              <td className="px-2 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-cyan-300"
                                  style={{ backgroundColor: 'rgba(34, 211, 238, 0.2)', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
                                  {getShippingLocation(order.shippingAddress)}
                                </span>
                              </td>
                              {/* Shipping */}
                              <td className="px-2 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-300">
                                    {order.shipping_method || 'UPS Ground'}
                                  </span>
                                  <div className="flex gap-1">
                                    {order.is_express_shipping && (
                                      <span className="px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-300 rounded-full border border-red-400/30 animate-pulse">
                                        🚀 EXPRESS
                                      </span>
                                    )}
                                    {order.is_rush_order && (
                                      <span className="px-2 py-0.5 text-xs font-bold bg-orange-500/20 text-orange-300 rounded-full border border-orange-400/30">
                                        ⚡ RUSH
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">

                                  {order.trackingNumber ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewTracking(order);
                                      }}
                                      className="p-1.5 rounded-lg text-green-300 transition-all"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                        backdropFilter: 'blur(25px) saturate(180%)',
                                        border: '1px solid rgba(34, 197, 94, 0.4)'
                                      }}
                                      title="View Tracking"
                                    >
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/admin/shipping-labels/${order.orderNumber || order.id.split('-')[0].toUpperCase()}`);
                                      }}
                                      className="p-1.5 rounded-lg text-green-300 transition-all"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                        backdropFilter: 'blur(25px) saturate(180%)',
                                        border: '1px solid rgba(34, 197, 94, 0.4)'
                                      }}
                                      title="Create Shipping Label"
                                    >
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Empty State */}
                    {filteredOrders.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-gray-400">
                          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <h3 className="text-lg font-medium text-white mb-1">No orders found</h3>
                          <p className="text-sm">Try adjusting your filters or search terms</p>
                        </div>
                      </div>
                    )}

                    {/* Pagination Controls */}
                    <div 
                      className="px-6 py-4 border-t"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-400">
                            Showing {startIndex + 1}-{Math.min(endIndex, totalOrders)} of {totalOrders} orders
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: currentPage === 1 ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                color: 'white'
                              }}
                            >
                              Previous
                            </button>
                            
                            {/* Page numbers */}
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 ${
                                    currentPage === page ? 'text-white' : 'text-gray-400'
                                  }`}
                                  style={{
                                    background: currentPage === page 
                                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                                      : 'rgba(255, 255, 255, 0.05)',
                                    backdropFilter: 'blur(25px) saturate(180%)',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                  }}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                backdropFilter: 'blur(25px) saturate(180%)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                                color: 'white'
                              }}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
              </>
            ) : (
              // Order Details View
              <div className="max-w-7xl mx-auto">
                {/* Mobile/Tablet Header */}
                <div className="xl:hidden mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={goBackToOrders}
                      className="p-1"
                      aria-label="Back to orders"
                    >
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div>
                      <h1 className="text-lg font-semibold text-white">
                        #{selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}
                      </h1>
                    </div>
                  </div>
                  
                  {/* Mobile Order Summary */}
                  <div>
                    <div className="glass-container p-6">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-semibold text-white">Order Summary</h3>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="rounded-full"
                            style={{
                              width: '8px',
                              height: '8px',
                              minWidth: '8px',
                              minHeight: '8px',
                              backgroundColor: getLEDGlowColor(getProofStatus(selectedOrder)),
                              boxShadow: `0 0 12px ${getLEDGlowColor(getProofStatus(selectedOrder))}, 0 0 8px ${getLEDGlowColor(getProofStatus(selectedOrder))}`,
                              position: 'relative',
                              zIndex: 10
                            }}
                          ></div>
                          <span className="text-xs font-medium text-gray-300">{getProofStatus(selectedOrder)}</span>
                        </div>
                      </div>

                      {/* Order Items - Mobile Enhanced */}
                      <div className="space-y-4 mb-6">
                        {selectedOrder.items.map((item, idx) => {
                          let selections = item.calculatorSelections || {};
                          const size = selections.size || selections.sizePreset || {};
                          const itemImage = getProductImage(item);
                          
                          // White options are stored per item in calculatorSelections - no fallback needed
                          
                          // Debug: Log what we have in selections to find missing white options
                          console.log('🔍 Admin mobile view - calculator selections debug:', {
                            itemId: item.id,
                            itemName: item.productName,
                            hasCalculatorSelections: !!item.calculatorSelections,
                            selections,
                            hasWhiteOption: !!selections.whiteOption,
                            whiteOptionValue: selections.whiteOption?.value,
                            whiteOptionDisplay: selections.whiteOption?.displayValue,
                            allKeys: Object.keys(selections),
                            parsedFromOrderNote: !item.calculatorSelections?.whiteOption && !!selections.whiteOption
                          });

                          return (
                            <div key={idx} className="py-4 border-b border-gray-700 border-opacity-30 last:border-b-0">
                              <div className="flex gap-4">
                                {/* Product Image */}
                                <div className="relative mb-3">
                                  <div
                                    className="rounded-lg overflow-hidden flex-shrink-0"
                                    style={{
                                      width: '80px',
                                      height: '80px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                  >
                                    {itemImage ? (
                                      <AIFileImage
                                        src={itemImage}
                                        filename={itemImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                        alt={`${item.productName} design`}
                                        className="w-full h-full object-contain p-4"
                                        size="thumbnail"
                                        showFileType={false}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Download Button */}
                                  {itemImage && (
                                    <button
                                      onClick={() => {
                                        // Prioritize company name, fallback to customer name
                                        const companyName = selectedOrder.shippingAddress?.company || selectedOrder.billingAddress?.company;
                                        const customerName = companyName || `${selectedOrder.customerFirstName || ''} ${selectedOrder.customerLastName || ''}`.trim();
                                        
                                        handleDownloadFile(
                                          itemImage,
                                          customerName,
                                          item.productName,
                                          item.quantity,
                                          itemImage.split('/').pop()?.split('?')[0]
                                        );
                                      }}
                                      className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-300 hover:scale-110 transition-all duration-200"
                                      title="Download original file"
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  )}
                                </div>

                                {/* Product Details */}
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-white text-base">{item.productName}</h4>
                                        {/* Additional Payment Badge */}
                                        {item.is_additional_payment && (
                                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            Additional Payment
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-400 mt-1">SKU: {item.sku || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-white">{formatCurrency(item.totalPrice)}</p>
                                      <p className="text-sm text-gray-400">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                                    </div>
                                  </div>

                                  {/* Specifications - No Pills */}
                                  <div className="mt-3 space-y-1 text-sm">
                                    {selections.cut?.displayValue && (
                                      <div className="flex">
                                        <span className="text-gray-500 w-20">Shape:</span>
                                        <span className="text-gray-300">{selections.cut.displayValue}</span>
                                      </div>
                                    )}
                                    {selections.material?.displayValue && (
                                      <div className="flex">
                                        <span className="text-gray-500 w-20">Material:</span>
                                        <span className="text-gray-300">{selections.material.displayValue}</span>
                                      </div>
                                    )}
                                    {(size.width && size.height) || size.displayValue ? (
                                      <div className="flex">
                                        <span className="text-gray-500 w-20">Size:</span>
                                        <span className="text-gray-300">
                                          {size.width && size.height ? `${size.width}" × ${size.height}"` : size.displayValue}
                                        </span>
                                      </div>
                                    ) : null}
                                    {selections.whiteOption?.displayValue && (
                                      <div className="flex">
                                        <span className="text-gray-500 w-20">White Ink:</span>
                                        <span className="text-gray-300">{selections.whiteOption.displayValue}</span>
                                      </div>
                                    )}
                                    {selections.kissOption?.displayValue && (
                                      <div className="flex">
                                        <span className="text-gray-500 w-20">Cut Options:</span>
                                        <span className="text-gray-300">{selections.kissOption.displayValue}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Additional Details */}
                                  {(() => {
                                    // Debug logging to see what data we have (mobile)
                                    console.log('📱 Admin order debug (mobile) - Item data:', {
                                      itemId: item.id,
                                      itemName: item.productName,
                                      instagramHandle: item.instagramHandle,
                                      instagramOptIn: item.instagramOptIn,
                                      customerNotes: item.customerNotes,
                                      calculatorSelections: selections,
                                      orderNote: selectedOrder.orderNote?.substring(0, 200),
                                      isRushOrder: (selectedOrder as any).is_rush_order,
                                      isExpressShipping: (selectedOrder as any).is_express_shipping
                                    });
                                    
                                    // Parse data from order note string format
                                    const itemString = selectedOrder.orderNote || '';
                                    
                                    // Enhanced fallback logic for Instagram  
                                    const instagramFromString = itemString.match(/📸 Instagram: @([^\\n]+)/);
                                    const instagramOptInFromString = itemString.includes('📸 Instagram') && itemString.includes('marketing');
                                    const instagramHandle = item.instagramHandle || selections.instagram?.value || selections.instagramHandle?.value || 
                                      (instagramFromString ? instagramFromString[1] : null);
                                    const instagramOptIn = item.instagramOptIn || !!selections.instagram || instagramOptInFromString;
                                    
                                    // Enhanced fallback logic for rush order
                                    const rushFromString = itemString.includes('🚀 Rush Order') || itemString.includes('Rush: Rush Order');
                                    const rushOrder = selections.rush?.value || (selectedOrder as any).is_rush_order || rushFromString;
                                    
                                    // Enhanced fallback logic for proof preference
                                    const proofFromString = itemString.includes('📧') ? true : itemString.includes('No Proof') ? false : null;
                                    const hasProofData = selections.proof?.value !== undefined || proofFromString !== null;
                                    const proofValue = selections.proof?.value !== undefined ? selections.proof.value : 
                                      proofFromString !== null ? proofFromString : true;
                                    
                                    // Parse Instagram and proof data from order note text since it's not in calculator selections
                                    
                                    // Parse Instagram from order note text
                                    const instagramMatch = itemString.match(/Instagram: @([^\s\n,]+)/i);
                                    const updatedInstagramHandle = instagramMatch ? instagramMatch[1] : instagramHandle;
                                    const updatedInstagramOptIn = !!updatedInstagramHandle || instagramOptIn;
                                    
                                    // Parse proof preference from order note text  
                                    const sendProofMatch = itemString.includes('Send FREE Proof') || itemString.includes('Send proof');
                                    const noProofMatch = itemString.includes("Don't Send Proof") || itemString.includes('Skip proof') || itemString.includes('No Proof');
                                    const updatedHasProofData = sendProofMatch || noProofMatch || hasProofData;
                                    const updatedProofValue = sendProofMatch ? true : noProofMatch ? false : proofValue;
                                    
                                    // Show section if ANY data exists
                                    const showSection = item.customerNotes || updatedInstagramHandle || updatedInstagramOptIn || rushOrder || updatedHasProofData;
                                    
                                    return showSection ? (
                                      <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                        {item.customerNotes && (
                                          <div className="text-sm">
                                            <span className="text-gray-500">Note:</span>
                                            <span className="text-gray-300 ml-2">{item.customerNotes}</span>
                                          </div>
                                        )}
                                        {(updatedInstagramHandle || updatedInstagramOptIn) && (
                                          <div className="text-sm mt-1">
                                            <span className="text-gray-500">Instagram:</span>
                                            <span className="text-gray-300 ml-2">
                                              {updatedInstagramHandle ? `@${updatedInstagramHandle}` : 'Opted in for posting'}
                                              <span className="text-pink-400 ml-2">📸</span>
                                              {updatedInstagramOptIn && updatedInstagramHandle && (
                                                <span className="ml-2 text-xs text-green-400">(Marketing opt-in)</span>
                                              )}
                                            </span>
                                          </div>
                                        )}
                                        {rushOrder && (
                                          <div className="text-sm mt-1">
                                            <span className="text-gray-500">Rush Order:</span>
                                            <span className="text-orange-300 ml-2 font-medium">🚀 24-hour production (+40%)</span>
                                          </div>
                                        )}
                                        {updatedHasProofData && (
                                          <div className="text-sm mt-1">
                                            <span className="text-gray-500">Proof Preference:</span>
                                            <span className={`ml-2 ${updatedProofValue ? 'text-blue-300' : 'text-gray-300'}`}>
                                              {updatedProofValue ? '📧 Send proof for approval' : '⚡ Skip proof - direct to production'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Totals */}
                      <div className="space-y-2 pt-4 border-t border-gray-700 border-opacity-30">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Subtotal</span>
                          <span className="text-white">{formatCurrency(selectedOrder.subtotalPrice || selectedOrder.totalPrice)}</span>
                        </div>
                        {selectedOrder.totalTax && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Tax</span>
                            <span className="text-white">{formatCurrency(selectedOrder.totalTax)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-semibold pt-2">
                          <span className="text-white">Total</span>
                          <span style={{ color: '#86efac' }}>{formatCurrency(selectedOrder.totalPrice)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Approved Proofs Section - Collapsible */}
                    {selectedOrder.proofs && selectedOrder.proofs.filter(p => p.status === 'approved').length > 0 && (
                      <div className="mt-4">
                        <details className="glass-container p-4">
                          <summary className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <h3 className="text-base font-semibold text-white">Approved Proofs</h3>
                            </div>
                          </summary>
                          
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            {selectedOrder.proofs.filter((p: any) => p.status === 'approved').map((proof: any, idx: number) => (
                              <div key={idx} className="space-y-2">
                                <div 
                                  className="rounded-lg overflow-hidden aspect-square p-2"
                                  style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                  }}
                                >
                                  <img 
                                    src={proof.proofUrl} 
                                    alt={proof.proofTitle}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white truncate">{proof.proofTitle}</p>
                                  <p className="text-xs text-gray-400">Approved</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Mobile Additional Payment Notification */}
                    {(() => {
                      const additionalPaymentAmount = calculateAdditionalPaymentAmount(selectedOrder);
                      const additionalPaymentItems = getAdditionalPaymentItems(selectedOrder);
                      
                      if (additionalPaymentAmount > 0) {
                        const additionalPaymentInvoiceData = {
                          orderNumber: `${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}-ADD`,
                          id: selectedOrder.id,
                          orderDate: selectedOrder.orderCreatedAt || selectedOrder.createdAt || new Date().toISOString(),
                          orderStatus: selectedOrder.orderStatus,
                          totalPrice: additionalPaymentAmount,
                          currency: 'USD',
                          items: additionalPaymentItems.map((item, index) => ({
                            id: index + 1,
                            productName: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            customFiles: item.customFiles,
                            calculatorSelections: item.calculatorSelections,
                            customerNotes: item.customerNotes
                          })),
                          trackingNumber: selectedOrder.trackingNumber,
                          trackingCompany: selectedOrder.trackingCompany,
                          subtotal: additionalPaymentAmount,
                          tax: 0,
                          shipping: 0,
                          customerInfo: {
                            name: `${selectedOrder.customerFirstName || ''} ${selectedOrder.customerLastName || ''}`.trim(),
                            email: selectedOrder.customerEmail,
                            phone: selectedOrder.customerPhone,
                            address: selectedOrder.shippingAddress
                          },
                          billingAddress: selectedOrder.billingAddress
                        };
                        
                        // eslint-disable-next-line react-hooks/rules-of-hooks
                        const { generatePrintPDF } = useInvoiceGenerator(additionalPaymentInvoiceData);
                        
                        return (
                          <div className="mb-4 p-4 rounded-lg" style={{
                            backgroundColor: 'rgba(251, 191, 36, 0.15)',
                            border: '2px solid rgba(251, 191, 36, 0.4)',
                            boxShadow: 'rgba(251, 191, 36, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                            backdropFilter: 'blur(12px)'
                          }}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20">
                                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-bold text-amber-300">
                                  💳 Additional Payment Made
                                </span>
                                <p className="text-xs text-amber-200 mt-1">
                                  Customer paid <span className="font-bold">${additionalPaymentAmount.toFixed(2)}</span> for {additionalPaymentItems.length} item{additionalPaymentItems.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => generatePrintPDF()}
                              className="w-full py-2 rounded-lg text-sm font-medium text-amber-300 hover:text-amber-200 transition-all"
                              style={{
                                background: 'rgba(251, 191, 36, 0.2)',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                backdropFilter: 'blur(12px)'
                              }}
                            >
                              <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Print Additional Payment Invoice
                            </button>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}

                    {/* Mobile Action Buttons */}
                    <div className="mt-4 space-y-2">
                      {selectedOrder.trackingNumber ? (
                        <>
                          <button
                            onClick={() => handleViewTracking(selectedOrder)}
                            className="w-full py-3 rounded-lg text-sm font-medium text-white"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)'
                            }}
                          >
                            View Tracking
                          </button>
                          
                          <button
                            onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                            className="w-full py-3 rounded-lg text-sm font-medium text-white"
                            style={{
                              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(234, 179, 8, 0.4)'
                            }}
                          >
                            Order New Label
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                          className="w-full py-3 rounded-lg text-sm font-medium text-white"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)'
                          }}
                        >
                          Create shipping label
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Desktop Header */}
                <div className="hidden xl:flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={goBackToOrders}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Back to orders"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div>
                      <h1 className="text-xl font-bold text-white">
                        #{selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}
                      </h1>
                      <p className="text-xs text-gray-400">{formatDate(selectedOrder.orderCreatedAt)}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3">
                    
                    {/* Tracking/Label Button */}
                    {selectedOrder.trackingNumber ? (
                      <>
                        <button
                          onClick={() => handleViewTracking(selectedOrder)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 h-[34px]"
                          style={{
                            background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(75, 85, 99, 0.4)'
                          }}
                        >
                          <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          View Tracking
                        </button>
                        
                        <button
                          onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 h-[34px]"
                          style={{
                            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(234, 179, 8, 0.4)'
                          }}
                        >
                          <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Order New Label
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 h-[34px]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(234, 179, 8, 0.4)'
                        }}
                      >
                        <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Create Shipping Label
                      </button>
                    )}
                    
                    {/* Print Order Slip Button */}
                    <button
                      onClick={() => handlePrintOrderSlip(selectedOrder)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 h-[34px]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                    >
                      <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Order Slip
                    </button>
                  </div>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column - Order Details */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Order Summary - Desktop Only */}
                    <div className="hidden xl:block glass-container p-6">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-semibold text-white">Order Summary</h3>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="rounded-full"
                            style={{
                              width: '8px',
                              height: '8px',
                              minWidth: '8px',
                              minHeight: '8px',
                              backgroundColor: getLEDGlowColor(getProofStatus(selectedOrder)),
                              boxShadow: `0 0 12px ${getLEDGlowColor(getProofStatus(selectedOrder))}, 0 0 8px ${getLEDGlowColor(getProofStatus(selectedOrder))}`,
                              position: 'relative',
                              zIndex: 10
                            }}
                          ></div>
                          <span className="text-xs font-medium text-gray-300">{getProofStatus(selectedOrder)}</span>
                        </div>
                      </div>

                      {/* Shipping Choice Section - Inside Order Summary */}
                      {/* Urgent Order Alerts */}
                      {((selectedOrder as any).is_express_shipping || (selectedOrder as any).is_rush_order || (selectedOrder as any).is_blind_shipment) && (
                        <div className="mb-6 p-4 rounded-lg animate-pulse" style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '2px solid rgba(239, 68, 68, 0.4)',
                          boxShadow: 'rgba(239, 68, 68, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                          backdropFilter: 'blur(12px)'
                        }}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20">
                              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <span className="text-base font-bold text-red-300">
                              {((selectedOrder as any).is_express_shipping && (selectedOrder as any).is_rush_order) ? '🚀⚡ RUSH + EXPRESS ALERT'
                               : (selectedOrder as any).is_express_shipping ? '⚡ EXPRESS SHIPPING ALERT'
                               : (selectedOrder as any).is_rush_order ? '🚀 RUSH ORDER ALERT'
                               : (selectedOrder as any).is_blind_shipment ? '🚚 Blind Shipment Alert'
                               : 'SPECIAL HANDLING ALERT'}
                            </span>
                          </div>
                          <p className="text-sm text-red-200 ml-11 font-medium">
                            {((selectedOrder as any).is_express_shipping && (selectedOrder as any).is_rush_order) 
                              ? `🚨 CRITICAL URGENT: Rush production (24hr) + Express shipping (${(selectedOrder as any).shipping_method}) - highest priority!`
                              : (selectedOrder as any).is_express_shipping 
                              ? `🚨 This order requires URGENT processing - ${(selectedOrder as any).shipping_method || 'Express shipping'} selected!`
                              : (selectedOrder as any).is_rush_order
                              ? '🚨 This order requires URGENT production - Rush order (24hr processing) selected!'
                              : (selectedOrder as any).is_blind_shipment
                              ? 'Do not include any Sticker Shuttle branding on the package or shipping label'
                              : 'This order requires special handling - please review all flags and requirements.'}
                          </p>
                        </div>
                      )}

                      <div className="mb-6 p-4 rounded-lg" style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="text-sm font-medium text-white">Shipping Choice</span>
                        </div>
                        <p className="text-sm text-gray-300 ml-6">
                          {(selectedOrder as any).shipping_method || 'UPS Ground'}
                          <div className="flex gap-2 mt-1">
                            {(selectedOrder as any).is_express_shipping && (
                              <span className="px-2 py-1 text-xs font-bold bg-red-500/20 text-red-300 rounded-full border border-red-400/30">
                                EXPRESS
                              </span>
                            )}
                            {(selectedOrder as any).is_rush_order && (
                              <span className="px-2 py-1 text-xs font-bold bg-orange-500/20 text-orange-300 rounded-full border border-orange-400/30">
                                RUSH
                              </span>
                            )}
                            {(selectedOrder as any).is_blind_shipment && (
                              <span className="px-2 py-1 text-xs font-bold bg-purple-500/20 text-purple-300 rounded-full border border-purple-400/30">
                                BLIND
                              </span>
                            )}
                          </div>
                        </p>
                      </div>

                      {/* Additional Payment Notification */}
                      {(() => {
                        const additionalPaymentAmount = calculateAdditionalPaymentAmount(selectedOrder);
                        const additionalPaymentItems = getAdditionalPaymentItems(selectedOrder);
                        
                        if (additionalPaymentAmount > 0) {
                          // Invoice data for additional payment
                          const additionalPaymentInvoiceData = {
                            orderNumber: `${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}-ADD`,
                            id: selectedOrder.id,
                            orderDate: selectedOrder.orderCreatedAt || selectedOrder.createdAt || new Date().toISOString(),
                            orderStatus: selectedOrder.orderStatus,
                            totalPrice: additionalPaymentAmount,
                            currency: 'USD',
                            items: additionalPaymentItems.map((item, index) => ({
                              id: index + 1,
                              productName: item.productName,
                              quantity: item.quantity,
                              unitPrice: item.unitPrice,
                              totalPrice: item.totalPrice,
                              customFiles: item.customFiles,
                              calculatorSelections: item.calculatorSelections,
                              customerNotes: item.customerNotes
                            })),
                            trackingNumber: selectedOrder.trackingNumber,
                            trackingCompany: selectedOrder.trackingCompany,
                            subtotal: additionalPaymentAmount,
                            tax: 0,
                            shipping: 0,
                            customerInfo: {
                              name: `${selectedOrder.customerFirstName || ''} ${selectedOrder.customerLastName || ''}`.trim(),
                              email: selectedOrder.customerEmail,
                              phone: selectedOrder.customerPhone,
                              address: selectedOrder.shippingAddress
                            },
                            billingAddress: selectedOrder.billingAddress
                          };
                          
                          // eslint-disable-next-line react-hooks/rules-of-hooks
                          const { generatePrintPDF } = useInvoiceGenerator(additionalPaymentInvoiceData);
                          
                          return (
                            <div className="mb-6 p-4 rounded-lg" style={{
                              backgroundColor: 'rgba(251, 191, 36, 0.15)',
                              border: '2px solid rgba(251, 191, 36, 0.4)',
                              boxShadow: 'rgba(251, 191, 36, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                              backdropFilter: 'blur(12px)'
                            }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20">
                                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                  </div>
                                  <div>
                                    <span className="text-base font-bold text-amber-300">
                                      💳 Additional Payment Made
                                    </span>
                                    <p className="text-sm text-amber-200 mt-1">
                                      This customer made an additional payment of <span className="font-bold">${additionalPaymentAmount.toFixed(2)}</span> for {additionalPaymentItems.length} item{additionalPaymentItems.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => generatePrintPDF()}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-300 hover:text-amber-200 transition-all"
                                    style={{
                                      background: 'rgba(251, 191, 36, 0.2)',
                                      border: '1px solid rgba(251, 191, 36, 0.4)',
                                      backdropFilter: 'blur(12px)'
                                    }}
                                  >
                                    <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })()}

                      {/* Order Items with Drag-and-Drop Proof Upload */}
                      <div className="space-y-4 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          Order Items
                          {!isSamplePackOrder(selectedOrder) && selectedOrder.items.length > 1 && (
                            <span className="text-sm text-purple-400 font-normal">
                              • Drag proofs onto items
                            </span>
                          )}
                        </h3>
                        {selectedOrder.items.map((item, idx) => {
                          let selections = item.calculatorSelections || {};
                          const size = selections.size || selections.sizePreset || {};
                          const itemImage = getProductImage(item);
                          
                          // White options are stored per item in calculatorSelections - no fallback needed
                          
                          // Enhanced desktop order details view
                          const originalContent = (
                            <div className="py-4 border-b border-gray-700 border-opacity-30 last:border-b-0">
                              <div className="flex gap-4">
                                {/* Product Image */}
                                <div className="relative mb-3">
                                  <div
                                    className={`rounded-lg overflow-hidden flex-shrink-0 ${item.customerReplacementFile ? 'ring-2 ring-orange-400 ring-opacity-60' : ''}`}
                                    style={{
                                      width: '80px',
                                      height: '80px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      border: item.customerReplacementFile 
                                        ? '1px solid rgba(251, 146, 60, 0.6)' 
                                        : '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                  >
                                    {itemImage ? (
                                      <AIFileImage
                                        src={itemImage}
                                        filename={itemImage.split('/').pop()?.split('?')[0] || 'design.jpg'}
                                        alt={`${item.productName} design`}
                                        className="w-full h-full object-contain p-4"
                                        size="thumbnail"
                                        showFileType={true}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Item Number Circle */}
                                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
                                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                                  </div>
                                  
                                  {/* Customer Replacement Indicator */}
                                  {item.customerReplacementFile && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                    </div>
                                  )}
                                </div>

                                {/* Product Details */}
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-white text-base">{item.productName}</h4>
                                        {/* Additional Payment Badge */}
                                        {item.is_additional_payment && (
                                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            Additional Payment
                                          </span>
                                        )}
                                        {/* Download Button for this specific item */}
                                        {itemImage && (
                                          <button
                                            onClick={() => {
                                              // Prioritize company name, fallback to customer name
                                              const companyName = selectedOrder.shippingAddress?.company || selectedOrder.billingAddress?.company;
                                              const customerName = companyName || `${selectedOrder.customerFirstName || ''} ${selectedOrder.customerLastName || ''}`.trim();
                                              
                                              handleDownloadFile(
                                                itemImage,
                                                customerName,
                                                item.productName,
                                                item.quantity,
                                                itemImage.split('/').pop()?.split('?')[0]
                                              );
                                            }}
                                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white transition-all cursor-pointer hover:scale-105"
                                            style={{
                                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                              backdropFilter: 'blur(25px) saturate(180%)',
                                              border: '1px solid rgba(59, 130, 246, 0.4)'
                                            }}
                                            title="Download original file"
                                          >
                                                                                         <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            Download
                                          </button>
                                        )}
                                        

                                      </div>
                                      <p className="text-sm text-gray-400 mt-1">SKU: {item.sku || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-white">{formatCurrency(item.totalPrice)}</p>
                                      <p className="text-sm text-gray-400">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                                    </div>
                                  </div>

                                  {/* Specifications Grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                                    {selections.cut?.displayValue && (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shape</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-300"
                                          style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                          {selections.cut.displayValue}
                                        </span>
                                      </div>
                                    )}
                                    {(size.width && size.height) || size.displayValue ? (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Size</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-orange-300 whitespace-nowrap"
                                          style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                                          {size.width && size.height ? `${size.width}" × ${size.height}"` : size.displayValue}
                                        </span>
                                      </div>
                                    ) : null}
                                    {selections.material?.displayValue && (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                                          {item.productCategory === 'vinyl-banners' ? 'Finish Options' : 'Material'}
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-green-300 whitespace-nowrap"
                                          style={{ backgroundColor: 'rgba(145, 200, 72, 0.2)', border: '1px solid rgba(145, 200, 72, 0.3)' }}>
                                          {selections.material.displayValue}
                                        </span>
                                      </div>
                                    )}
                                    {selections.whiteOption?.displayValue && (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">White Ink</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-cyan-300 whitespace-nowrap"
                                          style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                          {selections.whiteOption.displayValue}
                                        </span>
                                      </div>
                                    )}
                                    {selections.kissOption?.displayValue && (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cut Options</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-pink-300 whitespace-nowrap"
                                          style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                                          {selections.kissOption.displayValue}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Additional Details */}
                                  {(() => {
                                    // Parse Instagram and proof data from order note text
                                    
                                    // Parse data from order note string format
                                    const itemString = selectedOrder.orderNote || '';
                                    
                                    // Enhanced fallback logic for Instagram  
                                    const instagramFromString = itemString.match(/📸 Instagram: @([^\\n]+)/);
                                    const instagramOptInFromString = itemString.includes('📸 Instagram') && itemString.includes('marketing');
                                    const instagramHandle = item.instagramHandle || selections.instagram?.value || selections.instagramHandle?.value || 
                                      (instagramFromString ? instagramFromString[1] : null);
                                    const instagramOptIn = item.instagramOptIn || !!selections.instagram || instagramOptInFromString;
                                    
                                    // Parse Instagram from order note text
                                    const instagramMatch = itemString.match(/Instagram: @([^\s\n,]+)/i);
                                    const updatedInstagramHandle = instagramMatch ? instagramMatch[1] : instagramHandle;
                                    const updatedInstagramOptIn = !!updatedInstagramHandle || instagramOptIn;
                                    
                                    // Enhanced fallback logic for rush order
                                    const rushFromString = itemString.includes('🚀 Rush Order') || itemString.includes('Rush: Rush Order');
                                    const rushOrder = selections.rush?.value || (selectedOrder as any).is_rush_order || rushFromString;
                                    
                                    // Enhanced fallback logic for proof preference
                                    const proofFromString = itemString.includes('📧') ? true : itemString.includes('No Proof') ? false : null;
                                    const hasProofData = selections.proof?.value !== undefined || proofFromString !== null;
                                    const proofValue = selections.proof?.value !== undefined ? selections.proof.value : 
                                      proofFromString !== null ? proofFromString : true;
                                    
                                    // Parse proof preference from order note text  
                                    const sendProofMatch = itemString.includes('Send FREE Proof') || itemString.includes('Send proof');
                                    const noProofMatch = itemString.includes("Don't Send Proof") || itemString.includes('Skip proof') || itemString.includes('No Proof');
                                    const updatedHasProofData = sendProofMatch || noProofMatch || hasProofData;
                                    const updatedProofValue = sendProofMatch ? true : noProofMatch ? false : proofValue;
                                    
                                    // Show section if ANY data exists
                                    const showSection = item.customerNotes || instagramHandle || instagramOptIn || item.customerReplacementFile || 
                                      rushOrder || updatedHasProofData;
                                    
                                    return showSection ? (
                                      <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                        {item.customerNotes && (
                                          <div className="text-sm">
                                            <span className="text-gray-500">Customer Note:</span>
                                            <span className="text-gray-300 ml-2">{item.customerNotes}</span>
                                          </div>
                                        )}
                                        {(updatedInstagramHandle || updatedInstagramOptIn) && (
                                          <div className="text-sm mt-1">
                                            <span className="text-gray-500">Instagram:</span>
                                            <span className="text-gray-300 ml-2">
                                              {updatedInstagramHandle ? `@${updatedInstagramHandle}` : 'Opted in for posting'}
                                              <span className="text-pink-400 ml-2">📸</span>
                                              {updatedInstagramOptIn && updatedInstagramHandle && (
                                                <span className="ml-2 text-xs text-green-400">(Marketing opt-in)</span>
                                              )}
                                            </span>
                                          </div>
                                        )}
                                        {rushOrder && (
                                          <div className="text-sm mt-1">
                                            <span className="text-gray-500">Rush Order:</span>
                                            <span className="text-orange-300 ml-2 font-medium">🚀 24-hour production (+40%)</span>
                                          </div>
                                        )}
                                        {updatedHasProofData && (
                                          <div className="text-sm mt-1">
                                            <span className="text-gray-500">Proof Preference:</span>
                                            <span className={`ml-2 ${updatedProofValue ? 'text-blue-300' : 'text-gray-300'}`}>
                                              {updatedProofValue ? '📧 Send proof for approval' : '⚡ Skip proof - direct to production'}
                                            </span>
                                          </div>
                                        )}
                                        {item.customerReplacementFile && (
                                          <div className="text-sm mt-1 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                            <div className="flex items-center gap-2 mb-1">
                                              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                              </svg>
                                              <span className="text-orange-400 font-medium">Customer Replacement File</span>
                                            </div>
                                            <div className="ml-6 space-y-1">
                                              <div className="text-xs text-gray-300">
                                                <span className="text-gray-500">File:</span>
                                                <button
                                                  onClick={() => {
                                                    // Prioritize company name, fallback to customer name
                                                    const companyName = selectedOrder.shippingAddress?.company || selectedOrder.billingAddress?.company;
                                                    const customerName = companyName || `${selectedOrder.customerFirstName || ''} ${selectedOrder.customerLastName || ''}`.trim();
                                                    
                                                    handleDownloadFile(
                                                      item.customerReplacementFile!,
                                                      customerName,
                                                      item.productName + ' Replacement',
                                                      item.quantity,
                                                      item.customerReplacementFileName
                                                    );
                                                  }}
                                                  className="ml-2 text-orange-400 hover:text-orange-300 underline"
                                                >
                                                  {item.customerReplacementFileName || 'Download'}
                                                </button>
                                              </div>
                                              {item.customerReplacementAt && (
                                                <div className="text-xs text-gray-400">
                                                  <span className="text-gray-500">Uploaded:</span>
                                                  <span className="ml-2">{formatDate(item.customerReplacementAt)}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          );

                          // For non-sample pack orders, wrap with drag-and-drop functionality
                          if (!isSamplePackOrder(selectedOrder)) {
                            return (
                              <ItemSpecificProofUpload
                                key={idx}
                                orderId={selectedOrder.id}
                                orderItem={{
                                  id: item.id,
                                  productName: item.productName,
                                  quantity: item.quantity,
                                  calculatorSelections: item.calculatorSelections
                                }}
                                existingProofs={selectedOrder.proofs || []}
                                isAdmin={true}
                                itemNumber={idx + 1}
                                onProofUploaded={() => {
                                  // Refresh the order data
                                  refetch();
                                }}
                                renderChildren={() => originalContent}
                              />
                            );
                          }

                          // For sample pack orders, just return the original content
                          return <div key={idx}>{originalContent}</div>;
                        })}
                      </div>

                      {/* Order Summary Actions */}
                      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-700 border-opacity-30">
                        {/* Left Column - Proof Actions (Hide for sample packs) */}
                        {!isSamplePackOrder(selectedOrder) ? (
                          <>
                            {/* Customer requested changes - Show alert */}
                            {selectedOrder.proof_status === 'changes_requested' && (
                              <div className="col-span-2 mb-4 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10">
                                <div className="flex items-center gap-3">
                                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <div>
                                    <p className="text-amber-300 font-medium">Customer Requested Changes</p>
                                    <p className="text-amber-200 text-sm">Please upload a new revised proof and send again</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Proof Action Button */}
                            {selectedOrder.proofs && selectedOrder.proofs.length > 0 ? (
                              /* Show appropriate button based on proof status */
                              selectedOrder.proof_status === 'changes_requested' ? (
                                /* Changes requested - Show Send Proofs Again button (if new proofs uploaded) */
                                selectedOrder.proofs.filter(p => p.status === 'pending').length > 0 ? (
                                  <button
                                    onClick={async () => {
                                      setSendingProofs(true);
                                      try {
                                        await handleSendProofs(selectedOrder.id);
                                        setProofsSent(prev => ({ ...prev, [selectedOrder.id]: true }));
                                        setNewProofsCount(prev => ({ ...prev, [selectedOrder.id]: 0 }));
                                      } catch (error) {
                                        console.error('Failed to send proofs:', error);
                                      } finally {
                                        setSendingProofs(false);
                                      }
                                    }}
                                    disabled={sendingProofs}
                                    className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all hover:bg-opacity-80 cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    style={{
                                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                      border: '1px solid rgba(34, 197, 94, 0.4)'
                                    }}
                                  >
                                    {sendingProofs ? (
                                      <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Send Proofs Again
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  /* No new proofs yet - Show greyed out button */
                                  <button
                                    disabled
                                    className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-gray-500 transition-all cursor-not-allowed"
                                    style={{
                                      backgroundColor: 'rgba(75, 85, 99, 0.3)',
                                      border: '1px solid rgba(75, 85, 99, 0.4)'
                                    }}
                                  >
                                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                    </svg>
                                    Upload New Proof First
                                  </button>
                                )
                              ) : !selectedOrder.proof_sent_at ? (
                                /* Normal flow - Show Send Proofs */
                                <button
                                  onClick={async () => {
                                    setSendingProofs(true);
                                    try {
                                      await handleSendProofs(selectedOrder.id);
                                      setProofsSent(prev => ({ ...prev, [selectedOrder.id]: true }));
                                      setNewProofsCount(prev => ({ ...prev, [selectedOrder.id]: 0 }));
                                    } catch (error) {
                                      console.error('Failed to send proofs:', error);
                                    } finally {
                                      setSendingProofs(false);
                                    }
                                  }}
                                  disabled={sendingProofs}
                                  className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all hover:bg-opacity-80 cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                  style={{
                                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)'
                                  }}
                                >
                                  {sendingProofs ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                      </svg>
                                      Send Proofs
                                    </>
                                  )}
                                </button>
                              ) : (
                                /* Proofs already sent - Show View Proofs */
                                <button
                                  onClick={() => window.open(`/proofs?orderId=${selectedOrder.id}`, '_blank')}
                                  className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                    backdropFilter: 'blur(25px) saturate(180%)',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                  }}
                                >
                                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Proofs
                                </button>
                              )
                            ) : (
                              /* No proofs exist - Show greyed out button */
                              <button
                                disabled
                                className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-gray-500 transition-all cursor-not-allowed"
                                style={{
                                  backgroundColor: 'rgba(75, 85, 99, 0.3)',
                                  border: '1px solid rgba(75, 85, 99, 0.4)'
                                }}
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                </svg>
                                Upload Proof First
                              </button>
                            )}
                          </>
                        ) : null}

                        {/* Right Column - Tracking/Shipping Actions */}
                        {selectedOrder.trackingNumber ? (
                          <button
                            onClick={() => handleViewTracking(selectedOrder)}
                            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(75, 85, 99, 0.4)'
                            }}
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            View Tracking
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(234, 179, 8, 0.4)'
                            }}
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Create Shipping Label
                          </button>
                        )}

                        {/* Always show tracking for sample packs */}
                        {isSamplePackOrder(selectedOrder) && (
                          <>
                            {selectedOrder.trackingNumber ? (
                              <button
                                onClick={() => handleViewTracking(selectedOrder)}
                                className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 col-span-2"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(75, 85, 99, 0.4)'
                                }}
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                View Tracking
                              </button>
                            ) : (
                              <button
                                onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                                className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 col-span-2"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(234, 179, 8, 0.4)'
                                }}
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Create Shipping Label
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Proof Management System - Hide if proofs are approved OR if it's a sample pack */}
                    {!isSamplePackOrder(selectedOrder) && selectedOrder.proof_status !== 'approved' && (
                      <div className="glass-container p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Proof Management
                        </h3>
                        <ProofUpload
                          orderId={selectedOrder.id}
                          proofStatus={selectedOrder.proof_status}
                          existingProofs={selectedOrder.proofs || []}
                          isAdmin={true}
                          orderItems={selectedOrder.items}
                          onProofUploaded={() => {
                            // Refresh the order data
                            refetch();
                          }}
                        />
                      </div>
                    )}

                    {/* Approved Proofs Display - Show when proofs are approved (not for sample packs) */}
                    {!isSamplePackOrder(selectedOrder) && selectedOrder.proof_status === 'approved' && selectedOrder.proofs && selectedOrder.proofs.filter((p: any) => p.status === 'approved').length > 0 && (
                      <div className="glass-container p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-white">Approved Proofs</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {selectedOrder.proofs.filter((p: any) => p.status === 'approved').map((proof: any) => (
                            <div key={proof.id} className="space-y-2">
                              <div 
                                className="rounded-lg overflow-hidden aspect-square p-2"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <img 
                                  src={proof.proofUrl} 
                                  alt={proof.proofTitle}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <button
                                onClick={() => window.open(proof.proofUrl, '_blank')}
                                className="w-full px-3 py-2 text-xs font-medium rounded-lg text-white transition-all hover:scale-105"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                }}
                              >
                                <svg className="w-3 h-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              <div>
                                <p className="text-sm font-medium text-white truncate">{proof.proofTitle}</p>
                                <p className="text-xs text-green-400">✓ Approved</p>
                                {proof.orderItemId && (() => {
                                  const linkedItem = selectedOrder.items?.find(item => item.id === proof.orderItemId);
                                  return linkedItem ? (
                                    <p className="text-xs text-purple-400 truncate">{linkedItem.productName}</p>
                                  ) : (
                                    <p className="text-xs text-gray-400">Item-specific</p>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approved Proofs Display - Collapsible - Desktop Only - Show when proof status is not approved but has approved proofs (not for sample packs) */}
                    {!isSamplePackOrder(selectedOrder) && selectedOrder.proof_status !== 'approved' && selectedOrder.proofs && selectedOrder.proofs.filter((p: any) => p.status === 'approved').length > 0 && (
                      <div className="hidden xl:block">
                        <details className="glass-container p-6">
                        <summary className="flex items-center justify-between cursor-pointer -m-6 p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white">Approved Proofs</h3>
                          </div>
                        </summary>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                          {selectedOrder.proofs.filter((p: any) => p.status === 'approved').map((proof: any) => (
                            <div key={proof.id} className="space-y-2">
                              <div 
                                className="rounded-lg overflow-hidden aspect-square p-2"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <img 
                                  src={proof.proofUrl} 
                                  alt={proof.proofTitle}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <button
                                onClick={() => window.open(proof.proofUrl, '_blank')}
                                className="w-full px-3 py-2 text-xs font-medium rounded-lg text-white transition-all hover:scale-105"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                }}
                              >
                                <svg className="w-3 h-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              <div>
                                <p className="text-sm font-medium text-white truncate">{proof.proofTitle}</p>
                                <p className="text-xs text-gray-400">Approved</p>
                                {proof.orderItemId && (() => {
                                  const linkedItem = selectedOrder.items?.find(item => item.id === proof.orderItemId);
                                  return linkedItem ? (
                                    <p className="text-xs text-purple-400 truncate">{linkedItem.productName}</p>
                                  ) : (
                                    <p className="text-xs text-gray-400">Item-specific</p>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                                              </details>
                      </div>
                      )}

                    {/* Archived Proofs Display - Collapsible - Show superseded/rejected proofs (not for sample packs) */}
                    {!isSamplePackOrder(selectedOrder) && selectedOrder.proofs && selectedOrder.proofs.filter((p: any) => p.status === 'archived' || p.status === 'rejected' || p.status === 'superseded').length > 0 && (
                      <details className="glass-container p-6">
                        <summary className="flex items-center justify-between cursor-pointer -m-6 p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l14 14M19 8l-14 14M3 9h18" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white">Archived Proofs</h3>
                            <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                              {selectedOrder.proofs.filter((p: any) => p.status === 'archived' || p.status === 'rejected' || p.status === 'superseded').length}
                            </span>
                          </div>
                        </summary>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                          {selectedOrder.proofs.filter((p: any) => p.status === 'archived' || p.status === 'rejected' || p.status === 'superseded').map((proof: any) => (
                            <div key={proof.id} className="space-y-2 opacity-75">
                              <div 
                                className="rounded-lg overflow-hidden aspect-square p-2 relative"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <img 
                                  src={proof.proofUrl} 
                                  alt={proof.proofTitle}
                                  className="w-full h-full object-contain grayscale"
                                />
                                <div className="absolute top-1 right-1 bg-gray-600/80 text-white text-xs px-1.5 py-0.5 rounded">
                                  Archived
                                </div>
                              </div>
                              <button
                                onClick={() => window.open(proof.proofUrl, '_blank')}
                                className="w-full px-3 py-2 text-xs font-medium rounded-lg text-white transition-all hover:scale-105"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(75, 85, 99, 0.4)',
                                  boxShadow: 'rgba(75, 85, 99, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                }}
                              >
                                <svg className="w-3 h-3 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              <div>
                                <p className="text-sm font-medium text-white truncate">{proof.proofTitle}</p>
                                <p className="text-xs text-gray-500">
                                  {proof.status === 'superseded' ? '↻ Superseded' : 
                                   proof.status === 'rejected' ? '✗ Rejected' : 
                                   '📁 Archived'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {formatDate(proof.uploadedAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Right Column - Customer Info */}
                  <div className="space-y-6">
                    {/* Customer Information */}
                    <div className="glass-container p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Customer
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium text-white text-lg">{selectedOrder.customerFirstName} {selectedOrder.customerLastName}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {selectedOrder.userId ? 
                              (customerProfiles[selectedOrder.userId]?.companyName || 'Registered Customer') : 
                              'Guest Checkout'}
                          </p>
                          
                          {/* Customer Stats */}
                          {(() => {
                            const stats = getCustomerStats(selectedOrder.customerEmail);
                            const orderPosition = getOrderPosition(selectedOrder);
                            const ordinal = orderPosition === 1 ? 'st' : orderPosition === 2 ? 'nd' : orderPosition === 3 ? 'rd' : 'th';
                            
                            return (
                              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-300">
                                    <span className="text-purple-400 font-medium">{orderPosition}{ordinal} order</span>
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    This customer has spent <span className="text-green-400 font-medium">{formatCurrency(stats.lifetimeValue)}</span> in their lifetime with Sticker Shuttle.
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div className="pt-3 border-t border-gray-700 border-opacity-30">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Contact Information</p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm text-white">{selectedOrder.customerEmail}</p>
                              <button
                                onClick={() => copyToClipboard(selectedOrder.customerEmail || '')}
                                className="text-gray-400 hover:text-white transition-colors ml-auto"
                                title="Copy email"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            {selectedOrder.customerPhone && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <p className="text-sm text-white">{selectedOrder.customerPhone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Order Actions */}
                        <div className="pt-4 border-t border-gray-700 border-opacity-30">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Order Actions</p>
                          <div className="space-y-2">
                            {/* Mark as Approved Button - Only show if not already approved/printing */}
                            {selectedOrder.proof_status !== 'approved' && selectedOrder.orderStatus !== 'Printing' && 
                             selectedOrder.orderStatus !== 'Shipped' && selectedOrder.orderStatus !== 'Delivered' && 
                             selectedOrder.fulfillmentStatus !== 'fulfilled' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateOrderStatus({
                                      variables: {
                                        orderId: selectedOrder.id,
                                        statusUpdate: {
                                          proof_status: 'approved',
                                          orderStatus: 'Printing'
                                        }
                                      }
                                    });
                                    refetch();
                                  } catch (error) {
                                    console.error('Error approving order:', error);
                                    alert('Failed to approve order. Please try again.');
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.4) 0%, rgba(251, 146, 60, 0.25) 50%, rgba(251, 146, 60, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(251, 146, 60, 0.4)'
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Mark as Approved
                              </button>
                            )}

                            {/* Mark as Shipped Button - Only show if not already shipped or delivered */}
                            {selectedOrder.orderStatus !== 'Shipped' && selectedOrder.orderStatus !== 'Delivered' && 
                             selectedOrder.fulfillmentStatus !== 'fulfilled' && selectedOrder.proof_status !== 'shipped' && (
                              <button
                                onClick={() => setShowShipOrderModal(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0.25) 50%, rgba(168, 85, 247, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(168, 85, 247, 0.4)'
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Mark as Shipped
                              </button>
                            )}

                            {/* Local Pickup Buttons - Only show for local pickup orders */}
                            {selectedOrder.shipping_method && selectedOrder.shipping_method.includes('Local Pickup') && (
                              <>
                                {/* Ready for Pickup Button - Only show if not already ready or delivered */}
                                {selectedOrder.orderStatus !== 'Ready for Pickup' && selectedOrder.orderStatus !== 'Delivered' && 
                                 selectedOrder.fulfillmentStatus !== 'fulfilled' && (
                                  <button
                                    onClick={() => handleMarkAsReadyForPickup(selectedOrder.id)}
                                    disabled={markingReadyForPickup}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                      backdropFilter: 'blur(25px) saturate(180%)',
                                      border: '1px solid rgba(59, 130, 246, 0.4)'
                                    }}
                                  >
                                    {markingReadyForPickup ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Marking as Ready...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        Ready for Pickup
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Picked Up Button - Only show if ready for pickup */}
                                {selectedOrder.orderStatus === 'Ready for Pickup' && (
                                  <button
                                    onClick={() => handleMarkAsPickedUp(selectedOrder.id)}
                                    disabled={markingPickedUp}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                      backdropFilter: 'blur(25px) saturate(180%)',
                                      border: '1px solid rgba(34, 197, 94, 0.4)'
                                    }}
                                  >
                                    {markingPickedUp ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Marking as Picked Up...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Picked Up
                                      </>
                                    )}
                                  </button>
                                )}
                              </>
                            )}

                            {/* Mark as Delivered Button - Only show if not already delivered and not local pickup */}
                            {selectedOrder.orderStatus !== 'Delivered' && selectedOrder.fulfillmentStatus !== 'fulfilled' && 
                             (!selectedOrder.shipping_method || !selectedOrder.shipping_method.includes('Local Pickup')) && (
                              <button
                                onClick={() => handleMarkAsDelivered(selectedOrder.id)}
                                disabled={markingDelivered}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.25) 50%, rgba(34, 197, 94, 0.1) 100%)',
                                  backdropFilter: 'blur(25px) saturate(180%)',
                                  border: '1px solid rgba(34, 197, 94, 0.4)'
                                }}
                              >
                                {markingDelivered ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Marking as Delivered...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Mark as Delivered
                                  </>
                                )}
                              </button>
                            )}

                            {/* Order Status for reference */}
                            <div className="text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getProofStatusColor(getProofStatus(selectedOrder))}`}>
                                Current Status: {getProofStatus(selectedOrder)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                                        </div>

                    {/* Order Summary */}
                    <div className="glass-container p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Order Summary
                      </h3>
                      
                      <div className="space-y-3">
                        {/* Order Items */}
                        <div className="space-y-2 pb-3 border-b border-gray-700">
                          {selectedOrder.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <div className="flex-1 pr-2">
                                <span className="text-gray-300">{item.productName}</span>
                                {item.quantity > 1 && (
                                  <span className="text-gray-500 ml-2">× {item.quantity}</span>
                                )}
                              </div>
                              <span className="text-white">{formatCurrency(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Subtotal */}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Subtotal</span>
                          <span className="text-white">{formatCurrency(selectedOrder.subtotalPrice || selectedOrder.totalPrice)}</span>
                        </div>

                        {/* Credits Spent */}
                        {(() => {
                          const creditsSpent = (selectedOrder as any).creditsApplied || 0;
                          return creditsSpent > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-red-400">Credits Used</span>
                              <span className="text-red-400">-{formatCurrency(creditsSpent)}</span>
                            </div>
                          ) : null;
                        })()}

                        {/* Discounts Used */}
                        {(() => {
                          const discountAmount = (selectedOrder as any).discountAmount || 0;
                          const orderNote = selectedOrder.orderNote || '';
                          const discountMatch = orderNote.match(/Discount Code: (.+?) \(/);
                          const discountCode = discountMatch ? discountMatch[1] : null;
                          
                          return discountAmount > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-purple-400">
                                {discountCode ? `Discount (${discountCode})` : 'Discount Applied'}
                              </span>
                              <span className="text-purple-400">-{formatCurrency(discountAmount)}</span>
                            </div>
                          ) : null;
                        })()}

                        {/* Tax */}
                        {selectedOrder.totalTax && selectedOrder.totalTax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Tax</span>
                            <span className="text-white">{formatCurrency(selectedOrder.totalTax)}</span>
                          </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-700">
                          <span className="text-white">Total</span>
                          <span style={{ color: '#86efac' }}>{formatCurrency(selectedOrder.totalPrice)}</span>
                        </div>

                        {/* Credits Earned */}
                        {(() => {
                          const profile = selectedOrder.userId ? customerProfiles[selectedOrder.userId] : null;
                          const isWholesale = profile?.isWholesaleCustomer || false;
                          const earningRate = isWholesale ? 0.025 : 0.05;
                          const creditsEarned = selectedOrder.totalPrice * earningRate;
                          
                          return (
                            <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                              <span className="text-green-400 flex items-center gap-1">
                                <i className="fas fa-coins"></i>
                                Credits Earned ({(earningRate * 100).toFixed(1)}%)
                              </span>
                              <span className="text-green-400">+{formatCurrency(creditsEarned)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Shipping Address */}
                    {selectedOrder.shippingAddress && (
                      <div className={`glass-container p-6 ${selectedOrder.is_blind_shipment ? 'border-2 border-blue-400 bg-blue-500/10' : ''}`}>
                        {/* Blind Shipping Notice */}
                        {selectedOrder.is_blind_shipment && (
                          <div className="mb-4 p-3 rounded-lg border border-blue-400 bg-blue-500/20">
                            <div className="flex items-center gap-2 text-blue-300">
                              <span className="font-semibold text-sm">🚚 This order requested Blind Shipping!</span>
                            </div>
                            <p className="text-xs text-blue-200 mt-1">
                              Do not include any Sticker Shuttle branding on the package or shipping label
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`text-lg font-semibold flex items-center gap-2 ${selectedOrder.is_blind_shipment ? 'text-blue-200' : 'text-white'}`}>
                            <svg className={`w-5 h-5 ${selectedOrder.is_blind_shipment ? 'text-blue-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Shipping Address
                          </h3>
                          <button
                            onClick={() => handleEditShippingAddress(selectedOrder)}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                            }}
                          >
                            <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        </div>
                        <div className={`text-sm space-y-1 ${selectedOrder.is_blind_shipment ? 'text-blue-100' : 'text-gray-300'}`}>
                          {(selectedOrder.shippingAddress.first_name || selectedOrder.shippingAddress.last_name) && (
                            <p className={`font-medium ${selectedOrder.is_blind_shipment ? 'text-blue-200' : 'text-white'}`}>
                              {selectedOrder.shippingAddress.first_name} {selectedOrder.shippingAddress.last_name}
                            </p>
                          )}
                          {selectedOrder.shippingAddress.company && (
                            <p className={selectedOrder.is_blind_shipment ? 'text-blue-200' : 'text-gray-300'}>{selectedOrder.shippingAddress.company}</p>
                          )}
                          {(selectedOrder.shippingAddress.address1 || selectedOrder.shippingAddress.line1) && (
                            <p>{selectedOrder.shippingAddress.address1 || selectedOrder.shippingAddress.line1}</p>
                          )}
                          {(selectedOrder.shippingAddress.address2 || selectedOrder.shippingAddress.line2) && (
                            <p>{selectedOrder.shippingAddress.address2 || selectedOrder.shippingAddress.line2}</p>
                          )}
                          {(selectedOrder.shippingAddress.city || selectedOrder.shippingAddress.province || selectedOrder.shippingAddress.state || selectedOrder.shippingAddress.zip || selectedOrder.shippingAddress.postal_code) && (
                            <p>
                              {[
                                selectedOrder.shippingAddress.city,
                                selectedOrder.shippingAddress.province || selectedOrder.shippingAddress.state,
                                selectedOrder.shippingAddress.zip || selectedOrder.shippingAddress.postal_code
                              ].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {selectedOrder.shippingAddress.country && (
                            <p>{selectedOrder.shippingAddress.country === 'US' ? 'United States' : selectedOrder.shippingAddress.country}</p>
                          )}
                          {selectedOrder.shippingAddress.phone && (
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {selectedOrder.shippingAddress.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}





                    {/* Order Timeline */}
                    <div className="glass-container p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Timeline
                        {selectedOrder.orderStatus === 'Delivered' && selectedOrder.orderCreatedAt && (() => {
                          const orderDate = new Date(selectedOrder.orderCreatedAt);
                          const deliveryDate = new Date(); // Would need actual delivery date from tracking
                          const timeDiff = deliveryDate.getTime() - orderDate.getTime();
                          const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                          const hoursDiff = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
                          
                          return (
                            <span className="text-sm text-green-400 font-normal">
                              ({daysDiff > 0 ? `${daysDiff}d ${hoursDiff}h` : `${hoursDiff}h`} total)
                            </span>
                          );
                        })()}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white">Order placed</p>
                              <p className="text-xs text-gray-500">{formatDate(selectedOrder.orderCreatedAt)}</p>
                            </div>
                            <p className="text-xs text-gray-400">Customer submitted order</p>
                          </div>
                        </div>
                        {selectedOrder.financialStatus === 'paid' && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-white">Payment confirmed</p>
                                <p className="text-xs text-gray-500">{formatDate(selectedOrder.orderCreatedAt)}</p>
                              </div>
                              <p className="text-xs text-gray-400">Payment processed successfully</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Proof Activities */}
                        {selectedOrder.proofs && selectedOrder.proofs.length > 0 && (
                          <>
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5"></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">Design proofs uploaded</p>
                                <p className="text-xs text-gray-400">{formatDate(selectedOrder.proofs[0].uploadedAt)}</p>
                              </div>
                            </div>
                            
                            {selectedOrder.proof_sent_at && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">Proofs sent to customer</p>
                                  <p className="text-xs text-gray-400">{formatDate(selectedOrder.proof_sent_at)}</p>
                                </div>
                              </div>
                            )}
                            
                            {selectedOrder.proof_status === 'changes_requested' && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 animate-pulse"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">Customer requested changes</p>
                                  <p className="text-xs text-gray-400">Design revision needed based on feedback</p>
                                </div>
                              </div>
                            )}

                            {selectedOrder.proof_status === 'approved' && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">Proofs approved by customer</p>
                                  <p className="text-xs text-gray-400">Customer approved the design</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Production Status */}
                        {(selectedOrder.proof_status === 'approved' || selectedOrder.proof_status === 'label_printed' || selectedOrder.proof_status === 'shipped' || selectedOrder.proof_status === 'delivered') && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">In production</p>
                              <p className="text-xs text-gray-400">Order is being manufactured</p>
                            </div>
                          </div>
                        )}

                        {/* Shipping Label Printed */}
                        {(selectedOrder.proof_status === 'label_printed' || selectedOrder.proof_status === 'shipped' || selectedOrder.proof_status === 'delivered') && selectedOrder.trackingNumber && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Shipping label created
                              </p>
                              <p className="text-xs text-gray-400">Tracking #: {selectedOrder.trackingNumber}</p>
                              <p className="text-xs text-gray-400">Ready for pickup by carrier</p>
                            </div>
                          </div>
                        )}

                        {/* Package Dropped Off / In-Transit (Admin view) - Only show if EasyPost confirms */}
                        {selectedOrder.trackingNumber && selectedOrder.trackingDetails && 
                         (selectedOrder.trackingDetails.status === 'in_transit' || 
                          selectedOrder.trackingDetails.status === 'out_for_delivery' || 
                          selectedOrder.trackingDetails.status === 'delivered' ||
                          (selectedOrder.trackingDetails.tracking_details && 
                           selectedOrder.trackingDetails.tracking_details.some((event: any) => 
                             event.status === 'in_transit' || event.message?.toLowerCase().includes('picked up')
                           ))) && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Package dropped off at carrier
                              </p>
                              <p className="text-xs text-gray-400">
                                Picked up by {selectedOrder.trackingCompany || 'UPS'} - Now in transit
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Package In Transit / Shipped - Only show if EasyPost confirms */}
                        {selectedOrder.trackingNumber && selectedOrder.trackingDetails && 
                         (selectedOrder.trackingDetails.status === 'in_transit' || 
                          selectedOrder.trackingDetails.status === 'out_for_delivery' || 
                          selectedOrder.trackingDetails.status === 'delivered' ||
                          (selectedOrder.trackingDetails.tracking_details && 
                           selectedOrder.trackingDetails.tracking_details.some((event: any) => 
                             event.status === 'in_transit'
                           ))) && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Package in transit
                              </p>
                              <p className="text-xs text-gray-400">
                                Moving through {selectedOrder.trackingCompany || 'carrier'} network
                              </p>
                              {selectedOrder.trackingUrl && (
                                <a 
                                  href={selectedOrder.trackingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                                >
                                  Track package →
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Out for Delivery */}
                        {selectedOrder.orderStatus === 'Out for Delivery' && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 animate-pulse"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Out for delivery
                              </p>
                              <p className="text-xs text-gray-400">Package is on the delivery vehicle</p>
                              <p className="text-xs text-yellow-400">📦 Arriving today</p>
                            </div>
                          </div>
                        )}

                        {/* Package Delivered */}
                        {selectedOrder.orderStatus === 'Delivered' && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-white flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Package delivered
                                </p>
                                <p className="text-xs text-gray-500">{formatDate(new Date().toISOString())}</p>
                              </div>
                              <p className="text-xs text-gray-400">Order completed successfully</p>
                              <p className="text-xs text-green-400">✅ Thank you for your business!</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Current Status (for orders still in progress) */}
                        {selectedOrder.proof_status === 'awaiting_approval' ? (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 animate-pulse"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">Awaiting customer approval</p>
                              <p className="text-xs text-gray-400">Customer is reviewing proofs</p>
                            </div>
                          </div>
                        ) : selectedOrder.proof_status === 'changes_requested' ? (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 animate-pulse"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">Changes requested</p>
                              <p className="text-xs text-gray-400">Updating design based on feedback</p>
                            </div>
                          </div>
                        ) : !selectedOrder.proof_sent_at && selectedOrder.financialStatus === 'paid' ? (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 animate-pulse"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">Building proof</p>
                              <p className="text-xs text-gray-400">Creating design proof for approval</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>


                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tracking Modal */}
        {showTrackingModal && selectedOrder && (
          <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <div className="glass-container p-6 max-w-md w-full mx-4" style={{ 
              maxWidth: '500px',
              backgroundColor: 'rgba(3, 1, 64, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Tracking Information
                </h3>
                <button
                  onClick={() => setShowTrackingModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close tracking modal"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Order Info */}
                <div className="p-4 rounded-lg border border-gray-700 border-opacity-30">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-400">Order Number</p>
                      <p className="text-white font-semibold">#{selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProofStatusColor(getProofStatus(selectedOrder))}`}>
                        {getProofStatus(selectedOrder)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tracking Details */}
                <div className="p-4 rounded-lg border border-gray-700 border-opacity-30">
                  <div className="space-y-3">
                                         <div>
                       <p className="text-sm text-gray-400 mb-1">Tracking Number</p>
                       <div className="flex items-center gap-2">
                         <p className="text-white font-mono text-sm bg-gray-800 bg-opacity-50 px-3 py-2 rounded">{selectedOrder.trackingNumber}</p>
                         <div className="relative">
                           <button
                             onClick={() => copyTrackingToClipboard(selectedOrder.trackingNumber || '', 'number')}
                             className="text-gray-400 hover:text-white transition-colors"
                             title="Copy tracking number"
                           >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                             </svg>
                           </button>
                           {copiedTracking === 'number' && (
                             <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                               Copied!
                             </div>
                           )}
                         </div>
                       </div>
                     </div>

                    {selectedOrder.trackingCompany && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Carrier</p>
                        <p className="text-white text-sm">{selectedOrder.trackingCompany}</p>
                      </div>
                    )}

                    {selectedOrder.trackingUrl && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Carrier Tracking URL</p>
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm underline break-all"
                        >
                          {selectedOrder.trackingUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                                 {/* Action Buttons */}
                 <div className="flex gap-3 mt-6">
                   <button
                     onClick={() => handleTrackOnCarrierSite(selectedOrder)}
                     className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                     style={{
                       background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                       backdropFilter: 'blur(25px) saturate(180%)',
                       border: '1px solid rgba(234, 179, 8, 0.4)'
                     }}
                   >
                     <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L8 16" />
                     </svg>
                     Track on Carrier Site
                   </button>
                   <div className="relative">
                     <button
                       onClick={() => {
                         const trackingUrl = getTrackingUrl(selectedOrder.trackingNumber || '', selectedOrder.trackingCompany);
                         copyTrackingToClipboard(trackingUrl, 'url');
                       }}
                       className="p-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                       style={{
                         background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                         backdropFilter: 'blur(25px) saturate(180%)',
                         border: '1px solid rgba(59, 130, 246, 0.4)',
                         boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                       }}
                       title="Copy carrier tracking link"
                     >
                       <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                       </svg>
                     </button>
                     {copiedTracking === 'url' && (
                       <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                         Link Copied!
                       </div>
                     )}
                   </div>
                   <button
                     onClick={() => setShowTrackingModal(false)}
                     className="px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                     style={{
                       background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                       backdropFilter: 'blur(25px) saturate(180%)',
                       border: '1px solid rgba(75, 85, 99, 0.4)',
                       boxShadow: 'rgba(75, 85, 99, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                     }}
                   >
                     Close
                   </button>
                 </div>
              </div>
            </div>
          </div>
        )}
        
        {/* EasyPost Shipping Modal */}
        {showEasyPostModal && easyPostOrder && (
          <EasyPostShipping
            order={{
              id: easyPostOrder.id,
              orderNumber: easyPostOrder.orderNumber || '',
              customerFirstName: easyPostOrder.customerFirstName || '',
              customerLastName: easyPostOrder.customerLastName || '',
              customerEmail: easyPostOrder.customerEmail || '',
              shippingAddress: easyPostOrder.shippingAddress || {},
              items: easyPostOrder.items || []
            }}
            onClose={() => {
              setShowEasyPostModal(false);
              setEasyPostOrder(null);
            }}
            onLabelCreated={(labelData) => {
              console.log('Label created:', labelData);
              // Close the modal and return to order details
              setShowEasyPostModal(false);
              setEasyPostOrder(null);
              // Add this order to the set of orders with labels
              setOrdersWithLabels(prev => new Set(prev).add(easyPostOrder!.id));
              // Store the label URL for direct PDF access
              if (labelData.postage_label?.label_url) {
                setOrderLabelUrls(prev => new Map(prev).set(easyPostOrder!.id, labelData.postage_label.label_url));
              }
              // Refetch orders to update with tracking info
              refetch();
            }}
          />
        )}

        {/* Shipping Address Edit Modal */}
        {editingShippingAddress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                 style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   border: '1px solid rgba(255, 255, 255, 0.1)',
                   boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                   backdropFilter: 'blur(12px)'
                 }}>
              <h3 className="text-xl font-bold text-white mb-4">Edit Shipping Address</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                    <input
                      type="text"
                      id="first_name"
                      value={shippingAddressForm.first_name}
                      onChange={(e) => setShippingAddressForm({...shippingAddressForm, first_name: e.target.value})}
                      className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      id="last_name"
                      value={shippingAddressForm.last_name}
                      onChange={(e) => setShippingAddressForm({...shippingAddressForm, last_name: e.target.value})}
                      className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-1">Company</label>
                  <input
                    type="text"
                    id="company"
                    value={shippingAddressForm.company}
                    onChange={(e) => setShippingAddressForm({...shippingAddressForm, company: e.target.value})}
                    className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>
                
                <div>
                  <label htmlFor="address1" className="block text-sm font-medium text-gray-300 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    id="address1"
                    value={shippingAddressForm.address1}
                    onChange={(e) => setShippingAddressForm({...shippingAddressForm, address1: e.target.value})}
                    className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>
                
                <div>
                  <label htmlFor="address2" className="block text-sm font-medium text-gray-300 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    id="address2"
                    value={shippingAddressForm.address2}
                    onChange={(e) => setShippingAddressForm({...shippingAddressForm, address2: e.target.value})}
                    className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">City</label>
                    <input
                      type="text"
                      id="city"
                      value={shippingAddressForm.city}
                      onChange={(e) => setShippingAddressForm({...shippingAddressForm, city: e.target.value})}
                      className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-1">State</label>
                    <input
                      type="text"
                      id="state"
                      value={shippingAddressForm.state}
                      onChange={(e) => setShippingAddressForm({...shippingAddressForm, state: e.target.value})}
                      className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zip" className="block text-sm font-medium text-gray-300 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      id="zip"
                      value={shippingAddressForm.zip}
                      onChange={(e) => setShippingAddressForm({...shippingAddressForm, zip: e.target.value})}
                      className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                    <input
                      type="text"
                      id="country"
                      value={shippingAddressForm.country}
                      onChange={(e) => setShippingAddressForm({...shippingAddressForm, country: e.target.value})}
                      className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                        backdropFilter: 'blur(12px)'
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    id="phone"
                    value={shippingAddressForm.phone}
                    onChange={(e) => setShippingAddressForm({...shippingAddressForm, phone: e.target.value})}
                    className="text-white rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                </div>
              </div>
              
              {shippingAddressError && (
                <div className="text-red-400 text-sm mt-4">{shippingAddressError}</div>
              )}
              {shippingAddressSuccess && (
                <div className="text-green-400 text-sm mt-4">Shipping address updated successfully!</div>
              )}
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={handleCloseShippingModal}
                  className="px-4 py-2 text-white rounded hover:bg-gray-700 transition-colors"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveShippingAddress}
                  className="px-4 py-2 text-white rounded transition-colors"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                  disabled={shippingAddressLoading}
                >
                  {shippingAddressLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ship Order Modal */}
        {selectedOrder && (
          <ShipOrderModal
            isOpen={showShipOrderModal}
            onClose={() => setShowShipOrderModal(false)}
            order={{
              id: selectedOrder.id,
              orderNumber: selectedOrder.orderNumber,
              customerFirstName: selectedOrder.customerFirstName,
              customerLastName: selectedOrder.customerLastName,
              customerEmail: selectedOrder.customerEmail
            }}
            onOrderUpdated={() => {
              refetch();
              setShowShipOrderModal(false);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
} 