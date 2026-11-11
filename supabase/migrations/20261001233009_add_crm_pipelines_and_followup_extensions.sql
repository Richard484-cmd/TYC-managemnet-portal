/*
# CRM Pipelines, Follow-Up Extensions, and Default Pipeline Seed

## Purpose
Extends the existing CRM schema (pipeline_stages, contacts, follow_ups, follow_up_activities, tasks) with a multi-pipeline architecture, richer follow-up records, structured activity types, task-to-contact linking, and seeds the default "TYC Membership Follow-Up" pipeline with 7 stages.

## New Tables
1. **crm_pipelines** — Top-level pipeline container (e.g., "TYC Membership Follow-Up"). Each pipeline has a name, description, active/inactive status, and audit fields. Multiple pipelines can coexist.
2. **crm_pipeline_stages** — Stages belonging to a specific pipeline. Each has a position (sort_order), active/inactive status, and color. Replaces the flat pipeline_stages table for CRM operations (the old table remains untouched for backward compatibility).

## Modified Tables
1. **contacts** — Added `pipeline_id` (FK to crm_pipelines), `crm_stage_id` (FK to crm_pipeline_stages), `priority`, `follow_up_type`, `next_follow_up_date`. The existing `pipeline_stage` text column remains for backward compatibility but CRM operations use `crm_stage_id`.
2. **follow_ups** — Added `pipeline_id`, `stage_id`, `contact_id` already exists, added `outcome`, `next_follow_up_date`. Relaxed `assigned_to` to be nullable. Added new follow-up type values.
3. **follow_up_activities** — Added `contact_id` (nullable FK to contacts) so activities can be logged at the contact level. Added `outcome` field. Expanded activity type check to include WhatsApp and in_person.
4. **tasks** — Added `contact_id` (FK to contacts) for direct contact-task linking alongside the polymorphic entity_type/entity_id.

## Seed Data
1. **crm_pipelines** — One default pipeline: "TYC Membership Follow-Up" (is_system = true).
2. **crm_pipeline_stages** — 7 stages in order: New Visitor, First Follow-Up, Contacted, Second Visit, Membership Class, New Member, Active Member. All is_system = true.

## Security
- **crm_pipelines**: All authenticated can SELECT. Only super_admin/admin can INSERT/UPDATE/DELETE.
- **crm_pipeline_stages**: All authenticated can SELECT. Only super_admin/admin can INSERT/UPDATE/DELETE.
- New columns on contacts, follow_ups, follow_up_activities, tasks inherit existing RLS policies.

## Important Notes
1. The old `pipeline_stages` table and its 5 seeded rows remain untouched — no data loss, no breaking changes.
2. The `contacts.pipeline_stage` text column remains — existing code continues to work.
3. New `crm_stage_id` on contacts is the primary stage reference for CRM operations going forward.
4. All new columns are nullable or have safe defaults so existing rows are not broken.
5. Seed inserts use ON CONFLICT DO NOTHING — idempotent.
6. Follow-up type check constraint is replaced to support the new types: general, first_time_visitor, second_visit, membership, pastoral, event, other (plus existing types for backward compat).
7. Follow-up activity type check is replaced to support: phone_call, sms, whatsapp, email, in_person, note (plus existing types for backward compat).
8. Task status check is replaced to remove 'overdue' as a stored status — overdue is computed from due_date + status, not stored. Existing 'overdue' rows are migrated to 'pending'.
*/

-- ============================================================================
-- 1. CRM PIPELINES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  is_system    boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cp_select_authenticated" ON public.crm_pipelines;
CREATE POLICY "cp_select_authenticated"
  ON public.crm_pipelines FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "cp_insert_admin" ON public.crm_pipelines;
CREATE POLICY "cp_insert_admin"
  ON public.crm_pipelines FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "cp_update_admin" ON public.crm_pipelines;
CREATE POLICY "cp_update_admin"
  ON public.crm_pipelines FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "cp_delete_admin" ON public.crm_pipelines;
CREATE POLICY "cp_delete_admin"
  ON public.crm_pipelines FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER crm_pipelines_updated_at BEFORE UPDATE ON public.crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 2. CRM PIPELINE STAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id  uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  position     int NOT NULL DEFAULT 0,
  color        text DEFAULT '#3b82f6',
  is_active    boolean NOT NULL DEFAULT true,
  is_system    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cps_select_authenticated" ON public.crm_pipeline_stages;
CREATE POLICY "cps_select_authenticated"
  ON public.crm_pipeline_stages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "cps_insert_admin" ON public.crm_pipeline_stages;
CREATE POLICY "cps_insert_admin"
  ON public.crm_pipeline_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "cps_update_admin" ON public.crm_pipeline_stages;
CREATE POLICY "cps_update_admin"
  ON public.crm_pipeline_stages FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "cps_delete_admin" ON public.crm_pipeline_stages;
CREATE POLICY "cps_delete_admin"
  ON public.crm_pipeline_stages FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER crm_pipeline_stages_updated_at BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_cps_pipeline ON public.crm_pipeline_stages (pipeline_id, position);

