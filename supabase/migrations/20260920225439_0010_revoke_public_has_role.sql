/*
# Revoke anon execute on has_role

## Purpose
The previous migration revoked EXECUTE from `anon` but the `PUBLIC` role still has the grant.
Since `anon` inherits from `PUBLIC`, it still has execute permission. This migration
revokes EXECUTE from `PUBLIC` and re-grants it only to `authenticated`.

## Security Changes
- REVOKE EXECUTE ON has_role FROM PUBLIC
- GRANT EXECUTE ON has_role TO authenticated only
*/

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text, text, uuid) TO authenticated;
