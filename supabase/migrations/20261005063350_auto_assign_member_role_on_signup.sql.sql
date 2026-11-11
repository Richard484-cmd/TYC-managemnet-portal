/*
# Auto-assign 'member' role on signup

## Purpose
When a new user registers, they get an auth account but no role assignment.
This trigger automatically:
  1. Ensures a `public.users` profile row exists (upsert from auth metadata)
  2. Assigns the default `member` role (church scope)

## Changes
1. Ensures the `member` role exists in `public.roles`.
2. Creates `assign_default_member_role()` — SECURITY DEFINER trigger function
   that upserts the user profile and inserts a `member` role assignment.
3. Attaches it as `on_auth_user_created` AFTER INSERT on `auth.users`.
4. Backfills the `member` role for any existing users who don't have it.

## Security
- SECURITY DEFINER so it can write to `public.users` and `public.role_assignments`.
- `search_path = public` to prevent injection.
- No existing RLS policies are changed.

## Notes
1. Only fires on new signups — existing staff roles are unaffected.
2. Staff roles (admin, pastor, etc.) are still granted manually by a super_admin.
*/

-- Ensure the 'member' role exists
INSERT INTO public.roles (role_key, name, description, is_system)
VALUES ('member', 'Member', 'Default role for all registered users', true)
ON CONFLICT (role_key) DO NOTHING;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.assign_default_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure a public.users row exists (upsert from auth metadata)
  INSERT INTO public.users (id, email, display_name, first_name, last_name, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      TRIM(COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), '') || ' ' || COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''))
    ),
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(public.users.display_name, ''), EXCLUDED.display_name),
    updated_at = now();

  -- Insert the default 'member' role assignment if one doesn't already exist
  INSERT INTO public.role_assignments (user_id, role_key, scope_type, scope_id)
  VALUES (NEW.id, 'member', 'church', NULL)
  ON CONFLICT (user_id, role_key, scope_type, scope_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_member_role();

-- Backfill: assign 'member' role to existing users who don't have it
INSERT INTO public.role_assignments (user_id, role_key, scope_type, scope_id)
SELECT u.id, 'member', 'church', NULL
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_assignments ra
  WHERE ra.user_id = u.id AND ra.role_key = 'member' AND ra.revoked_at IS NULL
)
ON CONFLICT (user_id, role_key, scope_type, scope_id) DO NOTHING;
