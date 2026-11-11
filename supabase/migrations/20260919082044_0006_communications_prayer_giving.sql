/*
# Communications, Prayer, and Giving

## Purpose
Creates the communication system (outbound messages with per-recipient delivery tracking), the prayer request system (with strict visibility controls), and the giving system (campaigns and append-only transactions with finance-only access).

## New Tables

1. **messages** — An outbound communication (email, SMS, or in-app). Has subject, body, channel, sender, and status. Dispatched via the `send-communication` Edge Function.

2. **message_recipients** — Per-recipient delivery record. Tracks recipient, delivery status, and timestamps. Updated by webhook callbacks.

3. **prayer_requests** — A prayer request with strict visibility controls: public, members_only, pastoral_only, private. Pastoral-only is the strictest — invisible to everyone except pastors and super_admin.

4. **giving_campaigns** — A fundraising campaign with goal, dates, and status. Public campaigns readable by anyone.

5. **giving_transactions** — A verified giving transaction. **Finance-sensitive and append-only.** No client INSERT/UPDATE/DELETE — all writes go through the `record-giving` Edge Function with the service role key. Only finance_officer and super_admin can SELECT.

## Security

- **messages**: Staff can CRUD; recipients can read messages sent to them.
- **message_recipients**: Staff can read all; recipients can read their own. Staff-only insert/update.
- **prayer_requests**: Visibility enforced by column — public (anon), members_only (authenticated), pastoral_only (pastor/super_admin), private (submitter + pastor/super_admin). Any authenticated user can submit. Only pastor/super_admin can delete.
- **giving_campaigns**: Public campaigns readable by anon; all campaigns readable by finance/admin/super_admin. Finance/admin/super_admin can CRUD.
- **giving_transactions**: SELECT only by finance_officer/super_admin. NO client INSERT/UPDATE/DELETE — service role only via Edge Function.

## Important Notes

1. Tables created first, then policies, so cross-table policy references work.
2. `giving_transactions` is the strictest table — no client writes at all.
3. `prayer_requests.visibility = 'pastoral_only'` protects sensitive prayer needs.
4. Soft-delete on prayer_requests and giving_campaigns.
*/

-- ============================================================================
-- STEP 1: CREATE ALL TABLES
-- ============================================================================

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       text NOT NULL,
  body          text NOT NULL,
  channel       text NOT NULL DEFAULT 'email',
  template_id   text,
  sender_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'draft',
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  recipient_count int NOT NULL DEFAULT 0,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT messages_channel_check CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
  CONSTRAINT messages_status_check CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'))
);

-- MESSAGE RECIPIENTS
CREATE TABLE IF NOT EXISTS public.message_recipients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  recipient_user_id   uuid REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  recipient_email     text,
  recipient_phone     text,
  recipient_name      text,
  delivery_status     text NOT NULL DEFAULT 'pending',
  external_message_id text,
  error_message       text,
  sent_at             timestamptz,
  delivered_at        timestamptz,
  read_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mr_delivery_status_check CHECK (delivery_status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'read')),
  CONSTRAINT mr_recipient_check CHECK (
    recipient_user_id IS NOT NULL
    OR recipient_member_id IS NOT NULL
    OR recipient_email IS NOT NULL
    OR recipient_phone IS NOT NULL
  )
);

-- PRAYER REQUESTS
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  body            text NOT NULL,
  submitted_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  member_id       uuid REFERENCES public.members(id) ON DELETE SET NULL,
  visibility      text NOT NULL DEFAULT 'members_only',
  status          text NOT NULL DEFAULT 'open',
  is_anonymous    boolean NOT NULL DEFAULT false,
  category        text,
  prayer_count    int NOT NULL DEFAULT 0,
  answered_at     timestamptz,
  answered_description text,
  tags            text[],
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT pr_visibility_check CHECK (visibility IN ('public', 'members_only', 'pastoral_only', 'private')),
  CONSTRAINT pr_status_check CHECK (status IN ('open', 'in_progress', 'answered', 'closed')),
  CONSTRAINT pr_category_check CHECK (category IN ('healing', 'family', 'financial', 'spiritual', 'guidance', 'salvation', 'thanksgiving', 'other', NULL))
);

