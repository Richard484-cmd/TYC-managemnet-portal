/*
# Church Automation Engine — Workflow Steps, Executions, Logs, Event Queue

## Purpose
Extends the existing `automations` table to support multi-step workflows (trigger → condition → action → delay → action...) and creates new tables for ordered workflow steps, execution state, execution logging, and an event queue for the background processing engine.

## New Tables

1. **automation_steps** — Ordered steps within a workflow. Each step has a type (trigger, condition, action, delay), configuration (JSONB), position, and enabled state. This replaces the single-action model with a multi-step workflow model.

2. **automation_executions** — Persistent execution state for each workflow run. Tracks the current step, context (entity references), status (pending, running, waiting, successful, failed, cancelled), and timing. Survives browser/server restarts.

3. **automation_execution_logs** — Append-only log of each step's execution within a workflow run. Records step type, configuration, status, error messages, duration, and entity references. Administrators can see exactly what happened at each step.

4. **automation_event_queue** — Internal event queue for the automation engine. Events are emitted by business modules (visitor created, payment successful, etc.) and processed by the edge function. Includes idempotency protection via a unique event key.

## Modified Tables

1. **automations** — Added `status` column (draft, active, paused, archived) to replace the boolean `is_enabled`. Added `last_executed_at` and `execution_count` for monitoring. The existing `is_enabled` column is kept for backward compatibility — `status='active'` is equivalent to `is_enabled=true`.

2. **tag_assignments** — Extended the `entity_type` CHECK constraint to include `'contact'` so automations can tag CRM contacts.

## Security
- **automation_steps**: Admin/super_admin only for all CRUD.
- **automation_executions**: Admin/super_admin can SELECT; edge function (service role) can INSERT/UPDATE.
- **automation_execution_logs**: Admin/super_admin can SELECT; edge function (service role) can INSERT.
- **automation_event_queue**: Admin/super_admin can SELECT; any authenticated can INSERT (business modules emit events); edge function (service role) can UPDATE (mark processed).

## Important Notes
1. The existing `automations` table is NOT dropped or recreated — it's extended in place to preserve existing data.
2. The existing `automation_runs` table remains for backward compatibility with the old single-action model.
3. All new tables use RLS with admin/super_admin access for management and service-role access for the execution engine.
4. The event queue uses a unique `event_key` to prevent duplicate processing of the same event.
5. Execution context stores only entity IDs (member_id, contact_id, transaction_id, etc.) — not full records. The engine fetches authoritative data when needed.
6. Delay steps persist their `resume_at` timestamp in `automation_executions.waiting_until` so the background scheduler can resume them.
7. No payment credentials, provider secrets, or sensitive authentication data are stored in any automation table.
8. The `tag_assignments.entity_type` CHECK is extended to allow `'contact'` for CRM contact tagging via automation.
*/
-- ============================================================================
-- 1. EXTEND automations TABLE
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.automations ADD COLUMN status text NOT NULL DEFAULT 'draft';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.automations ADD COLUMN last_executed_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.automations ADD COLUMN execution_count int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add status CHECK constraint
DO $$ BEGIN
  ALTER TABLE public.automations ADD CONSTRAINT automations_status_check
    CHECK (status IN ('draft', 'active', 'paused', 'archived'));
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- Backfill status from is_enabled for existing rows
UPDATE public.automations SET status = CASE WHEN is_enabled THEN 'active' ELSE 'paused' END WHERE status = 'draft' AND id IS NOT NULL;

-- ============================================================================
-- 2. AUTOMATION STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  step_type   text NOT NULL CHECK (step_type IN ('trigger', 'condition', 'action', 'delay')),
  step_key    text NOT NULL,
  name        text,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  position    int NOT NULL DEFAULT 0,
  is_enabled  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_asteps_automation ON public.automation_steps (automation_id);
CREATE INDEX IF NOT EXISTS idx_asteps_position ON public.automation_steps (automation_id, position);

DROP POLICY IF EXISTS "asteps_select_admin" ON public.automation_steps;
CREATE POLICY "asteps_select_admin"
  ON public.automation_steps FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "asteps_insert_admin" ON public.automation_steps;
CREATE POLICY "asteps_insert_admin"
  ON public.automation_steps FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "asteps_update_admin" ON public.automation_steps;
CREATE POLICY "asteps_update_admin"
  ON public.automation_steps FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "asteps_delete_admin" ON public.automation_steps;
