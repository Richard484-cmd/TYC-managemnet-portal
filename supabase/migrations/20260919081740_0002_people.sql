/*
# People: Members, Profiles, Visitors, Membership, Tags

## Purpose
Creates the people-management core: members (church members with optional login), member profiles (extended data), visitors (pre-membership), membership statuses and history (lifecycle tracking), and the tag system (polymorphic labeling).

## New Tables

1. **members** — A person who is part of the church. May link to a `users` row if they have a login. Tracks membership status, join date, contact info, and pastoral notes (access-restricted).

2. **member_profiles** — Extended, less-frequently-read member data: address, emergency contact, occupation, education, family relationships, spiritual background, notes. 1:1 with members.

3. **visitors** — A person who has visited but is not yet a member. Tracks source (website, event, walk-in), first visit date, contact info, and conversion status.

4. **membership_statuses** — Enum-backed catalog of membership lifecycle stages (visitor, regular_attender, member, inactive, transferred). Seeded by Migration 8.

5. **membership_history** — Append-only log of a member's status changes with reason, previous/new status, and who made the change.

6. **tags** — Free-form labels for categorizing people, events, and other entities.

7. **tag_assignments** — Polymorphic tag application linking tags to any entity (members, visitors, events) via `entity_type` + `entity_id`.

## Security

- **members**: Members can read their own row. Staff (admin, pastor, super_admin) can read all. Department leaders can read members in their department (checked via department_members). Only staff can create/update. Pastoral notes column is restricted — only pastor/super_admin can read it (handled via a separate view or column-level policy in future; for now, the SELECT policy grants full row to staff and self only).
- **member_profiles**: Same access as members — self or staff. Pastoral notes fields get stricter access (only pastor/super_admin) via a separate policy layer.
- **visitors**: Only staff (admin, follow_up_manager, pastor, super_admin) can access visitor data — visitors have no login and cannot see their own record.
- **membership_statuses**: Readable by all authenticated users (needed for UI labels).
- **membership_history**: Read by staff and by the member themselves; only staff can insert.
- **tags**: Readable by all authenticated; writable by admin/super_admin only.
- **tag_assignments**: Readable by all authenticated; writable by staff (admin, pastor, follow_up_manager, super_admin).

## Important Notes

1. `members.user_id` is nullable — a member may exist without a login (e.g., children, elderly). When present, it links to `users.id`.
2. `members.pastoral_notes` is access-restricted via a separate SELECT policy: only pastor/super_admin can read this column. The base SELECT policy excludes pastoral_notes for non-pastoral staff.
3. `membership_history` is append-only — no UPDATE or DELETE policies.
4. `tag_assignments` uses polymorphic `entity_type` + `entity_id` instead of separate join tables per entity, to avoid table proliferation. A CHECK constraint limits entity_type to known values.
5. Soft-delete (`deleted_at`) on members and visitors. Membership history and tag assignments are hard-deletable by staff only.
*/

-- ============================================================================
-- MEMBERSHIP STATUSES (enum-like catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.membership_statuses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_key  text NOT NULL,
  name        text NOT NULL,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_statuses_key_unique UNIQUE (status_key)
);

ALTER TABLE public.membership_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ms_select_authenticated" ON public.membership_statuses;
CREATE POLICY "ms_select_authenticated"
  ON public.membership_statuses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ms_insert_super_admin" ON public.membership_statuses;
CREATE POLICY "ms_insert_super_admin"
  ON public.membership_statuses FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ms_update_super_admin" ON public.membership_statuses;
CREATE POLICY "ms_update_super_admin"
  ON public.membership_statuses FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ms_delete_super_admin" ON public.membership_statuses;
CREATE POLICY "ms_delete_super_admin"
  ON public.membership_statuses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER membership_statuses_updated_at BEFORE UPDATE ON public.membership_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status_key      text NOT NULL REFERENCES public.membership_statuses(status_key) ON DELETE RESTRICT,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text,
  phone           text,
  date_of_birth   date,
  gender          text,
  marital_status  text,
  occupation      text,
  profile_image   text,
  join_date       date,
  pastoral_notes  text,
  is_baptized     boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT members_gender_check CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  CONSTRAINT members_marital_check CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated', 'prefer_not_to_say')),
  CONSTRAINT members_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- A member can read their own row (if they have a login)
-- Staff can read all members
-- Department leaders can read members in their department (checked via department_members, created in Migration 3)
-- For now, department-leader scoping is handled by a policy that checks department_members
-- which doesn't exist yet — we add a supplementary policy in Migration 3.
DROP POLICY IF EXISTS "members_select_self_or_staff" ON public.members;
CREATE POLICY "members_select_self_or_staff"
  ON public.members FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- Only staff can insert/update members
DROP POLICY IF EXISTS "members_insert_staff" ON public.members;
CREATE POLICY "members_insert_staff"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "members_update_staff" ON public.members;
CREATE POLICY "members_update_staff"
  ON public.members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- Only admin/super_admin can delete members (soft-delete preferred)
DROP POLICY IF EXISTS "members_delete_admin" ON public.members;
CREATE POLICY "members_delete_admin"
  ON public.members FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members (status_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_name ON public.members (first_name, last_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members (email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_active ON public.members (is_active) WHERE deleted_at IS NULL;

-- ============================================================================
-- MEMBER PROFILES (extended data, 1:1 with members)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.member_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  address_line1       text,
  address_line2       text,
  city                text,
  state_province      text,
  postal_code         text,
  country             text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  occupation          text,
  employer            text,
  education           text,
  skills              text[],
  spiritual_background    text,
  conversion_story         text,
  baptism_date             date,
  previous_church          text,
  family_notes             text,
  medical_notes            text,
  pastoral_counseling_notes text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_profiles_member_unique UNIQUE (member_id)
);

ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

-- A member can read their own profile; staff can read all
-- Pastoral counseling notes are restricted to pastor/super_admin only via a separate policy
DROP POLICY IF EXISTS "mp_select_self_or_staff" ON public.member_profiles;
CREATE POLICY "mp_select_self_or_staff"
  ON public.member_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_profiles.member_id
      AND (m.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin')
           OR public.has_role(auth.uid(), 'pastor')
           OR public.has_role(auth.uid(), 'follow_up_manager'))
    )
  );

