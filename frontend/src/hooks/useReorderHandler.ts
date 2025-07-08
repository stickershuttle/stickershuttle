import { useRouter } from 'next/router';
import { useCallback } from 'react';

interface ReorderItem {
  id: string;
  product: string;
  quantity: number;
  customization: any;
  image?: string;
  customFiles?: string[];
  custom_files?: string[];
  notes?: string;
  customerNotes?: string;
  customer_notes?: string;
  calculatorSelections?: any;
  _fullItemData?: any;
}

interface ReorderOrder {
  id: string;
  items: ReorderItem[];
}

export const useReorderHandler = () => {
  const router = useRouter();

  const handleReorder = useCallback(async (orderId: string, orders: any[]) => {
    try {
      console.log('🔄 Starting reorder process for order:', orderId);
      
      // Find the order in the orders array
      const order = orders.find(o => o.id === orderId || o.order_id === orderId);
      if (!order) {
        console.error('❌ Order not found:', orderId);
        throw new Error('Order not found');
      }

      console.log('📋 Found order for reorder:', order);

      // Extract items from the order
      const items = order.items || [];
      if (!items || items.length === 0) {
        console.error('❌ No items found in order');
        throw new Error('No items found in order');
      }

      console.log('📦 Order items:', items);

      // Prepare reorder data for localStorage
      const reorderData = {
        orderId: orderId,
        items: items.map((item: any) => ({
          ...item,
          _fullItemData: item // Store full item data for calculator access
        }))
      };

      // Store reorder data in localStorage
      localStorage.setItem('reorderData', JSON.stringify(reorderData));
      console.log('💾 Reorder data stored in localStorage');

      // Get the first item to determine which product page to redirect to
      const firstItem = items[0];
      const productType = firstItem.product || firstItem.productType || 'vinyl-stickers';
      
      // Map product types to their respective pages
      const productPageMap: { [key: string]: string } = {
        'vinyl-stickers': '/products/vinyl-stickers',
        'holographic-stickers': '/products/holographic-stickers',
        'glitter-stickers': '/products/glitter-stickers',
        'chrome-stickers': '/products/chrome-stickers',
        'clear-stickers': '/products/clear-stickers',
        'sticker-sheets': '/products/sticker-sheets',
        'vinyl-banners': '/products/vinyl-banners'
      };

      const redirectPath = productPageMap[productType] || '/products/vinyl-stickers';
      
      console.log('🔀 Redirecting to product page:', redirectPath);
      
      // Redirect to the appropriate product page
      await router.push(redirectPath);
      
    } catch (error) {
      console.error('❌ Error in reorder process:', error);
      throw error;
    }
  }, [router]);

  return { handleReorder };
}; 