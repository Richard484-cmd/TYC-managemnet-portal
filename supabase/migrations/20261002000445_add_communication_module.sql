/*
# Communication Module — Templates, Jobs, Logs, Provider Configs, Audience Resolution

## Purpose
Creates the database infrastructure for a complete communication module supporting Email, SMS, WhatsApp, and In-App notifications through a provider abstraction architecture. Extends the existing `messages` and `message_recipients` tables rather than duplicating them.

## New Tables

1. **communication_templates** — Reusable message templates with channel-specific variants. Each template has an identifier (slug), name, description, channel, subject (for email), body, and active/inactive status.

2. **communication_jobs** — Represents a bulk or single communication campaign. Links to an audience definition (JSONB), channel, template, and created_by user. Tracks overall status and recipient counts.

3. **communication_logs** — Per-recipient delivery log for every communication attempt. Links to job, contact, template, channel, status, provider name, provider reference, failure reason, and timestamps.

4. **communication_provider_configs** — Stores which provider is configured for each channel. Only stores provider name and status — credentials are stored as Supabase edge function secrets, never in the database.

## Modified Tables

1. **messages** — Added `template_id`, `job_id`, `audience_criteria` columns.
2. **message_recipients** — Added `contact_id`, `log_id`, `failure_reason` columns.

## New RPC Functions

1. **resolve_communication_audience(p_criteria jsonb)** — SECURITY DEFINER function that resolves audience criteria into actual recipient contact records. Supports: all_members, all_visitors, by_tag, by_department, by_group, by_pipeline_stage, by_membership_status, by_contact_ids, all_contacts. Deduplicates by contact_id.

2. **get_contact_timeline** — Updated to also UNION communication_logs for the contact.

## Security
- **communication_templates**: Staff can SELECT. Admin/pastor/follow_up_manager can INSERT/UPDATE.
- **communication_jobs**: Staff can SELECT. Admin/pastor/follow_up_manager can INSERT/UPDATE.
- **communication_logs**: Staff can SELECT. Admin/pastor/follow_up_manager can INSERT/UPDATE.
- **communication_provider_configs**: super_admin only.
- **resolve_communication_audience**: SECURITY DEFINER, executable by authenticated.

## Important Notes
1. Provider credentials are NEVER stored in the database — they live as Supabase edge function secrets.
2. Communication logs allow UPDATE for status changes (pending -> sent -> delivered -> failed).
3. The audience resolution RPC deduplicates recipients by contact_id.
4. The timeline RPC now includes communication events.
5. Default templates are seeded with placeholder content clearly marked as editable.
*/

-- ============================================================================
-- 1. COMMUNICATION TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.communication_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   text NOT NULL,
  name         text NOT NULL,
  description  text,
  channel      text NOT NULL DEFAULT 'email',
  subject      text,
  body         text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  is_system    boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ct_identifier ON public.communication_templates (identifier);
CREATE INDEX IF NOT EXISTS idx_ct_channel ON public.communication_templates (channel);
CREATE INDEX IF NOT EXISTS idx_ct_active ON public.communication_templates (is_active);

DROP POLICY IF EXISTS "ct_select_staff" ON public.communication_templates;
CREATE POLICY "ct_select_staff"
  ON public.communication_templates FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager') OR
    public.has_role(auth.uid(), 'department_leader') OR
    public.has_role(auth.uid(), 'group_leader')
  );

DROP POLICY IF EXISTS "ct_insert_staff" ON public.communication_templates;
CREATE POLICY "ct_insert_staff"
  ON public.communication_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "ct_update_staff" ON public.communication_templates;
CREATE POLICY "ct_update_staff"
  ON public.communication_templates FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

-- ============================================================================
-- 2. COMMUNICATION JOBS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.communication_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         text NOT NULL,
  template_id     uuid REFERENCES public.communication_templates(id) ON DELETE SET NULL,
  subject         text,
  body            text,
  audience_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'draft',
  recipient_count int NOT NULL DEFAULT 0,
  eligible_count  int NOT NULL DEFAULT 0,
  excluded_count  int NOT NULL DEFAULT 0,
  sent_count      int NOT NULL DEFAULT 0,
  failed_count    int NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cj_status ON public.communication_jobs (status);
CREATE INDEX IF NOT EXISTS idx_cj_channel ON public.communication_jobs (channel);
CREATE INDEX IF NOT EXISTS idx_cj_created_at ON public.communication_jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_cj_created_by ON public.communication_jobs (created_by);

