const EasyPostClient = require('@easypost/api');

class EasyPostService {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.testMode = false;
        this.init();
    }

    init() {
        // Validate EasyPost configuration
        console.log('🔍 DEBUG: Environment variables check:');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('EASYPOST_TEST_MODE:', process.env.EASYPOST_TEST_MODE);
        console.log('EASYPOST_API_KEY:', process.env.EASYPOST_API_KEY ? 'SET' : 'NOT SET');
        
        // Show first few characters of key for debugging
        if (process.env.EASYPOST_API_KEY) {
            console.log('EASYPOST_API_KEY value:', process.env.EASYPOST_API_KEY.substring(0, 8) + '...');
        }
        
        // Determine if we're in test/development mode
        const isTestModeEnv = process.env.EASYPOST_TEST_MODE === 'true';
        const isDevEnvironment = process.env.NODE_ENV !== 'production';
        console.log('🎯 EASYPOST_TEST_MODE:', isTestModeEnv);
        console.log('🎯 NODE_ENV !== production:', isDevEnvironment);
        
        // Use test mode if explicitly set OR if in development environment
        const isTestMode = isTestModeEnv || isDevEnvironment;
        console.log('🎯 Final calculated test mode:', isTestMode);
        
        // Get the API key (standard EasyPost approach)
        const apiKey = process.env.EASYPOST_API_KEY;
        console.log('🔑 Using standard EASYPOST_API_KEY');
        
        console.log('🎯 Final API key found:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NONE');
            
        if (!apiKey) {
            console.error(`❌ EasyPost API key not found`);
            console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('EASYPOST')));
            console.error('Need: EASYPOST_API_KEY environment variable');
            this.isConfigured = false;
            this.client = null;
            return;
        }

        try {
            this.client = new EasyPostClient(apiKey);
            this.isConfigured = true;
            this.testMode = isTestMode;
            
            // Detect key type from the key itself
            const keyType = this.detectKeyType(apiKey);
            const actualMode = keyType === 'test' ? 'TEST' : 'PRODUCTION';
            
            console.log(`✅ EasyPost client initialized successfully`);
            console.log(`🔑 Using API key: ${apiKey.substring(0, 8)}...`);
            console.log(`📍 Detected mode: ${actualMode}`);
            
            if (keyType === 'test') {
                console.log('💰 TEST MODE: No real charges will be made!');
            } else {
                console.log('💸 PRODUCTION MODE: Real charges will be made!');
                if (isTestMode) {
                    console.warn('⚠️ WARNING: You wanted test mode but your key appears to be production!');
                    console.warn('⚠️ To use test mode, add EASYPOST_TEST_API_KEY with a test key');
                }
            }
        } catch (error) {
            console.error('❌ Failed to initialize EasyPost client:', error);
            this.isConfigured = false;
            this.client = null;
        }
    }

    detectKeyType(apiKey) {
        if (apiKey && (apiKey.includes('_test_') || apiKey.startsWith('EZSK_test_') || apiKey.startsWith('EZTK'))) {
            return 'test';
        }
        return 'production';
    }

    isReady() {
        const ready = !!(this.isConfigured && this.client);
        
        // Add detailed logging when isReady is called and returns false
        if (!ready) {
            console.log('🔍 EasyPost isReady() check failed:');
            console.log('  - isConfigured:', this.isConfigured);
            console.log('  - client exists:', !!this.client);
            console.log('  - EASYPOST_API_KEY exists:', !!process.env.EASYPOST_API_KEY);
            
            // Try to reinitialize if not configured
            if (!this.isConfigured && process.env.EASYPOST_API_KEY) {
                console.log('🔄 Attempting to reinitialize EasyPost client...');
                this.init();
                const retryReady = !!(this.isConfigured && this.client);
                console.log('  - Reinitialization result:', retryReady ? 'SUCCESS' : 'FAILED');
                return retryReady;
            }
        }
        
        return ready;
    }

    getClient() {
        if (!this.isReady()) {
            throw new Error('EasyPost client is not configured');
        }
        return this.client;
    }

    /**
     * Create a shipment with EasyPost
     * @param {Object} shipmentData - The shipment data including addresses and parcel info
     * @returns {Promise<Object>} - The created shipment with rates
     */
    async createShipment(shipmentData) {
        if (!this.isReady()) {
            throw new Error('EasyPost client is not configured');
        }

        try {
            console.log('📦 Creating EasyPost shipment...');
            const shipment = await this.client.Shipment.create(shipmentData);
            console.log('✅ EasyPost shipment created:', shipment.id);
            
            // Log shipping rate summary for analytics
            if (shipment.rates && shipment.rates.length > 0) {
                const carrierCounts = {};
                shipment.rates.forEach(rate => {
                    const carrier = rate.carrier.toUpperCase();
                    carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
                });
                
                console.log(`📊 Rates received by carrier:`, carrierCounts);
                console.log(`📊 Total rates: ${shipment.rates.length}`);
                
                // Check specifically for UPS
                const hasUPS = Object.keys(carrierCounts).some(carrier => 
                    carrier === 'UPS' || carrier === 'UPSDAP'
                );
                if (!hasUPS) {
                    console.log('⚠️ No UPS rates returned from EasyPost');
                    console.log('📍 From address:', JSON.stringify(shipmentData.from_address, null, 2));
                    console.log('📍 To address:', JSON.stringify(shipmentData.to_address, null, 2));
                    console.log('📦 Parcel:', JSON.stringify(shipmentData.parcel, null, 2));
                }
            } else {
                console.log('⚠️ No rates returned from EasyPost at all');
            }
            
            return shipment;
        } catch (error) {
            console.error('❌ Failed to create EasyPost shipment:', error);
            throw error;
        }
    }

    /**
     * Buy a shipping label
     * @param {string} shipmentId - The shipment ID
     * @param {Object} rate - The selected rate object
     * @param {string} insurance - Optional insurance amount
     * @returns {Promise<Object>} - The purchased shipment with label
     */
    async buyShipment(shipmentId, rate, insurance = null) {
        if (!this.isReady()) {
            throw new Error('EasyPost client is not configured');
        }

        try {
            const mode = this.isTestMode() ? 'TEST' : 'PRODUCTION';
            console.log(`💳 Buying EasyPost shipment label in ${mode} mode...`);
            
            if (this.isTestMode()) {
                console.log('💰 TEST MODE: This is a test purchase - no real money will be charged!');
            } else {
                console.log('💸 PRODUCTION MODE: This will charge real money!');
            }
            
            console.log('📊 Rate object:', JSON.stringify(rate, null, 2));
            
            // For Node.js EasyPost library, pass the rate object directly
            // If insurance is provided, pass it as a second parameter  
            let boughtShipment;
            if (insurance) {
                boughtShipment = await this.client.Shipment.buy(shipmentId, rate, insurance);
            } else {
                boughtShipment = await this.client.Shipment.buy(shipmentId, rate);
            }
            
            console.log(`✅ EasyPost label purchased in ${mode} mode:`, boughtShipment.id);
            
            if (this.isTestMode()) {
                console.log('🎉 TEST MODE: No real money was charged - this was a test!');
            }
            
            return boughtShipment;
        } catch (error) {
            console.error('❌ Failed to buy EasyPost shipment:', error);
            console.error('❌ Error details:', error.message);
            throw error;
        }
    }

    /**
     * Create and buy a shipment in one step
     * @param {Object} shipmentData - The shipment data
     * @param {boolean} useLowestRate - Whether to automatically select the lowest rate
     * @param {string} insurance - Optional insurance amount
     * @returns {Promise<Object>} - The purchased shipment with label
     */
    async createAndBuyShipment(shipmentData, useLowestRate = true, insurance = null) {
        try {
            // Create the shipment first
            const shipment = await this.createShipment(shipmentData);
            
            // Select rate (lowest by default or let user choose)
            let selectedRate;
            if (useLowestRate) {
                selectedRate = shipment.lowestRate();
                if (!selectedRate) {
                    throw new Error('No rates available for this shipment');
                }
            } else {
                // Return shipment with rates for user selection
                return { shipment, requiresRateSelection: true };
            }

            // Buy the label
            const boughtShipment = await this.buyShipment(shipment.id, selectedRate, insurance);
            return boughtShipment;
        } catch (error) {
            console.error('❌ Failed to create and buy EasyPost shipment:', error);
            throw error;
        }
    }

    /**
     * Track a shipment
     * @param {string} trackingCode - The tracking code
     * @returns {Promise<Object>} - Tracking information
     */
    async trackShipment(trackingCode) {
        if (!this.isReady()) {
            throw new Error('EasyPost client is not configured');
        }

        try {
            console.log('📍 Tracking shipment:', trackingCode);
            const tracker = await this.client.Tracker.create({ tracking_code: trackingCode });
            return tracker;
        } catch (error) {
            console.error('❌ Failed to track shipment:', error);
            throw error;
        }
    }

    /**
     * Verify an address
     * @param {Object} address - The address to verify
     * @returns {Promise<Object>} - Verified address
     */
    async verifyAddress(address) {
        if (!this.isReady()) {
            throw new Error('EasyPost client is not configured');
        }

        try {
            console.log('📍 Verifying address...');
            const verifiedAddress = await this.client.Address.create({
                ...address,
                verify: true
            });
            return verifiedAddress;
        } catch (error) {
            console.error('❌ Failed to verify address:', error);
            throw error;
        }
    }

    /**
     * Retrieve an address by ID
     * @param {string} addressId - The EasyPost address ID
     * @returns {Promise<Object>} - Address object
     */
    async getAddress(addressId) {
        if (!this.isReady()) {
            throw new Error('EasyPost client is not configured');
        }

        try {
            console.log('📍 Retrieving address:', addressId);
            const address = await this.client.Address.retrieve(addressId);
            return address;
        } catch (error) {
            console.error('❌ Failed to retrieve address:', error);
            throw error;
        }
    }

    /**
     * Convert order data to EasyPost shipment format
     * @param {Object} order - Order from Supabase
     * @param {Object|string} fromAddress - Your business address object or EasyPost address ID
     * @param {Object} customDimensions - Optional custom package dimensions
     * @returns {Object} - EasyPost shipment data
     */
    formatOrderForShipment(order, fromAddress, customDimensions = null) {
        const shippingAddr = order.shippingAddress || order.shipping_address;
        if (!shippingAddr) {
            throw new Error('Order must have a shipping address');
        }

        // Use custom dimensions if provided, otherwise calculate from order items
        let parcel;
        
        if (customDimensions) {
            parcel = {
                length: customDimensions.length,
                width: customDimensions.width,
                height: customDimensions.height,
                weight: customDimensions.weight
            };
        } else {
            // Calculate total weight and dimensions from order items
            let totalWeight = 0;
            let maxLength = 0;
            let maxWidth = 0;
            let totalHeight = 0;

            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    // Estimate weight based on item type and quantity
                    const itemWeight = this.estimateItemWeight(item);
                    totalWeight += itemWeight;

                    // Estimate dimensions
                    const itemDimensions = this.estimateItemDimensions(item);
                    maxLength = Math.max(maxLength, itemDimensions.length);
                    maxWidth = Math.max(maxWidth, itemDimensions.width);
                    totalHeight += itemDimensions.height; // Stack items
                });
            }

            // Minimum package dimensions
            // UPS typically requires minimum 1 lb (16 oz) for most services
            parcel = {
                length: Math.max(maxLength, 8), // Minimum 8 inches for UPS compatibility
                width: Math.max(maxWidth, 6),   // Minimum 6 inches for UPS compatibility  
                height: Math.max(totalHeight, 2), // Minimum 2 inches for UPS compatibility
                weight: Math.max(totalWeight, 16)  // Minimum 16 oz (1 lb) for UPS services
            };
        }

        // Format phone number for better carrier compatibility (remove non-numeric characters)
        const formatPhone = (phone) => {
            if (!phone) return null;
            // Remove all non-numeric characters
            return phone.replace(/\D/g, '');
        };

        const toAddress = {
            name: `${order.customerFirstName || order.customer_first_name || ''} ${order.customerLastName || order.customer_last_name || ''}`.trim(),
            company: shippingAddr.company || null,
            street1: shippingAddr.address1 || shippingAddr.line1,
            street2: shippingAddr.address2 || shippingAddr.line2 || null,
            city: shippingAddr.city,
            state: shippingAddr.province || shippingAddr.state,
            zip: shippingAddr.zip || shippingAddr.postal_code,
            country: shippingAddr.country || 'US',
            phone: formatPhone(shippingAddr.phone || order.customerPhone || order.customer_phone),
            email: order.customerEmail || order.customer_email
        };

        // Handle fromAddress as either an object or EasyPost address ID
        const fromAddressData = typeof fromAddress === 'string' 
            ? { id: fromAddress }  // Wrap address ID in object for EasyPost
            : fromAddress; // Use address object

        // Log the formatted data for debugging
        console.log('📦 Formatted shipment data:');
        console.log('To Address:', JSON.stringify(toAddress, null, 2));
        console.log('Parcel:', JSON.stringify(parcel, null, 2));
        console.log('From Address:', JSON.stringify(fromAddressData, null, 2));

        return {
            to_address: toAddress,
            from_address: fromAddressData,
            parcel: parcel,
            reference: order.orderNumber || order.order_number || order.id
        };
    }

    /**
     * Estimate item weight in ounces
     * @param {Object} item - Order item
     * @returns {number} - Weight in ounces
     */
    estimateItemWeight(item) {
        const quantity = item.quantity || 1;
        let baseWeight = 1; // Default 1 oz

        // Estimate based on product type
        if (item.productCategory) {
            const category = item.productCategory.toLowerCase();
            if (category.includes('sticker')) {
                baseWeight = 0.1; // Stickers are very light
            } else if (category.includes('banner')) {
                baseWeight = 4; // Banners are heavier
            }
        }

        // Estimate based on size if available
        const selections = item.calculatorSelections || {};
        if (selections.size) {
            const size = selections.size;
            if (size.width && size.height) {
                // Rough calculation: larger items weigh more
                const area = parseFloat(size.width) * parseFloat(size.height);
                baseWeight = Math.max(baseWeight, area * 0.01);
            }
        }

        return baseWeight * quantity;
    }

    /**
     * Estimate item dimensions in inches
     * @param {Object} item - Order item
     * @returns {Object} - Dimensions object
     */
    estimateItemDimensions(item) {
        let length = 6;
        let width = 4;
        let height = 0.1; // Very thin for stickers

        const selections = item.calculatorSelections || {};
        if (selections.size && selections.size.width && selections.size.height) {
            length = Math.max(parseFloat(selections.size.width), 6);
            width = Math.max(parseFloat(selections.size.height), 4);
        }

        // Adjust for product type
        if (item.productCategory) {
            const category = item.productCategory.toLowerCase();
            if (category.includes('banner')) {
                height = 0.5; // Banners are thicker
            }
        }

        return { length, width, height };
    }

    isTestMode() {
        if (!this.isConfigured || !this.client) return false;
        // Get the actual API key being used and check if it's a test key
        const apiKey = process.env.EASYPOST_TEST_API_KEY || process.env.EASYPOST_PROD_API_KEY || process.env.EASYPOST_API_KEY;
        return this.detectKeyType(apiKey) === 'test';
    }
}

module.exports = new EasyPostService(); 