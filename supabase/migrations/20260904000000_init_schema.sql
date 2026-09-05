-- Supabase SQL Migration
-- 20260904000000_init_schema.sql
-- Initializes the database schema for Revenue Autopilot

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT REFERENCES orders(razorpay_order_id),
  customer_id UUID REFERENCES customers(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recovery_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  recovery_type TEXT NOT NULL, -- 'failed_payment', 'checkout_abandonment', 'failed_subscription'
  revenue_at_risk NUMERIC NOT NULL,
  diagnosis TEXT,
  recovery_probability NUMERIC,
  confidence NUMERIC,
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'policy_approved', 'in_progress', 'recovered', 'stopped', 'escalated'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_case_id UUID REFERENCES recovery_cases(id),
  action_type TEXT NOT NULL,
  policy_result TEXT, -- 'approved', 'rejected'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'executed', 'successful', 'failed'
  result TEXT,
  amount_recovered NUMERIC DEFAULT 0,
  razorpay_payment_link_id TEXT,
  razorpay_payment_link_url TEXT,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customer_behaviour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) UNIQUE,
  preferred_payment_method TEXT,
  successful_payments INTEGER DEFAULT 0,
  failed_payments INTEGER DEFAULT 0,
  average_payment_delay NUMERIC DEFAULT 0,
  recovery_attempts INTEGER DEFAULT 0,
  successful_recoveries INTEGER DEFAULT 0,
  recovery_success_rate NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE merchant_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL DEFAULT 'default_merchant',
  max_retries INTEGER DEFAULT 3,
  max_contact_attempts INTEGER DEFAULT 3,
  max_auto_recovery_amount NUMERIC DEFAULT 50000,
  max_discount_percentage NUMERIC DEFAULT 0,
  min_intervention_amount NUMERIC DEFAULT 100,
  low_confidence_threshold NUMERIC DEFAULT 0.50,
  allowed_actions TEXT[] DEFAULT '{"payment_link", "retry", "customer_reminder"}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- references case, action, etc.
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  decision TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_payments_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_recovery_cases_payment_id ON recovery_cases(payment_id);
CREATE INDEX idx_recovery_cases_order_id ON recovery_cases(order_id);
CREATE INDEX idx_recovery_cases_customer_id ON recovery_cases(customer_id);
CREATE INDEX idx_recovery_actions_case_id ON recovery_actions(recovery_case_id);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
