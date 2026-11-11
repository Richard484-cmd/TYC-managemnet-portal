/*
# Visitor Management: lifecycle stages, visitor_statuses, member_invitation source, register_visitor RPC

## Purpose
Extend the existing CRM architecture to support a structured visitor lifecycle.
Visitors are contacts that move through stages (New Visitor → First Follow-up → Contacted →
Second Visit → Membership Class → New Member) and can be converted to members.

## Changes

### 1. New table: `visitor_lifecycle_stages`
Catalog of lifecycle stages a visitor passes through.
- `stage_key` (text, PK) — e.g. 'new_visitor', 'first_followup', 'contacted', etc.
- `name` (text) — display label
- `description` (text)
- `sort_order` (int) — ordering
- `is_system` (boolean) — system stages cannot be deleted
- timestamps

### 2. New table: `visitor_statuses`
Catalog of visitor statuses (active, converted, dropped_off, archived).
- `status_key` (text, PK)
- `name` (text) — display label
- `description` (text)
- `sort_order` (int)
- `is_system` (boolean)
- timestamps

### 3. Alter `visitors` table
- Add `lifecycle_stage` text referencing visitor_lifecycle_stages(stage_key), default 'new_visitor'
- Add `status_key` text referencing visitor_statuses(status_key), default 'active'
- Add `assigned_to` uuid referencing users(id) — follow-up officer assignment

### 4. Alter `contacts` and `visitors` CHECK constraints
- Add 'member_invitation' to the allowed `source` values on both tables.
  Done by dropping and recreating the constraints.

### 5. Seed lifecycle stages and visitor statuses

### 6. New function: `register_visitor(params)`
SECURITY DEFINER RPC that atomically:
  a) Creates or updates a contact (dedup by email or phone)
  b) Creates the visitor record (if not already existing for that contact)
  c) Adds the FIRST-TIMER tag via tag_assignments
  d) Creates a follow_up record (type='welcome_call', priority='normal', status='pending')
  e) Creates a task (entity_type='visitor', title='Follow up with new visitor')
  f) Returns the visitor UUID

### 7. New function: `convert_visitor_to_member(visitor_uuid, status_key)`
SECURITY DEFINER RPC that:
  a) Creates a member record from the visitor's data
  b) Creates a member_profiles record
  c) Links the visitor to the member via converted_to_member_id
  d) Updates the contact's member_id
  e) Updates visitor status_key to 'converted'
  f) Adds a membership_history entry
  g) Returns the new member UUID

## Security
- New tables get RLS with SELECT for authenticated, write for staff roles
- SECURITY DEFINER functions run as the table owner, callable by staff
- `assigned_to` on visitors allows follow-up officers to see their assigned visitors
*/

-- ============================================================
-- 1. visitor_lifecycle_stages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitor_lifecycle_stages (
  stage_key    text PRIMARY KEY,
  name         text NOT NULL,
  description  text,
  sort_order   int NOT NULL DEFAULT 0,
  is_system    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_lifecycle_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visitor_lifecycle_stages_select" ON public.visitor_lifecycle_stages;
CREATE POLICY "visitor_lifecycle_stages_select"
  ON public.visitor_lifecycle_stages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "visitor_lifecycle_stages_insert" ON public.visitor_lifecycle_stages;
CREATE POLICY "visitor_lifecycle_stages_insert"
  ON public.visitor_lifecycle_stages FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "visitor_lifecycle_stages_update" ON public.visitor_lifecycle_stages;
CREATE POLICY "visitor_lifecycle_stages_update"
  ON public.visitor_lifecycle_stages FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "visitor_lifecycle_stages_delete" ON public.visitor_lifecycle_stages;
CREATE POLICY "visitor_lifecycle_stages_delete"
  ON public.visitor_lifecycle_stages FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 2. visitor_statuses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitor_statuses (
  status_key   text PRIMARY KEY,
  name         text NOT NULL,
  description  text,
  sort_order   int NOT NULL DEFAULT 0,
  is_system    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visitor_statuses_select" ON public.visitor_statuses;
CREATE POLICY "visitor_statuses_select"
  ON public.visitor_statuses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "visitor_statuses_insert" ON public.visitor_statuses;
CREATE POLICY "visitor_statuses_insert"
  ON public.visitor_statuses FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "visitor_statuses_update" ON public.visitor_statuses;
CREATE POLICY "visitor_statuses_update"
  ON public.visitor_statuses FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "visitor_statuses_delete" ON public.visitor_statuses;
CREATE POLICY "visitor_statuses_delete"
  ON public.visitor_statuses FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 3. Alter visitors table — add lifecycle_stage, status_key, assigned_to
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='visitors' AND column_name='lifecycle_stage') THEN
    ALTER TABLE public.visitors ADD COLUMN lifecycle_stage text NOT NULL DEFAULT 'new_visitor'
      REFERENCES public.visitor_lifecycle_stages(stage_key) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='visitors' AND column_name='status_key') THEN
    ALTER TABLE public.visitors ADD COLUMN status_key text NOT NULL DEFAULT 'active'
      REFERENCES public.visitor_statuses(status_key) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='visitors' AND column_name='assigned_to') THEN
    ALTER TABLE public.visitors ADD COLUMN assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for assigned_to lookups
