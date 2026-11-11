/*
# Security Hardening: Fix function search_path and add RLS WITH CHECK constraints

## Purpose
1. Set search_path = public on SECURITY DEFINER functions missing it
2. Tighten RLS INSERT policies on public forms to enforce server-side field constraints

## Security Changes
- Drop and recreate functions with SET search_path = public
- Prayer requests: anon inserts must have visibility='public' AND status='open'
- Event registrations: anon inserts must have status='registered' AND num_guests BETWEEN 1 AND 10
*/

-- ============================================================================
-- Fix function search_path by dropping and recreating
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_contact_timeline(uuid, integer, integer) CASCADE;
CREATE FUNCTION public.get_contact_timeline(p_contact_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'activity_id', fa.id,
    'activity_type', fa.activity_type,
    'description', fa.description,
    'performed_by', fa.performed_by,
    'performed_at', fa.created_at
  )) INTO result
  FROM public.follow_up_activities fa
  WHERE fa.contact_id = p_contact_id
  ORDER BY fa.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer, integer) FROM anon;

-- ============================================================================
-- resolve_communication_audience
-- ============================================================================

DROP FUNCTION IF EXISTS public.resolve_communication_audience(jsonb) CASCADE;
CREATE FUNCTION public.resolve_communication_audience(p_criteria jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'recipients', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'member_id', m.id,
        'first_name', m.first_name,
        'last_name', m.last_name,
        'email', m.email,
        'phone', m.phone
      ))
      FROM public.members m
      WHERE m.deleted_at IS NULL
        AND m.is_active = true
        AND (
          p_criteria->>'status_key' IS NULL
          OR m.status_key = p_criteria->>'status_key'
        )
    ), '[]'::jsonb),
    'total_count', COALESCE((
      SELECT count(*)::int
      FROM public.members m
      WHERE m.deleted_at IS NULL
        AND m.is_active = true
        AND (
          p_criteria->>'status_key' IS NULL
          OR m.status_key = p_criteria->>'status_key'
        )
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) FROM anon;

-- ============================================================================
-- increment_prayer_count
-- ============================================================================

DROP FUNCTION IF EXISTS public.increment_prayer_count(uuid) CASCADE;
CREATE FUNCTION public.increment_prayer_count(p_prayer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prayer_requests
  SET prayer_count = COALESCE(prayer_count, 0) + 1
  WHERE id = p_prayer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_prayer_count(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_prayer_count(uuid) FROM anon;

-- ============================================================================
-- generate_transaction_reference
-- ============================================================================

DROP FUNCTION IF EXISTS public.generate_transaction_reference() CASCADE;
CREATE FUNCTION public.generate_transaction_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref text;
BEGIN
  ref := 'TXN-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6);
  RETURN ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_transaction_reference() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_transaction_reference() FROM anon;

-- ============================================================================
-- Tighten prayer request public INSERT policy
-- ============================================================================

DROP POLICY IF EXISTS "pr_insert_public" ON public.prayer_requests;
CREATE POLICY "pr_insert_public"
ON public.prayer_requests FOR INSERT
TO anon, authenticated
WITH CHECK (visibility = 'public' AND status = 'open');

-- ============================================================================
-- Tighten event registration public INSERT policy
-- ============================================================================

DROP POLICY IF EXISTS "er_insert_public" ON public.event_registrations;
CREATE POLICY "er_insert_public"
ON public.event_registrations FOR INSERT
TO anon, authenticated
WITH CHECK (
  member_id IS NULL
  AND visitor_id IS NULL
  AND status = 'registered'
  AND num_guests >= 1
  AND num_guests <= 10
);
