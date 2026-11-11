/*
# Security Hardening: Add RLS INSERT policy for contact_submissions

## Purpose
The public contact form inserts into contact_submissions, but there was no
anon INSERT policy allowing unauthenticated users to submit. This adds a
policy that only allows inserts with status='new'.

## Security Changes
- Add contact_submissions INSERT policy for anon+authenticated with WITH CHECK (status = 'new')
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contact_submissions' AND policyname = 'cs_insert_public'
  ) THEN
    CREATE POLICY "cs_insert_public"
    ON public.contact_submissions FOR INSERT
    TO anon, authenticated
    WITH CHECK (status = 'new');
  END IF;
END $$;
