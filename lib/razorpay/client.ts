import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getAdminDb } from '../db/supabaseStore';

// Only for fallback / mock purposes if we can't find keys
const fallback_key_id = process.env.RAZORPAY_KEY_ID || 'mock_key_id';
const fallback_key_secret = process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret';
const fallback_webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';

/**
 * Returns a dynamically initialized Razorpay client using the merchant's keys from the database.
 */
export const getRazorpayClient = async (merchantId: string) => {
  const policies = await getAdminDb().getPolicies();
  // In a real multi-tenant setup, getAdminDb().getPolicies() would take the merchantId as an argument
  // For MVP, we only have one merchant, so we just check if keys are configured in policies.
  
  const key_id = policies?.razorpay_key_id || fallback_key_id;
  const key_secret = policies?.razorpay_key_secret || fallback_key_secret;
  
  const isMock = key_id === 'mock_key_id';
  
  let razorpayInstance: any = null;
  if (!isMock) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }

  const createRazorpayOrder = async (amount: number, currency: string = 'INR', receipt: string) => {
    if (isMock) {
      return {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount,
        currency,
        receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000)
      };
    }
  
    return await razorpayInstance.orders.create({
      amount,
      currency,
      receipt,
    });
  };

  const createPaymentLink = async (
    amount: number, 
    currency: string = 'INR', 
    description: string, 
    customer: { name: string; email: string; contact?: string }
  ) => {
    if (isMock) {
      return {
        id: `plink_mock_${Date.now()}`,
        short_url: `https://rzp.io/i/mock${Date.now()}`,
        status: 'created',
        amount,
        currency,
        description,
        customer
      };
    }
  
    try {
      // Remove undefined properties to avoid Razorpay validation errors
      const safeCustomer: any = { name: customer.name, email: customer.email };
      if (customer.contact) safeCustomer.contact = customer.contact;

      return await razorpayInstance.paymentLink.create({
        amount,
        currency,
        description,
        customer: safeCustomer,
        notify: {
          sms: !!customer.contact,
          email: !!customer.email
        },
        reminder_enable: true
      });
    } catch (err) {
      console.error('Razorpay createPaymentLink error:', err);
      throw err;
    }
  };

  return {
    createRazorpayOrder,
    createPaymentLink
  };
};

export const verifyWebhookSignature = async (merchantId: string, body: string, signature: string): Promise<boolean> => {
  const policies = await getAdminDb().getPolicies();
  const secret = policies?.razorpay_webhook_secret || fallback_webhook_secret;

  if (secret === 'mock_webhook_secret') return true;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
    
  return expectedSignature === signature;
};