-- ============================================================================
-- 3. ADD COLUMNS TO contacts
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.contacts ADD COLUMN pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contacts ADD COLUMN crm_stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contacts ADD COLUMN priority text NOT NULL DEFAULT 'medium';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contacts ADD COLUMN follow_up_type text DEFAULT 'general';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contacts ADD COLUMN next_follow_up_date date;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contacts ADD COLUMN outcome text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add priority check (drop old if exists, create new)
DO $$ BEGIN
  ALTER TABLE public.contacts DROP CONSTRAINT contacts_priority_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.contacts ADD CONSTRAINT contacts_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.contacts ADD CONSTRAINT contacts_follow_up_type_check
  CHECK (follow_up_type IN ('general', 'first_time_visitor', 'second_visit', 'membership', 'pastoral', 'event', 'other'));

CREATE INDEX IF NOT EXISTS idx_contacts_pipeline ON public.contacts (pipeline_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_crm_stage ON public.contacts (crm_stage_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON public.contacts (priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_next_fu ON public.contacts (next_follow_up_date) WHERE deleted_at IS NULL;

-- ============================================================================
-- 4. ADD COLUMNS TO follow_ups
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.follow_ups ADD COLUMN pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.follow_ups ADD COLUMN stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.follow_ups ADD COLUMN outcome text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.follow_ups ADD COLUMN next_follow_up_date date;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Make assigned_to nullable (some follow-ups may be unassigned initially)
DO $$ BEGIN
  ALTER TABLE public.follow_ups ALTER COLUMN assigned_to DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Replace type check to include new types
DO $$ BEGIN
  ALTER TABLE public.follow_ups DROP CONSTRAINT fu_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.follow_ups ADD CONSTRAINT fu_type_check
  CHECK (type IN ('welcome_call', 'home_visit', 'prayer', 'counseling', 'invitation', 'check_in', 'other',
                  'general', 'first_time_visitor', 'second_visit', 'membership', 'pastoral', 'event'));

-- Replace priority check to use 'medium' instead of 'normal'
DO $$ BEGIN
  ALTER TABLE public.follow_ups DROP CONSTRAINT fu_priority_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.follow_ups ADD CONSTRAINT fu_priority_check
  CHECK (priority IN ('low', 'normal', 'medium', 'high', 'urgent'));

-- Add outcome check
ALTER TABLE public.follow_ups ADD CONSTRAINT fu_outcome_check
  CHECK (outcome IN ('contacted_successfully', 'no_response', 'requested_callback', 'interested_in_membership',
                     'attended_second_service', 'joined_membership_class', 'became_member', 'other'));

CREATE INDEX IF NOT EXISTS idx_fu_pipeline ON public.follow_ups (pipeline_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_stage ON public.follow_ups (stage_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_next_fu ON public.follow_ups (next_follow_up_date) WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. ADD COLUMNS TO follow_up_activities
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.follow_up_activities ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.follow_up_activities ADD COLUMN outcome text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Replace activity type check to include new types
DO $$ BEGIN
  ALTER TABLE public.follow_up_activities DROP CONSTRAINT fa_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.follow_up_activities ADD CONSTRAINT fa_type_check
  CHECK (activity_type IN ('call', 'text', 'email', 'visit', 'meeting', 'note', 'status_change', 'other',
                           'phone_call', 'sms', 'whatsapp', 'in_person'));

CREATE INDEX IF NOT EXISTS idx_fa_contact ON public.follow_up_activities (contact_id);

-- ============================================================================
-- 6. ADD COLUMNS TO tasks
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Migrate any existing 'overdue' status tasks to 'pending'
UPDATE public.tasks SET status = 'pending' WHERE status = 'overdue';

-- Replace status check to remove 'overdue' as a stored status
DO $$ BEGIN
  ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_tasks_contact ON public.tasks (contact_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 7. SEED DEFAULT PIPELINE AND STAGES
-- ============================================================================

INSERT INTO public.crm_pipelines (id, name, description, is_active, is_system)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'TYC Membership Follow-Up',
  'Default follow-up pipeline for tracking visitors through to active membership at The Youth Church of the Epiphany.',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crm_pipeline_stages (id, pipeline_id, name, description, position, color, is_active, is_system) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000101', 'a1b2c3d4-0000-0000-0000-000000000001', 'New Visitor', 'Person has visited for the first time', 1, '#3b82f6', true, true),
  ('a1b2c3d4-0000-0000-0000-000000000102', 'a1b2c3d4-0000-0000-0000-000000000001', 'First Follow-Up', 'Initial follow-up contact attempt', 2, '#8b5cf6', true, true),
  ('a1b2c3d4-0000-0000-0000-000000000103', 'a1b2c3d4-0000-0000-0000-000000000001', 'Contacted', 'Person has been successfully contacted', 3, '#10b981', true, true),
  ('a1b2c3d4-0000-0000-0000-000000000104', 'a1b2c3d4-0000-0000-0000-000000000001', 'Second Visit', 'Person has attended a second time', 4, '#f59e0b', true, true),
  ('a1b2c3d4-0000-0000-0000-000000000105', 'a1b2c3d4-0000-0000-0000-000000000001', 'Membership Class', 'Person is attending membership classes', 5, '#6366f1', true, true),
  ('a1b2c3d4-0000-0000-0000-000000000106', 'a1b2c3d4-0000-0000-0000-000000000001', 'New Member', 'Person has become a formal member', 6, '#ec4899', true, true),
  ('a1b2c3d4-0000-0000-0000-000000000107', 'a1b2c3d4-0000-0000-0000-000000000001', 'Active Member', 'Member is active in the church community', 7, '#14b8a6', true, true)
ON CONFLICT (id) DO NOTHING;
