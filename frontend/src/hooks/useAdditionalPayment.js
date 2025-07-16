import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_ADDITIONAL_PAYMENT_LINK } from '../lib/stripe-mutations';

export const useAdditionalPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [createAdditionalPaymentLink] = useMutation(CREATE_ADDITIONAL_PAYMENT_LINK);

  const createPaymentLink = async (orderId, additionalItems, customerEmail, orderNote = '') => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await createAdditionalPaymentLink({
        variables: {
          input: {
            orderId,
            additionalItems,
            customerEmail,
            orderNote
          }
        }
      });

      const result = data.createAdditionalPaymentLink;

      if (!result.success) {
        throw new Error(result.message || 'Failed to create payment link');
      }

      return { 
        success: true, 
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId 
      };

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentLink,
    loading,
    error
  };
}; 