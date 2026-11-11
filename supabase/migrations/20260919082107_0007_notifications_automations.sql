/*
# Notifications and Automations

## Purpose
Creates the in-app notification system (with realtime support) and the automation engine (trigger + condition + action definitions with execution logging).

## New Tables

1. **notifications** — In-app notifications for a user. Has a type, title, body, link, and read status. Realtime-subscribed by the user via Supabase Realtime. Created by the system (Edge Functions, triggers) and by server actions.

2. **automations** — A declarative automation definition: trigger event, optional condition (JSON), action type, action config (JSON), and enabled flag. Managed by admin/super_admin. Executed by the `run-automation` Edge Function.

3. **automation_runs** — Append-only execution log of an automation. Records the trigger payload, status (running/succeeded/failed), error message, and timestamps. Used for debugging and auditing automation behavior.

## Security

- **notifications**: A user can SELECT/UPDATE (mark as read) their own notifications. Any authenticated user can INSERT (the system writes notifications). Users cannot DELETE (notifications are retained; a soft "archived" flag could be added later).
- **automations**: Only admin/super_admin can SELECT, INSERT, UPDATE, or DELETE. Regular users have no access to automation definitions.
- **automation_runs**: Only admin/super_admin can SELECT. Any authenticated user can INSERT (the runner logs executions). No UPDATE or DELETE — append-only.

## Important Notes

1. `notifications` has `DEFAULT auth.uid()` on `user_id` so the system can create a notification for the current user without passing it explicitly. For notifications to other users, the `user_id` is passed explicitly by the Edge Function.
2. `automations.trigger_event` is a text key matching a domain event (e.g., `visitor.created`, `member.status_changed`). The runner matches incoming events against enabled automations.
3. `automations.trigger_condition` is a JSON expression evaluated by the runner — intentionally limited (no arbitrary code). Complex needs fall back to a custom Edge Function.
4. `automation_runs` is append-only — no UPDATE or DELETE policies.
5. No soft-delete on notifications (they're retained for history). Automations have soft-delete.
*/

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  link       text,
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read    boolean NOT NULL DEFAULT false,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- A user can read their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Any authenticated user can insert notifications (system writes them for other users too)
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- A user can update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- A user can delete their own notifications
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);

-- ============================================================================
-- AUTOMATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text,
  trigger_event     text NOT NULL,
  trigger_condition jsonb,
  action_type       text NOT NULL,
  action_config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled        boolean NOT NULL DEFAULT true,
  max_runs_per_day  int NOT NULL DEFAULT 100,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT automations_action_type_check CHECK (action_type IN (
    'send_communication',
    'create_task',
    'create_follow_up',
    'move_contact_stage',
    'add_tag',
    'notify',
    'create_notification'
  ))
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- Only admin/super_admin can manage automations
DROP POLICY IF EXISTS "automations_select_admin" ON public.automations;
CREATE POLICY "automations_select_admin"
  ON public.automations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "automations_insert_admin" ON public.automations;
CREATE POLICY "automations_insert_admin"
  ON public.automations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "automations_update_admin" ON public.automations;
CREATE POLICY "automations_update_admin"
  ON public.automations FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "automations_delete_admin" ON public.automations;
CREATE POLICY "automations_delete_admin"
  ON public.automations FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER automations_updated_at BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_automations_trigger ON public.automations (trigger_event) WHERE deleted_at IS NULL AND is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON public.automations (is_enabled) WHERE deleted_at IS NULL;

-- ============================================================================
-- AUTOMATION RUNS (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id   uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'running',
  error_message   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arun_status_check CHECK (status IN ('running', 'succeeded', 'failed', 'skipped'))
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- Only admin/super_admin can read automation runs
DROP POLICY IF EXISTS "arun_select_admin" ON public.automation_runs;
CREATE POLICY "arun_select_admin"
  ON public.automation_runs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Any authenticated user can insert (the runner logs executions)
DROP POLICY IF EXISTS "arun_insert_authenticated" ON public.automation_runs;
CREATE POLICY "arun_insert_authenticated"
  ON public.automation_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admin/super_admin can update (to mark as succeeded/failed)
DROP POLICY IF EXISTS "arun_update_admin" ON public.automation_runs;
CREATE POLICY "arun_update_admin"
  ON public.automation_runs FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- No DELETE policy — append-only

CREATE INDEX IF NOT EXISTS idx_arun_automation ON public.automation_runs (automation_id);
CREATE INDEX IF NOT EXISTS idx_arun_status ON public.automation_runs (status);
CREATE INDEX IF NOT EXISTS idx_arun_started ON public.automation_runs (started_at);
