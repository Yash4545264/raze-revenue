import { Order, Payment, CustomerBehaviour, MerchantPolicies, RecommendedActionType } from '@/types';

export type PolicyCheckResult = {
  approved: boolean;
  reason: string;
  ruleTriggered: string | null;
  requiresHumanApproval: boolean;
};

type PolicyEngineInput = {
  action: RecommendedActionType;
  order: Order;
  payment?: Payment;
  customerBehaviour?: CustomerBehaviour;
  policies: MerchantPolicies;
  confidence: number;
  revenueAtRisk: number;
  expectedNetRecovery: number;
};

export const runPolicyEngine = (input: PolicyEngineInput): PolicyCheckResult => {
  
  // Rule 1: Is Order already paid?
  if (input.order.status === 'paid' || input.order.status === 'captured') {
    return {
      approved: false,
      reason: 'Order has already been paid successfully.',
      ruleTriggered: 'STOP_ALREADY_PAID',
      requiresHumanApproval: false
    };
  }

  // Rule 2: Is Order cancelled?
  if (input.order.status === 'cancelled') {
    return {
      approved: false,
      reason: 'Order is cancelled. No further recovery attempted.',
      ruleTriggered: 'STOP_ORDER_CANCELLED',
      requiresHumanApproval: false
    };
  }

  // Rule 3: Max Retries
  if (input.action === 'retry' && input.payment && input.payment.attempt_number >= input.policies.max_retries) {
    return {
      approved: false,
      reason: `Maximum retry attempts (${input.policies.max_retries}) reached.`,
      ruleTriggered: 'STOP_MAX_RETRIES_REACHED',
      requiresHumanApproval: false
    };
  }

  // Rule 4: Max Contact Attempts (assuming we track this in behaviour or case history)
  if (input.customerBehaviour && input.customerBehaviour.recovery_attempts >= input.policies.max_contact_attempts) {
    return {
      approved: false,
      reason: `Customer has reached the maximum contact limit for recoveries (${input.policies.max_contact_attempts}).`,
      ruleTriggered: 'STOP_MAX_CONTACT_LIMIT_REACHED',
      requiresHumanApproval: false
    };
  }

  // Rule 5: Is action allowed by merchant?
  if (!input.policies.allowed_actions.includes(input.action) && input.action !== 'do_nothing' && input.action !== 'human_escalation') {
    return {
      approved: false,
      reason: `Action '${input.action}' is disabled in merchant policies.`,
      ruleTriggered: 'REJECT_DISALLOWED_ACTION',
      requiresHumanApproval: false
    };
  }

  // Rule 6: Expected Net Recovery <= 0 (Should do nothing)
  if (input.action !== 'do_nothing' && input.expectedNetRecovery <= 0) {
    return {
      approved: false,
      reason: 'Expected recovery net value is negative or zero. Intervention cost exceeds potential value.',
      ruleTriggered: 'STOP_NEGATIVE_ROI',
      requiresHumanApproval: false
    };
  }

  // Escalation Rule A: RBI Fair Practices Code (Time of Day Compliance)
  // Communications must only happen between 08:00 and 19:00 IST
  if (['payment_link', 'customer_reminder', 'switch_payment_method'].includes(input.action)) {
    // Get current hour in IST
    const now = new Date();
    // Use Intl.DateTimeFormat to get hour in Asia/Kolkata
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false
    });
    const istHour = parseInt(formatter.format(now), 10);
    
    if (istHour < 8 || istHour >= 19) {
      return {
        approved: false,
        reason: `RBI Compliance: Automated communication (${input.action}) is not allowed out-of-hours (${istHour}:00 IST). Must be sent between 08:00 and 19:00.`,
        ruleTriggered: 'ESCALATE_RBI_TIME_COMPLIANCE',
        requiresHumanApproval: true // Escalate so human can approve sending it the next morning
      };
    }
  }

  // Escalation Rule B: Auto-recovery limit
  if (input.revenueAtRisk > input.policies.max_auto_recovery_amount) {
    return {
      approved: false,
      reason: `Revenue at risk (${input.revenueAtRisk}) exceeds automatic recovery limit (${input.policies.max_auto_recovery_amount}). Needs human approval.`,
      ruleTriggered: 'ESCALATE_AMOUNT_LIMIT',
      requiresHumanApproval: true
    };
  }

  // Escalation Rule B: Low AI Confidence
  if (input.confidence < input.policies.low_confidence_threshold) {
    return {
      approved: false,
      reason: `AI confidence (${input.confidence}) is below threshold (${input.policies.low_confidence_threshold}). Needs human approval.`,
      ruleTriggered: 'ESCALATE_LOW_CONFIDENCE',
      requiresHumanApproval: true
    };
  }

  if (input.action === 'do_nothing') {
    return {
      approved: true, // It's approved to do nothing, but it halts the pipeline safely
      reason: 'Action selected is DO NOTHING.',
      ruleTriggered: 'STOP_DO_NOTHING',
      requiresHumanApproval: false
    };
  }

  return {
    approved: true,
    reason: 'All policy checks passed.',
    ruleTriggered: null,
    requiresHumanApproval: false
  };
};
