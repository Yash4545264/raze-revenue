import { getDb } from '@/lib/db/supabaseStore';
import { Customer, Order, Payment, RecoveryCase, RecoveryAction } from '@/types';

export interface CustomerMetrics {
  totalOrders: number;
  successfulPayments: number;
  failedPayments: number;
  abandonedCheckouts: number;
  totalSpend: number;
  averageOrderValue: number;
  preferredPaymentMethod: string;
  preferredPaymentTime: string; // e.g., '10 AM-12 PM'
  successfulRecoveries: number;
  failedRecoveries: number;
  recoverySuccessRate: number;
  totalContactAttempts: number;
  lastContactTimestamp: string | null;
  contactsLast24h: number;
  contactsLast7d: number;
  contactsLast30d: number;
}

export interface ValueScoreResult {
  score: number;
  classification: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ChurnRiskResult {
  score: number;
  classification: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
}

export async function calculateCustomerMetrics(customerId: string): Promise<CustomerMetrics> {
  const orders = await (await getDb()).getOrdersByCustomer(customerId);
  const payments = await (await getDb()).getPaymentsByCustomer(customerId);
  const allCases = await (await getDb()).getRecoveryCases();
  const recoveryCases = allCases.filter(rc => rc.customer_id === customerId);
  const allActions = await (await getDb()).getRecoveryActions();
  const actions = allActions.filter(a => recoveryCases.some(rc => rc.id === a.recovery_case_id));

  const successfulPayments = payments.filter(p => p.status === 'captured' || p.status === 'authorized');
  const failedPayments = payments.filter(p => p.status === 'failed');
  const abandonedCheckouts = orders.filter(o => o.status === 'abandoned').length;

  const totalSpend = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const averageOrderValue = successfulPayments.length > 0 ? totalSpend / successfulPayments.length : 0;

  // Calculate preferred payment method
  const methodCounts: Record<string, number> = {};
  successfulPayments.forEach(p => {
    const method = p.payment_method || 'card';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  let preferredMethod = 'card';
  let maxCount = 0;
  Object.entries(methodCounts).forEach(([method, count]) => {
    if (count > maxCount) {
      maxCount = count;
      preferredMethod = method;
    }
  });

  // Calculate preferred payment time (simplistic mode based on hours)
  const hourCounts: Record<number, number> = {};
  successfulPayments.forEach(p => {
    const hour = new Date(p.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  let bestHour = 10;
  let maxHourCount = 0;
  Object.entries(hourCounts).forEach(([hourStr, count]) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      bestHour = parseInt(hourStr);
    }
  });
  const preferredPaymentTime = `${bestHour}:00 - ${bestHour + 2}:00`;

  // Recovery Stats
  const successfulRecoveries = recoveryCases.filter(rc => rc.status === 'recovered').length;
  const failedRecoveries = recoveryCases.filter(rc => rc.status === 'stopped').length;
  const totalRecoveries = successfulRecoveries + failedRecoveries;
  const recoverySuccessRate = totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 0;

  // Contact Fatigue tracking
  const contactActions = actions.filter(a => ['email_reminder', 'sms_reminder', 'whatsapp_message'].includes(a.action_type));
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  let contactsLast24h = 0;
  let contactsLast7d = 0;
  let contactsLast30d = 0;
  let lastContactTimestamp: string | null = null;

  contactActions.forEach(a => {
    const aTime = new Date(a.executed_at || a.created_at || Date.now()).getTime();
    if (!lastContactTimestamp || aTime > new Date(lastContactTimestamp).getTime()) {
      lastContactTimestamp = (a.executed_at || a.created_at || new Date().toISOString()) as string;
    }
    const diffDays = (now - aTime) / dayMs;
    if (diffDays <= 1) contactsLast24h++;
    if (diffDays <= 7) contactsLast7d++;
    if (diffDays <= 30) contactsLast30d++;
  });

  return {
    totalOrders: orders.length,
    successfulPayments: successfulPayments.length,
    failedPayments: failedPayments.length,
    abandonedCheckouts,
    totalSpend,
    averageOrderValue,
    preferredPaymentMethod: preferredMethod,
    preferredPaymentTime,
    successfulRecoveries,
    failedRecoveries,
    recoverySuccessRate,
    totalContactAttempts: contactActions.length,
    lastContactTimestamp,
    contactsLast24h,
    contactsLast7d,
    contactsLast30d,
  };
}

export async function calculateCustomerValueScore(customerId: string): Promise<ValueScoreResult> {
  const metrics = await calculateCustomerMetrics(customerId);
  
  let score = 0;
  
  // 1. Lifetime spend (max 40 pts)
  if (metrics.totalSpend > 50000) score += 40;
  else if (metrics.totalSpend > 10000) score += 20;
  else if (metrics.totalSpend > 1000) score += 10;
  
  // 2. Purchase frequency (max 20 pts)
  if (metrics.successfulPayments > 10) score += 20;
  else if (metrics.successfulPayments > 3) score += 10;
  else if (metrics.successfulPayments > 0) score += 5;

  // 3. Payment Reliability (max 20 pts)
  const totalAttempted = metrics.successfulPayments + metrics.failedPayments;
  const successRatio = totalAttempted > 0 ? metrics.successfulPayments / totalAttempted : 0;
  if (successRatio > 0.9) score += 20;
  else if (successRatio > 0.7) score += 10;
  else if (successRatio > 0.4) score += 5;

  // 4. Recovery Responsiveness (max 20 pts)
  if (metrics.recoverySuccessRate > 0.8) score += 20;
  else if (metrics.recoverySuccessRate > 0.5) score += 10;

  // Cap at 100
  score = Math.min(score, 100);

  let classification: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (score > 70) classification = 'HIGH';
  else if (score > 30) classification = 'MEDIUM';

  return { score, classification };
}

export async function calculateChurnRiskScore(customerId: string): Promise<ChurnRiskResult> {
  const metrics = await calculateCustomerMetrics(customerId);
  
  let score = 0;
  const reasons: string[] = [];

  // 1. Payment Failures (Max 40)
  if (metrics.failedPayments > 3) {
    score += 40;
    reasons.push(`${metrics.failedPayments} recent payment failures`);
  } else if (metrics.failedPayments > 1) {
    score += 20;
    reasons.push(`Multiple payment failures`);
  }

  // 2. Abandoned Checkouts (Max 30)
  if (metrics.abandonedCheckouts > 2) {
    score += 30;
    reasons.push(`${metrics.abandonedCheckouts} abandoned checkouts`);
  } else if (metrics.abandonedCheckouts === 1) {
    score += 10;
  }

  // 3. Ignored/Failed Recoveries (Max 30)
  if (metrics.failedRecoveries > 2) {
    score += 30;
    reasons.push(`${metrics.failedRecoveries} recovery attempts ignored/failed`);
  } else if (metrics.failedRecoveries > 0) {
    score += 15;
    reasons.push(`Has ignored recovery attempts`);
  }

  score = Math.min(score, 100);

  let classification: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (score > 60) classification = 'HIGH';
  else if (score > 30) classification = 'MEDIUM';

  return { score, classification, reasons };
}

export async function hasContactFatigue(customerId: string): Promise<boolean> {
  const metrics = await calculateCustomerMetrics(customerId);
  const policies = await (await getDb()).getPolicies();
  
  // Phase 9: Contact Fatigue Check
  // In a real app we'd find the policy setting, for now default to 2
  const maxAttempts = 2; 
  if (metrics.contactsLast24h >= maxAttempts) {
    return true;
  }
  return false;
}