DROP POLICY IF EXISTS "cj_select_staff" ON public.communication_jobs;
CREATE POLICY "cj_select_staff"
  ON public.communication_jobs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager') OR
    public.has_role(auth.uid(), 'department_leader') OR
    public.has_role(auth.uid(), 'group_leader')
  );

DROP POLICY IF EXISTS "cj_insert_staff" ON public.communication_jobs;
CREATE POLICY "cj_insert_staff"
  ON public.communication_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "cj_update_staff" ON public.communication_jobs;
CREATE POLICY "cj_update_staff"
  ON public.communication_jobs FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

-- ============================================================================
-- 3. COMMUNICATION LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid REFERENCES public.communication_jobs(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  template_id     uuid REFERENCES public.communication_templates(id) ON DELETE SET NULL,
  channel         text NOT NULL,
  message_type    text NOT NULL DEFAULT 'bulk',
  recipient_name  text,
  recipient_email text,
  recipient_phone text,
  subject         text,
  status          text NOT NULL DEFAULT 'pending',
  provider_name   text,
  provider_ref    text,
  failure_reason  text,
  sent_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cl_contact ON public.communication_logs (contact_id);
CREATE INDEX IF NOT EXISTS idx_cl_channel ON public.communication_logs (channel);
CREATE INDEX IF NOT EXISTS idx_cl_status ON public.communication_logs (status);
CREATE INDEX IF NOT EXISTS idx_cl_template ON public.communication_logs (template_id);
CREATE INDEX IF NOT EXISTS idx_cl_job ON public.communication_logs (job_id);
CREATE INDEX IF NOT EXISTS idx_cl_created_at ON public.communication_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_cl_provider_ref ON public.communication_logs (provider_ref);

DROP POLICY IF EXISTS "cl_select_staff" ON public.communication_logs;
CREATE POLICY "cl_select_staff"
  ON public.communication_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager') OR
    public.has_role(auth.uid(), 'department_leader') OR
    public.has_role(auth.uid(), 'group_leader')
  );

DROP POLICY IF EXISTS "cl_insert_staff" ON public.communication_logs;
CREATE POLICY "cl_insert_staff"
  ON public.communication_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "cl_update_staff" ON public.communication_logs;
CREATE POLICY "cl_update_staff"
  ON public.communication_logs FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'pastor') OR
    public.has_role(auth.uid(), 'follow_up_manager')
  );

-- ============================================================================
-- 4. COMMUNICATION PROVIDER CONFIGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.communication_provider_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel       text NOT NULL UNIQUE,
  provider_name text NOT NULL,
  is_active     boolean NOT NULL DEFAULT false,
  configured_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpc_select_admin" ON public.communication_provider_configs;
CREATE POLICY "cpc_select_admin"
  ON public.communication_provider_configs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "cpc_insert_admin" ON public.communication_provider_configs;
CREATE POLICY "cpc_insert_admin"
  ON public.communication_provider_configs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "cpc_update_admin" ON public.communication_provider_configs;
