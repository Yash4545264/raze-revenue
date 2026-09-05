import { NextResponse } from 'next/server';
import { db } from '@/lib/db/store'; // Make sure to use the active store, maybe supabaseStore if active.
import { analyzeRecoveryCase } from '@/lib/ai/recoveryBrain';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { merchant_id, event_type, payload } = data;

    if (!merchant_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (event_type === 'checkout_crash' || event_type === 'cart_abandonment') {
      // 1. Create a placeholder customer if none exists
      // In a real scenario, the JS Agent would pass the customer's email or a session token
      const customerId = `cust_tracked_${Date.now()}`;
      db.customers.push({
        id: customerId,
        name: payload?.customerName || 'Anonymous Shopper',
        email: payload?.customerEmail || `shopper_${Date.now()}@example.com`,
        phone: null,
        created_at: new Date().toISOString()
      });

      // 2. Create a placeholder order/cart
      const orderAmount = payload?.cartValue || 5000; // Default 50.00
      const orderId = `cart_${Date.now()}`;
      db.orders.push({
        id: orderId,
        razorpay_order_id: `rzp_order_mock_${Date.now()}`,
        customer_id: customerId,
        amount: orderAmount,
        currency: 'INR',
        status: 'created',
        created_at: new Date().toISOString()
      });

      // 3. Create the Recovery Case
      const recoveryCase = db.createRecoveryCase({
        payment_id: null,
        order_id: orderId,
        customer_id: customerId,
        recovery_type: 'checkout_abandonment',
        revenue_at_risk: orderAmount,
        diagnosis: null,
        recovery_probability: null,
        confidence: null,
        recommended_action: null,
        optimal_timing: null,
        status: 'pending',
        test_group: Math.random() > 0.5 ? 'immediate' : 'wait_1_hour'
      });

      // 4. Log the audit event
      db.addAuditLog({
        entity_id: recoveryCase.id,
        event: 'TRACKER_EVENT_RECEIVED',
        actor: 'JS_Agent',
        decision: null,
        reason: `Event: ${event_type}`,
        metadata: payload
      });

      // 5. Trigger AI Analysis asynchronously
      const customer = db.getCustomer(customerId);
      const order = db.getOrder(orderId);
      
      if (customer && order) {
        // Run AI diagnosis in background so we don't block the tracking pixel
        analyzeRecoveryCase({
          customer,
          order,
          payment: {
            id: 'mock',
            razorpay_payment_id: null,
            razorpay_order_id: order.razorpay_order_id,
            customer_id: customer.id,
            amount: order.amount,
            currency: 'INR',
            payment_method: null,
            status: 'failed',
            failure_reason: event_type === 'checkout_crash' ? 'Website Crashed' : 'Cart Abandoned',
            attempt_number: 1,
            created_at: new Date().toISOString()
          } // Mock payment to feed into AI
        }).then(diagnosis => {
          db.updateRecoveryCase(recoveryCase.id, {
            diagnosis: diagnosis.diagnosis,
            recovery_probability: diagnosis.recovery_probability,
            recommended_action: diagnosis.recommended_action,
            confidence: diagnosis.confidence,
            optimal_timing: recoveryCase.test_group === 'wait_1_hour' ? 'in_1_hour' : 'immediately',
            status: 'pending' // Still pending execution
          });
          
          db.addAuditLog({
            entity_id: recoveryCase.id,
            event: 'AI_DIAGNOSIS_COMPLETE',
            actor: 'System_AI',
            decision: diagnosis.recommended_action,
            reason: diagnosis.reason,
            metadata: diagnosis
          });
        }).catch(err => {
          console.error("Failed to analyze tracker case:", err);
        });
      }

      return NextResponse.json({ success: true, case_id: recoveryCase.id }, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // Crucial for JS agent on third party sites
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Tracker API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle CORS preflight for the tracker
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
