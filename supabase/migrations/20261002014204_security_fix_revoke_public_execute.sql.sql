/*
# Security Hardening: Properly revoke anon EXECUTE on SECURITY DEFINER functions

## Root Cause
PostgreSQL grants EXECUTE to PUBLIC by default when functions are created.
REVOKE FROM anon only removes the direct grant to anon, but anon still
has EXECUTE through PUBLIC membership. The correct approach is:
1. REVOKE EXECUTE FROM PUBLIC (removes from everyone)
2. GRANT EXECUTE TO authenticated (re-grants to authenticated only)

This is especially important because:
- advance_visitor_stage, convert_visitor_to_member allow visitor lifecycle changes
- count_followups_by_type, count_members_by_status expose aggregate member data
- generate_transaction_reference generates financial references
- get_contact_timeline exposes contact activity history
- increment_prayer_count can manipulate prayer counters
- register_visitor creates visitor records
- resolve_communication_audience exposes member PII (emails, phones)
- verify_giving_transaction, refund_giving_transaction are financial operations
*/

REVOKE EXECUTE ON FUNCTION public.advance_visitor_stage(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_visitor_stage(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.convert_visitor_to_member(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_visitor_to_member(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.count_followups_by_type() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_followups_by_type() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.count_members_by_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_members_by_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_transaction_reference() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_transaction_reference() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_prayer_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_prayer_count(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.register_visitor(text, text, text, text, text, uuid, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_visitor(text, text, text, text, text, uuid, text, text, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_giving_transaction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_giving_transaction(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.refund_giving_transaction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_giving_transaction(uuid) TO authenticated;

-- has_role is used internally by RLS policies; keep it authenticated-only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text, text, uuid) TO authenticated;