CREATE POLICY "cpc_update_admin"
  ON public.communication_provider_configs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- 5. ADD COLUMNS TO EXISTING messages TABLE
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.messages ADD COLUMN template_id uuid REFERENCES public.communication_templates(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.messages ADD COLUMN job_id uuid REFERENCES public.communication_jobs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.messages ADD COLUMN audience_criteria jsonb;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================================
-- 6. ADD COLUMNS TO message_recipients
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.message_recipients ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.message_recipients ADD COLUMN log_id uuid REFERENCES public.communication_logs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.message_recipients ADD COLUMN failure_reason text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================================
-- 7. AUDIT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_communication_templates_updated_at ON public.communication_templates;
CREATE TRIGGER trigger_communication_templates_updated_at
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_communication_jobs_updated_at ON public.communication_jobs;
CREATE TRIGGER trigger_communication_jobs_updated_at
  BEFORE UPDATE ON public.communication_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_communication_logs_updated_at ON public.communication_logs;
CREATE TRIGGER trigger_communication_logs_updated_at
  BEFORE UPDATE ON public.communication_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_communication_provider_configs_updated_at ON public.communication_provider_configs;
CREATE TRIGGER trigger_communication_provider_configs_updated_at
  BEFORE UPDATE ON public.communication_provider_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 8. AUDIENCE RESOLUTION RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_communication_audience(
  p_criteria jsonb
)
RETURNS TABLE (
  contact_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  member_id uuid,
  visitor_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audience_type text;
  v_tag_ids text[];
  v_department_ids text[];
  v_group_ids text[];
  v_stage_ids text[];
  v_status_keys text[];
  v_contact_ids text[];
BEGIN
  v_audience_type := COALESCE(p_criteria->>'audience_type', 'all_members');

  IF v_audience_type = 'all_members' THEN
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    JOIN public.members m ON m.id = c.member_id
    WHERE c.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND m.is_active = true;

  ELSIF v_audience_type = 'all_visitors' THEN
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    JOIN public.visitors v ON v.id = c.visitor_id
    WHERE c.deleted_at IS NULL
      AND v.deleted_at IS NULL;

  ELSIF v_audience_type = 'by_tag' THEN
    v_tag_ids := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'tag_ids'));
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    JOIN public.tag_assignments ta ON ta.entity_id = c.id::text
    WHERE c.deleted_at IS NULL
      AND ta.tag_id::text = ANY(v_tag_ids)
      AND ta.entity_type = 'contact';

  ELSIF v_audience_type = 'by_department' THEN
    v_department_ids := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'department_ids'));
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    JOIN public.department_members dm ON dm.member_id = c.member_id
    WHERE c.deleted_at IS NULL
      AND dm.department_id::text = ANY(v_department_ids);

  ELSIF v_audience_type = 'by_group' THEN
    v_group_ids := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'group_ids'));
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    JOIN public.group_members gm ON gm.member_id = c.member_id
    WHERE c.deleted_at IS NULL
      AND gm.group_id::text = ANY(v_group_ids);

  ELSIF v_audience_type = 'by_pipeline_stage' THEN
    v_stage_ids := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'stage_ids'));
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    WHERE c.deleted_at IS NULL
      AND c.crm_stage_id::text = ANY(v_stage_ids);

  ELSIF v_audience_type = 'by_membership_status' THEN
    v_status_keys := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'status_keys'));
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    JOIN public.members m ON m.id = c.member_id
    WHERE c.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND m.status_key = ANY(v_status_keys);

  ELSIF v_audience_type = 'by_contact_ids' THEN
    v_contact_ids := ARRAY(SELECT jsonb_array_elements_text(p_criteria->'contact_ids'));
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    WHERE c.deleted_at IS NULL
      AND c.id::text = ANY(v_contact_ids);

  ELSIF v_audience_type = 'all_contacts' THEN
    RETURN QUERY
    SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.member_id, c.visitor_id
    FROM public.contacts c
    WHERE c.deleted_at IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) TO authenticated;

-- ============================================================================
-- 9. UPDATE get_contact_timeline TO INCLUDE COMMUNICATION LOGS
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
  SELECT member_id, visitor_id INTO v_contact_member_id, v_contact_visitor_id
  FROM public.contacts
  WHERE id = p_contact_id AND deleted_at IS NULL;

  SELECT public.has_role(v_caller, 'finance_officer') OR public.has_role(v_caller, 'super_admin')
  INTO v_has_finance;

  RETURN QUERY
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

  UNION ALL

  SELECT
    CASE WHEN cl.channel = 'email' THEN 'email_sent'
         WHEN cl.channel = 'sms' THEN 'sms_sent'
         WHEN cl.channel = 'whatsapp' THEN 'whatsapp_sent'
         WHEN cl.channel = 'in_app' THEN 'in_app_notification'
         ELSE 'communication' END::text,
    CASE
      WHEN cl.status = 'failed' THEN
        COALESCE(cl.channel || ' send failed' || CASE WHEN cl.failure_reason IS NOT NULL THEN ': ' || cl.failure_reason ELSE '' END, 'Communication failed')
      ELSE
        COALESCE(cl.channel || ' sent' || CASE WHEN cl.subject IS NOT NULL THEN ': ' || cl.subject ELSE '' END, 'Communication sent')
    END,
    cl.sent_by,
    u.display_name,
    COALESCE(cl.sent_at, cl.created_at),
    'communication_logs'::text,
    cl.id
  FROM public.communication_logs cl
  LEFT JOIN public.users u ON u.id = cl.sent_by
  WHERE cl.contact_id = p_contact_id

  ORDER BY occurred_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 10. SEED DEFAULT TEMPLATES
