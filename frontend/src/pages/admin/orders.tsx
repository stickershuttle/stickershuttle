import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import ProofUpload from '@/components/ProofUpload';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';


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
      }
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        status
        customerNotes
        adminNotes
      }
    }
  }
`;

// Mutation to update order status
const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: String!, $statusUpdate: OrderStatusInput!) {
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
  mutation SendProofs($orderId: String!) {
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
  }>;
  proofs?: Array<{
    id: string;
    proofUrl: string;
    proofPublicId: string;
    proofTitle: string;
    uploadedAt: string;
    uploadedBy: string;
    status: string;
    customerNotes?: string;
    adminNotes?: string;
    approvedAt?: string;
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

  // Filter and sort orders
  const filteredOrders = React.useMemo(() => {
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

  // Handle order status update
  const handleStatusUpdate = async (orderId: string, statusType: string, value: string) => {
    try {
      const statusUpdate: any = {};
      statusUpdate[statusType] = value;

      await updateOrderStatus({
        variables: {
          orderId: String(orderId),
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



  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Download file
  const handleDownloadFile = (fileUrl: string, fileName?: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || fileUrl.split('/').pop() || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Get proof status (updated with shipping statuses)
  const getProofStatus = (order: Order) => {
    // Check if this is a sample pack order (skip proof system)
    if (isSamplePackOrder(order)) {
      if (order.orderStatus === 'Assume Delivered' || order.fulfillmentStatus === 'fulfilled') {
        return 'Assume Delivered';
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
        return 'Label Created';
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
      case 'Label Created':
        return 'bg-blue-900 bg-opacity-40 text-blue-300';
      case 'Label Printed':
        return 'bg-blue-900 bg-opacity-40 text-blue-300';
      case 'Shipped':
        return 'bg-purple-900 bg-opacity-40 text-purple-300';
      case 'Out for Delivery':
        return 'bg-indigo-900 bg-opacity-40 text-indigo-300';
      case 'Delivered':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'Assume Delivered':
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
      case 'Label Created':
        return '#93c5fd'; // blue-300
      case 'Label Printed':
        return '#93c5fd'; // blue-300
      case 'Shipped':
        return '#c4b5fd'; // purple-300
      case 'Out for Delivery':
        return '#a5b4fc'; // indigo-300
      case 'Delivered':
        return '#86efac'; // green-300
      case 'Assume Delivered':
        return '#86efac'; // green-300
      case 'Changes Requested':
        return '#fcd34d'; // amber-300
      default:
        return '#d1d5db'; // gray-300
    }
  };



  // Group items by product name and sum quantities
  const groupItemsByProduct = (items: Order['items']) => {
    const grouped = items.reduce((acc, item) => {
      const key = item.productName;
      if (!acc[key]) {
        acc[key] = { ...item, totalQuantity: 0 };
      }
      acc[key].totalQuantity += item.quantity;
      return acc;
    }, {} as Record<string, Order['items'][0] & { totalQuantity: number }>);
    
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
        variables: { orderId: String(orderId) }
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

  // Print order slip - formatted for 4x6 label
  const printOrderSlip = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build a compact items list for 4x6 format
    const itemsHtml = order.items.map(item => {
      const selections = item.calculatorSelections || {};
      const size = selections.size || selections.sizePreset || {};

      const specs = [];
      if (selections.cut?.displayValue) specs.push(selections.cut.displayValue);
      if (selections.material?.displayValue) specs.push(selections.material.displayValue);
      if (size.width && size.height) {
        specs.push(`${size.width}" × ${size.height}"`);
      } else if (size.displayValue) {
        specs.push(size.displayValue);
      }

      return `<div class="item-row">
        <div class="item-name">${item.productName} (${item.quantity})</div>
        <div class="item-specs">${specs.join(' • ')}</div>
      </div>`;
    }).join('');

    const orderSlipHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Order Label - ${order.orderNumber || order.id}</title>
  <style>
    @page { 
      size: 4in 6in; 
      margin: 0.25in; 
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 11px;
      line-height: 1.3;
      margin: 0;
      padding: 0;
      width: 3.5in;
      height: 5.5in;
      overflow: hidden;
    }
    .header { 
      text-align: center; 
      margin-bottom: 12px; 
      border-bottom: 2px solid #000; 
      padding-bottom: 8px; 
    }
    .logo { 
      font-size: 16px; 
      font-weight: bold; 
      color: #000; 
      margin-bottom: 4px; 
    }
    .order-number { 
      font-size: 14px; 
      font-weight: bold;
      margin: 2px 0; 
    }
    .date { 
      font-size: 9px; 
      color: #666;
    }
    .section { 
      margin-bottom: 10px; 
      font-size: 10px;
    }
    .section-title { 
      font-weight: bold; 
      font-size: 11px; 
      margin-bottom: 4px; 
      color: #000; 
      border-bottom: 1px solid #ccc;
      padding-bottom: 2px;
    }
    .customer-info {
      margin-bottom: 8px;
    }
    .customer-name {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 2px;
    }
    .customer-email {
      font-size: 9px;
      color: #666;
    }
    .address-line {
      margin: 1px 0;
      font-size: 10px;
    }
    .item-row {
      margin-bottom: 6px;
      padding: 4px;
      background: #f8f8f8;
      border-radius: 3px;
    }
    .item-name {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .item-specs {
      font-size: 9px;
      color: #666;
    }
    .total-section { 
      text-align: center; 
      margin-top: 10px; 
      font-size: 14px;
      font-weight: bold;
      border: 2px solid #000;
      padding: 6px;
      background: #f0f0f0;
    }
    .notes { 
      font-size: 9px;
      margin-top: 8px;
      padding: 4px;
      background: #fffbf0;
      border: 1px solid #ddd;
      border-radius: 3px;
    }
    .notes-title {
      font-weight: bold;
      margin-bottom: 2px;
    }
    @media print { 
      body { 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      } 
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">STICKER SHUTTLE</div>
    <div class="order-number">Order #${order.orderNumber || order.id.split('-')[0].toUpperCase()}</div>
    <div class="date">${formatDate(order.orderCreatedAt)}</div>
  </div>

  <div class="section customer-info">
    <div class="section-title">Customer</div>
    <div class="customer-name">${order.customerFirstName} ${order.customerLastName}</div>
    <div class="customer-email">${order.customerEmail}</div>
    ${order.customerPhone ? `<div class="customer-email">${order.customerPhone}</div>` : ''}
  </div>

  ${order.shippingAddress ? `<div class="section">
    <div class="section-title">Ship To</div>
    <div class="address-line">${order.shippingAddress.first_name} ${order.shippingAddress.last_name}</div>
    <div class="address-line">${order.shippingAddress.address1}</div>
    ${order.shippingAddress.address2 ? `<div class="address-line">${order.shippingAddress.address2}</div>` : ''}
    <div class="address-line">${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.zip}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Items</div>
    ${itemsHtml}
  </div>

  <div class="total-section">
    Total: ${formatCurrency(order.totalPrice)}
  </div>

  ${order.orderNote ? `<div class="notes">
    <div class="notes-title">Notes:</div>
    <div>${order.orderNote}</div>
  </div>` : ''}
