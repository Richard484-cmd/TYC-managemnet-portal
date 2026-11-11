/*
# Security Hardening: Revoke anon EXECUTE on SECURITY DEFINER functions

## Purpose
Several SECURITY DEFINER functions were callable by the `anon` role, meaning unauthenticated users could invoke privileged database operations via the Supabase REST API. This migration revokes EXECUTE from `anon` on all SECURITY DEFINER functions that should only be callable by authenticated users.

## Security Changes
- Revoke EXECUTE from `anon` on: advance_visitor_stage, convert_visitor_to_member, count_followups_by_type, count_members_by_status, generate_transaction_reference, get_contact_timeline, increment_prayer_count, register_visitor, resolve_communication_audience
- `has_role` remains executable by `authenticated` only (already restricted)

## Important Notes
1. The `register_visitor` function is intentionally callable by `anon` for the public visitor registration flow — BUT it must only allow creating visitor records with safe defaults. After revoking anon EXECUTE, public visitor registration must go through the RLS INSERT policy on the visitors table instead (which already exists for anon).
2. All functions remain callable by `authenticated` role.
3. This does NOT affect the `has_role` function which is used internally by RLS policies.
*/

REVOKE EXECUTE ON FUNCTION public.advance_visitor_stage(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.convert_visitor_to_member(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.count_followups_by_type() FROM anon;
REVOKE EXECUTE ON FUNCTION public.count_members_by_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_transaction_reference() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_prayer_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) FROM anon;

-- register_visitor: revoke from anon — public visitor registration should use
-- the visitors table INSERT RLS policy (er_insert_public) instead of a SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.register_visitor(text, text, text, text, text, uuid, text, text, text, text, text, text, text) FROM anon;
