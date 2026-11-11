/*
# Organization: Departments, Ministries, Groups, and Memberships

## Purpose
Creates the church organizational structure: departments (top-level units), ministries (belong to departments), groups (small groups/cells), and the membership join tables for each. Also adds a supplementary RLS policy on `members` so department leaders can read members in their department.

## New Tables

1. **departments** — Top-level organizational unit (e.g., Worship, Youth, Outreach). Has a leader (user with department_leader role), description, and status.

2. **department_members** — Join table linking members to departments with a role (leader, member, volunteer) and join date.

3. **ministries** — A ministry within a department (e.g., Choir within Worship). Has a leader, description, meeting day, and status.

4. **ministry_members** — Join table linking members to ministries with a role and join date.

5. **groups** — Small groups / cells / fellowships. May optionally belong to a ministry. Has a leader, meeting day/time, location, and capacity.

6. **group_members** — Join table linking members to groups with a role and join date.

## Security

- **departments**: All authenticated users can SELECT (needed for member portal). Staff can INSERT/UPDATE. Only admin/super_admin can DELETE.
- **department_members**: All authenticated can SELECT (members see their own departments). Staff can INSERT/UPDATE. Self can read own memberships. Department leaders can read/update members in their department.
- **ministries**: All authenticated can SELECT. Staff and department leaders can INSERT/UPDATE. Admin/super_admin can DELETE.
- **ministry_members**: All authenticated can SELECT. Staff can INSERT/UPDATE. Self can read own memberships.
- **groups**: All authenticated can SELECT. Staff and group leaders can INSERT/UPDATE. Admin/super_admin can DELETE.
- **group_members**: All authenticated can SELECT. Staff and group leaders can INSERT/UPDATE. Self can read own memberships.

## Supplementary Policy

- Adds a SELECT policy on `members` allowing department leaders to read members who belong to their department (via `department_members`). This supplements the policy from Migration 2.

## Important Notes

1. `groups.ministry_id` is nullable — a group may exist independently of a ministry.
2. `department_members.role` and `group_members.role` use a CHECK constraint to limit values.
3. Soft-delete on departments, ministries, and groups. Join tables are hard-deletable by staff.
4. Each membership join table has a unique constraint on (entity_id, member_id) to prevent duplicates.
*/

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.departments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  leader_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'active',
  display_order int NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT departments_status_check CHECK (status IN ('active', 'inactive'))
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
CREATE POLICY "departments_select_authenticated"
  ON public.departments FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "departments_insert_staff" ON public.departments;
CREATE POLICY "departments_insert_staff"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "departments_update_staff" ON public.departments;
CREATE POLICY "departments_update_staff"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader', 'department', id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader', 'department', id)
  );

DROP POLICY IF EXISTS "departments_delete_admin" ON public.departments;
CREATE POLICY "departments_delete_admin"
  ON public.departments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_departments_status ON public.departments (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_leader ON public.departments (leader_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- DEPARTMENT MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.department_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member',
  joined_at     date NOT NULL DEFAULT CURRENT_DATE,
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_role_check CHECK (role IN ('leader', 'assistant_leader', 'member', 'volunteer')),
  CONSTRAINT dm_dept_member_unique UNIQUE (department_id, member_id)
);

ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

-- All authenticated can read; a member can read their own department memberships
DROP POLICY IF EXISTS "dm_select_authenticated" ON public.department_members;
CREATE POLICY "dm_select_authenticated"
  ON public.department_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "dm_insert_staff_or_leader" ON public.department_members;
CREATE POLICY "dm_insert_staff_or_leader"
  ON public.department_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader', 'department', department_id)
  );

DROP POLICY IF EXISTS "dm_update_staff_or_leader" ON public.department_members;
CREATE POLICY "dm_update_staff_or_leader"
  ON public.department_members FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader', 'department', department_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader', 'department', department_id)
  );

DROP POLICY IF EXISTS "dm_delete_staff_or_leader" ON public.department_members;
CREATE POLICY "dm_delete_staff_or_leader"
  ON public.department_members FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader', 'department', department_id)
  );

CREATE TRIGGER department_members_updated_at BEFORE UPDATE ON public.department_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_dm_department ON public.department_members (department_id);
CREATE INDEX IF NOT EXISTS idx_dm_member ON public.department_members (member_id);

-- ============================================================================
-- MINISTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ministries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  leader_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  meeting_day   text,
  meeting_time   text,
  location       text,
  status         text NOT NULL DEFAULT 'active',
  display_order  int NOT NULL DEFAULT 0,
  created_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT ministries_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT ministries_meeting_day_check CHECK (meeting_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', NULL))
);

ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ministries_select_authenticated" ON public.ministries;
CREATE POLICY "ministries_select_authenticated"
  ON public.ministries FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "ministries_insert_staff" ON public.ministries;
CREATE POLICY "ministries_insert_staff"
  ON public.ministries FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = ministries.department_id
      AND public.has_role(auth.uid(), 'department_leader', 'department', d.id)
    )
  );

DROP POLICY IF EXISTS "ministries_update_staff" ON public.ministries;
CREATE POLICY "ministries_update_staff"
  ON public.ministries FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = ministries.department_id
      AND public.has_role(auth.uid(), 'department_leader', 'department', d.id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = ministries.department_id
      AND public.has_role(auth.uid(), 'department_leader', 'department', d.id)
    )
  );

