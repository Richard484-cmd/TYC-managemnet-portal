/*
# Reporting RPC Helper Functions

## Purpose
Creates two SECURITY DEFINER helper functions used by the reporting service layer:
1. `count_members_by_status` — returns member counts grouped by status_key
2. `count_followups_by_type` — returns follow-up counts grouped by type

## Security
- Both functions are SECURITY DEFINER so they can aggregate data across all rows regardless of RLS, but they only return aggregated counts (no individual row data).
- EXECUTE is granted to `authenticated` only — only logged-in staff can call them.
- The functions are read-only (SELECT-only, no mutations).

## Important Notes
1. These functions return aggregate counts only — no personal or sensitive data is exposed.
2. Both functions filter out soft-deleted records.
3. `count_members_by_status` excludes records with `deleted_at IS NOT NULL`.
4. `count_followups_by_type` excludes records with `deleted_at IS NOT NULL`.
*/

-- ============================================================================
-- count_members_by_status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_members_by_status()
RETURNS TABLE (status_key text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status_key, count(*) as count
  FROM public.members
  WHERE deleted_at IS NULL
  GROUP BY status_key
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.count_members_by_status() TO authenticated;

-- ============================================================================
-- count_followups_by_type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_followups_by_type()
RETURNS TABLE (type text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT type, count(*) as count
  FROM public.follow_ups
  WHERE deleted_at IS NULL
  GROUP BY type
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.count_followups_by_type() TO authenticated;
