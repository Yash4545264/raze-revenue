import { Customer, Order, RecoveryCase } from '@/types';
import { Resend } from 'resend';

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
  const linkText = paymentLinkUrl ? `Complete your payment here: ${paymentLinkUrl}` : 'Please update your payment method.';
  let content = '';

  if (channel === 'whatsapp') {
    content = `[WhatsApp] Hi ${customer.name}, we noticed an issue with your recent payment of ${order.currency} ${order.amount} for Order #${order.razorpay_order_id}. ${linkText}`;
  } else if (channel === 'sms') {
    content = `[SMS] Payment issue for Order #${order.razorpay_order_id} (Amt: ${order.amount}). ${linkText}`;
  } else if (channel === 'email') {
    content = `[Email]\nSubject: Action Required: Payment Issue for Order #${order.razorpay_order_id}\n\nHi ${customer.name},\n\nWe were unable to process your payment of ${order.currency} ${order.amount}.\n\n${linkText}\n\nThank you for shopping with us!`;
    
    // Actually send real email using Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        const { data, error } = await resend.emails.send({
          from: 'RazeRevenue <onboarding@resend.dev>', // resend's default test sender
          to: [customer.email],
          subject: `Action Required: Payment Issue for Order #${order.razorpay_order_id}`,
          text: `Hi ${customer.name},\n\nWe were unable to process your payment of ${order.currency} ${order.amount}.\n\n${linkText}\n\nThank you for shopping with us!`
        });

        if (error) {
          console.error('Failed to send Resend email:', error);
          throw new Error('Email sending failed');
        }

        console.log(`Real Email Sent via Resend to ${customer.email}:`, data);
        return {
          success: true,
          messageId: data?.id || `msg_email_${Date.now()}`,
          channel,
          content
        };
      } catch (err) {
        console.error('Error with Resend API:', err);
      }
    } else {
      console.warn('RESEND_API_KEY not found. Simulating email instead.');
    }
  }

  // Simulate network delay for SMS / WhatsApp (or if Resend key is missing)
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`Mock Communication Sent via ${channel} to ${customer.email}:`, content);

  return {
    success: true,
    messageId: `msg_${channel}_${Date.now()}`,
    channel,
    content
  };
}
