/*
# CRM, Follow-ups, and Tasks

## Purpose
Creates the engagement pipeline (CRM), follow-up tracking, follow-up activity logging, and the task management system.

## New Tables

1. **pipeline_stages** — Ordered stages of the membership/engagement pipeline (e.g., First Visit → Engaged → Member → Active → Serving). Seeded by Migration 8. Each stage has a sort order and is system-defined.

2. **contacts** — A person in the CRM pipeline. May reference a member or visitor once they exist, but a contact can exist before either (e.g., a website inquiry). Tracks current pipeline stage, source, and engagement level.

3. **contact_movements** — Append-only log of a contact moving between pipeline stages. Records who moved the contact, from/to which stage, and the reason.

4. **follow_ups** — A follow-up task assigned to a staff member for a visitor/new member. Has a type (welcome call, visit, prayer, counseling), priority, due date, and status.

5. **follow_up_activities** — Append-only log of activities on a follow-up (e.g., "called", "left voicemail", "scheduled meeting"). Each activity records the actor, type, notes, and timestamp.

6. **tasks** — General assignable tasks with assignee, due date, priority, status, and optional link to any entity (polymorphic). Used by all staff roles.

## Security

- **pipeline_stages**: All authenticated can SELECT (needed for UI). Super_admin can INSERT/UPDATE/DELETE.
- **contacts**: Staff (admin, pastor, follow_up_manager, super_admin) can CRUD. No self-access — contacts are staff-managed.
- **contact_movements**: Staff can SELECT and INSERT. No UPDATE/DELETE — append-only.
- **follow_ups**: Staff (admin, pastor, follow_up_manager, super_admin) can CRUD. Assignees can read/update their assigned follow-ups (checked via `assigned_to` = auth.uid()).
- **follow_up_activities**: Staff can SELECT and INSERT. No UPDATE/DELETE — append-only.
- **tasks**: Staff can CRUD tasks they're assigned to or that they created. Admin/super_admin can CRUD all tasks. Members can read tasks assigned to them.

## Important Notes

1. `contacts` has optional FK to both `members` and `visitors` — a contact may predate either. Both are nullable and `ON DELETE SET NULL`.
2. `contact_movements` and `follow_up_activities` are append-only (no UPDATE/DELETE policies).
3. `tasks` uses polymorphic `entity_type` + `entity_id` for linking to any entity (member, visitor, event, follow_up, etc.).
4. `follow_ups.assigned_to` references `users` (the staff member assigned), not `members`.
5. Soft-delete on `follow_ups` and `tasks`. Contacts, movements, and activities are hard-deletable by admin only.
*/

-- ============================================================================
-- PIPELINE STAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key   text NOT NULL,
  name        text NOT NULL,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_system   boolean NOT NULL DEFAULT false,
  color       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_stages_key_unique UNIQUE (stage_key)
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ps_select_authenticated" ON public.pipeline_stages;
CREATE POLICY "ps_select_authenticated"
  ON public.pipeline_stages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ps_insert_super_admin" ON public.pipeline_stages;
CREATE POLICY "ps_insert_super_admin"
  ON public.pipeline_stages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ps_update_super_admin" ON public.pipeline_stages;
CREATE POLICY "ps_update_super_admin"
  ON public.pipeline_stages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ps_delete_super_admin" ON public.pipeline_stages;
CREATE POLICY "ps_delete_super_admin"
  ON public.pipeline_stages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_ps_sort ON public.pipeline_stages (sort_order);

