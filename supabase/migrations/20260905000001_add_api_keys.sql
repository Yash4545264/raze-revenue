-- Migration to add Razorpay API keys to merchant_policies for Multi-Tenant Support
-- Note: In a production environment, these should be encrypted using pgsodium or a secure vault.
-- For this MVP, they are stored as plain text.

ALTER TABLE public.merchant_policies 
ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT,
ADD COLUMN IF NOT EXISTS razorpay_webhook_secret TEXT;
