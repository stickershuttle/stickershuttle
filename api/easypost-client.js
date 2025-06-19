const EasyPostClient = require('@easypost/api');

class EasyPostService {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.init();
    }

    init() {
        const apiKey = process.env.EASYPOST_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ EasyPost API key not found in environment variables');
            return;
        }

        try {
            this.client = new EasyPostClient(apiKey);
            this.isConfigured = true;
            console.log('✅ EasyPost client initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize EasyPost client:', error);
            this.isConfigured = false;
        }
    }

    isReady() {
        return this.isConfigured && this.client;
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
            console.log('💳 Buying EasyPost shipment label...');
            const buyOptions = { rate };
            if (insurance) {
                buyOptions.insurance = insurance;
            }
            
            const boughtShipment = await this.client.Shipment.buy(shipmentId, buyOptions);
            console.log('✅ EasyPost label purchased:', boughtShipment.id);
            return boughtShipment;
        } catch (error) {
            console.error('❌ Failed to buy EasyPost shipment:', error);
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
            parcel = {
                length: Math.max(maxLength, 6), // Minimum 6 inches
                width: Math.max(maxWidth, 4),   // Minimum 4 inches  
                height: Math.max(totalHeight, 1), // Minimum 1 inch
                weight: Math.max(totalWeight, 1)  // Minimum 1 oz
            };
        }

        const toAddress = {
            name: `${order.customerFirstName || order.customer_first_name || ''} ${order.customerLastName || order.customer_last_name || ''}`.trim(),
            company: shippingAddr.company || null,
            street1: shippingAddr.address1 || shippingAddr.line1,
            street2: shippingAddr.address2 || shippingAddr.line2 || null,
            city: shippingAddr.city,
            state: shippingAddr.province || shippingAddr.state,
            zip: shippingAddr.zip || shippingAddr.postal_code,
            country: shippingAddr.country || 'US',
            phone: shippingAddr.phone || order.customerPhone || order.customer_phone,
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
}

module.exports = new EasyPostService(); 