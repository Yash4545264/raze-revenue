import { createClient as createServerClient } from '../supabase/server';
import { createClient as createBrowserClient } from '../supabase/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Customer, Order, Payment, RecoveryCase, RecoveryAction, AuditLog, MerchantPolicies, CustomerBehaviour, WebhookEvent } from '@/types';

export class SupabaseStore {
  supabase: any;

  constructor(client: any) {
    this.supabase = client;
  }

  async getRecoveryCases(): Promise<RecoveryCase[]> {
    const { data, error } = await this.supabase.from('recovery_cases').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    
    // Parse test_group out of diagnosis
    const parsed = (data || []).map((c: any) => {
      if (c.diagnosis && c.diagnosis.includes('[Test Group:')) {
         const match = c.diagnosis.match(/\[Test Group: (.*?)\]/);
         if (match) {
            c.test_group = match[1] as any;
            c.diagnosis = c.diagnosis.replace(/ \[Test Group: .*?\]/, '');
         }
      }
      return c;
    });
    return parsed;
  }

  async getRecoveryCase(id: string): Promise<RecoveryCase | undefined> {
    const { data, error } = await this.supabase.from('recovery_cases').select('*').eq('id', id).single();
    if (error) console.error(error);
    return data || undefined;
  }

  async createRecoveryCase(rc: Partial<RecoveryCase>): Promise<RecoveryCase> {
    const newCase = {
      id: `case_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...rc
    };
    
    const insertData = { ...newCase } as any;
    if (insertData.test_group) {
        insertData.diagnosis = (insertData.diagnosis || '') + ` [Test Group: ${insertData.test_group}]`;
    }
    delete insertData.test_group;
    delete insertData.optimal_timing;

    const { data, error } = await this.supabase.from('recovery_cases').insert(insertData).select().single();
    if (error) throw error;
    
    if (data.diagnosis && data.diagnosis.includes('[Test Group:')) {
       const match = data.diagnosis.match(/\[Test Group: (.*?)\]/);
       if (match) {
          data.test_group = match[1];
          data.diagnosis = data.diagnosis.replace(/ \[Test Group: .*?\]/, '');
       }
    }
    return data;
  }

  async updateRecoveryCase(id: string, updates: Partial<RecoveryCase>): Promise<void> {
    const { error } = await this.supabase.from('recovery_cases').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  async getRecoveryActions(caseId?: string): Promise<RecoveryAction[]> {
    let query = supabase.from('recovery_actions').select('*').order('executed_at', { ascending: false });
    if (caseId) query = query.eq('recovery_case_id', caseId);
    const { data, error } = await query;
    if (error) console.error(error);
    return data || [];
  }

  async getActions(): Promise<RecoveryAction[]> {
    const { data, error } = await this.supabase.from('recovery_actions').select('*');
    if (error) console.error(error);
    return data || [];
  }

  // RAG (Retrieval-Augmented Generation) Helper: Fetch similar past successes
  // In a full production env with pgvector, this would be an RPC call doing cosine similarity.
  // For the MVP, we pull recent successes and filter in-memory.
  async findSimilarCases(failureReason: string, customerTier: string, limit = 5): Promise<RecoveryCase[]> {
    // We only care about cases that actually resulted in recovered revenue
    const { data, error } = await supabase
      .from('recovery_cases')
      .select('*')
      .eq('status', 'recovered')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) console.error(error);
    const successes = data || [];
    
    // In-memory filter for similarity (simulating vector match)
    // We boost cases that match the failure reason or customer profile closely
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

  async createRecoveryAction(action: Partial<RecoveryAction>): Promise<RecoveryAction> {
    const newAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      executed_at: new Date().toISOString(),
      ...action
    };
    const insertData = { ...newAction } as any;
    delete insertData.razorpay_payment_link_id;
    delete insertData.razorpay_payment_link_url;

    const { data, error } = await this.supabase.from('recovery_actions').insert(insertData).select().single();
    if (error) throw error;
    return data;
  }

  async updateRecoveryAction(id: string, updates: Partial<RecoveryAction>): Promise<void> {
    const { error } = await this.supabase.from('recovery_actions').update(updates).eq('id', id);
    if (error) throw error;
  }

  async getAuditLogs(entityId?: string): Promise<AuditLog[]> {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (entityId) query = query.eq('entity_id', entityId);
    const { data, error } = await query;
    if (error) console.error(error);
    return data || [];
  }

  async addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString(),
      ...log
    };
    const { data, error } = await this.supabase.from('audit_logs').insert(newLog).select().single();
    if (error) throw error;
    return data;
  }

  async getPolicies(): Promise<MerchantPolicies> {
    const { data, error } = await this.supabase.from('merchant_policies').select('*').single();
    if (error && error.code !== 'PGRST116') console.error('getPolicies error:', error); // Ignore no rows error
    
    // Fallback to default if not found
    if (!data) {
      return {
        id: 'policy_1',
        merchant_id: 'default_merchant',
        max_retries: 3,
        max_contact_attempts: 3,
        max_auto_recovery_amount: 50000,
        max_discount_percentage: 0,
        min_intervention_amount: 100,
        low_confidence_threshold: 0.50,
        allowed_actions: ['payment_link', 'retry', 'customer_reminder', 'switch_payment_method'],
        updated_at: new Date().toISOString()
      };
    }
    return data;
  }

  async updatePolicies(updates: Partial<MerchantPolicies>): Promise<void> {
    // Assuming a single row exists, or we just update all rows if there's only one policy doc
    const { error } = await this.supabase.from('merchant_policies').update(updates).neq('id', 'dummy'); 
    if (error) throw error;
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const { data, error } = await this.supabase.from('customers').select('*').eq('id', id).single();
    if (error) console.error(error);
    return data || undefined;
  }
  
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await this.supabase.from('customers').select('*');
    if (error) console.error(error);
    return data || [];
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const { data, error } = await this.supabase.from('orders').select('*').eq('id', id).single();
    if (error) console.error(error);
    return data || undefined;
  }

  async getOrderByRazorpayId(rzpOrderId: string): Promise<Order | undefined> {
    const { data, error } = await this.supabase.from('orders').select('*').eq('razorpay_order_id', rzpOrderId).single();
    if (error) console.error(error);
    return data || undefined;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const { data, error } = await this.supabase.from('payments').select('*').eq('id', id).single();
    if (error) console.error(error);
    return data || undefined;
  }

  async getCustomerBehaviour(customerId: string): Promise<CustomerBehaviour | undefined> {
    const { data, error } = await this.supabase.from('customer_behaviours').select('*').eq('customer_id', customerId).single();
    if (error) console.error(error);
    return data || undefined;
  }

  async getWebhookEvent(eventId: string): Promise<WebhookEvent | undefined> {
    const { data, error } = await this.supabase.from('webhook_events').select('*').eq('event_id', eventId).single();
    if (error) console.error(error);
    return data || undefined;
  }

  async addWebhookEvent(event: Omit<WebhookEvent, 'id' | 'created_at'>): Promise<WebhookEvent> {
    const newEvent = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString(),
      ...event
    };
    const { data, error } = await this.supabase.from('webhook_events').insert(newEvent).select().single();
    if (error) throw error;
    return data;
  }
  
  async getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase.from('payments').select('*').eq('customer_id', customerId);
    if (error) console.error(error);
    return data || [];
  }

  async getAllPayments(): Promise<any[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customer_id ( name, email )
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  }
  
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    const { data, error } = await this.supabase.from('orders').select('*').eq('customer_id', customerId);
    if (error) console.error(error);
    return data || [];
  }
  
  async createOrder(order: Partial<Order>): Promise<Order> {
    const { data, error } = await this.supabase.from('orders').insert(order).select().single();
    if (error) throw error;
    return data;
  }
  
  async createPayment(payment: Partial<Payment>): Promise<Payment> {
    const { data, error } = await this.supabase.from('payments').insert(payment).select().single();
    if (error) throw error;
    return data;
  }
  
  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const { error } = await this.supabase.from('orders').update(updates).eq('id', id);
    if (error) throw error;
  }
  
  async getStats() {
    const { data: rawCases, error } = await this.supabase.from('recovery_cases').select('*');
    if (error) console.error(error);
    const rc = (rawCases || []).map(c => {
      if (c.diagnosis && c.diagnosis.includes('[Test Group:')) {
         const match = c.diagnosis.match(/\[Test Group: (.*?)\]/);
         if (match) {
            c.test_group = match[1];
            c.diagnosis = c.diagnosis.replace(/ \[Test Group: .*?\]/, '');
         }
      }
      return c;
    });
    
    const totalRisk = rc.reduce((sum, c) => sum + Number(c.revenue_at_risk), 0);
    const recoveredCases = rc.filter(c => c.status === 'recovered');
    const totalRecovered = recoveredCases.reduce((sum, c) => sum + Number(c.revenue_at_risk), 0);
    const recoveryRate = rc.length > 0 ? (recoveredCases.length / rc.length) * 100 : 0;
    const activeCases = rc.filter(c => ['pending', 'policy_approved', 'in_progress', 'escalated'].includes(c.status)).length;
    
    return {
      totalRisk,
      totalRecovered,
      recoveryRate,
      activeCases
    };
  }

  async getActionSuccessRates(): Promise<Record<string, { total: number, success: number }>> {
    const { data, error } = await this.supabase.from('recovery_actions').select('action_type, status');
    if (error) {
      console.error(error);
      return {};
    }
    
    const rates: Record<string, { total: number, success: number }> = {};
    for (const action of data || []) {
      if (!rates[action.action_type]) {
        rates[action.action_type] = { total: 0, success: 0 };
      }
      rates[action.action_type].total += 1;
      if (action.status === 'success') {
        rates[action.action_type].success += 1;
      }
    }
    return rates;
  }

  async seedData(
    customers: Customer[],
    orders: Order[],
    payments: Payment[],
    behaviours: CustomerBehaviour[],
    cases: RecoveryCase[],
    actions: RecoveryAction[],
    logs: AuditLog[]
  ) {
    if (customers.length > 0) await this.supabase.from('customers').insert(customers);
    if (orders.length > 0) await this.supabase.from('orders').insert(orders);
    if (payments.length > 0) await this.supabase.from('payments').insert(payments);
    if (behaviours.length > 0) await this.supabase.from('customer_behaviours').insert(behaviours);
    if (cases.length > 0) {
      const sanitizedCases = cases.map(c => {
         const sc = { ...c } as any;
         if (sc.test_group) {
            sc.diagnosis = (sc.diagnosis || '') + ` [Test Group: ${sc.test_group}]`;
         }
         delete sc.test_group;
         delete sc.optimal_timing;
         return sc;
      });
      await this.supabase.from('recovery_cases').insert(sanitizedCases);
    }
    if (actions.length > 0) {
      const sanitizedActions = actions.map(a => {
        const sa = { ...a } as any;
        delete sa.razorpay_payment_link_id;
        delete sa.razorpay_payment_link_url;
        return sa;
      });
      await this.supabase.from('recovery_actions').insert(sanitizedActions);
    }
    if (logs.length > 0) await this.supabase.from('audit_logs').insert(logs);
  }
}
export const getDb = async () => {
  if (typeof window === 'undefined') {
    return new SupabaseStore(await createServerClient());
  }
  return new SupabaseStore(createBrowserClient());
};

export const getAdminDb = () => {
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );
  return new SupabaseStore(adminClient);
};
