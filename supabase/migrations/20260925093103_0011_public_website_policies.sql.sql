/*
# Public Website — RLS Policies + Contact Submissions Table

## Purpose
Enable the public-facing church website to:
1. Allow anonymous visitors to submit prayer requests (visibility = 'public')
2. Allow anonymous visitors to register for events
3. Store contact form submissions from the public contact page

## Changes

### 1. Prayer Requests — Anon INSERT Policy
- Adds an INSERT policy allowing anon + authenticated to create prayer requests
- Restricted to visibility = 'public' so anonymous users can only submit public prayers

### 2. Event Registrations — Anon INSERT Policy
- Adds an INSERT policy allowing anon + authenticated to register for events
- member_id and visitor_id remain NULL for anonymous registrations

### 3. Contact Submissions Table (new)
- Stores contact form submissions from the public website
- Fields: name, email, phone, subject, message, status
- RLS: anon + authenticated can INSERT; only staff can SELECT/UPDATE

## Security
- Prayer request anon INSERT is limited to public visibility only
- Event registration anon INSERT does not allow setting member_id or visitor_id
- Contact submissions are write-only for the public; only staff can read them
*/

-- ============================================================================
-- 1. Prayer Requests — Anon INSERT Policy
-- ============================================================================

DROP POLICY IF EXISTS "pr_insert_public" ON prayer_requests;
CREATE POLICY "pr_insert_public"
ON prayer_requests FOR INSERT
TO anon, authenticated
WITH CHECK (visibility = 'public');

-- ============================================================================
-- 2. Event Registrations — Anon INSERT Policy
-- ============================================================================

DROP POLICY IF EXISTS "er_insert_public" ON event_registrations;
CREATE POLICY "er_insert_public"
ON event_registrations FOR INSERT
TO anon, authenticated
WITH CHECK (member_id IS NULL AND visitor_id IS NULL);

-- ============================================================================
-- 3. Contact Submissions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'responded', 'archived')),
  ip_address inet,
  user_agent text,
  responded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions(created_at) WHERE deleted_at IS NULL;

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_insert_public" ON contact_submissions;
CREATE POLICY "contact_insert_public"
ON contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "contact_select_staff" ON contact_submissions;
CREATE POLICY "contact_select_staff"
ON contact_submissions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'pastor') OR
  has_role(auth.uid(), 'follow_up_manager')
);

DROP POLICY IF EXISTS "contact_update_staff" ON contact_submissions;
CREATE POLICY "contact_update_staff"
ON contact_submissions FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'pastor') OR
  has_role(auth.uid(), 'follow_up_manager')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'pastor') OR
  has_role(auth.uid(), 'follow_up_manager')
);

DROP POLICY IF EXISTS "contact_delete_admin" ON contact_submissions;
CREATE POLICY "contact_delete_admin"
ON contact_submissions FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin')
);

DROP TRIGGER IF EXISTS trigger_contact_submissions_updated_at ON contact_submissions;
CREATE TRIGGER trigger_contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
