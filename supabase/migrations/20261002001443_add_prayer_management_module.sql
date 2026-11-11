/*
# Prayer Request Management Module — Categories, Status History, Pastoral Notes, Member Updates

## Purpose
Extends the existing `prayer_requests` table with assignment, follow-up, and pastoral workflow columns. Creates new tables for prayer categories, prayer status history, pastoral notes, and member-visible updates. Adds a SECURITY DEFINER function for incrementing prayer counts safely.

## New Tables

1. **prayer_categories** — Configurable prayer request categories. Admins/pastors can manage; all authenticated users can read.
2. **prayer_status_history** — Append-only log of prayer request status changes.
3. **prayer_pastoral_notes** — Internal pastoral notes visible only to authorized pastoral/admin users and assigned user. Append-only.
4. **prayer_member_updates** — Member-visible updates from pastoral staff. Members can read updates on their own requests.

## Modified Tables

1. **prayer_requests** — Added `assigned_to`, `assigned_at`, `follow_up_date`, `closed_at`, `closed_by`, `pastoral_notes_summary`, `member_update` columns. Updated status CHECK constraint to include new pastoral workflow statuses.

## New Functions

1. **increment_prayer_count(p_prayer_id uuid)** — SECURITY DEFINER function that atomically increments `prayer_count`.

## Security
- **prayer_categories**: All authenticated can SELECT. Admin/pastor can INSERT/UPDATE.
- **prayer_status_history**: Staff can SELECT all. Members can SELECT their own. Any authenticated can INSERT.
- **prayer_pastoral_notes**: Only pastoral roles and assigned user can SELECT/INSERT. No UPDATE/DELETE — append-only.
- **prayer_member_updates**: Staff can SELECT all. Members can SELECT on their own requests. Staff/assigned user can INSERT.

## Important Notes
1. Pastoral notes are stored in a separate table with strict RLS — never returned through general prayer request queries.
2. Member-visible updates are in a separate table — members can only see updates on their own requests.
3. Anonymous requests maintain internal ownership but suppress identity for unauthorized users.
4. The increment_prayer_count function is SECURITY DEFINER so it works regardless of caller RLS.
*/

-- ============================================================================
-- 1. PRAYER CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prayer_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_select_all" ON public.prayer_categories;
CREATE POLICY "pc_select_all"
  ON public.prayer_categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "pc_insert_pastoral" ON public.prayer_categories;
CREATE POLICY "pc_insert_pastoral"
  ON public.prayer_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "pc_update_pastoral" ON public.prayer_categories;
CREATE POLICY "pc_update_pastoral"
  ON public.prayer_categories FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor')
  );

INSERT INTO public.prayer_categories (slug, name, description, sort_order)
VALUES
  ('personal', 'Personal', 'Personal prayer needs', 1),
  ('family', 'Family', 'Family-related prayer requests', 2),
  ('health', 'Health', 'Health and healing', 3),
  ('finances', 'Finances', 'Financial needs', 4),
  ('career', 'Career', 'Career and work', 5),
  ('relationships', 'Relationships', 'Relationships and friendships', 6),
  ('spiritual_growth', 'Spiritual Growth', 'Spiritual growth and walk with God', 7),
  ('academic', 'Academic', 'Academic and studies', 8),
  ('ministry', 'Ministry', 'Ministry and service', 9),
  ('thanksgiving', 'Thanksgiving', 'Thanksgiving and gratitude', 10),
  ('other', 'Other', 'Other prayer requests', 11)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. EXTEND prayer_requests TABLE
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.prayer_requests ADD COLUMN assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prayer_requests ADD COLUMN assigned_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prayer_requests ADD COLUMN follow_up_date date;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prayer_requests ADD COLUMN closed_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prayer_requests ADD COLUMN closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prayer_requests ADD COLUMN pastoral_notes_summary text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.prayer_requests ADD COLUMN member_update text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pr_assigned_to ON public.prayer_requests (assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pr_follow_up_date ON public.prayer_requests (follow_up_date) WHERE deleted_at IS NULL;

-- Update status CHECK constraint
DO $$ BEGIN
  ALTER TABLE public.prayer_requests DROP CONSTRAINT pr_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.prayer_requests ADD CONSTRAINT pr_status_check
    CHECK (status IN ('open', 'in_progress', 'answered', 'closed', 'new', 'assigned', 'praying', 'follow_up_required'));
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- RLS: assigned user can view their assigned requests
DROP POLICY IF EXISTS "pr_select_assigned" ON public.prayer_requests;
CREATE POLICY "pr_select_assigned"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() AND deleted_at IS NULL
  );