CREATE POLICY "asteps_delete_admin"
  ON public.automation_steps FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 3. AUTOMATION EXECUTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_executions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id  uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'waiting', 'successful', 'failed', 'cancelled')),
  current_step_id uuid REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  current_step_position int NOT NULL DEFAULT 0,
  context        jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger_event  text,
  trigger_payload jsonb,
  event_key      text,
  is_test        boolean NOT NULL DEFAULT false,
  error_message  text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  waiting_until  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_aexec_automation ON public.automation_executions (automation_id);
CREATE INDEX IF NOT EXISTS idx_aexec_status ON public.automation_executions (status);
CREATE INDEX IF NOT EXISTS idx_aexec_waiting ON public.automation_executions (status, waiting_until) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_aexec_event_key ON public.automation_executions (event_key);
CREATE INDEX IF NOT EXISTS idx_aexec_created ON public.automation_executions (created_at DESC);

DROP POLICY IF EXISTS "aexec_select_admin" ON public.automation_executions;
CREATE POLICY "aexec_select_admin"
  ON public.automation_executions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "aexec_insert_admin" ON public.automation_executions;
CREATE POLICY "aexec_insert_admin"
  ON public.automation_executions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "aexec_update_admin" ON public.automation_executions;
CREATE POLICY "aexec_update_admin"
  ON public.automation_executions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4. AUTOMATION EXECUTION LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_execution_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id   uuid NOT NULL REFERENCES public.automation_executions(id) ON DELETE CASCADE,
  automation_id  uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  step_id        uuid REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  step_type      text NOT NULL,
  step_key       text NOT NULL,
  step_name      text,
  config         jsonb,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'successful', 'failed', 'skipped', 'cancelled')),
  result         jsonb,
  error_message  text,
  duration_ms    int,
  member_id      uuid,
  contact_id     uuid,
  entity_type    text,
  entity_id      uuid,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_aelog_execution ON public.automation_execution_logs (execution_id);
CREATE INDEX IF NOT EXISTS idx_aelog_automation ON public.automation_execution_logs (automation_id);
CREATE INDEX IF NOT EXISTS idx_aelog_status ON public.automation_execution_logs (status);
CREATE INDEX IF NOT EXISTS idx_aelog_created ON public.automation_execution_logs (created_at DESC);

DROP POLICY IF EXISTS "aelog_select_admin" ON public.automation_execution_logs;
CREATE POLICY "aelog_select_admin"
  ON public.automation_execution_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "aelog_insert_admin" ON public.automation_execution_logs;
CREATE POLICY "aelog_insert_admin"
  ON public.automation_execution_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. AUTOMATION EVENT QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_event_queue (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     text NOT NULL,
  event_key      text UNIQUE,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  entity_type    text,
  entity_id      uuid,
  member_id      uuid,
  contact_id     uuid,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz
);

ALTER TABLE public.automation_event_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_aeq_status ON public.automation_event_queue (status);
CREATE INDEX IF NOT EXISTS idx_aeq_type ON public.automation_event_queue (event_type);
CREATE INDEX IF NOT EXISTS idx_aeq_created ON public.automation_event_queue (created_at DESC);

DROP POLICY IF EXISTS "aeq_select_admin" ON public.automation_event_queue;
CREATE POLICY "aeq_select_admin"
  ON public.automation_event_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "aeq_insert_any" ON public.automation_event_queue;
CREATE POLICY "aeq_insert_any"
  ON public.automation_event_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "aeq_update_admin" ON public.automation_event_queue;
CREATE POLICY "aeq_update_admin"
  ON public.automation_event_queue FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 6. EXTEND tag_assignments entity_type CHECK
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.tag_assignments DROP CONSTRAINT IF EXISTS tag_assignments_entity_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tag_assignments ADD CONSTRAINT tag_assignments_entity_type_check
    CHECK (entity_type IN ('member', 'visitor', 'event', 'group', 'department', 'ministry', 'contact'));
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_automation_steps_updated_at ON public.automation_steps;
CREATE TRIGGER trigger_automation_steps_updated_at
  BEFORE UPDATE ON public.automation_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_automation_executions_updated_at ON public.automation_executions;
CREATE TRIGGER trigger_automation_executions_updated_at
  BEFORE UPDATE ON public.automation_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
