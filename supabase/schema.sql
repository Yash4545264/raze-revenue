-- Supabase Database Schema for Revenue Autopilot

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure schema is recreated cleanly
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS recovery_actions CASCADE;
DROP TABLE IF EXISTS recovery_cases CASCADE;
DROP TABLE IF EXISTS merchant_policies CASCADE;
DROP TABLE IF EXISTS customer_behaviours CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  razorpay_order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Customer Behaviour Table
CREATE TABLE IF NOT EXISTS customer_behaviours (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  preferred_payment_method TEXT,
  successful_payments INTEGER NOT NULL DEFAULT 0,
  failed_payments INTEGER NOT NULL DEFAULT 0,
  average_payment_delay NUMERIC NOT NULL DEFAULT 0,
  recovery_attempts INTEGER NOT NULL DEFAULT 0,
  successful_recoveries INTEGER NOT NULL DEFAULT 0,
  recovery_success_rate NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Merchant Policies Table
CREATE TABLE IF NOT EXISTS merchant_policies (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  max_retries INTEGER NOT NULL DEFAULT 3,
  max_contact_attempts INTEGER NOT NULL DEFAULT 3,
  max_auto_recovery_amount NUMERIC NOT NULL DEFAULT 50000,
  max_discount_percentage NUMERIC NOT NULL DEFAULT 0,
  min_intervention_amount NUMERIC NOT NULL DEFAULT 100,
  low_confidence_threshold NUMERIC NOT NULL DEFAULT 0.50,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Recovery Cases Table
CREATE TABLE IF NOT EXISTS recovery_cases (
  id TEXT PRIMARY KEY,
  payment_id TEXT, -- Not a strict foreign key because it could be a checkout abandonment without a payment
  order_id TEXT NOT NULL REFERENCES orders(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  recovery_type TEXT NOT NULL,
  status TEXT NOT NULL,
  revenue_at_risk NUMERIC NOT NULL,
  diagnosis TEXT,
  recovery_probability NUMERIC,
  confidence NUMERIC,
  recommended_action TEXT,
  optimal_timing TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Recovery Actions Table
CREATE TABLE IF NOT EXISTS recovery_actions (
  id TEXT PRIMARY KEY,
  recovery_case_id TEXT NOT NULL REFERENCES recovery_cases(id),
  action_type TEXT NOT NULL,
  policy_result TEXT NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  amount_recovered NUMERIC,
  razorpay_payment_link_id TEXT,
  razorpay_payment_link_url TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  decision TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Webhook Events Table
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Basic Row Level Security (RLS) setup (optional for this MVP, but good practice)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_behaviours ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist so the script can be rerun cleanly
DROP POLICY IF EXISTS "Enable all access for service role on customers" ON customers;
DROP POLICY IF EXISTS "Enable all access for service role on orders" ON orders;
DROP POLICY IF EXISTS "Enable all access for service role on payments" ON payments;
DROP POLICY IF EXISTS "Enable all access for service role on customer_behaviours" ON customer_behaviours;
DROP POLICY IF EXISTS "Enable all access for service role on merchant_policies" ON merchant_policies;
DROP POLICY IF EXISTS "Enable all access for service role on recovery_cases" ON recovery_cases;
DROP POLICY IF EXISTS "Enable all access for service role on recovery_actions" ON recovery_actions;
DROP POLICY IF EXISTS "Enable all access for service role on audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Enable all access for service role on webhook_events" ON webhook_events;

-- Create policies for service role access
CREATE POLICY "Enable all access for service role on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on customer_behaviours" ON customer_behaviours FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on merchant_policies" ON merchant_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on recovery_cases" ON recovery_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on recovery_actions" ON recovery_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on webhook_events" ON webhook_events FOR ALL USING (true) WITH CHECK (true);

-- Insert initial default policy
INSERT INTO merchant_policies (id, merchant_id, allowed_actions) 
VALUES (
  'policy_1', 
  'default_merchant', 
  '["payment_link", "retry", "customer_reminder", "switch_payment_method"]'::jsonb
) ON CONFLICT (id) DO NOTHING;
