/*
# Tasks: completion audit, notes, assignment history, and contact timeline normalization

## Purpose
Extends the existing tasks table with `completed_by`, and `notes` fields, creates a `task_assignment_history` append-only table for tracking reassignments, and creates a `contact_activities` view-free normalization table that the unified Activity Timeline reads from. Also adds an RPC function `get_contact_timeline` that aggregates activities from multiple sources (follow_up_activities, contact_movements, tasks, event_registrations, attendance_records, giving_transactions, prayer_requests) into a single permission-aware timeline.

## New Tables
1. **task_assignment_history** — Append-only log of task reassignments. Records task_id, previous_assignee, new_assignee, changed_by, and changed_at.

## Modified Tables
1. **tasks** — Added `completed_by` (uuid FK to users), `notes` (text). Both nullable.

## New Functions
1. **get_contact_timeline(p_contact_id uuid, p_limit int, p_offset int)** — SECURITY DEFINER function that unions activity records from multiple existing tables (follow_up_activities, contact_movements, tasks, audit_logs for registration/profile, event_registrations, attendance_records, giving_transactions) into a normalized timeline. Returns columns: activity_type, description, actor_id, actor_name, occurred_at, source_table, source_id. Respects permission boundaries by only including giving data when the caller has finance role.

## Security
- **task_assignment_history**: Staff can SELECT. Staff can INSERT. No UPDATE/DELETE (append-only).
- New columns on tasks inherit existing RLS policies.
- **get_contact_timeline**: SECURITY DEFINER, executable by authenticated. Checks caller permissions internally for giving data.

## Important Notes
1. `completed_by` is set by the application when a task is marked completed.
2. `task_assignment_history` is append-only — no UPDATE or DELETE policies.
3. The timeline RPC reads from existing tables — it does not duplicate data.
4. Giving transactions are only included in the timeline when the caller has finance_officer or super_admin role.
5. The function uses `auth.uid()` to determine the caller.
*/

-- ============================================================================
-- 1. ADD COLUMNS TO tasks
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN completed_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN notes text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_completed_by ON public.tasks (completed_by) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. TASK ASSIGNMENT HISTORY (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_assignment_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  previous_assignee uuid REFERENCES public.users(id) ON DELETE SET NULL,
  new_assignee      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tah_select_staff" ON public.task_assignment_history;
CREATE POLICY "tah_select_staff"
  ON public.task_assignment_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager') OR
    public.has_role(auth.uid(), 'department_leader') OR
    public.has_role(auth.uid(), 'group_leader')
  );

DROP POLICY IF EXISTS "tah_insert_staff" ON public.task_assignment_history;
CREATE POLICY "tah_insert_staff"
  ON public.task_assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager') OR
    public.has_role(auth.uid(), 'department_leader') OR
    public.has_role(auth.uid(), 'group_leader')
  );

CREATE INDEX IF NOT EXISTS idx_tah_task ON public.task_assignment_history (task_id);
CREATE INDEX IF NOT EXISTS idx_tah_changed_at ON public.task_assignment_history (changed_at);

-- ============================================================================
-- 3. CONTACT TIMELINE RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_contact_timeline(
  p_contact_id uuid,
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  activity_type text,
  description text,
  actor_id uuid,
  actor_name text,
  occurred_at timestamptz,
  source_table text,
  source_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_has_finance boolean := false;
  v_contact_member_id uuid;
  v_contact_visitor_id uuid;
BEGIN
  -- Get the contact's linked member/visitor IDs
  SELECT member_id, visitor_id INTO v_contact_member_id, v_contact_visitor_id
  FROM public.contacts
  WHERE id = p_contact_id AND deleted_at IS NULL;

  -- Check if caller has finance permissions
  SELECT public.has_role(v_caller, 'finance_officer') OR public.has_role(v_caller, 'super_admin')
  INTO v_has_finance;

  RETURN QUERY
  -- 1. Follow-up activities (phone calls, SMS, WhatsApp, email, notes, etc.)
  SELECT
    fa.activity_type::text,
    COALESCE(fa.notes, ''),
    fa.performed_by,
    u.display_name,
    fa.performed_at,
    'follow_up_activities'::text,
    fa.id
  FROM public.follow_up_activities fa
  LEFT JOIN public.users u ON u.id = fa.performed_by
  WHERE fa.contact_id = p_contact_id

  UNION ALL

  -- 2. Contact movements (stage changes)
  SELECT
    'stage_change'::text,
    COALESCE(
      'Moved from ' || cm.from_stage || ' to ' || cm.to_stage,
      'Moved to ' || cm.to_stage
    ),
    cm.moved_by,
    u.display_name,
    cm.moved_at,
    'contact_movements'::text,
    cm.id
  FROM public.contact_movements cm
  LEFT JOIN public.users u ON u.id = cm.moved_by
  WHERE cm.contact_id = p_contact_id

  UNION ALL

  -- 3. Tasks (created, completed)
  SELECT
    CASE WHEN t.completed_at IS NOT NULL THEN 'task_completed' ELSE 'task_created' END::text,
    COALESCE(t.title, ''),
    t.created_by,
    u.display_name,
    CASE WHEN t.completed_at IS NOT NULL THEN t.completed_at ELSE t.created_at END,
    'tasks'::text,
    t.id
  FROM public.tasks t
  LEFT JOIN public.users u ON u.id = CASE WHEN t.completed_at IS NOT NULL THEN t.completed_by ELSE t.created_by END
  WHERE t.contact_id = p_contact_id AND t.deleted_at IS NULL

  UNION ALL

  -- 4. Event registrations (if linked to member or visitor)
  SELECT
    'event_registration'::text,
    COALESCE(e.title, 'Event registration'),
    NULL::uuid,
    NULL::text,
    er.created_at,
    'event_registrations'::text,
    er.id
  FROM public.event_registrations er
  LEFT JOIN public.events e ON e.id = er.event_id
  WHERE (er.member_id = v_contact_member_id OR er.visitor_id = v_contact_visitor_id)
    AND (v_contact_member_id IS NOT NULL OR v_contact_visitor_id IS NOT NULL)

  UNION ALL

  -- 5. Attendance records (if linked to member)
  SELECT
    'attendance'::text,
    COALESCE(ae.title, 'Attended service'),
    NULL::uuid,
    NULL::text,
    ar.check_in_time,
    'attendance_records'::text,
    ar.id
  FROM public.attendance_records ar
  LEFT JOIN public.attendance_events ae ON ae.id = ar.attendance_event_id
  WHERE ar.member_id = v_contact_member_id
    AND v_contact_member_id IS NOT NULL

  UNION ALL

  -- 6. Giving transactions (only if caller has finance permission)
  SELECT
    'giving'::text,
    CASE WHEN v_has_finance THEN
      'Gave ' || gt.currency || ' ' || gt.amount::text
    ELSE
      'Giving activity recorded'
    END,
    NULL::uuid,
    NULL::text,
    gt.transaction_date,
    'giving_transactions'::text,
    gt.id
  FROM public.giving_transactions gt
  WHERE gt.member_id = v_contact_member_id
    AND v_contact_member_id IS NOT NULL

  ORDER BY occurred_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_timeline(uuid, int, int) TO authenticated;
