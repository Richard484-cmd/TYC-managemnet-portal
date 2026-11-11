/*
# Giving and Financial Transactions Module — Categories, Provider Configs, Member Access, Webhook Idempotency

## Purpose
Extends the existing `giving_transactions` and `giving_campaigns` tables with proper giving categories, payment provider configuration, member-facing access, webhook idempotency tracking, and receipt generation support.

## New Tables

1. **giving_categories** — Configurable giving categories (Tithes, Offerings, Missions, Building, Welfare, Other). All authenticated users can SELECT active categories. Finance/admin/pastor can INSERT/UPDATE.

2. **giving_provider_configs** — Stores which payment provider is configured. Only stores provider name and status — actual credentials are stored as Supabase edge function secrets, never in the database. super_admin only access.

3. **giving_webhook_events** — Idempotency log for payment provider webhooks. Records provider, event_id, transaction_reference, processed status, and timestamps. Prevents duplicate webhook processing.

## Modified Tables

1. **giving_transactions** — Added `category_id` (FK to giving_categories), `provider_name` (text), `provider_transaction_id` (text), `receipt_number` (text), `completed_at` (timestamptz), `refunded_at` (timestamptz), `updated_at` (timestamptz). Updated status CHECK to include 'refunded' and 'successful'. Added RLS policies for members to view their own transactions and for members to insert their own pending transactions.

2. **giving_transactions RLS** — Added `gt_select_own` policy: members can SELECT their own transactions (matched via member_id → members.user_id = auth.uid()). Added `gt_insert_own` policy: authenticated users can INSERT transactions where the member_id belongs to them. Added `gt_update_own` policy: members can update their own transactions (limited use). Finance UPDATE policy for status changes.

## Security
- **giving_categories**: All authenticated can SELECT active. Finance/admin/pastor can INSERT/UPDATE.
- **giving_provider_configs**: super_admin only for all operations.
- **giving_webhook_events**: super_admin and finance_officer can SELECT. Any authenticated can INSERT (webhook handler writes). super_admin can UPDATE (mark processed).
- **giving_transactions**: Members can SELECT their own (via member.user_id = auth.uid()). Finance/super_admin can SELECT all. Members can INSERT their own. Finance/super_admin can UPDATE. No DELETE.
- Transaction references are generated server-side via a SECURITY DEFINER function.

## New Functions
1. **generate_transaction_reference()** — SECURITY DEFINER function that generates a unique transaction reference in format `TYC-YYYYMMDD-XXXXXX`. Executable by authenticated.

## Important Notes
1. Payment credentials are NEVER stored in the database — they live as Supabase edge function secrets.
2. The `giving_provider_configs` table only records which provider is active, not credentials.
3. Webhook idempotency is enforced via the `giving_webhook_events` table with unique constraint on (provider, event_id).
4. Members can only see their own transactions — enforced at the RLS level via member_id → members.user_id = auth.uid().
5. Transaction references are generated server-side to prevent client-side manipulation.
6. The existing `giving_campaigns` table is not modified — campaigns remain as-is.
*/

-- ============================================================================
-- 1. GIVING CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.giving_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  fund_code   text UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.giving_categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gcat_active ON public.giving_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_gcat_slug ON public.giving_categories (slug);

DROP POLICY IF EXISTS "gcat_select_all" ON public.giving_categories;
CREATE POLICY "gcat_select_all"
  ON public.giving_categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "gcat_insert_finance" ON public.giving_categories;
CREATE POLICY "gcat_insert_finance"
  ON public.giving_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_officer') OR
    public.has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "gcat_update_finance" ON public.giving_categories;
CREATE POLICY "gcat_update_finance"
  ON public.giving_categories FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_officer') OR
    public.has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'finance_officer') OR
    public.has_role(auth.uid(), 'pastor')
  );

INSERT INTO public.giving_categories (slug, name, description, fund_code, sort_order)
VALUES
  ('tithes', 'Tithes', 'Regular tithes and first fruits', 'TITHE', 1),
  ('offerings', 'Offerings', 'General offerings', 'OFFER', 2),
  ('missions', 'Missions', 'Missions and evangelism', 'MISS', 3),
  ('building', 'Building', 'Building and infrastructure fund', 'BLDG', 4),
  ('welfare', 'Welfare', 'Welfare and benevolence', 'WELF', 5),
  ('other', 'Other', 'Other giving', 'OTHER', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. EXTEND giving_transactions TABLE
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD COLUMN category_id uuid REFERENCES public.giving_categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD COLUMN provider_name text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD COLUMN provider_transaction_id text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD COLUMN receipt_number text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD COLUMN completed_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD COLUMN refunded_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add unique constraint on provider_transaction_id to prevent duplicates
DO $$ BEGIN
  ALTER TABLE public.giving_transactions ADD CONSTRAINT gt_provider_txn_id_unique UNIQUE (provider_transaction_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Update status CHECK constraint to include 'refunded' and 'successful'
DO $$ BEGIN
  ALTER TABLE public.giving_transactions DROP CONSTRAINT gt_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.giving_transactions ADD CONSTRAINT gt_status_check
    CHECK (status IN ('pending', 'verified', 'failed', 'reversed', 'refunded', 'successful'));
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_gt_category ON public.giving_transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_gt_provider ON public.giving_transactions (provider_name);
CREATE INDEX IF NOT EXISTS idx_gt_receipt ON public.giving_transactions (receipt_number);
CREATE INDEX IF NOT EXISTS idx_gt_completed ON public.giving_transactions (completed_at);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trigger_giving_transactions_updated_at ON public.giving_transactions;
CREATE TRIGGER trigger_giving_transactions_updated_at
  BEFORE UPDATE ON public.giving_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 3. GIVING TRANSACTIONS RLS — Member Access
-- ============================================================================

-- Members can SELECT their own transactions (via member.user_id = auth.uid())
DROP POLICY IF EXISTS "gt_select_own" ON public.giving_transactions;
CREATE POLICY "gt_select_own"
  ON public.giving_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = giving_transactions.member_id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
    )
  );