-- GIVING CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.giving_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  goal_amount   numeric(12,2),
  raised_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'USD',
  start_date    date NOT NULL,
  end_date      date,
  is_public     boolean NOT NULL DEFAULT true,
  status        text NOT NULL DEFAULT 'active',
  image_url     text,
  fund_code     text,
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT gc_status_check CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  CONSTRAINT gc_goal_check CHECK (goal_amount IS NULL OR goal_amount >= 0),
  CONSTRAINT gc_raised_check CHECK (raised_amount >= 0)
);

-- GIVING TRANSACTIONS (append-only, finance-only access)
CREATE TABLE IF NOT EXISTS public.giving_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         uuid REFERENCES public.members(id) ON DELETE SET NULL,
  campaign_id       uuid REFERENCES public.giving_campaigns(id) ON DELETE SET NULL,
  amount            numeric(12,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'USD',
  payment_method    text NOT NULL,
  payment_reference text,
  transaction_date  timestamptz NOT NULL DEFAULT now(),
  is_anonymous      boolean NOT NULL DEFAULT false,
  giver_name        text,
  giver_email       text,
  fund_code         text,
  notes             text,
  is_reversal       boolean NOT NULL DEFAULT false,
  reversal_of_id    uuid REFERENCES public.giving_transactions(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'verified',
  verified_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gt_amount_check CHECK (amount != 0),
  CONSTRAINT gt_payment_method_check CHECK (payment_method IN ('cash', 'check', 'card', 'bank_transfer', 'online', 'mobile', 'other')),
  CONSTRAINT gt_status_check CHECK (status IN ('pending', 'verified', 'failed', 'reversed'))
);

-- ============================================================================
-- STEP 2: ENABLE RLS
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giving_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giving_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: RLS POLICIES
-- ============================================================================

-- MESSAGES policies
DROP POLICY IF EXISTS "messages_select_staff_or_recipient" ON public.messages;
CREATE POLICY "messages_select_staff_or_recipient"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR EXISTS (
      SELECT 1 FROM public.message_recipients mr
      WHERE mr.message_id = messages.id
      AND mr.recipient_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_staff" ON public.messages;
CREATE POLICY "messages_insert_staff"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  );

DROP POLICY IF EXISTS "messages_update_staff" ON public.messages;
CREATE POLICY "messages_update_staff"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    sender_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "messages_delete_admin" ON public.messages;
CREATE POLICY "messages_delete_admin"
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- MESSAGE RECIPIENTS policies
DROP POLICY IF EXISTS "mr_select_staff_or_recipient" ON public.message_recipients;
CREATE POLICY "mr_select_staff_or_recipient"
  ON public.message_recipients FOR SELECT
  TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_recipients.message_id
      AND m.sender_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mr_insert_staff" ON public.message_recipients;
CREATE POLICY "mr_insert_staff"
  ON public.message_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  );

DROP POLICY IF EXISTS "mr_update_staff" ON public.message_recipients;
CREATE POLICY "mr_update_staff"
  ON public.message_recipients FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "mr_delete_admin" ON public.message_recipients;
CREATE POLICY "mr_delete_admin"
  ON public.message_recipients FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- PRAYER REQUESTS policies (4 SELECT policies for 4 visibility levels)
DROP POLICY IF EXISTS "pr_select_public" ON public.prayer_requests;
CREATE POLICY "pr_select_public"
  ON public.prayer_requests FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "pr_select_members" ON public.prayer_requests;
CREATE POLICY "pr_select_members"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (visibility = 'members_only' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "pr_select_pastoral" ON public.prayer_requests;
CREATE POLICY "pr_select_pastoral"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (visibility = 'pastoral_only' AND deleted_at IS NULL AND (
    public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'super_admin')
  ));

