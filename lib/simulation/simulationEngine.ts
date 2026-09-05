import { Customer, Order, Payment, CustomerBehaviour, RecoveryCase, RecoveryAction, AuditLog } from '@/types';
import { getAdminDb } from '../db/supabaseStore';
import { analyzeRecoveryCase } from '../ai/recoveryBrain';
import { evaluateStrategies, selectBestStrategy } from '../recovery/strategyEngine';
import { runPolicyEngine } from '../policy/policyEngine';

export type SimulationResult = {
  totalCases: number;
  revenueAtRisk: number;
  casesEvaluated: number;
  actionsAttempted: number;
  casesStopped: number;
  humanEscalations: number;
  successfulRecoveries: number;
  revenueRecovered: number;
  netRevenueRecovered: number;
  recoveryRate: number;
};

// Generate synthetic cases and run the autonomous recovery loop
export const runSimulation = async (merchant_id: string, numCases: number = 100, forceType: 'failed_payment' | 'checkout_abandonment' | 'failed_subscription' | null = null): Promise<SimulationResult> => {
  let results: SimulationResult = {
    totalCases: numCases,
    revenueAtRisk: 0,
    casesEvaluated: 0,
    actionsAttempted: 0,
    casesStopped: 0,
    humanEscalations: 0,
    successfulRecoveries: 0,
    revenueRecovered: 0,
    netRevenueRecovered: 0,
    recoveryRate: 0,
  };

  const adminDb = getAdminDb();
  const policies = await adminDb.getPolicies(merchant_id);

  const customers: Customer[] = [];
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const behaviours: CustomerBehaviour[] = [];
  const cases: RecoveryCase[] = [];
  const actions: RecoveryAction[] = [];
  const logs: AuditLog[] = [];

  const timestamp = Date.now();

  for (let i = 0; i < numCases; i++) {
    const shouldSaveToDb = i < 100; // Only save up to 100 cases to DB to keep insertion fast
    
    // 1. Generate Synthetic Data
    const amount = Math.floor(Math.random() * 20000) + 500;
    results.revenueAtRisk += amount;

    const mockCustomer: Customer = { merchant_id, id: `sim_cust_${timestamp}_${i}`, name: `Sim Cust ${i}`, email: `sim${i}@example.com`, phone: null, created_at: new Date().toISOString() };
    const mockOrder: Order = { merchant_id, id: `sim_ord_${timestamp}_${i}`, razorpay_order_id: `rzp_ord_${i}`, customer_id: mockCustomer.id, amount, currency: 'INR', status: 'created', created_at: new Date().toISOString() };
    
    const typeRand = Math.random();
    let failureReason = '';
    let recoveryType: 'failed_payment' | 'checkout_abandonment' | 'failed_subscription' = 'failed_payment';

    if (forceType) {
      recoveryType = forceType;
      if (forceType === 'checkout_abandonment') failureReason = 'website_crashed_during_checkout';
      else if (forceType === 'failed_subscription') failureReason = 'card_expired';
      else failureReason = 'insufficient_funds';
    } else {
      if (typeRand < 0.6) {
        failureReason = Math.random() > 0.5 ? 'temporary_bank_outage' : 'insufficient_funds';
      } else if (typeRand < 0.85) {
        recoveryType = 'checkout_abandonment';
        failureReason = 'abandoned_at_checkout';
      } else {
        recoveryType = 'failed_subscription';
        failureReason = 'card_expired';
      }
    }

    const mockPayment: Payment | undefined = recoveryType === 'failed_payment' ? {
      merchant_id, id: `sim_pay_${timestamp}_${i}`, razorpay_payment_id: null, razorpay_order_id: mockOrder.razorpay_order_id,
      customer_id: mockCustomer.id, amount, currency: 'INR', payment_method: 'upi', status: 'failed',
      failure_reason: failureReason, attempt_number: 1, created_at: new Date().toISOString()
    } : undefined;

    const mockBehaviour: CustomerBehaviour = {
      merchant_id, id: `sim_cb_${timestamp}_${i}`, customer_id: mockCustomer.id, preferred_payment_method: 'upi', successful_payments: Math.floor(Math.random() * 5),
      failed_payments: Math.floor(Math.random() * 2), average_payment_delay: 0, recovery_attempts: 0, successful_recoveries: 0, recovery_success_rate: 0, updated_at: new Date().toISOString()
    };

    if (shouldSaveToDb) {
      customers.push(mockCustomer);
      orders.push(mockOrder);
      if (mockPayment) payments.push(mockPayment);
      behaviours.push(mockBehaviour);
    }

    // 2. The Core AI Loop -> Detect -> Diagnose -> Predict -> Decide
    results.casesEvaluated++;
    
    const diagnosisResult = await analyzeRecoveryCase({
      customer: mockCustomer,
      payment: mockPayment,
      order: mockOrder,
      customerBehaviour: mockBehaviour
    });

    const evaluatedStrategies = await evaluateStrategies({
      revenueAtRisk: amount,
      policies: policies,
      alternativeActions: diagnosisResult.alternative_actions
    });

    const bestStrategy = selectBestStrategy(evaluatedStrategies);
    
    let currentStatus: RecoveryCase['status'] = 'pending';

    // 3. A/B Testing Engine: Assign test group
    const testGroup = Math.random() > 0.5 ? 'immediate' : 'wait_1_hour';
    if (testGroup === 'wait_1_hour') {
      diagnosisResult.optimal_timing = 'in_1_hour';
    } else {
      diagnosisResult.optimal_timing = 'immediately';
    }

    // 4. Policy Check
    const policyResult = runPolicyEngine({
      action: bestStrategy.action,
      order: mockOrder,
      payment: mockPayment,
      customerBehaviour: mockBehaviour,
      policies,
      confidence: diagnosisResult.confidence,
      revenueAtRisk: amount,
      expectedNetRecovery: bestStrategy.expectedNetRecovery
    });

    // Log AI Decision
    if (shouldSaveToDb) {
      logs.push({
        merchant_id,
        id: `log_ai_${timestamp}_${i}`,
        entity_id: `sim_case_${timestamp}_${i}`,
        event: 'AI_DIAGNOSIS',
        actor: 'AI_AGENT',
        decision: null,
        reason: `Diagnosed as ${failureReason} with ${Math.round(diagnosisResult.confidence * 100)}% confidence`,
        metadata: { recommended_action: bestStrategy.action, probability: bestStrategy.estimatedProbability },
        created_at: new Date().toISOString()
      });

      // Log Policy Result
      logs.push({
        merchant_id,
        id: `log_policy_${timestamp}_${i}`,
        entity_id: `sim_case_${timestamp}_${i}`,
        event: 'POLICY_EVALUATION',
        actor: 'POLICY_ENGINE',
        decision: policyResult.approved ? 'APPROVED' : 'REJECTED',
        reason: policyResult.reason,
        metadata: { rule: policyResult.ruleTriggered },
        created_at: new Date().toISOString()
      });
    }

    // 4. Act / Simulate Outcome
    let isSuccessful = false;
    if (policyResult.approved) {
      if (bestStrategy.action === 'do_nothing') {
        results.casesStopped++;
        currentStatus = 'stopped';
      } else {
        results.actionsAttempted++;
        const successRoll = Math.random();
        isSuccessful = successRoll <= bestStrategy.estimatedProbability;

        if (isSuccessful) {
          results.successfulRecoveries++;
          results.revenueRecovered += amount;
          results.netRevenueRecovered += (amount - bestStrategy.interventionCost);
          currentStatus = 'recovered';
        } else {
          results.netRevenueRecovered -= bestStrategy.interventionCost;
          currentStatus = 'failed';
        }
        
        if (shouldSaveToDb) {
          logs.push({
            merchant_id,
            id: `log_exec_${timestamp}_${i}`,
            entity_id: `sim_case_${timestamp}_${i}`,
            event: 'ACTION_EXECUTION',
            actor: 'SYSTEM',
            decision: isSuccessful ? 'SUCCESS' : 'FAILED',
            reason: isSuccessful ? `Recovered ₹${amount}` : 'Recovery attempt failed',
            metadata: { recovered_amount: isSuccessful ? amount : 0 },
            created_at: new Date().toISOString()
          });
        }
      }
    } else {
      if (policyResult.requiresHumanApproval) {
        results.humanEscalations++;
        currentStatus = 'escalated';
      } else {
        results.casesStopped++;
        currentStatus = 'stopped';
      }
    }
    
    if (shouldSaveToDb) {
      const mockCase: RecoveryCase = {
        merchant_id,
        id: `sim_case_${timestamp}_${i}`,
        payment_id: mockPayment?.id || null,
        order_id: mockOrder.id,
        customer_id: mockCustomer.id,
        recovery_type: recoveryType,
        status: currentStatus,
        test_group: testGroup,
        revenue_at_risk: amount,
        diagnosis: diagnosisResult.diagnosis,
        recovery_probability: bestStrategy.estimatedProbability,
        confidence: diagnosisResult.confidence,
        recommended_action: bestStrategy.action,
        optimal_timing: diagnosisResult.optimal_timing,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cases.push(mockCase);
      
      if (policyResult.approved && bestStrategy.action !== 'do_nothing') {
        actions.push({
          merchant_id,
          id: `sim_action_${timestamp}_${i}`,
          recovery_case_id: mockCase.id,
          action_type: bestStrategy.action,
          policy_result: 'approved',
          status: isSuccessful ? 'success' : 'failed',
          result: isSuccessful ? 'Customer completed payment via link' : 'Customer did not respond',
          amount_recovered: isSuccessful ? amount : 0,
          razorpay_payment_link_id: null,
          razorpay_payment_link_url: null,
          executed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }
  }

  // Save the synthesized data in batch to Supabase to reflect in UI
  if (customers.length > 0) {
    await adminDb.seedData(customers, orders, payments, behaviours, cases, actions, logs);
  }

  results.recoveryRate = results.casesEvaluated > 0 ? (results.successfulRecoveries / results.casesEvaluated) * 100 : 0;
  
  return results;
};