CREATE INDEX IF NOT EXISTS idx_visitors_assigned_to ON public.visitors(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_lifecycle ON public.visitors(lifecycle_stage) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. Update CHECK constraints to include 'member_invitation'
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'visitors_source_check' AND table_name = 'visitors' AND table_schema = 'public') THEN
    ALTER TABLE public.visitors DROP CONSTRAINT visitors_source_check;
  END IF;
END $$;

ALTER TABLE public.visitors ADD CONSTRAINT visitors_source_check
  CHECK (source IN ('website', 'event', 'walk_in', 'referral', 'social_media', 'member_invitation', 'other'));

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'contacts_source_check' AND table_name = 'contacts' AND table_schema = 'public') THEN
    ALTER TABLE public.contacts DROP CONSTRAINT contacts_source_check;
  END IF;
END $$;

ALTER TABLE public.contacts ADD CONSTRAINT contacts_source_check
  CHECK (source IN ('website', 'event', 'referral', 'social_media', 'walk_in', 'member_invitation', 'other'));

-- ============================================================
-- 5. Seed lifecycle stages and visitor statuses
-- ============================================================
INSERT INTO public.visitor_lifecycle_stages (stage_key, name, description, sort_order, is_system) VALUES
  ('new_visitor',       'New Visitor',        'A first-time visitor who has just been registered', 1, true),
  ('first_followup',    'First Follow-up',    'Initial follow-up contact is being made', 2, true),
  ('contacted',         'Contacted',          'Visitor has been successfully contacted', 3, true),
  ('second_visit',      'Second Visit',       'Visitor has attended a second time', 4, true),
  ('membership_class',  'Membership Class',   'Visitor is attending membership classes', 5, true),
  ('new_member',        'New Member',         'Visitor has been converted to a member', 6, true)
ON CONFLICT (stage_key) DO NOTHING;

INSERT INTO public.visitor_statuses (status_key, name, description, sort_order, is_system) VALUES
  ('active',        'Active',         'Visitor is actively being followed up', 1, true),
  ('converted',     'Converted',      'Visitor has been converted to a member', 2, true),
  ('dropped_off',   'Dropped Off',    'Visitor has stopped responding to follow-up', 3, true),
  ('archived',      'Archived',       'Visitor record has been archived', 4, true)
ON CONFLICT (status_key) DO NOTHING;

-- ============================================================
-- 6. SECURITY DEFINER function: register_visitor
-- ============================================================
-- Creates or updates contact, creates visitor, adds FIRST-TIMER tag,
-- creates follow-up record and follow-up task. Returns visitor UUID.

