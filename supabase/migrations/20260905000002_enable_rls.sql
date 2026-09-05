-- Enable RLS on core tables

ALTER TABLE public.merchant_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_behaviour ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policies for merchant_policies
CREATE POLICY "Merchants can view their own policies" 
ON public.merchant_policies FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own policies" 
ON public.merchant_policies FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own policies" 
ON public.merchant_policies FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for recovery_cases
CREATE POLICY "Merchants can view their own recovery cases" 
ON public.recovery_cases FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own recovery cases" 
ON public.recovery_cases FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own recovery cases" 
ON public.recovery_cases FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for orders
CREATE POLICY "Merchants can view their own orders" 
ON public.orders FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own orders" 
ON public.orders FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for customers
CREATE POLICY "Merchants can view their own customers" 
ON public.customers FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own customers" 
ON public.customers FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own customers" 
ON public.customers FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for payments
CREATE POLICY "Merchants can view their own payments" 
ON public.payments FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own payments" 
ON public.payments FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own payments" 
ON public.payments FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for recovery_actions
CREATE POLICY "Merchants can view their own recovery actions" 
ON public.recovery_actions FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own recovery actions" 
ON public.recovery_actions FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own recovery actions" 
ON public.recovery_actions FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for customer_behaviour
CREATE POLICY "Merchants can view their own customer behaviours" 
ON public.customer_behaviour FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own customer behaviours" 
ON public.customer_behaviour FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own customer behaviours" 
ON public.customer_behaviour FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for audit_logs
CREATE POLICY "Merchants can view their own audit logs" 
ON public.audit_logs FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own audit logs" 
ON public.audit_logs FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);

-- Create policies for webhook_events
CREATE POLICY "Merchants can view their own webhook events" 
ON public.webhook_events FOR SELECT 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can update their own webhook events" 
ON public.webhook_events FOR UPDATE 
USING (merchant_id = auth.uid()::text);

CREATE POLICY "Merchants can insert their own webhook events" 
ON public.webhook_events FOR INSERT 
WITH CHECK (merchant_id = auth.uid()::text);
