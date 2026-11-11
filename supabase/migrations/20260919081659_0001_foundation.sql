/*
# Foundation: Roles, Users, Role Assignments, Church Settings, Audit Logs

## Purpose
Establishes the core identity, access-control, and audit infrastructure that all subsequent modules depend on. This migration creates the RBAC helper functions, the application-level users table, the roles catalog, role assignments (scoped), church-wide settings, and the append-only audit log.

## New Tables

1. **roles** — Catalog of the 8 ChurchConnect role keys (super_admin, admin, pastor, finance_officer, follow_up_manager, department_leader, group_leader, member). Seeded by Migration 8.

2. **users** — Application-level user record, 1:1 with `auth.users`. Holds display name, avatar URL, phone, status, and timestamps.

3. **role_assignments** — Grants a role to a user, optionally scoped to a department, ministry, or group. A user may hold multiple active assignments; effective permissions are the union. `revoked_at` supports soft-revocation.

4. **church_settings** — Key/value store for church-wide configuration. Single-tenant in v1.

5. **audit_logs** — Append-only security audit trail. INSERT-only via RLS; no UPDATE/DELETE policies — entries are immutable.

## Helper Functions

- **update_updated_at()** — Trigger function that sets `updated_at = now()` on row update.
- **has_role(p_user, p_role, p_scope_type, p_scope_id)** — SECURITY DEFINER function used by RLS policies. Returns true if the given user has an active role assignment matching the role and optional scope. Defined after all tables are created so it can reference `role_assignments`.

## Security

- RLS enabled on all 5 tables.
- **users**: self SELECT/UPDATE; staff (admin/pastor/super_admin) can SELECT all; super_admin can DELETE.
- **role_assignments**: self SELECT; admin/super_admin SELECT all; super_admin full CRUD.
- **church_settings**: public keys readable by anon+authenticated (sensitive keys filtered); staff can read all; super_admin can write.
- **audit_logs**: INSERT by any authenticated; SELECT by super_admin only; no UPDATE/DELETE.
- **roles**: SELECT by authenticated; writes by super_admin only.

## Important Notes

1. Tables are created first, then `has_role` function, then all RLS policies — so the function exists when policies are created.
2. `users.id` defaults to `auth.uid()` so first-login self-insert works.
3. `audit_logs` has no UPDATE or DELETE policies — permanent once written.
4. All UUIDs use `gen_random_uuid()`.
*/

-- ============================================================================
-- STEP 1: HELPER: updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 2: CREATE ALL TABLES (no policies yet)
-- ============================================================================

-- ROLES CATALOG
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key    text NOT NULL,
  name        text NOT NULL,
  description text,
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_role_key_unique UNIQUE (role_key)
);

-- USERS (application-level profile, 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text NOT NULL,
  first_name    text,
  last_name     text,
  phone         text,
  avatar_url    text,
  status        text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'suspended')),
  CONSTRAINT users_email_unique UNIQUE (email)
);

-- ROLE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.role_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_key    text NOT NULL REFERENCES public.roles(role_key) ON DELETE RESTRICT,
  scope_type  text NOT NULL DEFAULT 'church',
  scope_id    uuid,
  granted_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,
  revoked_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ra_scope_type_check CHECK (scope_type IN ('church', 'department', 'ministry', 'group')),
  CONSTRAINT ra_scope_check CHECK (
    (scope_type = 'church' AND scope_id IS NULL)
    OR (scope_type IN ('department', 'ministry', 'group') AND scope_id IS NOT NULL)
  ),
  CONSTRAINT ra_user_role_scope_unique UNIQUE (user_id, role_key, scope_type, scope_id)
);

-- CHURCH SETTINGS
CREATE TABLE IF NOT EXISTS public.church_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL,
  value       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT church_settings_key_unique UNIQUE (key)
);

-- AUDIT LOGS (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  diff        jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: DEFINE has_role FUNCTION (after role_assignments exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(
  p_user       uuid,
  p_role       text,
  p_scope_type text DEFAULT NULL,
  p_scope_id   uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_assignments
    WHERE user_id = p_user
      AND role_key = p_role
      AND revoked_at IS NULL
      AND (
        (p_scope_type IS NULL AND scope_type = 'church')
        OR
        (p_scope_type IS NOT NULL AND scope_type = p_scope_type AND scope_id = p_scope_id)
      )
  );
$$;

-- ============================================================================
-- STEP 5: CREATE ALL RLS POLICIES
-- ============================================================================

-- ROLES policies
DROP POLICY IF EXISTS "roles_select_authenticated" ON public.roles;
CREATE POLICY "roles_select_authenticated"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "roles_insert_super_admin" ON public.roles;
CREATE POLICY "roles_insert_super_admin"
  ON public.roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "roles_update_super_admin" ON public.roles;
CREATE POLICY "roles_update_super_admin"
  ON public.roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "roles_delete_super_admin" ON public.roles;
CREATE POLICY "roles_delete_super_admin"
  ON public.roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- USERS policies
DROP POLICY IF EXISTS "users_select_own_or_staff" ON public.users;
CREATE POLICY "users_select_own_or_staff"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_delete_super_admin" ON public.users;
CREATE POLICY "users_delete_super_admin"
  ON public.users FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ROLE ASSIGNMENTS policies
DROP POLICY IF EXISTS "ra_select_own_or_admin" ON public.role_assignments;
CREATE POLICY "ra_select_own_or_admin"
  ON public.role_assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "ra_insert_super_admin" ON public.role_assignments;
CREATE POLICY "ra_insert_super_admin"
  ON public.role_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ra_update_super_admin" ON public.role_assignments;
CREATE POLICY "ra_update_super_admin"
  ON public.role_assignments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ra_delete_super_admin" ON public.role_assignments;
CREATE POLICY "ra_delete_super_admin"
  ON public.role_assignments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- CHURCH SETTINGS policies
DROP POLICY IF EXISTS "church_settings_select_public" ON public.church_settings;
CREATE POLICY "church_settings_select_public"
  ON public.church_settings FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    AND key NOT ILIKE '%secret%'
    AND key NOT ILIKE '%credential%'
    AND key NOT ILIKE '%key%'
  );

DROP POLICY IF EXISTS "church_settings_select_staff" ON public.church_settings;
CREATE POLICY "church_settings_select_staff"
  ON public.church_settings FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "church_settings_insert_super_admin" ON public.church_settings;
CREATE POLICY "church_settings_insert_super_admin"
  ON public.church_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "church_settings_update_super_admin" ON public.church_settings;
CREATE POLICY "church_settings_update_super_admin"
  ON public.church_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "church_settings_delete_super_admin" ON public.church_settings;
CREATE POLICY "church_settings_delete_super_admin"
  ON public.church_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- AUDIT LOGS policies (insert-only, no update/delete)
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_super_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- STEP 6: TRIGGERS AND INDEXES
-- ============================================================================

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER role_assignments_updated_at BEFORE UPDATE ON public.role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER church_settings_updated_at BEFORE UPDATE ON public.church_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_ra_user ON public.role_assignments (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ra_role ON public.role_assignments (role_key) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ra_scope ON public.role_assignments (scope_type, scope_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs (created_at);
