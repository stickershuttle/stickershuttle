const EasyPostClient = require('@easypost/api');

class EasyPostService {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.testMode = false;
        this.recentCalls = []; // Track recent API calls for rate limiting detection
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

        const maxRetries = 4; // Increased from 2 to 4
        let lastError = null;

        // Add a longer random delay to avoid API race conditions
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📦 Creating EasyPost shipment (attempt ${attempt}/${maxRetries})...`);
                
                // Check rate limiting before making the call
                const rateLimitStats = this.getRateLimitingStats();
                console.log('📊 Rate limiting stats:', rateLimitStats);
                
                if (rateLimitStats.possibleRateLimit) {
                    console.warn('⚠️ Possible rate limiting detected - high call volume');
                    console.warn(`   - Calls last minute: ${rateLimitStats.callsLastMinute}`);
                    console.warn(`   - Calls last 5 minutes: ${rateLimitStats.callsLast5Minutes}`);
                }
                
                // Enhanced debugging - log all shipment data
                console.log('📦 Full shipment data being sent to EasyPost:');
                console.log(JSON.stringify(shipmentData, null, 2));
                
                // Validate package dimensions for carrier requirements
                const parcel = shipmentData.parcel;
                console.log('📦 Package validation:');
                console.log(`  - Length: ${parcel.length}" (Min: 8" for UPS/FedEx)`);
                console.log(`  - Width: ${parcel.width}" (Min: 6" for UPS/FedEx)`);
                console.log(`  - Height: ${parcel.height}" (Min: 2" for UPS/FedEx)`);
                console.log(`  - Weight: ${parcel.weight} lbs (Min: 1 lb for UPS/FedEx)`);
                
                // Check if dimensions meet carrier requirements
                const meetsUPSRequirements = parcel.length >= 8 && parcel.width >= 6 && parcel.height >= 2 && parcel.weight >= 1;
                const meetsFedExRequirements = parcel.length >= 8 && parcel.width >= 6 && parcel.height >= 2 && parcel.weight >= 1;
                
                console.log('📦 Carrier requirements check:');
                console.log(`  - UPS requirements met: ${meetsUPSRequirements}`);
                console.log(`  - FedEx requirements met: ${meetsFedExRequirements}`);
                console.log(`  - USPS requirements met: true (USPS is more flexible)`);
                
                // Validate addresses
                const toAddress = shipmentData.to_address;
                console.log('📍 Address validation:');
                console.log(`  - To Address complete: ${!!(toAddress.name && toAddress.street1 && toAddress.city && toAddress.state && toAddress.zip)}`);
                console.log(`  - From Address type: ${typeof shipmentData.from_address}`);
                
                if (!toAddress.name || !toAddress.street1 || !toAddress.city || !toAddress.state || !toAddress.zip) {
                    console.warn('⚠️ Incomplete destination address may cause carrier rates to be filtered out');
                }
                
                // Add a unique reference to prevent any potential caching issues
                const uniqueShipmentData = {
                    ...shipmentData,
                    reference: `${shipmentData.reference}_${Date.now()}_${attempt}`
                };
                
                console.log(`📦 Creating shipment with unique reference: ${uniqueShipmentData.reference}`);
                
                // Track the API call
                this.trackApiCall('createShipment');
                
                const shipment = await this.client.Shipment.create(uniqueShipmentData);
                console.log('✅ EasyPost shipment created:', shipment.id);
                
                // Enhanced rate analysis
                if (shipment.rates && shipment.rates.length > 0) {
                    const carrierCounts = {};
                    const carrierDetails = {};
                    
                    shipment.rates.forEach(rate => {
                        const carrier = rate.carrier.toUpperCase();
                        carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
                        
                        if (!carrierDetails[carrier]) {
                            carrierDetails[carrier] = [];
                        }
                        carrierDetails[carrier].push({
                            service: rate.service,
                            rate: rate.rate,
                            delivery_days: rate.delivery_days
                        });
                    });
                    
                    console.log(`📊 Detailed rates analysis (attempt ${attempt}):`);
                    console.log(`📊 Total rates: ${shipment.rates.length}`);
                    console.log(`📊 Rates by carrier:`, carrierCounts);
                    
                    // Log detailed carrier information
                    Object.keys(carrierDetails).forEach(carrier => {
                        console.log(`📊 ${carrier} services:`, carrierDetails[carrier]);
                    });
                    
                    // Check for missing major carriers
                    const hasUPS = Object.keys(carrierCounts).some(carrier => 
                        carrier === 'UPS' || carrier === 'UPSDAP'
                    );
                    const hasFedEx = Object.keys(carrierCounts).some(carrier => 
                        carrier === 'FEDEX' || carrier === 'FEDEXDEFAULT'
                    );
                    const hasUSPS = Object.keys(carrierCounts).some(carrier => 
                        carrier === 'USPS'
                    );
                    
                    console.log('📊 Major carriers present:');
                    console.log(`  - UPS: ${hasUPS ? '✅' : '❌'}`);
                    console.log(`  - FedEx: ${hasFedEx ? '✅' : '❌'}`);
                    console.log(`  - USPS: ${hasUSPS ? '✅' : '❌'}`);
                    
                    // If we got a reasonable response with at least one major carrier, return it
                    if (hasUSPS || hasUPS || hasFedEx) {
                        console.log(`✅ Success on attempt ${attempt} - returning shipment with carriers`);
                        return shipment;
                    } else if (attempt < maxRetries) {
                        console.log(`⚠️ No major carriers returned on attempt ${attempt}, retrying...`);
                        lastError = new Error('No major carriers returned from EasyPost');
                        // Exponential backoff: wait longer on each retry
                        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s
                        console.log(`⏱️ Waiting ${delay}ms before retry ${attempt + 1}`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    
                    if (!hasUPS) {
                        console.log('⚠️ UPS rates missing - possible causes:');
                        console.log('  - Package too small (min 8"x6"x2", 1lb)');
                        console.log('  - Address validation failed');
                        console.log('  - Destination not serviceable by UPS');
                        console.log('  - Package dimensions exceed UPS limits');
                        console.log('  - EasyPost API timing/rate limiting issue');
                    }
                    
                    if (!hasFedEx) {
                        console.log('⚠️ FedEx rates missing - possible causes:');
                        console.log('  - Package too small (min 8"x6"x2", 1lb)');
                        console.log('  - Address validation failed');
                        console.log('  - Destination not serviceable by FedEx');
                        console.log('  - Package dimensions exceed FedEx limits');
                        console.log('  - EasyPost API timing/rate limiting issue');
                    }
                    
                    // Check for any EasyPost error messages in the response
                    if (shipment.messages && shipment.messages.length > 0) {
                        console.log('⚠️ EasyPost messages/warnings:');
                        shipment.messages.forEach(msg => {
                            console.log(`  - ${msg.message}`);
                        });
                    }
                    
                    return shipment; // Return even if some carriers are missing
                } else {
                    console.log('❌ No rates returned from EasyPost at all');
                    if (attempt < maxRetries) {
                        console.log(`⚠️ No rates on attempt ${attempt}, retrying...`);
                        lastError = new Error('No rates returned from EasyPost');
                        // Exponential backoff for no rates scenario
                        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s
                        console.log(`⏱️ Waiting ${delay}ms before retry ${attempt + 1}`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    console.log('❌ This usually indicates:');
                    console.log('  - Invalid addresses');
                    console.log('  - Package dimensions outside carrier limits');
                    console.log('  - No carriers service this route');
                    console.log('  - EasyPost API issue');
                }
                
                return shipment;
            } catch (error) {
                console.error(`❌ Failed to create EasyPost shipment (attempt ${attempt}):`, error);
                console.error('❌ Error details:', error.message);
                if (error.errors) {
                    console.error('❌ EasyPost validation errors:', error.errors);
                }
                
                lastError = error;
                
                if (attempt < maxRetries) {
                    // Exponential backoff for errors
                    const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s
                    console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ All retry attempts failed');
                    throw error;
                }
            }
        }
        
        // If we get here, all retries failed
        throw lastError || new Error('Failed to create shipment after all retries');
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
            // Custom dimensions from frontend (weight is in pounds)
            // Remove cache-busting timestamp if present
            const { _timestamp, ...cleanDimensions } = customDimensions;
            const originalDimensions = { ...cleanDimensions };
            
            parcel = {
                length: Math.max(cleanDimensions.length, 8),    // Ensure minimum 8" for UPS/FedEx
                width: Math.max(cleanDimensions.width, 6),      // Ensure minimum 6" for UPS/FedEx
                height: Math.max(cleanDimensions.height, 2),    // Ensure minimum 2" for UPS/FedEx
                weight: Math.max(cleanDimensions.weight, 1)     // Ensure minimum 1 lb for UPS/FedEx
            };
            
            // Check if any adjustments were made
            const adjustments = [];
            if (parcel.length !== originalDimensions.length) {
                adjustments.push(`Length: ${originalDimensions.length}" → ${parcel.length}"`);
            }
            if (parcel.width !== originalDimensions.width) {
                adjustments.push(`Width: ${originalDimensions.width}" → ${parcel.width}"`);
            }
            if (parcel.height !== originalDimensions.height) {
                adjustments.push(`Height: ${originalDimensions.height}" → ${parcel.height}"`);
            }
            if (parcel.weight !== originalDimensions.weight) {
                adjustments.push(`Weight: ${originalDimensions.weight}lb → ${parcel.weight}lb`);
            }
            
            console.log('📦 Using custom dimensions with auto-enhancement:');
            console.log(`  - Original: ${originalDimensions.length}×${originalDimensions.width}×${originalDimensions.height}, ${originalDimensions.weight}lb`);
            console.log(`  - Enhanced: ${parcel.length}×${parcel.width}×${parcel.height}, ${parcel.weight}lb`);
            if (_timestamp) {
                console.log(`  - Cache-busting timestamp: ${_timestamp}`);
            }
            
            if (adjustments.length > 0) {
                console.log('🔧 Auto-adjustments made:');
                adjustments.forEach(adj => console.log(`     ${adj}`));
                console.log('🎯 These adjustments ensure UPS/FedEx compatibility');
            } else {
                console.log('✅ No adjustments needed - package already meets carrier requirements');
            }
            
            // Validate the final dimensions
            const meetsUPS = parcel.length >= 8 && parcel.width >= 6 && parcel.height >= 2 && parcel.weight >= 1;
            const meetsFedEx = parcel.length >= 8 && parcel.width >= 6 && parcel.height >= 2 && parcel.weight >= 1;
            
            console.log('🔍 Final validation check:');
            console.log(`  - UPS requirements (8×6×2, 1lb): ${meetsUPS ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`  - FedEx requirements (8×6×2, 1lb): ${meetsFedEx ? '✅ PASS' : '❌ FAIL'}`);
            
            if (!meetsUPS || !meetsFedEx) {
                console.error('❌ CRITICAL: Auto-enhancement failed! Package still doesn\'t meet requirements');
                console.error('❌ This will likely cause UPS/FedEx to not return rates');
            }
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

            // Convert ounces to pounds for EasyPost (estimateItemWeight returns ounces)
            totalWeight = totalWeight / 16;

            // Stricter minimum package dimensions for better carrier compatibility
            parcel = {
                length: Math.max(maxLength, 8),   // Minimum 8 inches for UPS/FedEx compatibility
                width: Math.max(maxWidth, 6),     // Minimum 6 inches for UPS/FedEx compatibility  
                height: Math.max(totalHeight, 2), // Minimum 2 inches for UPS/FedEx compatibility
                weight: Math.max(totalWeight, 1)  // Minimum 1 lb for UPS/FedEx services
            };
            
            console.log('📦 Calculated dimensions from order items:');
            console.log(`  - Calculated: ${maxLength}×${maxWidth}×${totalHeight}, ${totalWeight}lb`);
            console.log(`  - Enhanced: ${parcel.length}×${parcel.width}×${parcel.height}, ${parcel.weight}lb`);
        }

        // Additional validation for extreme cases
        if (parcel.weight > 150) {
            console.warn('⚠️ Package weight exceeds 150 lbs - some carriers may not accept');
        }
        
        if (parcel.length > 108 || parcel.width > 108 || parcel.height > 108) {
            console.warn('⚠️ Package dimensions exceed 108 inches - some carriers may not accept');
        }

        // Format phone number for better carrier compatibility (remove non-numeric characters)
        const formatPhone = (phone) => {
            if (!phone) return null;
            // Remove all non-numeric characters and ensure it's 10 digits
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.length === 10) {
                return cleaned;
            } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
                return cleaned.substring(1); // Remove country code
            }
            return null; // Invalid phone number
        };

        // Enhanced address formatting for better carrier compatibility
        const toAddress = {
            name: `${order.customerFirstName || order.customer_first_name || ''} ${order.customerLastName || order.customer_last_name || ''}`.trim(),
            company: shippingAddr.company || null,
            street1: (shippingAddr.address1 || shippingAddr.line1 || '').trim(),
            street2: (shippingAddr.address2 || shippingAddr.line2 || '').trim() || null,
            city: (shippingAddr.city || '').trim(),
            state: (shippingAddr.province || shippingAddr.state || '').trim(),
            zip: (shippingAddr.zip || shippingAddr.postal_code || '').trim(),
            country: (shippingAddr.country || 'US').trim(),
            phone: formatPhone(shippingAddr.phone || order.customerPhone || order.customer_phone),
            email: order.customerEmail || order.customer_email,
            verify: ['delivery'] // Add address verification for better carrier compatibility
        };

        // Validate required address fields
        if (!toAddress.name || toAddress.name.length < 2) {
            console.warn('⚠️ Customer name is too short - may cause carrier issues');
        }
        
        if (!toAddress.street1 || toAddress.street1.length < 5) {
            console.warn('⚠️ Street address is too short - may cause carrier issues');
        }
        
        if (!toAddress.city || toAddress.city.length < 2) {
            console.warn('⚠️ City name is too short - may cause carrier issues');
        }
        
        if (!toAddress.state || toAddress.state.length < 2) {
            console.warn('⚠️ State is missing or too short - may cause carrier issues');
        }
        
        if (!toAddress.zip || toAddress.zip.length < 5) {
            console.warn('⚠️ ZIP code is missing or too short - may cause carrier issues');
        }

        // Additional address validations for common issues
        const commonIssues = [];
        
        // Check for PO Box (UPS/FedEx may not deliver to PO Boxes)
        if (toAddress.street1.toUpperCase().includes('PO BOX') || toAddress.street1.toUpperCase().includes('P.O. BOX')) {
            commonIssues.push('PO Box detected - UPS/FedEx may not deliver to PO Boxes');
        }
        
        // Check for APO/FPO addresses (military addresses)
        if (toAddress.state.toUpperCase().includes('APO') || toAddress.state.toUpperCase().includes('FPO')) {
            commonIssues.push('Military address detected - some carriers may have restrictions');
        }
        
        // Check for common state abbreviation issues
        if (toAddress.state.length > 2 && toAddress.country === 'US') {
            commonIssues.push('State should be 2-letter abbreviation for US addresses');
        }
        
        // Check ZIP code format for US addresses
        if (toAddress.country === 'US' && toAddress.zip) {
            const zipRegex = /^\d{5}(-\d{4})?$/;
            if (!zipRegex.test(toAddress.zip)) {
                commonIssues.push('Invalid ZIP code format - should be 12345 or 12345-1234');
            }
        }
        
        if (commonIssues.length > 0) {
            console.warn('⚠️ Address validation issues detected:');
            commonIssues.forEach(issue => console.warn(`  - ${issue}`));
        }

        // Handle fromAddress as either an object or EasyPost address ID
        const fromAddressData = typeof fromAddress === 'string' 
            ? { id: fromAddress }  // Wrap address ID in object for EasyPost
            : fromAddress; // Use address object

        // Log the formatted data for debugging
        console.log('📦 Final formatted shipment data:');
        console.log('📍 To Address:', JSON.stringify(toAddress, null, 2));
        console.log('📦 Parcel:', JSON.stringify(parcel, null, 2));
        console.log('📍 From Address:', JSON.stringify(fromAddressData, null, 2));

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

    /**
     * Test EasyPost API connectivity and account status
     * @returns {Promise<Object>} - Diagnostic information
     */
    async testApiHealth() {
        if (!this.isReady()) {
            return {
                status: 'error',
                message: 'EasyPost client is not configured',
                ready: false
            };
        }

        try {
            console.log('🔍 Testing EasyPost API health...');
            
            // Test with a simple address verification
            const testAddress = {
                street1: '2981 S Harrison St',
                city: 'Denver',
                state: 'CO',
                zip: '80210',
                country: 'US'
            };

            this.trackApiCall('healthCheck_address');
            const address = await this.client.Address.create(testAddress);
            
            // Test with a minimal shipment creation
            const testShipment = {
                to_address: testAddress,
                from_address: testAddress,
                parcel: {
                    length: 10,
                    width: 8, 
                    height: 6,
                    weight: 2
                }
            };

            this.trackApiCall('healthCheck_shipment');
            const shipment = await this.client.Shipment.create(testShipment);
            
            const diagnostics = {
                status: 'success',
                ready: true,
                testMode: this.isTestMode(),
                apiKeyType: this.detectKeyType(process.env.EASYPOST_API_KEY),
                addressVerification: {
                    success: !!address.id,
                    addressId: address.id
                },
                shipmentCreation: {
                    success: !!shipment.id,
                    shipmentId: shipment.id,
                    ratesCount: shipment.rates?.length || 0,
                    carriers: shipment.rates ? shipment.rates.map(r => r.carrier).join(', ') : 'none'
                },
                timestamp: new Date().toISOString()
            };

            console.log('✅ EasyPost API health test passed:', diagnostics);
            return diagnostics;

        } catch (error) {
            console.error('❌ EasyPost API health test failed:', error);
            
            const diagnostics = {
                status: 'error',
                ready: this.isReady(),
                testMode: this.isTestMode(),
                apiKeyType: this.detectKeyType(process.env.EASYPOST_API_KEY),
                error: error.message,
                errorCode: error.code,
                timestamp: new Date().toISOString()
            };

            return diagnostics;
        }
    }

    /**
     * Track API call for rate limiting detection
     * @param {string} operation - The type of API operation
     */
    trackApiCall(operation) {
        const now = Date.now();
        this.recentCalls.push({ operation, timestamp: now });
        
        // Keep only last 100 calls or calls from last 5 minutes
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        this.recentCalls = this.recentCalls
            .filter(call => call.timestamp > fiveMinutesAgo)
            .slice(-100);
    }

    /**
     * Get rate limiting statistics
     * @returns {Object} - Rate limiting info
     */
    getRateLimitingStats() {
        const now = Date.now();
        const oneMinuteAgo = now - (60 * 1000);
        const fiveMinutesAgo = now - (5 * 60 * 1000);

        const lastMinuteCalls = this.recentCalls.filter(call => call.timestamp > oneMinuteAgo);
        const lastFiveMinutesCalls = this.recentCalls.filter(call => call.timestamp > fiveMinutesAgo);

        return {
            totalRecentCalls: this.recentCalls.length,
            callsLastMinute: lastMinuteCalls.length,
            callsLast5Minutes: lastFiveMinutesCalls.length,
            averageCallsPerMinute: lastFiveMinutesCalls.length / 5,
            lastCallTimestamp: this.recentCalls.length > 0 ? this.recentCalls[this.recentCalls.length - 1].timestamp : null,
            possibleRateLimit: lastMinuteCalls.length > 30 || lastFiveMinutesCalls.length > 100 // Conservative estimates
        };
    }
}

module.exports = new EasyPostService(); 