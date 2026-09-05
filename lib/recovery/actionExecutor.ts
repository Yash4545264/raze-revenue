import { getDb } from '@/lib/db/supabaseStore';
import { getRazorpayClient } from '@/lib/razorpay/client';
import { sendRecoveryCommunication, CommunicationChannel } from '@/lib/communications/engine';
import { RecommendedActionType } from '@/types';

export async function executeRecoveryAction(caseId: string, actionType: RecommendedActionType) {
  const recoveryCase = await (await getDb()).getRecoveryCase(caseId);
  if (!recoveryCase) throw new Error('Case not found');
  if (recoveryCase.status === 'recovered') throw new Error('Already recovered');

  const customer = await (await getDb()).getCustomer(recoveryCase.customer_id);
  if (!customer) throw new Error('Customer not found');
  
  const order = await (await getDb()).getOrder(recoveryCase.order_id);
  if (!order) throw new Error('Order not found');

  const rzpClient = await getRazorpayClient(recoveryCase.merchant_id);

  if (actionType === 'payment_link') {
    // Create Razorpay payment link
    const plink = await rzpClient.createPaymentLink(
      Number(recoveryCase.revenue_at_risk) * 100, // Amount in paise
      'INR',
      `Recovery for order ${recoveryCase.order_id}`,
      { name: customer.name, email: customer.email, contact: customer.phone || undefined }
    );

    // Record Action
    await (await getDb()).createRecoveryAction({
      merchant_id: recoveryCase.merchant_id,
      recovery_case_id: recoveryCase.id,
      action_type: 'payment_link',
      policy_result: 'approved',
      status: 'executed',
      result: 'Payment link created successfully',
      amount_recovered: 0,
      razorpay_payment_link_id: plink.id,
      razorpay_payment_link_url: plink.short_url,
      executed_at: new Date().toISOString()
    });

    await (await getDb()).updateRecoveryCase(recoveryCase.id, { status: 'in_progress' });
    await (await getDb()).addAuditLog({
      merchant_id: recoveryCase.merchant_id,
      entity_id: recoveryCase.id,
      event: 'PAYMENT_LINK_CREATED',
      actor: 'SYSTEM',
      decision: null,
      reason: 'Payment link generated via Razorpay',
      metadata: { link_id: plink.id, url: plink.short_url }
    });

    return { success: true, paymentLink: plink };
  }

  if (['email_reminder', 'sms_reminder', 'whatsapp_message'].includes(actionType)) {
    // Generate a payment link first if they don't have one active
    let paymentLinkUrl = null;
    let paymentLinkId = null;
    
    // Simplistic check for existing link
    const existingActions = await (await getDb()).getRecoveryActions(recoveryCase.id);
    const existingLinkAction = existingActions.find(a => a.razorpay_payment_link_url);
    if (existingLinkAction) {
      paymentLinkUrl = existingLinkAction.razorpay_payment_link_url;
      paymentLinkId = existingLinkAction.razorpay_payment_link_id;
    } else {
      const plink = await rzpClient.createPaymentLink(
        Number(recoveryCase.revenue_at_risk) * 100,
        'INR',
        `Recovery for order ${recoveryCase.order_id}`,
        { name: customer.name, email: customer.email, contact: customer.phone || undefined }
      );
      paymentLinkUrl = plink.short_url;
      paymentLinkId = plink.id;
    }

    const channelMap: Record<string, CommunicationChannel> = {
      'email_reminder': 'email',
      'sms_reminder': 'sms',
      'whatsapp_message': 'whatsapp'
    };

    const commResult = await sendRecoveryCommunication(
      channelMap[actionType],
      customer,
      order,
      recoveryCase,
      paymentLinkUrl
    );

    await (await getDb()).createRecoveryAction({
      merchant_id: recoveryCase.merchant_id,
      recovery_case_id: recoveryCase.id,
      action_type: actionType as RecommendedActionType,
      policy_result: 'approved',
      status: 'executed',
      result: `Communication sent: ${commResult.messageId}`,
      amount_recovered: 0,
      razorpay_payment_link_id: paymentLinkId,
      razorpay_payment_link_url: paymentLinkUrl,
      executed_at: new Date().toISOString()
    });

    await (await getDb()).updateRecoveryCase(recoveryCase.id, { status: 'in_progress' });
    await (await getDb()).addAuditLog({
      merchant_id: recoveryCase.merchant_id,
      entity_id: recoveryCase.id,
      event: 'COMMUNICATION_SENT',
      actor: 'SYSTEM',
      decision: null,
      reason: `${actionType} sent to customer via ${commResult.channel}`,
      metadata: { action: actionType, messageId: commResult.messageId }
    });

    return { success: true, message: `Communication sent via ${commResult.channel}` };
  }

  // Simulate other actions (retry, human_escalation, etc.)
  await (await getDb()).createRecoveryAction({
    merchant_id: recoveryCase.merchant_id,
    recovery_case_id: recoveryCase.id,
    action_type: actionType,
    policy_result: 'approved',
    status: 'executed',
    result: `${actionType} executed successfully (simulated)`,
    amount_recovered: 0,
    razorpay_payment_link_id: null,
    razorpay_payment_link_url: null,
    executed_at: new Date().toISOString()
  });

  await (await getDb()).updateRecoveryCase(recoveryCase.id, { status: 'in_progress' });
  await (await getDb()).addAuditLog({
    merchant_id: recoveryCase.merchant_id,
    entity_id: recoveryCase.id,
    event: 'RECOVERY_ATTEMPTED',
    actor: 'SYSTEM',
    decision: null,
    reason: `${actionType} executed (simulated)`,
    metadata: { action: actionType }
  });

  return { success: true, message: `${actionType} executed (simulated)` };
}
