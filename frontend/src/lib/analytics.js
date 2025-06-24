import { usePostHog } from 'posthog-js/react'
import { useRouter } from 'next/router'

// Custom hook for analytics
export function useAnalytics() {
  const posthog = usePostHog()
  const router = useRouter()

  const trackEvent = (eventName, properties = {}) => {
    if (posthog) {
      posthog.capture(eventName, {
        ...properties,
        page: router.pathname,
        timestamp: new Date().toISOString()
      })
    }
  }

  const trackPageView = (page) => {
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        page: page || router.pathname
      })
    }
  }

  const identifyUser = (userId, properties = {}) => {
    if (posthog) {
      posthog.identify(userId, properties)
    }
  }

  // Sticker Shuttle specific events
  const trackProductView = (productName, productType) => {
    trackEvent('product_viewed', {
      product_name: productName,
      product_type: productType
    })
  }

  const trackCalculatorUsed = (calculatorType, selections) => {
    trackEvent('calculator_used', {
      calculator_type: calculatorType,
      selections: selections
    })
  }

  const trackAddToCart = (item) => {
    trackEvent('add_to_cart', {
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      value: item.price
    })
  }

  const trackRemoveFromCart = (item) => {
    trackEvent('remove_from_cart', {
      product_name: item.name,
      quantity: item.quantity,
      price: item.price
    })
  }

  const trackCheckoutStarted = (cartItems, totalValue) => {
    trackEvent('checkout_started', {
      items: cartItems.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total_items: cartItems.length,
      total_value: totalValue
    })
  }

  const trackPurchaseCompleted = (orderNumber, orderTotal, items) => {
    trackEvent('purchase_completed', {
      order_number: orderNumber,
      revenue: orderTotal,
      items: items.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total_items: items.length
    })
  }

  const trackProofViewed = (orderNumber, proofId) => {
    trackEvent('proof_viewed', {
      order_number: orderNumber,
      proof_id: proofId
    })
  }

  const trackProofApproved = (orderNumber, proofId) => {
    trackEvent('proof_approved', {
      order_number: orderNumber,
      proof_id: proofId
    })
  }

  const trackOrderTracked = (orderNumber, trackingNumber) => {
    trackEvent('order_tracked', {
      order_number: orderNumber,
      tracking_number: trackingNumber
    })
  }

  const trackSupportContact = (method, topic) => {
    trackEvent('support_contacted', {
      contact_method: method,
      topic: topic
    })
  }

  const trackFileUpload = (fileType, fileName, context) => {
    trackEvent('file_uploaded', {
      file_type: fileType,
      file_name: fileName,
      upload_context: context
    })
  }

  return {
    trackEvent,
    trackPageView,
    identifyUser,
    trackProductView,
    trackCalculatorUsed,
    trackAddToCart,
    trackRemoveFromCart,
    trackCheckoutStarted,
    trackPurchaseCompleted,
    trackProofViewed,
    trackProofApproved,
    trackOrderTracked,
    trackSupportContact,
    trackFileUpload
  }
} 