DROP POLICY IF EXISTS "ministries_delete_admin" ON public.ministries;
CREATE POLICY "ministries_delete_admin"
  ON public.ministries FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER ministries_updated_at BEFORE UPDATE ON public.ministries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_ministries_department ON public.ministries (department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ministries_status ON public.ministries (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ministries_leader ON public.ministries (leader_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- MINISTRY MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ministry_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member',
  joined_at   date NOT NULL DEFAULT CURRENT_DATE,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mm_role_check CHECK (role IN ('leader', 'assistant_leader', 'member', 'volunteer')),
  CONSTRAINT mm_ministry_member_unique UNIQUE (ministry_id, member_id)
);

ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mm_select_authenticated" ON public.ministry_members;
CREATE POLICY "mm_select_authenticated"
  ON public.ministry_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "mm_insert_staff" ON public.ministry_members;
CREATE POLICY "mm_insert_staff"
  ON public.ministry_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
  );

DROP POLICY IF EXISTS "mm_update_staff" ON public.ministry_members;
CREATE POLICY "mm_update_staff"
  ON public.ministry_members FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
  );

DROP POLICY IF EXISTS "mm_delete_staff" ON public.ministry_members;
CREATE POLICY "mm_delete_staff"
  ON public.ministry_members FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
  );

CREATE TRIGGER ministry_members_updated_at BEFORE UPDATE ON public.ministry_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_mm_ministry ON public.ministry_members (ministry_id);
CREATE INDEX IF NOT EXISTS idx_mm_member ON public.ministry_members (member_id);

-- ============================================================================
-- GROUPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id   uuid REFERENCES public.ministries(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  leader_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  group_type    text NOT NULL DEFAULT 'small_group',
  meeting_day   text,
  meeting_time  text,
  location      text,
  max_capacity  int,
  status        text NOT NULL DEFAULT 'active',
  display_order int NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT groups_status_check CHECK (status IN ('active', 'inactive', 'full')),
  CONSTRAINT groups_type_check CHECK (group_type IN ('small_group', 'cell_group', 'fellowship', 'bible_study', 'prayer_group', 'youth_group', 'other')),
  CONSTRAINT groups_meeting_day_check CHECK (meeting_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', NULL))
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_select_authenticated" ON public.groups;
CREATE POLICY "groups_select_authenticated"
  ON public.groups FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "groups_insert_staff" ON public.groups;
CREATE POLICY "groups_insert_staff"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
  );

DROP POLICY IF EXISTS "groups_update_staff_or_leader" ON public.groups;
CREATE POLICY "groups_update_staff_or_leader"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'group_leader', 'group', id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'group_leader', 'group', id)
  );

DROP POLICY IF EXISTS "groups_delete_admin" ON public.groups;
CREATE POLICY "groups_delete_admin"
  ON public.groups FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_groups_ministry ON public.groups (ministry_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_groups_status ON public.groups (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_groups_leader ON public.groups (leader_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_groups_type ON public.groups (group_type) WHERE deleted_at IS NULL;

-- ============================================================================
-- GROUP MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member',
  joined_at   date NOT NULL DEFAULT CURRENT_DATE,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gm_role_check CHECK (role IN ('leader', 'assistant_leader', 'member', 'visitor')),
  CONSTRAINT gm_group_member_unique UNIQUE (group_id, member_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gm_select_authenticated" ON public.group_members;
CREATE POLICY "gm_select_authenticated"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "gm_insert_staff_or_leader" ON public.group_members;
CREATE POLICY "gm_insert_staff_or_leader"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'group_leader', 'group', group_id)
  );

DROP POLICY IF EXISTS "gm_update_staff_or_leader" ON public.group_members;
CREATE POLICY "gm_update_staff_or_leader"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'group_leader', 'group', group_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'group_leader', 'group', group_id)
  );

DROP POLICY IF EXISTS "gm_delete_staff_or_leader" ON public.group_members;
CREATE POLICY "gm_delete_staff_or_leader"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'group_leader', 'group', group_id)
  );

CREATE TRIGGER group_members_updated_at BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_gm_group ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_gm_member ON public.group_members (member_id);

-- ============================================================================
-- SUPPLEMENTARY POLICY: Department leaders can read members in their department
-- ============================================================================

-- This supplements the members SELECT policy from Migration 2
DROP POLICY IF EXISTS "members_select_dept_leader" ON public.members;
CREATE POLICY "members_select_dept_leader"
  ON public.members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.department_members dm
      JOIN public.role_assignments ra
        ON ra.user_id = auth.uid()
        AND ra.role_key = 'department_leader'
        AND ra.scope_type = 'department'
        AND ra.scope_id = dm.department_id
        AND ra.revoked_at IS NULL
      WHERE dm.member_id = members.id
    )
  );

-- Group leaders can read members in their group
DROP POLICY IF EXISTS "members_select_group_leader" ON public.members;
CREATE POLICY "members_select_group_leader"
  ON public.members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.role_assignments ra
        ON ra.user_id = auth.uid()
        AND ra.role_key = 'group_leader'
        AND ra.scope_type = 'group'
        AND ra.scope_id = gm.group_id
        AND ra.revoked_at IS NULL
      WHERE gm.member_id = members.id
    )
  );
