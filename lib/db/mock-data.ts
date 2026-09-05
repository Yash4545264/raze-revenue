import {
  Customer,
  Order,
  Payment,
  RecoveryCase,
  RecoveryAction,
  CustomerBehaviour,
  MerchantPolicies,
  AuditLog,
  WebhookEvent,
  RecommendedActionType
} from '@/types';

export const mockCustomers: Customer[] = [
  { id: 'cust_1', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+919876543210', created_at: new Date().toISOString() },
  { id: 'cust_2', name: 'Priya Patel', email: 'priya@example.com', phone: '+919876543211', created_at: new Date().toISOString() },
  { id: 'cust_3', name: 'Amit Singh', email: 'amit@example.com', phone: '+919876543212', created_at: new Date().toISOString() },
];

export const mockOrders: Order[] = [
  { id: 'ord_1', razorpay_order_id: 'order_Mxyz1', customer_id: 'cust_1', amount: 5000, currency: 'INR', status: 'created', created_at: new Date().toISOString() },
  { id: 'ord_2', razorpay_order_id: 'order_Mxyz2', customer_id: 'cust_2', amount: 12000, currency: 'INR', status: 'paid', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'ord_3', razorpay_order_id: 'order_Mxyz3', customer_id: 'cust_3', amount: 3500, currency: 'INR', status: 'created', created_at: new Date().toISOString() },
];

export const mockPayments: Payment[] = [
  { id: 'pay_1', razorpay_payment_id: 'pay_Mxyz1', razorpay_order_id: 'order_Mxyz1', customer_id: 'cust_1', amount: 5000, currency: 'INR', payment_method: 'upi', status: 'failed', failure_reason: 'temporary_bank_outage', attempt_number: 1, created_at: new Date().toISOString() },
  { id: 'pay_2', razorpay_payment_id: 'pay_Mxyz2', razorpay_order_id: 'order_Mxyz2', customer_id: 'cust_2', amount: 12000, currency: 'INR', payment_method: 'card', status: 'captured', failure_reason: null, attempt_number: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'pay_3', razorpay_payment_id: 'pay_Mxyz3', razorpay_order_id: 'order_Mxyz3', customer_id: 'cust_3', amount: 3500, currency: 'INR', payment_method: 'netbanking', status: 'failed', failure_reason: 'insufficient_funds', attempt_number: 1, created_at: new Date().toISOString() },
];

export const mockRecoveryCases: RecoveryCase[] = [
  {
    id: 'case_1',
    payment_id: 'pay_1',
    order_id: 'ord_1',
    customer_id: 'cust_1',
    recovery_type: 'failed_payment',
    revenue_at_risk: 5000,
    diagnosis: 'Temporary bank outage detected for UPI provider.',
    recovery_probability: 0.85,
    confidence: 0.92,
    recommended_action: 'payment_link',
    optimal_timing: 'immediately',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'case_2',
    payment_id: 'pay_3',
    order_id: 'ord_3',
    customer_id: 'cust_3',
    recovery_type: 'failed_payment',
    revenue_at_risk: 3500,
    diagnosis: 'Insufficient funds on Netbanking.',
    recovery_probability: 0.45,
    confidence: 0.88,
    recommended_action: 'switch_payment_method',
    optimal_timing: 'immediately',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const mockCustomerBehaviour: CustomerBehaviour[] = [
  { id: 'cb_1', customer_id: 'cust_1', preferred_payment_method: 'upi', successful_payments: 5, failed_payments: 1, average_payment_delay: 2.5, recovery_attempts: 0, successful_recoveries: 0, recovery_success_rate: 0, updated_at: new Date().toISOString() },
  { id: 'cb_2', customer_id: 'cust_2', preferred_payment_method: 'card', successful_payments: 12, failed_payments: 0, average_payment_delay: 0, recovery_attempts: 0, successful_recoveries: 0, recovery_success_rate: 0, updated_at: new Date().toISOString() },
  { id: 'cb_3', customer_id: 'cust_3', preferred_payment_method: 'netbanking', successful_payments: 2, failed_payments: 3, average_payment_delay: 48, recovery_attempts: 2, successful_recoveries: 1, recovery_success_rate: 0.5, updated_at: new Date().toISOString() },
];

export const mockMerchantPolicies: MerchantPolicies = {
  id: 'policy_1',
  merchant_id: 'default_merchant',
  max_retries: 3,
  max_contact_attempts: 3,
  max_auto_recovery_amount: 50000,
  max_discount_percentage: 0,
  min_intervention_amount: 100,
  low_confidence_threshold: 0.50,
  allowed_actions: ['payment_link', 'retry', 'customer_reminder', 'switch_payment_method'],
  updated_at: new Date().toISOString(),
};

export const mockAuditLogs: AuditLog[] = [];
