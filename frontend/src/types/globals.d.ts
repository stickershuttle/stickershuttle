// Global type declarations for Sticker Shuttle

declare global {
  interface Window {
    fbq?: (
      command: 'track' | 'trackCustom' | 'init',
      eventName: string,
      parameters?: {
        content_ids?: string[];
        content_name?: string;
        content_category?: string;
        content_type?: string;
        contents?: Array<{
          id: string;
          quantity: number;
          item_price: number;
        }>;
        currency?: string;
        value?: number;
        num_items?: number;
      }
    ) => void;
  }
}

export {}; 