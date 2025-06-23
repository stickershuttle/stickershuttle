import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, gql } from '@apollo/client';
import { getSupabase } from '../../lib/supabase';
import ProofUpload from '@/components/ProofUpload';


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

// Admin check - add your admin email(s) here
const ADMIN_EMAILS = ['justin@stickershuttle.com']; // Add all admin emails here

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
  }>;
}

// Define column configuration
const defaultColumns = [
  { id: 'status', name: 'Status', width: 'pl-6 pr-3', align: 'left' },
  { id: 'image', name: 'Image', width: 'px-3', align: 'left' },
  { id: 'total', name: 'Total', width: 'px-3', align: 'left' },
  { id: 'order', name: 'Order', width: 'px-3', align: 'left' },
  { id: 'customer', name: 'Customer', width: 'px-3', align: 'left' },
  { id: 'qty', name: 'QTY', width: 'px-3', align: 'left' },
  { id: 'items', name: 'Items', width: 'pl-4 pr-2', align: 'left' },
  { id: 'shape', name: 'Shape', width: 'px-2', align: 'left' },
  { id: 'material', name: 'Material', width: 'px-2', align: 'left' },
  { id: 'size', name: 'Size', width: 'px-2', align: 'left' },
  { id: 'notes', name: 'Notes', width: 'px-3', align: 'left' },
  { id: 'actions', name: 'Actions', width: 'px-6', align: 'center' }
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
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('all');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: null as Date | null, end: null as Date | null });
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sendingProofs, setSendingProofs] = useState(false);
  const [proofsSent, setProofsSent] = useState<{ [key: string]: boolean }>({});
  const [newProofsCount, setNewProofsCount] = useState<{ [key: string]: number }>({});

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
      order.customerEmail === customerEmail
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
      .filter((o: Order) => o.customerEmail === order.customerEmail)
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

    // Apply status filter
    if (filterStatus !== 'all') {
      orders = orders.filter(order => {
        switch (filterStatus) {
          case 'building':
            return !order.proof_status || order.proof_status === 'building' || order.proof_status === 'pending';
          case 'awaiting':
            return order.proof_status === 'awaiting_approval';
          case 'approved':
            return order.proof_status === 'approved';
          case 'label-created':
            return order.proof_status === 'approved' && order.trackingNumber && !order.proof_status?.includes('shipped');
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
          orderId,
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

  // Get proof status (updated with shipping statuses)
  const getProofStatus = (order: Order) => {
    // Check the actual proof_status from the database
    if (order.proof_status === 'awaiting_approval') {
      return 'Awaiting Approval';
    }
    if (order.proof_status === 'approved') {
      // Check if label has been created
      if (order.trackingNumber && !order.proof_status?.includes('shipped')) {
        return 'Label Created';
      }
      return 'Proof Approved';
    }
    if (order.proof_status === 'shipped' || (order.fulfillmentStatus === 'partial' && order.trackingNumber)) {
      return 'Shipped';
    }
    if (order.orderStatus === 'Out for Delivery' || order.fulfillmentStatus === 'out_for_delivery') {
      return 'Out for Delivery';
    }
    if (order.orderStatus === 'Delivered' || order.fulfillmentStatus === 'fulfilled') {
      return 'Delivered';
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
      case 'Proof Approved':
        return 'bg-green-900 bg-opacity-40 text-green-300';
      case 'Label Created':
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
        variables: { orderId }
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

  // Print order slip
  const printOrderSlip = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build items HTML separately to avoid complex template literal nesting
    const itemsHtml = order.items.map(item => {
      const selections = item.calculatorSelections || {};
      const size = selections.size || selections.sizePreset || {};

      let specsHtml = '';
      if (selections.cut?.displayValue) {
        specsHtml += `Cut: ${selections.cut.displayValue}<br>`;
      }
      if (selections.material?.displayValue) {
        specsHtml += `Material: ${selections.material.displayValue}<br>`;
      }
      if (size.width && size.height) {
        specsHtml += `Size: ${size.width}" × ${size.height}"`;
      } else if (size.displayValue) {
        specsHtml += size.displayValue;
      }

      return `<tr>
        <td>${item.productName}</td>
        <td>${specsHtml}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.totalPrice)}</td>
      </tr>`;
    }).join('');

    const orderSlipHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Order Slip - ${order.orderNumber || order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #030140; margin-bottom: 10px; }
    .order-number { font-size: 18px; margin: 10px 0; }
    .section { margin: 20px 0; border: 1px solid #ccc; padding: 15px; }
    .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #030140; }
    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .label { font-weight: bold; color: #666; }
    .value { color: #000; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .items-table th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ccc; }
    .items-table td { padding: 10px; border: 1px solid #ccc; }
    .total-section { text-align: right; margin-top: 20px; font-size: 18px; }
    .notes { background: #fffbf0; padding: 15px; margin-top: 20px; border: 1px solid #f0d0a0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">STICKER SHUTTLE</div>
    <div class="order-number">Order #${order.orderNumber || order.id.split('-')[0].toUpperCase()}</div>
    <div>Date: ${formatDate(order.orderCreatedAt)}</div>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="info-row">
      <span class="label">Name:</span>
      <span class="value">${order.customerFirstName} ${order.customerLastName}</span>
    </div>
    <div class="info-row">
      <span class="label">Email:</span>
      <span class="value">${order.customerEmail}</span>
    </div>
    ${order.customerPhone ? `<div class="info-row">
      <span class="label">Phone:</span>
      <span class="value">${order.customerPhone}</span>
    </div>` : ''}
  </div>

  ${order.shippingAddress ? `<div class="section">
    <div class="section-title">Shipping Address</div>
    <div>${order.shippingAddress.first_name} ${order.shippingAddress.last_name}</div>
    <div>${order.shippingAddress.address1}</div>
    ${order.shippingAddress.address2 ? `<div>${order.shippingAddress.address2}</div>` : ''}
    <div>${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.zip}</div>
    <div>${order.shippingAddress.country}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Order Items</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Specifications</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  </div>

  <div class="total-section">
    <strong>Total: ${formatCurrency(order.totalPrice)}</strong>
  </div>

  ${order.orderNote ? `<div class="notes">
    <div class="section-title">Order Notes</div>
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
          background-color: rgba(255, 255, 255, 0.08) !important;
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
      `}</style>
      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        {/* Main Content */}
        <div className="pt-8 pb-8">
          <div className="w-full px-6">
            {!selectedOrder ? (
              // Orders List View
              <>
                {/* Analytics Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Total Sales</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold transition-all duration-200 hover:scale-105" style={{ color: '#86efac' }}>
                          {formatCurrency(data?.getAllOrders?.reduce((sum: number, order: Order) => sum + order.totalPrice, 0) || 0)}
                        </p>
                        <p className="text-xs text-green-400 mt-1">↑ 23%</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Avg Order Value</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold transition-all duration-200 hover:scale-105" style={{ color: '#86efac' }}>
                          {formatCurrency(
                            data?.getAllOrders?.length
                              ? (data.getAllOrders.reduce((sum: number, order: Order) => sum + order.totalPrice, 0) / data.getAllOrders.length)
                              : 0
                          )}
                        </p>
                        <p className="text-xs text-green-400 mt-1">↑ 23%</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Orders</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white transition-all duration-200 hover:scale-105">{data?.getAllOrders?.length || 0}</p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>—</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] glass-container">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Conversion Rate</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white transition-all duration-200 hover:scale-105">2.9%</p>
                        <p className="text-xs text-green-400 mt-1">↑ 31%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Filters */}
                <div className="flex justify-end items-center gap-3 mb-4">
                  {/* Filter Dropdown */}
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm"
                      aria-label="Filter orders by status"
                    >
                      <option value="all">All Orders</option>
                      <option value="building">Building</option>
                      <option value="awaiting">Awaiting Approval</option>
                      <option value="approved">Approved</option>
                      <option value="label-created">Label Created</option>
                      <option value="shipped">Shipped</option>
                      <option value="out-for-delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
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
                      style={{ minWidth: '200px' }}
                    />
                    <svg className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="rounded-2xl overflow-hidden glass-container">
                  <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
                    <table className="min-w-full">
                      <thead
                        className="border-b border-gray-700 sticky top-0 z-20"
                        style={{
                          backgroundColor: 'rgba(3, 1, 64, 0.98)',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 1px 0 rgba(255, 255, 255, 0.1), 0 -1px 0 rgba(255, 255, 255, 0.1)'
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
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Notes
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          // Get first item's image for preview
                          const firstItemImage = order.items[0]?.customFiles?.[0] || null;
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
                                backgroundColor: 'transparent'
                              }}
                              onClick={() => selectOrder(order)}
                            >
                              {/* Status */}
                              <td className="pl-6 pr-3 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`rounded-full ${getProofStatusColor(getProofStatus(order))}`}
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      minWidth: '8px',
                                      minHeight: '8px',
                                      boxShadow: '0 0 10px currentColor'
                                    }}
                                  ></div>
                                  <span className="text-xs text-gray-300 font-medium">{getProofStatus(order)}</span>
                                </div>
                              </td>
                              {/* Image Preview */}
                              <td className="px-3 py-4">
                                <div
                                  className="rounded-lg relative overflow-hidden flex items-center justify-center"
                                  style={{
                                    width: '64px',
                                    height: '64px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}
                                >
                                  {firstItemImage ? (
                                    <img
                                      src={firstItemImage}
                                      alt="Design preview"
                                      className="w-full h-full object-contain p-4"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-gray-500 text-xs">No image</span>
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
                                  {order.items.map((item: any, idx: number) => (
                                    <div key={idx}>
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-purple-300"
                                        style={{ backgroundColor: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                                        {item.productName}
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
                              {/* Notes */}
                              <td className="px-3 py-4">
                                <div className="max-w-xs">
                                  {order.orderNote ? (
                                    <span className="text-sm text-gray-300 line-clamp-2" title={order.orderNote}>
                                      {order.orderNote}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500">-</span>
                                  )}
                                </div>
                              </td>
                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectOrder(order);
                                    }}
                                    className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500 hover:bg-opacity-10 transition-all"
                                    title="View Order Details"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      printOrderSlip(order);
                                    }}
                                    className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500 hover:bg-opacity-10 transition-all"
                                    title="Print Order Slip"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/admin/shipping-labels/${order.orderNumber || order.id.split('-')[0].toUpperCase()}`);
                                    }}
                                    className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500 hover:bg-opacity-10 transition-all"
                                    title="Create Shipping Label"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </button>
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
              // Order Details View - Shopify-style layout
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
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
                        className={`rounded-full ${getProofStatusColor(getProofStatus(selectedOrder))}`}
                        style={{
                          width: '8px',
                          height: '8px',
                          minWidth: '8px',
                          minHeight: '8px',
                          boxShadow: '0 0 8px currentColor'
                        }}
                      ></div>
                      <span className="text-xs font-medium text-gray-300">{getProofStatus(selectedOrder)}</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <button
                      onClick={() => printOrderSlip(selectedOrder)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all hover:bg-opacity-80 cursor-pointer hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)'
                      }}
                    >
                      <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Order Slip
                    </button>
                    <button
                      onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-black transition-all hover:bg-opacity-80 cursor-pointer hover:scale-105"
                      style={{
                        backgroundColor: '#EAB308',
                        border: '1px solid #CA8A04'
                      }}
                    >
                      <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Create Shipping Label
                    </button>
                  </div>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Order Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Order Summary */}
                    <div className="glass-container p-6">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-semibold text-white">Order Summary</h3>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.financialStatus)}`}>
                          {selectedOrder.financialStatus}
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
                          const itemImage = item.customFiles?.[0] || null;

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
                            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white transition-all hover:bg-opacity-80 cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            style={{
                              backgroundColor: selectedOrder.proofs && selectedOrder.proofs.length > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(75, 85, 99, 0.2)',
                              border: `1px solid ${selectedOrder.proofs && selectedOrder.proofs.length > 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(75, 85, 99, 0.4)'}`
                            }}
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Proofs
                          </button>
                        )}

                        <button
                          onClick={() => router.push(`/admin/shipping-labels/${selectedOrder.orderNumber || selectedOrder.id.split('-')[0].toUpperCase()}`)}
                          className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-black transition-all hover:bg-opacity-80 cursor-pointer hover:scale-105"
                          style={{
                            backgroundColor: '#EAB308',
                            border: '1px solid #CA8A04'
                          }}
                        >
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Create Shipping Label
                        </button>
                      </div>
                    </div>

                    {/* Proof Upload Section */}
                    <div className="glass-container p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Design Proofs
                        </h3>
                        
                        {/* Cut Lines Selection - Moved to top right */}
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm">Include cut lines in proofs:</span>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 rounded-full text-xs font-medium transition-all border flex items-center gap-2 bg-green-500/20 text-green-300 border-green-400/50"
                            >
                              <div className="w-4 h-0.5" style={{ backgroundColor: '#91c848' }}></div>
                              Green Cut Line
                            </button>
                            <button
                              className="px-3 py-1 rounded-full text-xs font-medium transition-all border flex items-center gap-2 bg-gray-600/20 text-gray-500 border-gray-600/50"
                            >
                              <div className="w-4 h-0.5" style={{ backgroundColor: '#9ca3af' }}></div>
                              Grey Cut Line
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <ProofUpload
                        orderId={selectedOrder.id}
                        proofStatus={selectedOrder.proof_status}
                        existingProofs={selectedOrder.proofs}
                        isAdmin={true}
                        orderItems={selectedOrder.items}
                        hideCutLinesSection={true}
                        onProofUploaded={(proof) => {
                          console.log('Proof uploaded:', proof);
                          // Refetch data to get updated proof information
                          refetch();
                          
                          // Handle different proof actions
                          if (proof.removed) {
                            // Remove proof from local state
                            setSelectedOrder(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                proofs: (prev.proofs || []).filter(p => p.id !== proof.proofId)
                              };
                            });
                          } else if (proof.replaced) {
                            // Just refetch for replacements since proof ID stays the same
                            // The refetch above will handle the update
                          } else if (proof.sent) {
                            // Proofs were sent - refetch will handle the status updates
                            // Reset new proofs count since they've been sent
                            setNewProofsCount(prev => ({ ...prev, [selectedOrder.id]: 0 }));
                            // Mark proofs as sent in local state
                            setProofsSent(prev => ({ ...prev, [selectedOrder.id]: true }));
                          } else {
                            // Add new proof to local state
                            setSelectedOrder(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                proofs: [...(prev.proofs || []), proof]
                              };
                            });
                            // Track that we have a new proof for this order
                            setNewProofsCount(prev => ({
                              ...prev,
                              [selectedOrder.id]: (prev[selectedOrder.id] || 0) + 1
                            }));
                          }
                        }}
                      />
                    </div>
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
                                  <p className="text-xs text-gray-400">Ready for production</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Current Status */}
                        {selectedOrder.proof_status === 'awaiting_approval' ? (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 animate-pulse"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">Awaiting customer approval</p>
                              <p className="text-xs text-gray-400">Customer is reviewing proofs</p>
                            </div>
                          </div>
                        ) : !selectedOrder.proof_sent_at && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 animate-pulse"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">Building proof</p>
                              <p className="text-xs text-gray-400">In progress</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>



      </div>
    </AdminLayout>
  );
} 