-- ============================================================================
-- CONTACTS (CRM pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text,
  phone           text,
  member_id       uuid REFERENCES public.members(id) ON DELETE SET NULL,
  visitor_id      uuid REFERENCES public.visitors(id) ON DELETE SET NULL,
  pipeline_stage  text NOT NULL REFERENCES public.pipeline_stages(stage_key) ON DELETE RESTRICT,
  source          text NOT NULL DEFAULT 'website',
  engagement_level int NOT NULL DEFAULT 1,
  notes           text,
  assigned_to     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_contacted_at timestamptz,
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT contacts_source_check CHECK (source IN ('website', 'event', 'referral', 'social_media', 'walk_in', 'other'))
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Staff can access contacts; assignee can read their assigned contacts
DROP POLICY IF EXISTS "contacts_select_staff" ON public.contacts;
CREATE POLICY "contacts_select_staff"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "contacts_insert_staff" ON public.contacts;
CREATE POLICY "contacts_insert_staff"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "contacts_update_staff" ON public.contacts;
CREATE POLICY "contacts_update_staff"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "contacts_delete_admin" ON public.contacts;
CREATE POLICY "contacts_delete_admin"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_contacts_stage ON public.contacts (pipeline_stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_member ON public.contacts (member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_visitor ON public.contacts (visitor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON public.contacts (assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.contacts (first_name, last_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts (email) WHERE deleted_at IS NULL;

-- ============================================================================
-- CONTACT MOVEMENTS (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  from_stage    text REFERENCES public.pipeline_stages(stage_key) ON DELETE RESTRICT,
  to_stage      text NOT NULL REFERENCES public.pipeline_stages(stage_key) ON DELETE RESTRICT,
  reason        text,
  moved_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  moved_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cm_select_staff" ON public.contact_movements;
CREATE POLICY "cm_select_staff"
  ON public.contact_movements FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "cm_insert_staff" ON public.contact_movements;
CREATE POLICY "cm_insert_staff"
  ON public.contact_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- No UPDATE or DELETE — append-only

CREATE INDEX IF NOT EXISTS idx_cm_contact ON public.contact_movements (contact_id);
CREATE INDEX IF NOT EXISTS idx_cm_moved_at ON public.contact_movements (moved_at);
CREATE INDEX IF NOT EXISTS idx_cm_to_stage ON public.contact_movements (to_stage);

-- ============================================================================
-- FOLLOW-UPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id      uuid REFERENCES public.visitors(id) ON DELETE CASCADE,
  member_id       uuid REFERENCES public.members(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'welcome_call',
  priority        text NOT NULL DEFAULT 'normal',
  status          text NOT NULL DEFAULT 'pending',
  due_date        date,
  completed_at    timestamptz,
  assigned_to     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes           text,
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT fu_type_check CHECK (type IN ('welcome_call', 'home_visit', 'prayer', 'counseling', 'invitation', 'check_in', 'other')),
  CONSTRAINT fu_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT fu_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  CONSTRAINT fu_subject_check CHECK (visitor_id IS NOT NULL OR member_id IS NOT NULL OR contact_id IS NOT NULL)
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Staff and assignees can read follow-ups
DROP POLICY IF EXISTS "fu_select_staff_or_assignee" ON public.follow_ups;
CREATE POLICY "fu_select_staff_or_assignee"
  ON public.follow_ups FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR assigned_to = auth.uid()
  );

-- Staff can insert follow-ups
DROP POLICY IF EXISTS "fu_insert_staff" ON public.follow_ups;
CREATE POLICY "fu_insert_staff"
  ON public.follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- Staff and assignees can update follow-ups
DROP POLICY IF EXISTS "fu_update_staff_or_assignee" ON public.follow_ups;
CREATE POLICY "fu_update_staff_or_assignee"
  ON public.follow_ups FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR assigned_to = auth.uid()
  );

-- Only admin/super_admin can delete follow-ups
DROP POLICY IF EXISTS "fu_delete_admin" ON public.follow_ups;
CREATE POLICY "fu_delete_admin"
  ON public.follow_ups FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER follow_ups_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_fu_visitor ON public.follow_ups (visitor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_member ON public.follow_ups (member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_contact ON public.follow_ups (contact_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_assigned ON public.follow_ups (assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_status ON public.follow_ups (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_due_date ON public.follow_ups (due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fu_priority ON public.follow_ups (priority) WHERE deleted_at IS NULL;

-- ============================================================================
-- FOLLOW-UP ACTIVITIES (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.follow_up_activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_id  uuid NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  notes         text,
  performed_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  performed_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fa_type_check CHECK (activity_type IN ('call', 'text', 'email', 'visit', 'meeting', 'note', 'status_change', 'other'))
);

ALTER TABLE public.follow_up_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fa_select_staff" ON public.follow_up_activities;
CREATE POLICY "fa_select_staff"
  ON public.follow_up_activities FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR EXISTS (
      SELECT 1 FROM public.follow_ups fu
      WHERE fu.id = follow_up_activities.follow_up_id
      AND fu.assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fa_insert_staff" ON public.follow_up_activities;
CREATE POLICY "fa_insert_staff"
  ON public.follow_up_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR EXISTS (
      SELECT 1 FROM public.follow_ups fu
      WHERE fu.id = follow_up_activities.follow_up_id
      AND fu.assigned_to = auth.uid()
    )
  );

-- No UPDATE or DELETE — append-only

CREATE INDEX IF NOT EXISTS idx_fa_follow_up ON public.follow_up_activities (follow_up_id);
CREATE INDEX IF NOT EXISTS idx_fa_performed_at ON public.follow_up_activities (performed_at);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  entity_type text,
  entity_id   uuid,
  assigned_to uuid REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  priority    text NOT NULL DEFAULT 'normal',
  status      text NOT NULL DEFAULT 'pending',
  due_date    date,
  completed_at timestamptz,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT tasks_entity_type_check CHECK (entity_type IN ('member', 'visitor', 'event', 'follow_up', 'contact', 'group', 'department', NULL))
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Staff can read all tasks; a user can read tasks assigned to them
DROP POLICY IF EXISTS "tasks_select_staff_or_assignee" ON public.tasks;
CREATE POLICY "tasks_select_staff_or_assignee"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
    OR assigned_to = auth.uid()
    OR assigned_by = auth.uid()
  );

-- Staff can insert tasks
DROP POLICY IF EXISTS "tasks_insert_staff" ON public.tasks;
CREATE POLICY "tasks_insert_staff"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  );

-- Staff and assignees can update tasks
DROP POLICY IF EXISTS "tasks_update_staff_or_assignee" ON public.tasks;
CREATE POLICY "tasks_update_staff_or_assignee"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
    OR assigned_to = auth.uid()
  );

-- Only admin/super_admin can delete tasks
DROP POLICY IF EXISTS "tasks_delete_admin" ON public.tasks;
CREATE POLICY "tasks_delete_admin"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks (assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks (priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON public.tasks (entity_type, entity_id) WHERE deleted_at IS NULL;