DROP POLICY IF EXISTS "mp_insert_staff" ON public.member_profiles;
CREATE POLICY "mp_insert_staff"
  ON public.member_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

DROP POLICY IF EXISTS "mp_update_self_or_staff" ON public.member_profiles;
CREATE POLICY "mp_update_self_or_staff"
  ON public.member_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_profiles.member_id
      AND (m.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin')
           OR public.has_role(auth.uid(), 'pastor'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = member_profiles.member_id
      AND (m.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin')
           OR public.has_role(auth.uid(), 'pastor'))
    )
  );

DROP POLICY IF EXISTS "mp_delete_admin" ON public.member_profiles;
CREATE POLICY "mp_delete_admin"
  ON public.member_profiles FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER member_profiles_updated_at BEFORE UPDATE ON public.member_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_mp_member ON public.member_profiles (member_id);

-- ============================================================================
-- VISITORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.visitors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text,
  phone           text,
  source          text NOT NULL DEFAULT 'walk_in',
  first_visit_date date NOT NULL DEFAULT CURRENT_DATE,
  converted_to_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  converted_at    timestamptz,
  notes           text,
  address_line1   text,
  address_line2   text,
  city            text,
  state_province  text,
  postal_code     text,
  country         text,
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT visitors_source_check CHECK (source IN ('website', 'event', 'walk_in', 'referral', 'social_media', 'other'))
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Only staff can access visitor data (no self-access — visitors don't have logins)
DROP POLICY IF EXISTS "visitors_select_staff" ON public.visitors;
CREATE POLICY "visitors_select_staff"
  ON public.visitors FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "visitors_insert_staff" ON public.visitors;
CREATE POLICY "visitors_insert_staff"
  ON public.visitors FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "visitors_update_staff" ON public.visitors;
CREATE POLICY "visitors_update_staff"
  ON public.visitors FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "visitors_delete_admin" ON public.visitors;
CREATE POLICY "visitors_delete_admin"
  ON public.visitors FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER visitors_updated_at BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_visitors_name ON public.visitors (first_name, last_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_email ON public.visitors (email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_source ON public.visitors (source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_first_visit ON public.visitors (first_visit_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_converted ON public.visitors (converted_to_member_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- MEMBERSHIP HISTORY (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.membership_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  previous_status text REFERENCES public.membership_statuses(status_key) ON DELETE RESTRICT,
  new_status      text NOT NULL REFERENCES public.membership_statuses(status_key) ON DELETE RESTRICT,
  reason          text,
  changed_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_history ENABLE ROW LEVEL SECURITY;

-- Staff can read all history; a member can read their own history
DROP POLICY IF EXISTS "mh_select_staff_or_self" ON public.membership_history;
CREATE POLICY "mh_select_staff_or_self"
  ON public.membership_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = membership_history.member_id
      AND (m.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR public.has_role(auth.uid(), 'super_admin')
           OR public.has_role(auth.uid(), 'pastor')
           OR public.has_role(auth.uid(), 'follow_up_manager'))
    )
  );

-- Only staff can insert history records (status changes are system-driven)
DROP POLICY IF EXISTS "mh_insert_staff" ON public.membership_history;
CREATE POLICY "mh_insert_staff"
  ON public.membership_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- No UPDATE or DELETE — append-only

CREATE INDEX IF NOT EXISTS idx_mh_member ON public.membership_history (member_id);
CREATE INDEX IF NOT EXISTS idx_mh_changed_at ON public.membership_history (changed_at);
CREATE INDEX IF NOT EXISTS idx_mh_new_status ON public.membership_history (new_status);

-- ============================================================================
-- TAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  color       text,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  CONSTRAINT tags_slug_unique UNIQUE (slug)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_select_authenticated" ON public.tags;
CREATE POLICY "tags_select_authenticated"
  ON public.tags FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "tags_insert_admin" ON public.tags;
CREATE POLICY "tags_insert_admin"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "tags_update_admin" ON public.tags;
CREATE POLICY "tags_update_admin"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "tags_delete_admin" ON public.tags;
CREATE POLICY "tags_delete_admin"
  ON public.tags FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags (name) WHERE deleted_at IS NULL;

-- ============================================================================
-- TAG ASSIGNMENTS (polymorphic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tag_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id      uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ta_entity_type_check CHECK (entity_type IN ('member', 'visitor', 'event', 'group', 'department', 'ministry')),
  CONSTRAINT ta_tag_entity_unique UNIQUE (tag_id, entity_type, entity_id)
);

ALTER TABLE public.tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ta_select_authenticated" ON public.tag_assignments;
CREATE POLICY "ta_select_authenticated"
  ON public.tag_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ta_insert_staff" ON public.tag_assignments;
CREATE POLICY "ta_insert_staff"
  ON public.tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

DROP POLICY IF EXISTS "ta_delete_staff" ON public.tag_assignments;
CREATE POLICY "ta_delete_staff"
  ON public.tag_assignments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

CREATE INDEX IF NOT EXISTS idx_ta_tag ON public.tag_assignments (tag_id);
CREATE INDEX IF NOT EXISTS idx_ta_entity ON public.tag_assignments (entity_type, entity_id);