-- RLS: assigned user can UPDATE the request
DROP POLICY IF EXISTS "pr_update_assigned" ON public.prayer_requests;
CREATE POLICY "pr_update_assigned"
  ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- ============================================================================
-- 3. PRAYER STATUS HISTORY (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prayer_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  previous_status text,
  new_status      text NOT NULL,
  changed_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  notes           text
);

ALTER TABLE public.prayer_status_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_psh_prayer ON public.prayer_status_history (prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_psh_changed_at ON public.prayer_status_history (changed_at);

DROP POLICY IF EXISTS "psh_select_staff" ON public.prayer_status_history;
CREATE POLICY "psh_select_staff"
  ON public.prayer_status_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "psh_select_own" ON public.prayer_status_history;
CREATE POLICY "psh_select_own"
  ON public.prayer_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_requests pr
      WHERE pr.id = prayer_status_history.prayer_request_id
      AND pr.submitted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "psh_insert_authenticated" ON public.prayer_status_history;
CREATE POLICY "psh_insert_authenticated"
  ON public.prayer_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 4. PASTORAL NOTES (append-only, strict access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prayer_pastoral_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_pastoral_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ppn_prayer ON public.prayer_pastoral_notes (prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_ppn_created_at ON public.prayer_pastoral_notes (created_at);

DROP POLICY IF EXISTS "ppn_select_pastoral" ON public.prayer_pastoral_notes;
CREATE POLICY "ppn_select_pastoral"
  ON public.prayer_pastoral_notes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    EXISTS (
      SELECT 1 FROM public.prayer_requests pr
      WHERE pr.id = prayer_pastoral_notes.prayer_request_id
      AND pr.assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ppn_insert_pastoral" ON public.prayer_pastoral_notes;
CREATE POLICY "ppn_insert_pastoral"
  ON public.prayer_pastoral_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    EXISTS (
      SELECT 1 FROM public.prayer_requests pr
      WHERE pr.id = prayer_pastoral_notes.prayer_request_id
      AND pr.assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- 5. MEMBER-VISIBLE UPDATES (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prayer_member_updates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_member_updates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pmu_prayer ON public.prayer_member_updates (prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_pmu_created_at ON public.prayer_member_updates (created_at);

DROP POLICY IF EXISTS "pmu_select_staff" ON public.prayer_member_updates;
CREATE POLICY "pmu_select_staff"
  ON public.prayer_member_updates FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "pmu_select_own" ON public.prayer_member_updates;
CREATE POLICY "pmu_select_own"
  ON public.prayer_member_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_requests pr
      WHERE pr.id = prayer_member_updates.prayer_request_id
      AND pr.submitted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pmu_insert_staff" ON public.prayer_member_updates;
CREATE POLICY "pmu_insert_staff"
  ON public.prayer_member_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager') OR
    EXISTS (
      SELECT 1 FROM public.prayer_requests pr
      WHERE pr.id = prayer_member_updates.prayer_request_id
      AND pr.assigned_to = auth.uid()
    )
  );

-- ============================================================================
-- 6. INCREMENT PRAYER COUNT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_prayer_count(p_prayer_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count int;
BEGIN
  UPDATE public.prayer_requests
  SET prayer_count = prayer_count + 1
  WHERE id = p_prayer_id AND deleted_at IS NULL
  RETURNING prayer_count INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_prayer_count(uuid) TO authenticated;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_prayer_categories_updated_at ON public.prayer_categories;
CREATE TRIGGER trigger_prayer_categories_updated_at
  BEFORE UPDATE ON public.prayer_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
