-- Migration to add flexible intervention costs to merchant_policies

ALTER TABLE public.merchant_policies 
ADD COLUMN IF NOT EXISTS cost_payment_link NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cost_customer_reminder NUMERIC DEFAULT 0.11,
ADD COLUMN IF NOT EXISTS cost_switch_payment_method NUMERIC DEFAULT 0.18,
ADD COLUMN IF NOT EXISTS cost_human_escalation NUMERIC DEFAULT 10.40,
ADD COLUMN IF NOT EXISTS gateway_fee_rate NUMERIC DEFAULT 0.0236;

-- Update existing rows to have default values if null (in case added dynamically)
UPDATE public.merchant_policies SET cost_payment_link = 0.00 WHERE cost_payment_link IS NULL;
UPDATE public.merchant_policies SET cost_customer_reminder = 0.11 WHERE cost_customer_reminder IS NULL;
UPDATE public.merchant_policies SET cost_switch_payment_method = 0.18 WHERE cost_switch_payment_method IS NULL;
UPDATE public.merchant_policies SET cost_human_escalation = 10.40 WHERE cost_human_escalation IS NULL;
UPDATE public.merchant_policies SET gateway_fee_rate = 0.0236 WHERE gateway_fee_rate IS NULL;
