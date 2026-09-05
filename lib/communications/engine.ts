import { Customer, Order, RecoveryCase } from '@/types';

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp';

export interface CommunicationResult {
  success: boolean;
  messageId: string;
  channel: CommunicationChannel;
  content: string;
}

export async function sendRecoveryCommunication(
  channel: CommunicationChannel,
  customer: Customer,
  order: Order,
  recoveryCase: RecoveryCase,
  paymentLinkUrl?: string | null
): Promise<CommunicationResult> {
  // In a real app, this would integrate with Twilio (SMS/WhatsApp) and SendGrid/Postmark (Email)
  
  const linkText = paymentLinkUrl ? `Complete your payment here: ${paymentLinkUrl}` : 'Please update your payment method.';
  let content = '';

  if (channel === 'whatsapp') {
    content = `[WhatsApp] Hi ${customer.name}, we noticed an issue with your recent payment of ${order.currency} ${order.amount} for Order #${order.razorpay_order_id}. ${linkText}`;
  } else if (channel === 'sms') {
    content = `[SMS] Payment issue for Order #${order.razorpay_order_id} (Amt: ${order.amount}). ${linkText}`;
  } else if (channel === 'email') {
    content = `[Email]\nSubject: Action Required: Payment Issue for Order #${order.razorpay_order_id}\n\nHi ${customer.name},\n\nWe were unable to process your payment of ${order.currency} ${order.amount}.\n\n${linkText}\n\nThank you for shopping with us!`;
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`Mock Communication Sent via ${channel} to ${customer.email}:`, content);

  return {
    success: true,
    messageId: `msg_${channel}_${Date.now()}`,
    channel,
    content
  };
}
