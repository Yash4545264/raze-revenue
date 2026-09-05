import { 
  Customer, Order, Payment, RecoveryCase, RecoveryAction, 
  CustomerBehaviour, MerchantPolicies, AuditLog, WebhookEvent 
} from '@/types';
import * as initialData from './mock-data';

// Simple in-memory store mimicking a DB for the buildathon
class Store {
  customers: Customer[] = [...initialData.mockCustomers];
  orders: Order[] = [...initialData.mockOrders];
  payments: Payment[] = [...initialData.mockPayments];
  recoveryCases: RecoveryCase[] = [...initialData.mockRecoveryCases];
  recoveryActions: RecoveryAction[] = [];
  customerBehaviour: CustomerBehaviour[] = [...initialData.mockCustomerBehaviour];
  policies: MerchantPolicies = { ...initialData.mockMerchantPolicies };
  auditLogs: AuditLog[] = [...initialData.mockAuditLogs];
  webhookEvents: WebhookEvent[] = [];

  // Data access methods
  getPolicies(): MerchantPolicies {
    return this.policies;
  }

  updatePolicies(updates: Partial<MerchantPolicies>): MerchantPolicies {
    this.policies = { ...this.policies, ...updates, updated_at: new Date().toISOString() };
    return this.policies;
  }

  getRecoveryCases(): RecoveryCase[] {
    return [...this.recoveryCases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getRecoveryCase(id: string): RecoveryCase | undefined {
    return this.recoveryCases.find(c => c.id === id);
  }

  createRecoveryCase(data: Omit<RecoveryCase, 'id' | 'created_at' | 'updated_at'>): RecoveryCase {
    const newCase: RecoveryCase = {
      ...data,
      id: `case_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.recoveryCases.push(newCase);
    return newCase;
  }

  updateRecoveryCase(id: string, updates: Partial<RecoveryCase>): RecoveryCase | undefined {
    const index = this.recoveryCases.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    this.recoveryCases[index] = { ...this.recoveryCases[index], ...updates, updated_at: new Date().toISOString() };
    return this.recoveryCases[index];
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers.find(c => c.id === id);
  }

  getCustomerBehaviour(customerId: string): CustomerBehaviour | undefined {
    return this.customerBehaviour.find(cb => cb.customer_id === customerId);
  }

  getPayment(id: string): Payment | undefined {
    return this.payments.find(p => p.id === id);
  }

  getOrder(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }
  
  getOrderByRazorpayId(razorpayOrderId: string): Order | undefined {
    return this.orders.find(o => o.razorpay_order_id === razorpayOrderId);
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog); // Prepend for latest first
    return newLog;
  }
  
  getAuditLogs(entityId?: string): AuditLog[] {
    if (entityId) {
      return this.auditLogs.filter(l => l.entity_id === entityId);
    }
    return this.auditLogs;
  }

  createRecoveryAction(action: Omit<RecoveryAction, 'id' | 'created_at'>): RecoveryAction {
    const newAction: RecoveryAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      created_at: new Date().toISOString(),
    };
    this.recoveryActions.push(newAction);
    return newAction;
  }
  
  getRecoveryActions(caseId?: string): RecoveryAction[] {
    if (caseId) return this.recoveryActions.filter(a => a.recovery_case_id === caseId);
    return this.recoveryActions;
  }

  getActions(): RecoveryAction[] {
    return this.recoveryActions;
  }

  // RAG (Retrieval-Augmented Generation) Helper: Fetch similar past successes
  async findSimilarCases(failureReason: string, customerTier: string, limit = 5): Promise<RecoveryCase[]> {
    const successes = this.recoveryCases.filter(c => c.status === 'recovered');
    
    // In-memory filter for similarity (simulating vector match)
    const scored = successes.map(c => {
      let score = 0;
      if (c.diagnosis?.includes(failureReason)) score += 5;
      if (c.recovery_type === failureReason) score += 5;
      // Just a simple mock score for MVP RAG demonstration
      score += Math.random() * 2; 
      return { case: c, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.case);
  }

  // Stats for Dashboard
  getStats() {
    const totalRisk = this.recoveryCases.reduce((sum, c) => sum + Number(c.revenue_at_risk), 0);
    const totalRecovered = this.recoveryActions
      .filter(a => a.status === 'success')
      .reduce((sum, a) => sum + Number(a.amount_recovered), 0);
    
    const successfulCases = this.recoveryCases.filter(c => c.status === 'recovered').length;
    const closedCases = this.recoveryCases.filter(c => ['recovered', 'stopped', 'failed'].includes(c.status)).length;
    const recoveryRate = closedCases > 0 ? (successfulCases / closedCases) * 100 : 0;

    return {
      totalRisk,
      totalRecovered,
      recoveryRate,
      activeCases: this.recoveryCases.filter(c => ['pending', 'policy_approved', 'in_progress'].includes(c.status)).length
    };
  }
}

// Export a singleton instance
export const db = new Store();