</body>
</html>`;

    printWindow.document.write(orderSlipHtml);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
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
      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#030140' }}>
        {/* Main Content */}
        <div className="pt-8 pb-8">
          <div className="w-full pl-2 pr-8 lg:pl-2 lg:pr-8"> {/* Keep original right padding, reduce left */}
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
                  <div className="lg:hidden">
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
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
                  </div>
                </div>

                {/* Analytics & Sales Overview Container - Mobile Wall-to-Wall */}
                <div className="lg:glass-container lg:p-6 mb-6 -mx-8 lg:mx-0 lg:rounded-2xl">
                  {/* Analytics Cards - Mobile: 2x2 Grid, Desktop: 1x4 Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-6 px-4 lg:px-0">
                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 16px, rgba(255, 255, 255, 0.05) 0px 1px 0px inset',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total Sales</span>
                        <div className="p-1 lg:p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}>
                          <svg className="w-2 h-2 lg:w-3 lg:h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm lg:text-xl font-bold mb-1" style={{ color: '#86efac' }}>
                        {formatCurrency(timeFilteredAnalytics?.totalSales || 0)}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Revenue generated</div>
                    </div>

                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 16px, rgba(255, 255, 255, 0.05) 0px 1px 0px inset',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Average Order</span>
                        <div className="p-1 lg:p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                          <svg className="w-2 h-2 lg:w-3 lg:h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm lg:text-xl font-bold text-white mb-1">
                        {formatCurrency(timeFilteredAnalytics?.avgOrderValue || 0)}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Per order value</div>
                    </div>

                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 16px, rgba(255, 255, 255, 0.05) 0px 1px 0px inset',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Orders</span>
                        <div className="p-1 lg:p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)' }}>
                          <svg className="w-2 h-2 lg:w-3 lg:h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm lg:text-xl font-bold text-white mb-1">
                        {timeFilteredAnalytics?.totalOrders || 0}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Total orders placed</div>
                    </div>

                    <div 
                      className="p-2 lg:p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 16px, rgba(255, 255, 255, 0.05) 0px 1px 0px inset',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Stickers</span>
                        <div className="p-1 lg:p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)' }}>
                          <svg className="w-2 h-2 lg:w-3 lg:h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm lg:text-xl font-bold text-white mb-1">
                        {timeFilteredAnalytics?.totalStickers || 0}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">Units produced</div>
                    </div>
                  </div>

                  {/* Sales Chart - Hidden on mobile to save space */}
                  {timeFilteredAnalytics?.chartData && timeFilteredAnalytics.chartData.length > 0 && (
                    <div className="border-t border-gray-700 border-opacity-30 pt-4 hidden lg:block px-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-white">Sales Overview</h3>
                        <div className="text-sm text-gray-400">{getTimeFilterLabel(timeFilter)}</div>
                      </div>
                      <div className="h-16">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timeFilteredAnalytics.chartData}>
                            <defs>
                              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              stroke="rgba(255, 255, 255, 0.1)" 
                              vertical={false}
                            />
                            <XAxis 
                              dataKey="date" 
                              stroke="rgba(255, 255, 255, 0.4)"
                              fontSize={11}
                              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                              tickLine={false}
                            />
                            <YAxis 
                              stroke="rgba(255, 255, 255, 0.4)"
                              fontSize={11}
                              tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                              tickLine={false}
                              tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(3, 1, 64, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                              }}
                              labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}
                              itemStyle={{ color: '#fff' }}
                              formatter={(value: number, name: string) => {
                                if (name === 'sales') return [`$${value.toFixed(2)}`, 'Sales'];
                                if (name === 'orders') return [value, 'Orders'];
                                return [value, name];
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="sales" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#salesGradient)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile/Tablet Filters */}
                <div className="xl:hidden mb-4 px-4">
                  <div 
                    className="p-4 rounded-lg"
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
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'all' 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setFilterStatus('building')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'building' 
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Building
                    </button>
                    <button 
                      onClick={() => setFilterStatus('awaiting')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'awaiting' 
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Awaiting
                    </button>
                    <button 
                      onClick={() => setFilterStatus('approved')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'approved' 
                          ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Approved
                    </button>
                    <button 
                      onClick={() => setFilterStatus('label-printed')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'label-printed' 
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Label Printed
                    </button>
                    <button 
                      onClick={() => setFilterStatus('shipped')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'shipped' 
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Shipped
                    </button>
                    <button 
                      onClick={() => setFilterStatus('out-for-delivery')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                        filterStatus === 'out-for-delivery' 
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
                          : 'bg-transparent text-gray-400 border-gray-600'
                      }`}
                    >
                      Out for Delivery
                    </button>
                    <button 
                      onClick={() => setFilterStatus('delivered')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
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
                <div className="hidden xl:flex justify-end items-center gap-3 mb-4">
                  {/* Filter Dropdown */}
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none bg-transparent border border-white/20 rounded-xl px-4 py-2 pl-10 text-white text-sm font-medium focus:outline-none focus:border-purple-400 transition-all cursor-pointer hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 8px center',
                        backgroundSize: '16px',
                        paddingRight: '32px'
                      }}
                      aria-label="Filter orders by status"
                    >
                      <option value="all" style={{ backgroundColor: '#030140' }}>All Orders</option>
                      <option value="building" style={{ backgroundColor: '#030140' }}>Building</option>
                      <option value="awaiting" style={{ backgroundColor: '#030140' }}>Awaiting Approval</option>
                      <option value="approved" style={{ backgroundColor: '#030140' }}>Approved</option>
                      <option value="label-printed" style={{ backgroundColor: '#030140' }}>Label Printed</option>
                      <option value="shipped" style={{ backgroundColor: '#030140' }}>Shipped</option>
                      <option value="out-for-delivery" style={{ backgroundColor: '#030140' }}>Out for Delivery</option>
                      <option value="delivered" style={{ backgroundColor: '#030140' }}>Delivered</option>
                    </select>
                    <svg className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>

                  {/* Date Range Dropdown */}
                  <div className="relative">
                    <select
                      aria-label="Filter orders by date range"
                      value={dateRange}
                      onChange={(e) => {
                        setDateRange(e.target.value);
                        if (e.target.value === 'custom') {
                          setShowDatePicker(true);
                        }
                      }}
                      className="appearance-none bg-transparent border border-white/20 rounded-xl px-4 py-2 pl-10 text-white text-sm font-medium focus:outline-none focus:border-purple-400 transition-all cursor-pointer hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 8px center',
                        backgroundSize: '16px',
                        paddingRight: '32px'
                      }}
                    >
                      <option value="all" style={{ backgroundColor: '#030140' }}>All Time</option>
                      <option value="today" style={{ backgroundColor: '#030140' }}>Today</option>
                      <option value="week" style={{ backgroundColor: '#030140' }}>This Week</option>
                      <option value="month" style={{ backgroundColor: '#030140' }}>This Month</option>
                      <option value="quarter" style={{ backgroundColor: '#030140' }}>This Quarter</option>
                      <option value="year" style={{ backgroundColor: '#030140' }}>Year to Date</option>
                      <option value="last90" style={{ backgroundColor: '#030140' }}>Last 90 Days</option>
                      <option value="custom" style={{ backgroundColor: '#030140' }}>Custom Range...</option>
                    </select>
                    <svg className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent border border-white/20 rounded-xl px-4 py-2 pl-10 text-white text-sm placeholder-white/60 focus:outline-none focus:border-purple-400 transition-all"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        minWidth: '200px'
                      }}
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
                        <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-2">{date}</h3>
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
                                className="flex items-center px-2 py-4 cursor-pointer active:bg-white/5 transition-colors"
                                style={{
                                  borderBottom: orderIndex < orders.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
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
                                    
                                    {/* Print Action */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        printOrderSlip(order);
                                      }}
                                      className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                      title="Print Order Slip"
                                      aria-label="Print Order Slip"
                                    >
                                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                      </svg>
                                    </button>
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
                  <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
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
                          <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Material
                          </th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Size
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
                                backgroundColor: 'rgba(3, 1, 64, 0.3)'
                              }}
                              onClick={() => selectOrder(order)}
                            >
                              {/* Status */}
                              <td className="pl-2 pr-3 py-4">
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
                                            <img
                                              src={itemImage}
                                              alt="Design preview"
                                              className="w-full h-full object-contain p-2"
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
                              {/* Total */}
                              <td className="px-3 py-4">
                                <div className="text-base font-semibold" style={{ color: '#86efac' }}>
                                  {formatCurrency(order.totalPrice)}
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
                                    <div key={idx}>
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-purple-300"
                                        style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                                        {item.productName} {item.totalQuantity > 1 ? `x${item.totalQuantity}` : ''}
                                      </span>
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
                              <td className="px-2 py-4">
                                {firstItemSelections.material?.displayValue ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-green-300"
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

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      printOrderSlip(order);
                                    }}
                                    className="p-1.5 rounded-lg text-blue-300 transition-all"
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                                      backdropFilter: 'blur(25px) saturate(180%)',
                                      border: '1px solid rgba(59, 130, 246, 0.4)',
                                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                    }}
                                    title="Print Order Slip"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                  </button>
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
                                        border: '1px solid rgba(34, 197, 94, 0.4)',
                                        boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
                                        border: '1px solid rgba(34, 197, 94, 0.4)',
                                        boxShadow: 'rgba(34, 197, 94, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
                  </div>
                </div>
              </>
            ) : (
              // Order Details View
              <div className="max-w-7xl mx-auto">
                {/* Mobile/Tablet Header */}
                <div className="xl:hidden mb-4">
                  <div className="flex items-center gap-3 px-4 mb-3">
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
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.financialStatus)}`}>
                          {selectedOrder.financialStatus.charAt(0).toUpperCase() + selectedOrder.financialStatus.slice(1)}
                        </span>
                      </div>

                      {/* Order Items - Mobile Enhanced */}
                      <div className="space-y-4 mb-6">
                        {selectedOrder.items.map((item, idx) => {
                          const selections = item.calculatorSelections || {};
                          const size = selections.size || selections.sizePreset || {};
                          const itemImage = getProductImage(item);

                          return (
                            <div key={idx} className="py-4 border-b border-gray-700 border-opacity-30 last:border-b-0">
                              <div className="flex gap-4">
                                {/* Product Image */}
                                <div className="relative">
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
                                      <img
                                        src={itemImage}
                                        alt={`${item.productName} design`}
                                        className="w-full h-full object-contain p-4"
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

                                {/* Product Details */}
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-semibold text-white text-base">{item.productName}</h4>
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
                                  </div>

                                  {/* Additional Details */}
                                  {(item.customerNotes || item.instagramHandle) && (
                                    <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                      {item.customerNotes && (
                                        <div className="text-sm">
                                          <span className="text-gray-500">Note:</span>
                                          <span className="text-gray-300 ml-2">{item.customerNotes}</span>
                                        </div>
                                      )}
                                      {item.instagramHandle && (
                                        <div className="text-sm mt-1">
                                          <span className="text-gray-500">Instagram:</span>
                                          <span className="text-gray-300 ml-2">@{item.instagramHandle}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
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

                    {/* Mobile Action Buttons */}
                    <div className="mt-4 space-y-2">
                      {selectedOrder.trackingNumber ? (
                        <button
                          onClick={() => handleViewTracking(selectedOrder)}
                          className="w-full py-3 rounded-lg text-sm font-medium text-white"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
                          }}
                        >
                          View Tracking
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                          className="w-full py-3 rounded-lg text-sm font-medium text-white"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                            backdropFilter: 'blur(25px) saturate(180%)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset',
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

                  {/* Status Badge and Action Buttons */}
                  <div className="flex items-center gap-3">
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
                    
                    {/* Action Buttons */}
                    <button
                      onClick={() => printOrderSlip(selectedOrder)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
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
                    {selectedOrder.trackingNumber ? (
                      <button
                        onClick={() => handleViewTracking(selectedOrder)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(75, 85, 99, 0.4)',
                          boxShadow: 'rgba(75, 85, 99, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        View Tracking
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(234, 179, 8, 0.25) 50%, rgba(234, 179, 8, 0.1) 100%)',
                          backdropFilter: 'blur(25px) saturate(180%)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          boxShadow: 'rgba(234, 179, 8, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                        }}
                      >
                        <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Create Shipping Label
                      </button>
                    )}
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
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.financialStatus)}`}>
                          {selectedOrder.financialStatus.charAt(0).toUpperCase() + selectedOrder.financialStatus.slice(1)}
                        </span>
                      </div>

                      {/* Shipping Choice Section - Inside Order Summary */}
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
                        <p className="text-sm text-gray-300 ml-6">UPS Ground (2-3 Days)</p>
                      </div>

                      {/* Order Items - Enhanced */}
                      <div className="space-y-4 mb-6">
                        {selectedOrder.items.map((item, idx) => {
                          const selections = item.calculatorSelections || {};
                          const size = selections.size || selections.sizePreset || {};
                          const itemImage = getProductImage(item);

                          return (
                            <div key={idx} className="py-4 border-b border-gray-700 border-opacity-30 last:border-b-0">
                              <div className="flex gap-4">
                                {/* Product Image */}
                                <div className="relative">
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
                                      <img
                                        src={itemImage}
                                        alt={`${item.productName} design`}
                                        className="w-full h-full object-contain p-4"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
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
                                    <div>
                                      <h4 className="font-semibold text-white text-base">{item.productName}</h4>
                                      <p className="text-sm text-gray-400 mt-1">SKU: {item.sku || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-white">{formatCurrency(item.totalPrice)}</p>
                                      <p className="text-sm text-gray-400">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                                    </div>
                                  </div>

                                  {/* Specifications Grid */}
                                  <div className="grid grid-cols-3 gap-3 mt-3">
                                    {selections.cut?.displayValue && (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Shape</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-blue-300"
                                          style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                          {selections.cut.displayValue}
                                        </span>
                                      </div>
                                    )}
                                    {selections.material?.displayValue && (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Material</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-green-300"
                                          style={{ backgroundColor: 'rgba(145, 200, 72, 0.2)', border: '1px solid rgba(145, 200, 72, 0.3)' }}>
                                          {selections.material.displayValue}
                                        </span>
                                      </div>
                                    )}
                                    {(size.width && size.height) || size.displayValue ? (
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Size</span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-orange-300"
                                          style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                                          {size.width && size.height ? `${size.width}" × ${size.height}"` : size.displayValue}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>

                                  {/* Additional Details */}
                                  {(item.customerNotes || item.instagramHandle || item.customerReplacementFile) && (
                                    <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                                      {item.customerNotes && (
                                        <div className="text-sm">
                                          <span className="text-gray-500">Customer Note:</span>
                                          <span className="text-gray-300 ml-2">{item.customerNotes}</span>
                                        </div>
                                      )}
                                      {item.instagramHandle && (
                                        <div className="text-sm mt-1">
                                          <span className="text-gray-500">Instagram:</span>
                                          <span className="text-gray-300 ml-2">@{item.instagramHandle}</span>
                                          {item.instagramOptIn && (
                                            <span className="ml-2 text-xs text-green-400">(Opted in for marketing)</span>
                                          )}
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
                                                onClick={() => handleDownloadFile(item.customerReplacementFile!, item.customerReplacementFileName)}
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
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Summary Actions */}
                      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-700 border-opacity-30">
                        {/* Hide proof actions for sample packs */}
                        {!isSamplePackOrder(selectedOrder) && (
                          <>
                            {/* Show Send Proofs if proofs haven't been sent, otherwise show View Proofs */}
                            {!selectedOrder.proof_sent_at && selectedOrder.proofs && selectedOrder.proofs.length > 0 ? (
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
                          <button
                            onClick={async () => {
                              if (selectedOrder.proofs && selectedOrder.proofs.length > 0) {
                                // Open proof viewer/gallery
                                window.open(selectedOrder.proofs[0].proofUrl, '_blank');
                              }
                            }}
                            disabled={!selectedOrder.proofs || selectedOrder.proofs.length === 0}
                            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            style={{
                              background: selectedOrder.proofs && selectedOrder.proofs.length > 0 
                                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)'
                                : 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: `1px solid ${selectedOrder.proofs && selectedOrder.proofs.length > 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(75, 85, 99, 0.4)'}`,
                              boxShadow: selectedOrder.proofs && selectedOrder.proofs.length > 0 
                                ? 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                                : 'rgba(75, 85, 99, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                            }}
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Proofs
                          </button>
                        )}

                        {selectedOrder.trackingNumber ? (
                          <button
                            onClick={() => handleViewTracking(selectedOrder)}
                            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all cursor-pointer hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.4) 0%, rgba(75, 85, 99, 0.25) 50%, rgba(75, 85, 99, 0.1) 100%)',
                              backdropFilter: 'blur(25px) saturate(180%)',
                              border: '1px solid rgba(75, 85, 99, 0.4)',
                              boxShadow: 'rgba(75, 85, 99, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              boxShadow: 'rgba(234, 179, 8, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
                                  border: '1px solid rgba(75, 85, 99, 0.4)',
                                  boxShadow: 'rgba(75, 85, 99, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
                                  border: '1px solid rgba(234, 179, 8, 0.4)',
                                  boxShadow: 'rgba(234, 179, 8, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
                                className="rounded-lg overflow-hidden aspect-square p-2 cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                                onClick={() => window.open(proof.proofUrl, '_blank')}
                              >
                                <img 
                                  src={proof.proofUrl} 
                                  alt={proof.proofTitle}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white truncate">{proof.proofTitle}</p>
                                <p className="text-xs text-green-400">✓ Approved</p>
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
                          <p className="text-sm text-gray-400 mt-1">{selectedOrder.userId ? 'Registered Customer' : 'Guest Checkout'}</p>
                          
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
                      </div>
                                        </div>

                    {/* Shipping Address */}
                    {selectedOrder.shippingAddress && (
                      <div className="glass-container p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Shipping Address
                        </h3>
                        <div className="text-sm text-gray-300 space-y-1">
                          {(selectedOrder.shippingAddress.first_name || selectedOrder.shippingAddress.last_name) && (
                            <p className="font-medium text-white">
                              {selectedOrder.shippingAddress.first_name} {selectedOrder.shippingAddress.last_name}
                            </p>
                          )}
                          {selectedOrder.shippingAddress.company && (
                            <p className="text-gray-300">{selectedOrder.shippingAddress.company}</p>
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



                    {/* Order Notes */}
                    {selectedOrder.orderNote && (
                      <div className="glass-container p-6">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          Order Notes
                        </h3>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedOrder.orderNote}</p>
                      </div>
                    )}

                    {/* Order Timeline */}
                    <div className="glass-container p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Timeline
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">Order placed</p>
                            <p className="text-xs text-gray-400">{formatDate(selectedOrder.orderCreatedAt)}</p>
                          </div>
                        </div>
                        {selectedOrder.financialStatus === 'paid' && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">Payment confirmed</p>
                              <p className="text-xs text-gray-400">{formatDate(selectedOrder.orderCreatedAt)}</p>
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
                            
                            {selectedOrder.proof_status === 'approved' && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">Proofs approved by customer</p>
                                  <p className="text-xs text-gray-400">
                                    {(() => {
                                      const approvedProof = selectedOrder.proofs?.find(p => p.approvedAt);
                                      return approvedProof?.approvedAt ? 
                                        new Date(approvedProof.approvedAt).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }) : 'Customer approved the design';
                                    })()}
                                  </p>
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
                              <p className="text-sm font-medium text-white flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Package delivered
                              </p>
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
                       border: '1px solid rgba(234, 179, 8, 0.4)',
                       boxShadow: 'rgba(234, 179, 8, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
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
      </div>
    </AdminLayout>
  );
} 