-- ============================================================================

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('welcome_new_member_email', 'Welcome New Member (Email)', 'Welcome email for new members', 'email',
   'Welcome to {{church_name}}, {{first_name}}!',
   'Dear {{first_name}}, welcome to {{church_name}}! We are so glad you have joined our church family. This is a sample template — please edit this message to suit your church''s voice. Blessings, {{church_name}}',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('welcome_new_member_sms', 'Welcome New Member (SMS)', 'Welcome SMS for new members', 'sms',
   NULL,
   'Hi {{first_name}}, welcome to {{church_name}}! We''re glad to have you. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('first_time_visitor_email', 'First-Time Visitor Follow-Up (Email)', 'Follow-up email for first-time visitors', 'email',
   'Thank you for visiting {{church_name}}',
   'Dear {{first_name}}, thank you for visiting {{church_name}}! We''d love to get to know you better. This is a sample template — please edit this message. Blessings, {{church_name}}',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('first_time_visitor_sms', 'First-Time Visitor Follow-Up (SMS)', 'Follow-up SMS for first-time visitors', 'sms',
   NULL,
   'Hi {{first_name}}, thanks for visiting {{church_name}}! We''d love to connect. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('event_reminder_email', 'Event Reminder (Email)', 'Reminder email for upcoming events', 'email',
   'Reminder: {{event_name}} on {{event_date}}',
   'Dear {{first_name}}, this is a reminder for {{event_name}} happening on {{event_date}} at {{event_location}}. This is a sample template — please edit. {{church_name}}',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('event_reminder_sms', 'Event Reminder (SMS)', 'Reminder SMS for upcoming events', 'sms',
   NULL,
   'Reminder: {{event_name}} on {{event_date}} at {{event_location}}. See you there! [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('birthday_email', 'Birthday Greeting (Email)', 'Birthday greeting email', 'email',
   'Happy Birthday from {{church_name}}!',
   'Dear {{first_name}}, wishing you a blessed and joyful birthday from all of us at {{church_name}}! [Edit this template] {{church_name}}',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('follow_up_email', 'Follow-Up (Email)', 'General follow-up email', 'email',
   'Following up from {{church_name}}',
   'Dear {{first_name}}, we wanted to follow up with you. [Edit this template] {{church_name}}',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('follow_up_sms', 'Follow-Up (SMS)', 'General follow-up SMS', 'sms',
   NULL,
   'Hi {{first_name}}, this is {{church_name}} following up. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('follow_up_reminder_sms', 'Follow-Up Reminder (SMS)', 'Reminder for follow-up officers', 'sms',
   NULL,
   'Hi {{first_name}}, reminder: follow-up due on {{follow_up_date}}. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('absence_reminder_email', 'Absence Reminder (Email)', 'Reminder for absent members', 'email',
   'We miss you at {{church_name}}',
   'Dear {{first_name}}, we noticed we haven''t seen you at {{church_name}} recently and wanted to check in. [Edit this template] {{church_name}}',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('absence_reminder_sms', 'Absence Reminder (SMS)', 'Reminder SMS for absent members', 'sms',
   NULL,
   'Hi {{first_name}}, we miss you at {{church_name}}! Hope to see you soon. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('welcome_new_member_whatsapp', 'Welcome New Member (WhatsApp)', 'Welcome WhatsApp message for new members', 'whatsapp',
   NULL,
   'Hi {{first_name}}! Welcome to {{church_name}}. We''re so glad you''re here. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('first_time_visitor_whatsapp', 'First-Time Visitor (WhatsApp)', 'WhatsApp follow-up for first-time visitors', 'whatsapp',
   NULL,
   'Hi {{first_name}}, thanks for visiting {{church_name}}! We''d love to connect. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('follow_up_whatsapp', 'Follow-Up (WhatsApp)', 'General follow-up WhatsApp message', 'whatsapp',
   NULL,
   'Hi {{first_name}}, this is {{church_name}} following up with you. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.communication_templates (identifier, name, description, channel, subject, body, is_active, is_system)
VALUES
  ('follow_up_reminder_in_app', 'Follow-Up Reminder (In-App)', 'In-app notification for follow-up reminders', 'in_app',
   NULL,
   'Follow-up reminder: {{first_name}} — follow-up due on {{follow_up_date}}. [Edit this template]',
   true, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. SEED DEFAULT PROVIDER CONFIGS
-- ============================================================================

INSERT INTO public.communication_provider_configs (channel, provider_name, is_active)
VALUES
  ('email', 'console', false),
  ('sms', 'console', false),
  ('whatsapp', 'console', false),
  ('in_app', 'builtin', true)
ON CONFLICT (channel) DO NOTHING;