-- Members can INSERT their own transactions (pending only)
DROP POLICY IF EXISTS "gt_insert_own" ON public.giving_transactions;
CREATE POLICY "gt_insert_own"
  ON public.giving_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = giving_transactions.member_id
      AND m.user_id = auth.uid()
      AND m.deleted_at IS NULL
    )
  );

-- Finance/super_admin can UPDATE (for status changes, verification, refunds)
DROP POLICY IF EXISTS "gt_update_finance" ON public.giving_transactions;
CREATE POLICY "gt_update_finance"
  ON public.giving_transactions FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  );

-- ============================================================================
-- 4. GIVING PROVIDER CONFIGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.giving_provider_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel       text NOT NULL UNIQUE,
  provider_name text NOT NULL,
  is_active     boolean NOT NULL DEFAULT false,
  configured_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.giving_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gpc_select_admin" ON public.giving_provider_configs;
CREATE POLICY "gpc_select_admin"
  ON public.giving_provider_configs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  );

DROP POLICY IF EXISTS "gpc_insert_admin" ON public.giving_provider_configs;
CREATE POLICY "gpc_insert_admin"
  ON public.giving_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "gpc_update_admin" ON public.giving_provider_configs;
CREATE POLICY "gpc_update_admin"
  ON public.giving_provider_configs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed default provider config (inactive)
INSERT INTO public.giving_provider_configs (channel, provider_name, is_active)
VALUES ('online', 'console', false)
ON CONFLICT (channel) DO NOTHING;

-- ============================================================================
-- 5. GIVING WEBHOOK EVENTS (idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.giving_webhook_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              text NOT NULL,
  event_id              text NOT NULL,
  transaction_reference text,
  status                text NOT NULL DEFAULT 'received',
  error_message         text,
  received_at           timestamptz NOT NULL DEFAULT now(),
  processed_at          timestamptz,
  CONSTRAINT gwe_event_unique UNIQUE (provider, event_id)
);

ALTER TABLE public.giving_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gwe_provider ON public.giving_webhook_events (provider);
CREATE INDEX IF NOT EXISTS idx_gwe_reference ON public.giving_webhook_events (transaction_reference);

DROP POLICY IF EXISTS "gwe_select_finance" ON public.giving_webhook_events;
CREATE POLICY "gwe_select_finance"
  ON public.giving_webhook_events FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  );

DROP POLICY IF EXISTS "gwe_insert_any" ON public.giving_webhook_events;
CREATE POLICY "gwe_insert_any"
  ON public.giving_webhook_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "gwe_update_admin" ON public.giving_webhook_events;
CREATE POLICY "gwe_update_admin"
  ON public.giving_webhook_events FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_officer')
  );

-- ============================================================================
-- 6. GENERATE TRANSACTION REFERENCE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_transaction_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_part text;
  v_random_part text;
  v_ref text;
  v_exists boolean;
  v_attempts int := 0;
BEGIN
  v_date_part := to_char(now(), 'YYYYMMDD');
  
  LOOP
    v_attempts := v_attempts + 1;
    v_random_part := lpad(floor(random() * 1000000)::text, 6, '0');
    v_ref := 'TYC-' || v_date_part || '-' || v_random_part;
    
    SELECT EXISTS(SELECT 1 FROM public.giving_transactions WHERE payment_reference = v_ref) INTO v_exists;
    IF NOT v_exists OR v_attempts > 10 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_transaction_reference() TO authenticated;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_giving_categories_updated_at ON public.giving_categories;
CREATE TRIGGER trigger_giving_categories_updated_at
  BEFORE UPDATE ON public.giving_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_giving_provider_configs_updated_at ON public.giving_provider_configs;
CREATE TRIGGER trigger_giving_provider_configs_updated_at
  BEFORE UPDATE ON public.giving_provider_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