DROP POLICY IF EXISTS "pr_select_private" ON public.prayer_requests;
CREATE POLICY "pr_select_private"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (visibility = 'private' AND deleted_at IS NULL AND (
    submitted_by = auth.uid()
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'super_admin')
  ));

DROP POLICY IF EXISTS "pr_insert_authenticated" ON public.prayer_requests;
CREATE POLICY "pr_insert_authenticated"
  ON public.prayer_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "pr_update_own_or_pastor" ON public.prayer_requests;
CREATE POLICY "pr_update_own_or_pastor"
  ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    submitted_by = auth.uid()
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "pr_delete_pastor" ON public.prayer_requests;
CREATE POLICY "pr_delete_pastor"
  ON public.prayer_requests FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- GIVING CAMPAIGNS policies
DROP POLICY IF EXISTS "gc_select_public" ON public.giving_campaigns;
CREATE POLICY "gc_select_public"
  ON public.giving_campaigns FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "gc_select_finance" ON public.giving_campaigns;
CREATE POLICY "gc_select_finance"
  ON public.giving_campaigns FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'finance_officer')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "gc_insert_finance" ON public.giving_campaigns;
CREATE POLICY "gc_insert_finance"
  ON public.giving_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'finance_officer')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "gc_update_finance" ON public.giving_campaigns;
CREATE POLICY "gc_update_finance"
  ON public.giving_campaigns FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'finance_officer')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'finance_officer')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "gc_delete_admin" ON public.giving_campaigns;
CREATE POLICY "gc_delete_admin"
  ON public.giving_campaigns FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- GIVING TRANSACTIONS policies (SELECT only for finance; NO client writes)
DROP POLICY IF EXISTS "gt_select_finance" ON public.giving_transactions;
CREATE POLICY "gt_select_finance"
  ON public.giving_transactions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'finance_officer')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- NO INSERT, UPDATE, or DELETE policies — service role only via Edge Function

-- ============================================================================
-- STEP 4: TRIGGERS AND INDEXES
-- ============================================================================

CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER message_recipients_updated_at BEFORE UPDATE ON public.message_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER prayer_requests_updated_at BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER giving_campaigns_updated_at BEFORE UPDATE ON public.giving_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages (channel) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON public.messages (scheduled_at) WHERE deleted_at IS NULL AND status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_mr_message ON public.message_recipients (message_id);
CREATE INDEX IF NOT EXISTS idx_mr_recipient_user ON public.message_recipients (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_mr_recipient_member ON public.message_recipients (recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_mr_delivery_status ON public.message_recipients (delivery_status);
CREATE INDEX IF NOT EXISTS idx_mr_email ON public.message_recipients (recipient_email);

CREATE INDEX IF NOT EXISTS idx_pr_visibility ON public.prayer_requests (visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pr_status ON public.prayer_requests (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pr_submitted_by ON public.prayer_requests (submitted_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pr_member ON public.prayer_requests (member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pr_created ON public.prayer_requests (created_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gc_status ON public.giving_campaigns (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gc_public ON public.giving_campaigns (is_public) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gc_dates ON public.giving_campaigns (start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gc_fund_code ON public.giving_campaigns (fund_code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gt_member ON public.giving_transactions (member_id);
CREATE INDEX IF NOT EXISTS idx_gt_campaign ON public.giving_transactions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_gt_date ON public.giving_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_gt_status ON public.giving_transactions (status);
CREATE INDEX IF NOT EXISTS idx_gt_payment_method ON public.giving_transactions (payment_method);
CREATE INDEX IF NOT EXISTS idx_gt_fund_code ON public.giving_transactions (fund_code);
CREATE INDEX IF NOT EXISTS idx_gt_reversal ON public.giving_transactions (reversal_of_id) WHERE is_reversal = true;
