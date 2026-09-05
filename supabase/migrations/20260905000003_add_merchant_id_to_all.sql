ALTER TABLE public.recovery_cases ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
ALTER TABLE public.recovery_actions ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
ALTER TABLE public.customer_behaviour ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS merchant_id TEXT NOT NULL DEFAULT 'default_merchant';