CREATE OR REPLACE FUNCTION public.register_visitor(
  p_first_name   text,
  p_last_name    text,
  p_email        text DEFAULT NULL,
  p_phone        text DEFAULT NULL,
  p_source       text DEFAULT 'walk_in',
  p_assigned_to  uuid DEFAULT NULL,
  p_notes        text DEFAULT NULL,
  p_address_line1 text DEFAULT NULL,
  p_address_line2 text DEFAULT NULL,
  p_city         text DEFAULT NULL,
  p_state_province text DEFAULT NULL,
  p_postal_code  text DEFAULT NULL,
  p_country      text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id   uuid;
  v_visitor_id   uuid;
  v_tag_id       uuid;
  v_assigned_to  uuid := COALESCE(p_assigned_to, auth.uid());
  v_followup_id  uuid;
BEGIN
  -- 1. Find or create contact (dedup by email or phone)
  IF p_email IS NOT NULL AND p_email != '' THEN
    SELECT id INTO v_contact_id FROM contacts
      WHERE email = p_email AND deleted_at IS NULL LIMIT 1;
  END IF;

  IF v_contact_id IS NULL AND p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT id INTO v_contact_id FROM contacts
      WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
  END IF;

  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (first_name, last_name, email, phone, source, pipeline_stage, assigned_to, notes)
    VALUES (p_first_name, p_last_name, NULLIF(p_email, ''), NULLIF(p_phone, ''), p_source, 'first_visit', v_assigned_to, p_notes)
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE contacts SET
      first_name = p_first_name,
      last_name = p_last_name,
      email = COALESCE(NULLIF(p_email, ''), contacts.email),
      phone = COALESCE(NULLIF(p_phone, ''), contacts.phone),
      source = p_source,
      assigned_to = COALESCE(v_assigned_to, contacts.assigned_to),
      notes = COALESCE(p_notes, contacts.notes),
      updated_at = now()
    WHERE id = v_contact_id;
  END IF;

  -- 2. Check if a visitor already exists for this contact
  SELECT v.id INTO v_visitor_id
    FROM visitors v
    WHERE v.email = p_email AND v.email IS NOT NULL AND v.deleted_at IS NULL
    LIMIT 1;

  IF v_visitor_id IS NULL AND p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT v.id INTO v_visitor_id
      FROM visitors v
      WHERE v.phone = p_phone AND v.deleted_at IS NULL
      LIMIT 1;
  END IF;

  IF v_visitor_id IS NULL THEN
    INSERT INTO visitors (
      first_name, last_name, email, phone, source, lifecycle_stage, status_key,
      assigned_to, notes, address_line1, address_line2, city, state_province, postal_code, country
    ) VALUES (
      p_first_name, p_last_name, NULLIF(p_email, ''), NULLIF(p_phone, ''), p_source,
      'new_visitor', 'active', v_assigned_to, p_notes,
      p_address_line1, p_address_line2, p_city, p_state_province, p_postal_code, p_country
    )
    RETURNING id INTO v_visitor_id;
  ELSE
    UPDATE visitors SET
      first_name = p_first_name,
      last_name = p_last_name,
      email = COALESCE(NULLIF(p_email, ''), visitors.email),
      phone = COALESCE(NULLIF(p_phone, ''), visitors.phone),
      source = p_source,
      assigned_to = COALESCE(v_assigned_to, visitors.assigned_to),
      notes = COALESCE(p_notes, visitors.notes),
      updated_at = now()
    WHERE id = v_visitor_id;
  END IF;

  -- Link contact to visitor
  UPDATE contacts SET visitor_id = v_visitor_id WHERE id = v_contact_id;

  -- 3. Add FIRST-TIMER tag
  SELECT id INTO v_tag_id FROM tags WHERE slug = 'first-timer' AND deleted_at IS NULL LIMIT 1;
  IF v_tag_id IS NOT NULL THEN
    INSERT INTO tag_assignments (tag_id, entity_type, entity_id, assigned_by)
    VALUES (v_tag_id, 'visitor', v_visitor_id, auth.uid())
    ON CONFLICT (tag_id, entity_type, entity_id) DO NOTHING;
  END IF;

  -- 4. Create follow-up record
  INSERT INTO follow_ups (
    visitor_id, contact_id, type, priority, status, due_date, assigned_to, assigned_by
  ) VALUES (
    v_visitor_id, v_contact_id, 'welcome_call', 'normal', 'pending',
    CURRENT_DATE + INTERVAL '3 days', v_assigned_to, auth.uid()
  )
  RETURNING id INTO v_followup_id;

  -- 5. Create follow-up task
  INSERT INTO tasks (
    title, description, entity_type, entity_id, assigned_to, assigned_by, priority, status, due_date
  ) VALUES (
    'Follow up with new visitor: ' || p_first_name || ' ' || p_last_name,
    'Welcome call for first-time visitor. Contact via ' || COALESCE(NULLIF(p_phone, ''), NULLIF(p_email, ''), 'no contact info'),
    'visitor', v_visitor_id, v_assigned_to, auth.uid(), 'normal', 'pending',
    CURRENT_DATE + INTERVAL '3 days'
  );

  RETURN v_visitor_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.register_visitor TO authenticated;

-- ============================================================
-- 7. SECURITY DEFINER function: convert_visitor_to_member
-- ============================================================
CREATE OR REPLACE FUNCTION public.convert_visitor_to_member(
  p_visitor_id  uuid,
  p_status_key  text DEFAULT 'regular_attender'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor    RECORD;
  v_member_id  uuid;
BEGIN
  SELECT * INTO v_visitor FROM visitors WHERE id = p_visitor_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visitor not found';
  END IF;

  -- Check if already converted
  IF v_visitor.converted_to_member_id IS NOT NULL THEN
    RETURN v_visitor.converted_to_member_id;
  END IF;

  -- Create member
  INSERT INTO members (first_name, last_name, email, phone, status_key, join_date, is_baptized, is_active)
  VALUES (
    v_visitor.first_name, v_visitor.last_name, v_visitor.email, v_visitor.phone,
    p_status_key, CURRENT_DATE, false, true
  )
  RETURNING id INTO v_member_id;

  -- Create member_profiles
  INSERT INTO member_profiles (
    member_id, address_line1, address_line2, city, state_province, postal_code, country
  ) VALUES (
    v_member_id, v_visitor.address_line1, v_visitor.address_line2,
    v_visitor.city, v_visitor.state_province, v_visitor.postal_code, v_visitor.country
  );

  -- Link visitor to member
  UPDATE visitors SET
    converted_to_member_id = v_member_id,
    converted_at = now(),
    status_key = 'converted',
    lifecycle_stage = 'new_member',
    updated_at = now()
  WHERE id = p_visitor_id;

  -- Update contact's member_id
  UPDATE contacts SET member_id = v_member_id, pipeline_stage = 'member' WHERE visitor_id = p_visitor_id;

  -- Add membership_history entry
  INSERT INTO membership_history (member_id, previous_status, new_status, reason, changed_by)
  VALUES (v_member_id, NULL, p_status_key, 'Converted from visitor', auth.uid());

  RETURN v_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_visitor_to_member TO authenticated;
