import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables');
  console.error('Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file');
}

const stripePromise = stripePublishableKey 
  ? loadStripe(stripePublishableKey)
  : null;

export default stripePromise; 