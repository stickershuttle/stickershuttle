const axios = require('axios');
const { shopifyConfig, validateConfig } = require('./shopify-config');

class ShopifyClient {
  constructor() {
    this.config = shopifyConfig;
    this.baseURL = `https://${this.config.storeUrl}/admin/api/${this.config.apiVersion}`;
    this.headers = {
      'X-Shopify-Access-Token': this.config.accessToken,
      'Content-Type': 'application/json'
    };
  }

  // Create a draft order
  async createDraftOrder(orderData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/draft_orders.json`,
        {
          draft_order: {
            line_items: orderData.lineItems,
            customer: orderData.customer,
            shipping_address: orderData.shippingAddress,
            billing_address: orderData.billingAddress,
            email: orderData.email,
            note: orderData.note || '',
            tags: orderData.tags || 'draft-order',
            use_customer_default_address: true
          }
        },
        { headers: this.headers }
      );

      return response.data.draft_order;
    } catch (error) {
      console.error('Error creating draft order:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.errors 
        ? JSON.stringify(error.response.data.errors) 
        : error.response?.data?.message || error.message;
      throw new Error(`Failed to create draft order: ${errorMessage}`);
    }
  }

  // Complete a draft order (convert to order)
  async completeDraftOrder(draftOrderId) {
    try {
      const response = await axios.put(
        `${this.baseURL}/draft_orders/${draftOrderId}/complete.json`,
        { payment_pending: false },
        { headers: this.headers }
      );

      return response.data.draft_order;
    } catch (error) {
      console.error('Error completing draft order:', error.response?.data || error.message);
      throw new Error(`Failed to complete draft order: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get draft order details
  async getDraftOrder(draftOrderId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/draft_orders/${draftOrderId}.json`,
        { headers: this.headers }
      );

      return response.data.draft_order;
    } catch (error) {
      console.error('Error fetching draft order:', error.response?.data || error.message);
      throw new Error(`Failed to fetch draft order: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Update draft order
  async updateDraftOrder(draftOrderId, updateData) {
    try {
      const response = await axios.put(
        `${this.baseURL}/draft_orders/${draftOrderId}.json`,
        { draft_order: updateData },
        { headers: this.headers }
      );

      return response.data.draft_order;
    } catch (error) {
      console.error('Error updating draft order:', error.response?.data || error.message);
      throw new Error(`Failed to update draft order: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Delete draft order
  async deleteDraftOrder(draftOrderId) {
    try {
      await axios.delete(
        `${this.baseURL}/draft_orders/${draftOrderId}.json`,
        { headers: this.headers }
      );

      return { success: true, message: 'Draft order deleted successfully' };
    } catch (error) {
      console.error('Error deleting draft order:', error.response?.data || error.message);
      throw new Error(`Failed to delete draft order: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get all draft orders
  async getAllDraftOrders(options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        since_id: options.sinceId || '',
        status: options.status || 'open'
      });

      const response = await axios.get(
        `${this.baseURL}/draft_orders.json?${params}`,
        { headers: this.headers }
      );

      return response.data.draft_orders;
    } catch (error) {
      console.error('Error fetching draft orders:', error.response?.data || error.message);
      throw new Error(`Failed to fetch draft orders: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get product details including variants
  async getProduct(productId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/products/${productId}.json`,
        { headers: this.headers }
      );

      return response.data.product;
    } catch (error) {
      console.error('Error fetching product:', error.response?.data || error.message);
      throw new Error(`Failed to fetch product: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get product variants
  async getProductVariants(productId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/products/${productId}/variants.json`,
        { headers: this.headers }
      );

      return response.data.variants;
    } catch (error) {
      console.error('Error fetching product variants:', error.response?.data || error.message);
      throw new Error(`Failed to fetch product variants: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Create checkout URL for draft order
  async createCheckoutUrl(draftOrderId) {
    try {
      const draftOrder = await this.getDraftOrder(draftOrderId);
      
      if (!draftOrder.invoice_url) {
        throw new Error('No invoice URL available for this draft order');
      }

      return {
        checkoutUrl: draftOrder.invoice_url,
        draftOrderId: draftOrder.id,
        totalPrice: draftOrder.total_price
      };
    } catch (error) {
      console.error('Error creating checkout URL:', error.message);
      throw error;
    }
  }
}

module.exports = ShopifyClient; 