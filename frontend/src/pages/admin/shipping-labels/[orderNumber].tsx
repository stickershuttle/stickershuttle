import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client';
import AdminLayout from '../../../components/AdminLayout';
import { getSupabase } from '../../../lib/supabase';
import { GET_ORDER_BY_NUMBER } from '../../../lib/order-mutations';
import { CREATE_EASYPOST_SHIPMENT, BUY_EASYPOST_LABEL } from '../../../lib/easypost-mutations';

const ADMIN_EMAILS = ['justin@stickershuttle.com']; // Add all admin emails here

// Preset package dimensions (comprehensive list with old and new dimensions)
const PACKAGE_PRESETS = [
  // Most Popular Section
  { id: 'bubble-mailer', name: 'Bubble Mailer', dimensions: '10.5 × 7.5 × 1 in, 1 lb', length: 10.5, width: 7.5, height: 1, weight: 1, mostPopular: true },
  { id: '4x4x4', name: '4 × 4 × 4', dimensions: '4 × 4 × 4 in, 1 lb', length: 4, width: 4, height: 4, weight: 1, mostPopular: true },
  { id: '6x4x4', name: '6 × 4 × 4', dimensions: '6 × 4 × 4 in, 1 lb', length: 6, width: 4, height: 4, weight: 1, mostPopular: true },
  
  // Standard Packages
  { id: 'envelope', name: 'Envelope', dimensions: '9.5 × 6.5 × 1 in, 1 lb', length: 9.5, width: 6.5, height: 1, weight: 1 },
  { id: '4x4x36', name: '4 × 4 × 36', dimensions: '4 × 4 × 36 in, 3 lb', length: 4, width: 4, height: 36, weight: 3 },
  { id: '6x6x6', name: '6 × 6 × 6', dimensions: '6 × 6 × 6 in, 2 lb', length: 6, width: 6, height: 6, weight: 2 },
  { id: '8x6x4', name: '8 × 6 × 4', dimensions: '8 × 6 × 4 in, 2 lb', length: 8, width: 6, height: 4, weight: 2 },
  { id: '8x8x8', name: '8 × 8 × 8', dimensions: '8 × 8 × 8 in, 3 lb', length: 8, width: 8, height: 8, weight: 3 },
  { id: '10x8x6', name: '10 × 8 × 6', dimensions: '10 × 8 × 6 in, 3 lb', length: 10, width: 8, height: 6, weight: 3 },
  { id: '10x10x10', name: '10 × 10 × 10', dimensions: '10 × 10 × 10 in, 5 lb', length: 10, width: 10, height: 10, weight: 5 },
  { id: '12x9x6', name: '12 × 9 × 6', dimensions: '12 × 9 × 6 in, 3 lb', length: 12, width: 9, height: 6, weight: 3 },
  { id: '14x11x8', name: '14 × 11 × 8', dimensions: '14 × 11 × 8 in, 8 lb', length: 14, width: 11, height: 8, weight: 8 },
  { id: '16x12x8', name: '16 × 12 × 8', dimensions: '16 × 12 × 8 in, 10 lb', length: 16, width: 12, height: 8, weight: 10 },
  { id: '18x12x6', name: '18 × 12 × 6', dimensions: '18 × 12 × 6 in, 4 lb', length: 18, width: 12, height: 6, weight: 4 },
  { id: '20x14x10', name: '20 × 14 × 10', dimensions: '20 × 14 × 10 in, 15 lb', length: 20, width: 14, height: 10, weight: 15 }
];

// Carrier logo components
const UPSLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} rounded flex items-center justify-center overflow-hidden`}>
    <img 
      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750366915/ups-logo-png-transparent_fpyiwe.png"
      alt="UPS Logo"
      className="w-full h-full object-contain"
    />
  </div>
);

const USPSLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} rounded flex items-center justify-center overflow-hidden`}>
    <img 
      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750366914/USPS-Logo_lnyobe.png"
      alt="USPS Logo"
      className="w-full h-full object-contain"
    />
  </div>
);

const FedExLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} rounded flex items-center justify-center overflow-hidden`}>
    <img 
      src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1750366916/purepng.com-fedex-logologobrand-logoiconslogos-251519939539h7rji_lru3bi.png"
      alt="FedEx Logo"
      className="w-full h-full object-contain"
    />
  </div>
);

const getCarrierLogo = (carrier: string) => {
  switch (carrier.toUpperCase()) {
    case 'UPS':
    case 'UPSDAP':
      return <UPSLogo />;
    case 'USPS':
      return <USPSLogo />;
    case 'FEDEX':
    case 'FEDEXDEFAULT':
      return <FedExLogo />;
    default:
      return (
        <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {carrier.charAt(0)}
          </span>
        </div>
      );
  }
};

interface Order {
  id: string;
  orderNumber?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: any;
  billingAddress?: any;
  totalPrice: number;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export default function ShippingLabels() {
  const router = useRouter();
  const { orderNumber } = router.query;
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(PACKAGE_PRESETS.find(p => p.mostPopular) || PACKAGE_PRESETS[0]);
  const [customWeight, setCustomWeight] = useState('');
  const [shippingStep, setShippingStep] = useState<'package' | 'loading' | 'rates' | 'purchasing' | 'complete' | 'error'>('package');
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [insurance, setInsurance] = useState<string>('');
  const [shippingError, setShippingError] = useState<string>('');
  const [labelData, setLabelData] = useState<any>(null);
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('UPS');
  const [showAllRatesForCarrier, setShowAllRatesForCarrier] = useState(false);
  const [isCarrierDropdownOpen, setIsCarrierDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCarrierDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.carrier-dropdown')) {
          setIsCarrierDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCarrierDropdownOpen]);

  const { data: orderData, loading: orderLoading, error: orderError } = useQuery(GET_ORDER_BY_NUMBER, {
    variables: { orderNumber },
    skip: !orderNumber
  });

  const [createShipment] = useMutation(CREATE_EASYPOST_SHIPMENT);
  const [buyLabel] = useMutation(BUY_EASYPOST_LABEL);

  // Check admin access
  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push('/login?message=Admin access required');
          return;
        }

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

  const order = orderData?.getOrderByNumber;

  const handleCreateShipment = async () => {
    if (!order) return;

    try {
      setShippingStep('loading');
      setShippingError('');

      // Validate package dimensions
      const weight = customWeight ? parseFloat(customWeight) : selectedPackage.weight;
      if (isNaN(weight) || weight <= 0) {
        setShippingError('Please enter a valid weight greater than 0');
        setShippingStep('error');
        return;
      }

      const packageDimensions = {
        length: selectedPackage.length,
        width: selectedPackage.width,
        height: selectedPackage.height,
        weight: weight
      };

      // Enhanced debugging for tracking the issue
      console.log('🔍 FRONTEND DEBUG - Package Selection Details:');
      console.log('  - Selected Package ID:', selectedPackage.id);
      console.log('  - Selected Package Name:', selectedPackage.name);
      console.log('  - Original Dimensions:', selectedPackage);
      console.log('  - Custom Weight:', customWeight);
      console.log('  - Final Package Dimensions:', packageDimensions);
      console.log('  - Data Types Check:', {
        length: typeof packageDimensions.length,
        width: typeof packageDimensions.width,
        height: typeof packageDimensions.height,
        weight: typeof packageDimensions.weight,
        lengthValue: packageDimensions.length,
        widthValue: packageDimensions.width,
        heightValue: packageDimensions.height,
        weightValue: packageDimensions.weight
      });
      
      // Check if this package needs auto-adjustment
      const needsAdjustment = packageDimensions.length < 8 || packageDimensions.width < 6 || packageDimensions.height < 2 || packageDimensions.weight < 1;
      console.log('  - Package needs auto-adjustment:', needsAdjustment);
      if (needsAdjustment) {
        console.log('  - Auto-adjustments expected:');
        if (packageDimensions.length < 8) console.log(`    - Length: ${packageDimensions.length}" → 8"`);
        if (packageDimensions.width < 6) console.log(`    - Width: ${packageDimensions.width}" → 6"`);
        if (packageDimensions.height < 2) console.log(`    - Height: ${packageDimensions.height}" → 2"`);
        if (packageDimensions.weight < 1) console.log(`    - Weight: ${packageDimensions.weight}lb → 1lb`);
      }
      
      console.log('  - Order ID:', order.id);
      console.log('  - Order Details:', {
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        shippingAddress: order.shippingAddress
      });

      // Add frontend retry logic for intermittent API issues
      let data = null;
      let lastError = null;
      const maxAttempts = 2;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`🔄 Frontend attempt ${attempt}/${maxAttempts} for createShipment`);
          
          const result = await createShipment({
            variables: { 
              orderId: order.id,
              packageDimensions: {
                ...packageDimensions,
                // Add cache-busting timestamp
                _timestamp: Date.now()
              }
            },
            // Disable Apollo cache for this request to prevent stale responses
            fetchPolicy: 'no-cache'
          });
          
          data = result.data;
          
          // Check if we got a good response with carriers
          if (data?.createEasyPostShipment?.success && data?.createEasyPostShipment?.shipment?.rates?.length > 0) {
            console.log(`✅ Frontend success on attempt ${attempt}`);
            break;
          } else if (attempt < maxAttempts) {
            console.log(`⚠️ Frontend attempt ${attempt} failed or no rates, retrying...`);
            lastError = new Error('No rates or failed response');
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            continue;
          }
        } catch (err) {
          console.error(`❌ Frontend attempt ${attempt} error:`, err);
          lastError = err;
          if (attempt < maxAttempts) {
            console.log(`🔄 Retrying frontend in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // Handle case where all attempts failed
      if (!data || !data.createEasyPostShipment) {
        throw lastError || new Error('All frontend retry attempts failed');
      }

      console.log('🔍 FRONTEND DEBUG - GraphQL Response:');
      console.log('  - Success:', data?.createEasyPostShipment?.success);
      console.log('  - Error:', data?.createEasyPostShipment?.error);
      console.log('  - Rates Count:', data?.createEasyPostShipment?.shipment?.rates?.length || 0);
      
      if (data?.createEasyPostShipment?.shipment?.rates) {
        const carrierCounts: { [key: string]: number } = {};
        data.createEasyPostShipment.shipment.rates.forEach((rate: any) => {
          const carrier = rate.carrier.toUpperCase();
          carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
        });
        console.log('  - Carriers Returned:', carrierCounts);
      }

      if (data.createEasyPostShipment.success) {
        setShipmentData(data.createEasyPostShipment.shipment);
        // Auto-select the first rate if available
        if (data.createEasyPostShipment.shipment.rates && data.createEasyPostShipment.shipment.rates.length > 0) {
          setSelectedRate(data.createEasyPostShipment.shipment.rates[0]);
        }
        setShippingStep('rates');
      } else {
        setShippingError(data.createEasyPostShipment.error || 'Failed to create shipment after retries');
        setShippingStep('error');
      }
    } catch (err: any) {
      console.error('🔍 FRONTEND DEBUG - Error:', err);
      console.error('Error creating shipment:', err);
      setShippingError(err.message || 'Failed to create shipment');
      setShippingStep('error');
    }
  };

  const handleBuyLabel = async () => {
    if (!selectedRate || !shipmentData || !order) return;

    try {
      setShippingStep('purchasing');
      const { data } = await buyLabel({
        variables: {
          shipmentId: shipmentData.id,
          rateId: selectedRate.id,
          orderId: order.id,
          insurance: insurance || null
        }
      });

      if (data.buyEasyPostLabel.success) {
        setLabelData(data.buyEasyPostLabel.shipment);
        setShippingStep('complete');
        
        // Open the label PDF immediately
        if (data.buyEasyPostLabel.shipment.postage_label?.label_url) {
          window.open(data.buyEasyPostLabel.shipment.postage_label.label_url, '_blank');
        }
        
        // Automatically redirect back to order details after a short delay
        setTimeout(() => {
          router.push(`/admin/orders/${orderNumber}`);
        }, 1500);
      } else {
        setShippingError(data.buyEasyPostLabel.error || 'Failed to purchase label');
        setShippingStep('error');
      }
    } catch (err: any) {
      console.error('Error buying label:', err);
      setShippingError(err.message || 'Failed to purchase label');
      setShippingStep('error');
    }
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const formatDelivery = (rate: any) => {
    if (rate.delivery_days) {
      return `${rate.delivery_days} business day${rate.delivery_days > 1 ? 's' : ''}`;
    }
    if (rate.delivery_date) {
      return new Date(rate.delivery_date).toLocaleDateString();
    }
    return 'Standard delivery';
  };



  // Get rates organized by carrier with "load more" functionality
  const getOrganizedRates = () => {
    if (!shipmentData?.rates) return { ups: [], fedex: [], usps: [] };
    
    const organized = { ups: [] as any[], fedex: [] as any[], usps: [] as any[] };
    
    shipmentData.rates.forEach((rate: any) => {
      const carrier = rate.carrier.toUpperCase();
      
      if (carrier === 'UPS' || carrier === 'UPSDAP') {
        organized.ups.push(rate);
      } else if (carrier === 'FEDEX' || carrier === 'FEDEXDEFAULT') {
        organized.fedex.push(rate);
      } else if (carrier === 'USPS') {
        organized.usps.push(rate);
      }
    });
    
    // Sort each carrier's rates
    const sortRates = (rates: any[]) => {
      return rates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
    };
    
    organized.ups = sortRates(organized.ups);
    organized.fedex = sortRates(organized.fedex);
    organized.usps = sortRates(organized.usps);
    
    return organized;
  };

  // Get available carriers with their info
  const getAvailableCarriers = () => {
    const organized = getOrganizedRates();
    const carriers = [];
    
    if (organized.ups.length > 0) {
      carriers.push({
        id: 'UPS',
        name: 'UPS',
        logo: <UPSLogo className="w-6 h-6" />,
        rates: organized.ups
      });
    }
    
    if (organized.fedex.length > 0) {
      carriers.push({
        id: 'FEDEX',
        name: 'FedEx',
        logo: <FedExLogo className="w-6 h-6" />,
        rates: organized.fedex
      });
    }
    
    if (organized.usps.length > 0) {
      carriers.push({
        id: 'USPS',
        name: 'USPS',
        logo: <USPSLogo className="w-6 h-6" />,
        rates: organized.usps
      });
    }
    
    return carriers;
  };

  // Get filtered rates for selected carrier
  const getFilteredRates = () => {
    const organized = getOrganizedRates();
    let carrierRates: any[] = [];
    
    switch (selectedCarrier) {
      case 'UPS':
        // Show top 2 most popular (Ground and NextDayAir) + load more if requested
        const upsPopular = organized.ups.filter((rate: any) => {
          const service = rate.service.toUpperCase();
          return service === 'GROUND' || service === 'NEXTDAYAIR';
        });
        
        if (showAllRatesForCarrier) {
          carrierRates = organized.ups;
        } else {
          carrierRates = upsPopular;
        }
        break;
        
      case 'FEDEX':
        if (showAllRatesForCarrier) {
          carrierRates = organized.fedex;
        } else {
          carrierRates = organized.fedex.slice(0, 2);
        }
        break;
        
      case 'USPS':
        if (showAllRatesForCarrier) {
          carrierRates = organized.usps;
        } else {
          carrierRates = organized.usps.slice(0, 2);
        }
        break;
    }
    
    return carrierRates;
  };

  // Check if there are more rates available for the selected carrier
  const organized = getOrganizedRates();
  const hasMoreRates = () => {
    switch (selectedCarrier) {
      case 'UPS':
        const upsPopular = organized.ups.filter((rate: any) => {
          const service = rate.service.toUpperCase();
          return service === 'GROUND' || service === 'NEXTDAYAIR';
        });
        return organized.ups.length > upsPopular.length && !showAllRatesForCarrier;
      case 'FEDEX':
        return organized.fedex.length > 2 && !showAllRatesForCarrier;
      case 'USPS':
        return organized.usps.length > 2 && !showAllRatesForCarrier;
      default:
        return false;
    }
  };
  
  const getRemainingCount = () => {
    switch (selectedCarrier) {
      case 'UPS':
        const upsPopular = organized.ups.filter((rate: any) => {
          const service = rate.service.toUpperCase();
          return service === 'GROUND' || service === 'NEXTDAYAIR';
        });
        return organized.ups.length - upsPopular.length;
      case 'FEDEX':
        return organized.fedex.length - 2;
      case 'USPS':
        return organized.usps.length - 2;
      default:
        return 0;
    }
  };
  


  if (loading || orderLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400"></div>
        </div>
      </AdminLayout>
    );
  }

  if (orderError || !order) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex" style={{ backgroundColor: '#030140' }}>
          <div className="flex-1 pt-8 pb-8">
            <div className="w-full px-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Order Not Found</h1>
                <p className="text-gray-400 mb-6">Could not find order #{orderNumber}</p>
                <button
                  onClick={() => router.push('/admin/orders')}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Back to Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Shipping Labels - Order #${orderNumber} - Sticker Shuttle Admin`}>
      <style jsx global>{`
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
        

        
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

        .button-interactive {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .button-interactive:hover {
          transform: translateY(-1px);
        }
        
        .button-interactive:active {
          transform: translateY(0) scale(0.98);
        }
        
        .button-selected {
          position: relative;
        }

        .animate-glow-yellow {
          animation: glow-yellow 2s ease-in-out infinite alternate;
        }

        .animate-glow-purple {
          animation: glow-purple 2s ease-in-out infinite alternate;
        }

        @keyframes glow-yellow {
          from {
            box-shadow: 0 0 5px rgba(234, 179, 8, 0.4), 0 0 10px rgba(234, 179, 8, 0.3), 0 0 15px rgba(234, 179, 8, 0.2);
          }
          to {
            box-shadow: 0 0 10px rgba(234, 179, 8, 0.6), 0 0 20px rgba(234, 179, 8, 0.4), 0 0 30px rgba(234, 179, 8, 0.3);
          }
        }

        @keyframes glow-purple {
          from {
            box-shadow: 0 0 5px rgba(147, 51, 234, 0.4), 0 0 10px rgba(147, 51, 234, 0.3), 0 0 15px rgba(147, 51, 234, 0.2);
          }
          to {
            box-shadow: 0 0 10px rgba(147, 51, 234, 0.6), 0 0 20px rgba(147, 51, 234, 0.4), 0 0 30px rgba(147, 51, 234, 0.3);
          }
        }
      `}</style>
      
      <div className="min-h-screen flex" style={{ backgroundColor: '#030140' }}>
        {/* Main Content */}
        <div className="flex-1 pt-8 pb-8">
          <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/admin/orders/${orderNumber}`)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Back to order"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    #{orderNumber}
                  </h1>
                  <p className="text-xs text-gray-400">Create shipping label</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Package Selection */}
              <div className="lg:col-span-2">
                {shippingStep === 'package' && (
                  <div className="glass-container p-6">
                    {/* Package Dimensions */}
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                        <span className="text-purple-400">📦</span>
                        Select Package Dimensions
                      </h2>
                      
                      {/* Most Popular Section */}
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Most Popular</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {PACKAGE_PRESETS.filter(pkg => pkg.mostPopular).map((pkg) => {
                            const isSelected = selectedPackage.id === pkg.id;
                            
                            return (
                              <button
                                key={pkg.id}
                                onClick={() => {
                                  setSelectedPackage(pkg);
                                  setPackageSearch('');
                                }}
                                className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex flex-col gap-2 transition-all border backdrop-blur-md
                                  ${
                                    isSelected
                                      ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                                      : "hover:bg-white/10 border-white/20 text-white/80"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{pkg.name}</span>
                                  {pkg.name === 'Bubble Mailer' && (
                                    <span className="text-[10px] text-purple-300 font-medium">Most Popular</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400 text-left">{pkg.dimensions}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* All Packages Section */}
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">All Packages</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {PACKAGE_PRESETS.filter(pkg => !pkg.mostPopular).map((pkg) => {
                            const isSelected = selectedPackage.id === pkg.id;
                            
                            return (
                              <button
                                key={pkg.id}
                                onClick={() => {
                                  setSelectedPackage(pkg);
                                  setPackageSearch('');
                                }}
                                className={`button-interactive relative w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all border backdrop-blur-md
                                  ${
                                    isSelected
                                      ? "bg-purple-500/20 text-purple-200 font-medium border-purple-400/50 button-selected animate-glow-purple"
                                      : "hover:bg-white/10 border-white/20 text-white/80"
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{pkg.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pkg.dimensions}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>



                    {/* Custom Weight Override */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Total weight (with package)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={customWeight}
                          onChange={(e) => setCustomWeight(e.target.value)}
                          placeholder={selectedPackage.weight.toString()}
                          className="flex-1 px-3 py-2 bg-transparent border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                        />
                        <select 
                          className="px-3 py-2 bg-transparent border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
                          title="Weight unit"
                        >
                          <option value="lb" style={{ backgroundColor: '#030140' }}>lb</option>
                        </select>
                      </div>
                    </div>

                    {/* Create Shipment Button */}
                    <button
                      onClick={handleCreateShipment}
                      className="w-full py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                    >
                      Get Shipping Rates
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {shippingStep === 'loading' && (
                  <div className="glass-container p-6">
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                      <p className="text-white text-lg">Creating shipment...</p>
                      <p className="text-gray-400 text-sm">Getting rates from carriers</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {shippingStep === 'error' && (
                  <div className="glass-container p-6">
                    <div className="text-center py-8">
                      <div className="text-red-400 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <p className="text-red-400 mb-4">{shippingError}</p>
                      <button
                        onClick={() => setShippingStep('package')}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Shipping Rates */}
                {shippingStep === 'rates' && shipmentData && (
                  <div className="glass-container p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-white">Shipping service</h2>
                      
                      {/* Carrier Dropdown */}
                      <div className="relative carrier-dropdown">
                        <button
                          onClick={() => setIsCarrierDropdownOpen(!isCarrierDropdownOpen)}
                          className="flex items-center gap-3 px-4 py-2 bg-transparent border border-white/20 rounded-lg text-white hover:border-purple-400 transition-all min-w-[160px]"
                        >
                          <div className="flex items-center gap-2">
                            {getAvailableCarriers().find(c => c.id === selectedCarrier)?.logo}
                            <span className="text-sm">{getAvailableCarriers().find(c => c.id === selectedCarrier)?.name}</span>
                          </div>
                          <svg className={`w-4 h-4 text-yellow-400 transition-transform ${isCarrierDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Carrier Dropdown Menu */}
                        {isCarrierDropdownOpen && (
                          <div className="absolute top-full right-0 mt-2 min-w-[200px] z-50" style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '16px'
                          }}>
                            <div className="p-2">
                              {getAvailableCarriers().map((carrier) => (
                                <button
                                  key={carrier.id}
                                  onClick={() => {
                                    setSelectedCarrier(carrier.id);
                                    setIsCarrierDropdownOpen(false);
                                    setShowAllRatesForCarrier(false); // Reset load more when switching carriers
                                    setSelectedRate(null); // Clear selected rate when switching carriers
                                  }}
                                  className={`w-full p-3 rounded-lg text-left transition-all hover:bg-white/10 ${
                                    selectedCarrier === carrier.id ? 'bg-purple-500/20 border border-purple-500/40' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {carrier.logo}
                                    <div>
                                      <p className="text-white font-medium text-sm">{carrier.name}</p>
                                      <p className="text-xs text-gray-400">{carrier.rates.length} services available</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {getFilteredRates().length > 0 && (
                      <div className="space-y-3">
                        {getFilteredRates().map((rate: any) => {
                          const carrier = rate.carrier.toUpperCase();
                          const isUPS = carrier === 'UPS' || carrier === 'UPSDAP';
                          const isSelected = selectedRate?.id === rate.id;
                          const service = rate.service.toUpperCase();
                          const isGround = service === 'GROUND';
                          const isNextDay = service === 'NEXTDAYAIR';
                          
                          // Clean up carrier and service names for display
                          const displayCarrier = isUPS ? 'UPS' : rate.carrier;
                          let displayService = rate.service;
                          if (isUPS) {
                            if (isGround) {
                              displayService = 'Ground';
                            } else if (isNextDay) {
                              displayService = 'Next Day Air';
                            }
                          }
                          
                          return (
                            <button
                              key={rate.id}
                              onClick={() => setSelectedRate(rate)}
                              className={`button-interactive relative w-full text-left px-6 py-5 rounded-2xl flex items-center justify-between transition-all border backdrop-blur-md glass-container
                                ${
                                  isSelected
                                    ? isUPS 
                                      ? "bg-yellow-500/20 text-yellow-200 font-medium border-yellow-400/50 button-selected animate-glow-yellow shadow-lg shadow-yellow-500/20"
                                      : "bg-green-500/20 text-green-200 font-medium border-green-400/50 button-selected shadow-lg shadow-green-500/20"
                                    : "hover:bg-white/10 border-white/20 text-white/80 hover:shadow-lg hover:shadow-white/10"
                                }`}
                            >
                              <div className="flex items-center gap-4">
                                {getCarrierLogo(rate.carrier)}
                                                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-white font-semibold text-lg">{displayCarrier} {displayService}</p>
                                    {isUPS && isGround && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                        Most Popular
                                      </span>
                                    )}
                                    {isUPS && isNextDay && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30">
                                        Express
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-400 mt-1">{formatDelivery(rate)}</p>
                                  {isUPS && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-xs text-gray-400">Tracking and delivery confirmation</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-4 py-2 text-base font-semibold rounded-full border backdrop-blur-md ${
                                  isSelected 
                                    ? isUPS 
                                      ? "bg-yellow-500/30 text-white border-yellow-400/50 shadow-lg"
                                      : "bg-green-500/30 text-white border-green-400/50 shadow-lg"
                                    : "bg-green-500/20 text-green-200 border-green-400/30"
                                }`}>
                                  {formatCurrency(rate.rate)}
                                </span>
                                {isUPS && (
                                  <span className="text-sm text-yellow-400 font-medium">⭐ Preferred</span>
                                )}
                              </div>
                              
                              {isUPS && isSelected && (
                                <div className="absolute top-2 right-3 text-xs text-yellow-300 font-medium">
                                  Recommended
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Load More Button for Selected Carrier */}
                    {hasMoreRates() && (
                      <div className="mt-6">
                        <button
                          onClick={() => setShowAllRatesForCarrier(true)}
                          className={`w-full px-4 py-2 text-sm rounded-lg transition-colors ${
                            selectedCarrier === 'UPS' 
                              ? 'bg-yellow-600/20 text-yellow-200 border border-yellow-400/30 hover:bg-yellow-600/30'
                              : selectedCarrier === 'FEDEX'
                              ? 'bg-purple-600/20 text-purple-200 border border-purple-400/30 hover:bg-purple-600/30'
                              : 'bg-blue-600/20 text-blue-200 border border-blue-400/30 hover:bg-blue-600/30'
                          }`}
                        >
                          Load More {selectedCarrier} Services ({getRemainingCount()} more)
                        </button>
                      </div>
                    )}

                    {/* Insurance Input */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Insurance (optional)
                      </label>
                      <input
                        type="number"
                        value={insurance}
                        onChange={(e) => setInsurance(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-transparent border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">Enter insurance value in dollars</p>
                    </div>

                    {/* Buy Label Button */}
                    <button
                      onClick={handleBuyLabel}
                      disabled={!selectedRate}
                      className="w-full mt-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Purchase Label - {selectedRate ? formatCurrency(selectedRate.rate) : '$0.00'} USD
                    </button>
                  </div>
                )}

                {/* Purchasing State */}
                {shippingStep === 'purchasing' && (
                  <div className="glass-container p-6">
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                      <p className="text-white text-lg">Purchasing label...</p>
                      <p className="text-gray-400 text-sm">Processing payment and generating label</p>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {shippingStep === 'complete' && labelData && (
                  <div className="glass-container p-6">
                    <div className="text-center py-8">
                      <div className="text-green-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">Label Created Successfully!</h3>
                      <div className="space-y-4">
                        <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4">
                          <p className="text-sm text-gray-400">Tracking Number</p>
                          <p className="text-xl font-mono text-white">{labelData.tracking_code}</p>
                        </div>
                        <div className="flex gap-4 justify-center">
                          {labelData.postage_label && labelData.postage_label.label_url && (
                            <a
                              href={labelData.postage_label.label_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                            >
                              Download Label
                            </a>
                          )}
                          <button
                            onClick={() => router.push(`/admin/orders/${orderNumber}`)}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Back to Order
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Customer & Address Info */}
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="glass-container p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Customer
                  </h3>
                  <div className="space-y-2">
                    <p className="text-white font-medium">
                      {order.customerFirstName} {order.customerLastName}
                    </p>
                    <p className="text-sm text-gray-400">{order.customerEmail}</p>
                    {order.customerPhone && (
                      <p className="text-sm text-gray-400">{order.customerPhone}</p>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div className="glass-container p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Shipping Address
                    </h3>
                    <div className="text-sm text-gray-300 space-y-1">
                      {(order.shippingAddress.first_name || order.shippingAddress.last_name) && (
                        <p className="font-medium text-white">
                          {[order.shippingAddress.first_name, order.shippingAddress.last_name].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {order.shippingAddress.company && (
                        <p>{order.shippingAddress.company}</p>
                      )}
                      <p>{order.shippingAddress.address1 || order.shippingAddress.line1}</p>
                      {(order.shippingAddress.address2 || order.shippingAddress.line2) && (
                        <p>{order.shippingAddress.address2 || order.shippingAddress.line2}</p>
                      )}
                      <p>
                        {[
                          order.shippingAddress.city,
                          order.shippingAddress.state || order.shippingAddress.province,
                          order.shippingAddress.zip || order.shippingAddress.postal_code
                        ].filter(Boolean).join(', ')}
                      </p>
                      <p>{order.shippingAddress.country === 'US' ? 'United States' : order.shippingAddress.country}</p>
                    </div>
                  </div>
                )}

                {/* Label Information */}
                <div className="glass-container p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Label Details
                  </h3>
                  
                  {selectedRate ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                        {getCarrierLogo(selectedRate.carrier)}
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{selectedRate.carrier} {selectedRate.service}</p>
                          <p className="text-xs text-gray-400">{formatDelivery(selectedRate)}</p>
                        </div>
                        <p className="text-lg font-bold text-green-400">{formatCurrency(selectedRate.rate)}</p>
                      </div>
                      
                      {insurance && parseFloat(insurance) > 0 && (
                        <div className="flex justify-between items-center p-2 text-sm">
                          <span className="text-gray-400">Insurance</span>
                          <span className="text-white">{formatCurrency(insurance)}</span>
                        </div>
                      )}
                      
                      <div className="border-t border-gray-600 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Total Cost</span>
                          <span className="text-lg font-bold text-green-400">
                            {formatCurrency(
                              parseFloat(selectedRate.rate) + (insurance ? parseFloat(insurance) : 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : labelData ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="w-8 h-8 bg-green-600 rounded-sm flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">Label Purchased</p>
                          <p className="text-xs text-gray-400">Ready for download</p>
                        </div>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        <p className="text-sm text-gray-400 mb-1">Tracking Number</p>
                        <p className="text-white font-mono text-sm">{labelData.tracking_code}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">Select a shipping service to see pricing details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
