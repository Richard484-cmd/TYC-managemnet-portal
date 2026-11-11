/*
# Fix Security Advisor Warnings

## Purpose
Fixes 3 security linter warnings:
1. `update_updated_at()` function has a mutable search_path — use ALTER FUNCTION to set it.
2. `has_role()` function has a mutable search_path — use ALTER FUNCTION to set it.
3. `has_role()` function is callable by `anon` role — revoke EXECUTE from `anon`.

## Security Changes
- Both functions now have `SET search_path = public` to prevent search_path injection.
- `has_role()` EXECUTE privilege revoked from `anon` role. It remains callable by `authenticated` since RLS policies depend on it.

## Important Notes
1. Uses ALTER FUNCTION (not DROP + CREATE) to preserve existing trigger dependencies.
2. `has_role()` MUST remain callable by `authenticated` — all RLS policies use it for role checks.
3. These changes do not affect any data or table structure.
*/

-- Fix 1: Set search_path on update_updated_at (preserves trigger dependencies)
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- Fix 2: Set search_path on has_role
ALTER FUNCTION public.has_role(uuid, text, text, uuid) SET search_path = public;

-- Fix 3: Revoke EXECUTE from anon, keep grant for authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text, text, uuid) TO authenticated;
