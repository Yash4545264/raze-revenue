import { NextResponse } from 'next/server';
import { verifyWebhookSignature, getRazorpayClient } from '@/lib/razorpay/client';
import { getAdminDb } from '@/lib/db/supabaseStore';
import { analyzeRecoveryCase } from '@/lib/ai/recoveryBrain';
import { evaluateStrategies, selectBestStrategy } from '@/lib/recovery/strategyEngine';
import { runPolicyEngine } from '@/lib/policy/policyEngine';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id') || 'default_merchant';

    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature || !(await verifyWebhookSignature(merchantId, body, signature))) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const adminDb = getAdminDb();

    // Idempotency check
    const existingEvent = await adminDb.getWebhookEvent(event.id);
    if (existingEvent) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    await adminDb.addWebhookEvent({
      merchant_id: merchantId,
      event_id: event.id || event.event_id,
      event_type: event.event,
      payload: event,
      processed: true
    });

    if (event.event === 'payment.failed') {
      const paymentEntity = event.payload.payment.entity;
      
      // Look up existing order
      let order = await adminDb.getOrderByRazorpayId(paymentEntity.order_id);
      
      // If we don't have order in DB, create a dummy one
      if (!order) {
        // Fallback to finding an existing customer
        const allCustomers = await adminDb.getCustomers();
        const fallbackCustomerId = allCustomers.length > 0 ? allCustomers[0].id : 'cust_1';

        order = await adminDb.createOrder({
          id: `ord_dummy_${Date.now()}`,
          razorpay_order_id: paymentEntity.order_id,
          customer_id: fallbackCustomerId,
          amount: paymentEntity.amount / 100,
          currency: paymentEntity.currency,
          status: 'created',
          created_at: new Date().toISOString()
        });
      }
      
      const customer = await adminDb.getCustomer(order.customer_id);
      const behaviour = await adminDb.getCustomerBehaviour(order.customer_id);
      
      if (!customer) throw new Error('Customer not found for order');

      // 1. Record the failed payment
      const payment = await adminDb.createPayment({
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        merchant_id: merchantId,
        razorpay_order_id: order.id,
        customer_id: customer.id,
        razorpay_payment_id: paymentEntity.id,
        amount: paymentEntity.amount / 100,
        currency: paymentEntity.currency,
        status: 'failed',
        failure_reason: paymentEntity.error_description || paymentEntity.error_code,
        attempt_number: 1,
        created_at: new Date().toISOString()
      });

      // 2. Create a Recovery Case
      const recoveryCase = await adminDb.createRecoveryCase({
        merchant_id: merchantId,
        payment_id: payment.id,
        order_id: order.id,
        customer_id: customer.id,
        recovery_type: 'failed_payment',
        revenue_at_risk: payment.amount,
        diagnosis: null,
        recovery_probability: null,
        confidence: null,
        recommended_action: null,
        optimal_timing: null,
      });

      await adminDb.addAuditLog({
        merchant_id: merchantId,
        entity_id: recoveryCase.id,
        event: 'case_created',
        actor: 'system',
        decision: null,
        reason: 'Payment failed webhook received',
        metadata: { error_code: paymentEntity.error_code }
      });

      // 3. AI Diagnosis
      const diagnosis = await analyzeRecoveryCase({
        customer,
        payment,
        order,
        customerBehaviour: behaviour || undefined
      });
      
      // 4. Strategy Engine
      const policies = await adminDb.getPolicies();
      const strategyInput = {
        revenueAtRisk: payment.amount,
        policies,
        alternativeActions: diagnosis.alternative_actions
      };
      
      const strategies = await evaluateStrategies(strategyInput);
      const bestStrategy = selectBestStrategy(strategies);

      // 5. Policy Engine Guardrails
      const policyResult = await runPolicyEngine({
        action: bestStrategy.action,
        order,
        payment,
        customerBehaviour: behaviour || undefined,
        policies: policies,
        confidence: diagnosis.confidence,
        revenueAtRisk: payment.amount,
        expectedNetRecovery: bestStrategy.expectedNetRecovery
      });

      if (policyResult.approved) {
        let paymentLinkId = null;
        let paymentLinkUrl = null;

        // 1. Actually Execute the Action!
        if (bestStrategy.action === 'payment_link') {
            const customerDetails = {
                name: customer.name,
                email: customer.email,
                contact: customer.phone || undefined
            };
            // Amount must be in subunits (paise) for Razorpay API
            const amountInPaise = Math.round(payment.amount * 100);
            const rzpClient = await getRazorpayClient(merchantId);
            const plink = await rzpClient.createPaymentLink(
              amountInPaise, 
              payment.currency, 
              `Payment recovery for order ${order.razorpay_order_id}`, 
              customerDetails
            );
            
            paymentLinkId = plink.id;
            paymentLinkUrl = plink.short_url;
        }

        // 2. Mark case as progressing
        await adminDb.updateRecoveryCase(recoveryCase.id, { status: 'in_progress' });
        
        // 3. Log the action
        await adminDb.createRecoveryAction({
          recovery_case_id: recoveryCase.id,
          action_type: bestStrategy.action,
          status: bestStrategy.action === 'payment_link' ? 'success' : 'pending',
          result: `Automated action triggered: ${bestStrategy.action}`,
          amount_recovered: 0,
          razorpay_payment_link_id: paymentLinkId,
          razorpay_payment_link_url: paymentLinkUrl
        });

        await adminDb.addAuditLog({
          merchant_id: merchantId,
          entity_id: recoveryCase.id,
          event: 'action_execution',
          actor: 'system',
          decision: null,
          reason: `Policy approved with score ${bestStrategy.expectedNetRecovery}`,
          metadata: { action: bestStrategy.action, link: paymentLinkUrl }
        });
      } else {
        // Escalate to human or stop
        await adminDb.updateRecoveryCase(recoveryCase.id, { status: policyResult.requiresHumanApproval ? 'escalated' : 'stopped' });
        await adminDb.addAuditLog({
          merchant_id: merchantId,
          entity_id: recoveryCase.id,
          event: 'policy_evaluation',
          actor: 'system',
          decision: policyResult.approved ? 'APPROVED' : 'REJECTED',
          reason: policyResult.reason,
          metadata: { original_action: bestStrategy.action }
        });
      }
    } else if (event.event === 'payment.captured') {
        const paymentEntity = event.payload.payment.entity;
        
        // Find order
        const oId = paymentEntity.order_id;
        const order = await adminDb.getOrderByRazorpayId(oId);
        if (order) {
          await adminDb.updateOrder(order.id, { status: 'paid' });
          const allCases = await adminDb.getRecoveryCases();
          const rc = allCases.find(c => c.order_id === order.id && c.status !== 'recovered');
          
          if (rc) {
            await adminDb.updateRecoveryCase(rc.id, { status: 'recovered' });
            
            // Mark latest action as success
            const actions = await adminDb.getRecoveryActions(rc.id);
            const pendingAction = actions.find(a => a.status === 'pending');
            if (pendingAction) {
              await adminDb.updateRecoveryAction(pendingAction.id, {
                status: 'success',
                amount_recovered: paymentEntity.amount / 100,
                result: 'Payment captured'
              });
            }
            
            await adminDb.addAuditLog({
              merchant_id: merchantId,
              entity_id: rc.id,
              event: 'case_recovered',
              actor: 'system',
              decision: null,
              reason: 'Payment captured webhook received',
              metadata: { amount: paymentEntity.amount / 100 }
            });
          }
        }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
