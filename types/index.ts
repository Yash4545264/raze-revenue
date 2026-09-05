export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  razorpay_order_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export type Payment = {
  id: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: string;
  failure_reason: string | null;
  attempt_number: number;
  created_at: string;
};

export type RecoveryCaseType = 'failed_payment' | 'checkout_abandonment' | 'failed_subscription';
export type RecoveryCaseStatus = 'pending' | 'policy_approved' | 'in_progress' | 'recovered' | 'failed' | 'stopped' | 'escalated';

export type RecommendedActionType = 'payment_link' | 'retry' | 'customer_reminder' | 'switch_payment_method' | 'human_escalation' | 'do_nothing';

export type RecoveryCase = {
  id: string;
  payment_id: string | null;
  order_id: string;
  customer_id: string;
  recovery_type: RecoveryCaseType;
  revenue_at_risk: number;
  diagnosis: string | null;
  recovery_probability: number | null;
  confidence: number | null;
  recommended_action: RecommendedActionType | null;
  optimal_timing: string | null;
  status: RecoveryCaseStatus;
  test_group?: 'immediate' | 'wait_1_hour'; // For A/B Testing Engine
  created_at: string;
  updated_at: string;
};

export type RecoveryAction = {
  id: string;
  recovery_case_id: string;
  action_type: RecommendedActionType;
  policy_result: 'approved' | 'rejected' | null;
  status: 'pending' | 'executed' | 'success' | 'failed';
  result: string | null;
  amount_recovered: number;
  razorpay_payment_link_id: string | null;
  razorpay_payment_link_url: string | null;
  executed_at: string | null;
  created_at: string;
};

export type CustomerBehaviour = {
  id: string;
  customer_id: string;
  preferred_payment_method: string | null;
  successful_payments: number;
  failed_payments: number;
  average_payment_delay: number;
  recovery_attempts: number;
  successful_recoveries: number;
  recovery_success_rate: number;
  updated_at: string;
};

export type MerchantPolicies = {
  id: string;
  merchant_id: string;
  max_retries: number;
  max_contact_attempts: number;
  max_auto_recovery_amount: number;
  max_discount_percentage: number;
  min_intervention_amount: number;
  low_confidence_threshold: number;
  allowed_actions: RecommendedActionType[];
  cost_payment_link?: number;
  cost_customer_reminder?: number;
  cost_switch_payment_method?: number;
  cost_human_escalation?: number;
  gateway_fee_rate?: number;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_webhook_secret?: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  entity_id: string;
  event: string;
  actor: string;
  decision: string | null;
  reason: string | null;
  metadata: any | null;
  created_at: string;
};

export type WebhookEvent = {
  id: string;
  event_id: string;
  event_type: string;
  payload: any;
  processed: boolean;
  created_at: string;
};

// AI Output Interface
export type AiDiagnosisResult = {
  diagnosis: string;
  recovery_probability: number;
  recommended_action: RecommendedActionType;
  confidence: number;
  reason: string;
  optimal_timing: string;
  alternative_actions: {
    action: RecommendedActionType;
    estimated_probability: number;
  }[];
};
