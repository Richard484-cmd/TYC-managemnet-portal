/*
# Attendance & Events

## Purpose
Creates the attendance tracking system (recurring service/gathering occurrences with per-person records) and the public events system (calendar events with registration).

## New Tables

1. **attendance_events** — A scheduled gathering occurrence (e.g., Sunday Service, Youth Group Meeting). Has a date, type, optional department/group association, and status. This is the operational record used for attendance tracking.

2. **attendance_records** — Per-person attendance for an attendance event. Records status (present, absent, late, excused), notes, and who recorded it. A member can read their own attendance; staff and department/group leaders can read and record attendance for their scope.

3. **events** — Public/calendar-facing events with title, description, date/time, location, capacity, image, and registration settings. May be public or members-only.

4. **event_registrations** — A person registered for an event. Tracks registration status, number of guests, and timestamps. A member can register themselves; staff can register others and manage all registrations.

## Security

- **attendance_events**: Staff and department/group leaders can CRUD. All authenticated can SELECT (members see upcoming service times). Public events visible to anon via a separate policy.
- **attendance_records**: A member can read their own records. Staff and department/group leaders can read/insert/update records for their scope. Members cannot insert/update their own attendance (staff-only).
- **events**: Public events readable by anon+authenticated. Members-only events readable by authenticated only. Staff can CRUD.
- **event_registrations**: A member can read/insert their own registrations. Staff can read/insert/update all registrations. Members cannot delete their own registration (contact admin to cancel).

## Important Notes

1. `attendance_events` has `department_id` and `group_id` as optional scope references — an attendance event may be for a department, a group, or church-wide (both null).
2. `events.is_public` controls whether the event shows on the public website.
3. `event_registrations` has a CHECK constraint limiting `status` to known values.
4. Soft-delete on `events` only. Attendance events and records are hard-deletable by staff.
5. `attendance_records` has a unique constraint on (attendance_event_id, member_id) to prevent duplicate records.
*/

-- ============================================================================
-- ATTENDANCE EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  event_type    text NOT NULL DEFAULT 'service',
  event_date    date NOT NULL,
  start_time    time,
  end_time      time,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  group_id      uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  location      text,
  notes         text,
  status        text NOT NULL DEFAULT 'scheduled',
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT ae_type_check CHECK (event_type IN ('service', 'group_meeting', 'ministry_meeting', 'special', 'rehearsal', 'other')),
  CONSTRAINT ae_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

-- All authenticated can read attendance events (members see their service schedule)
DROP POLICY IF EXISTS "ae_select_authenticated" ON public.attendance_events;
CREATE POLICY "ae_select_authenticated"
  ON public.attendance_events FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Staff and scoped leaders can insert
DROP POLICY IF EXISTS "ae_insert_staff" ON public.attendance_events;
CREATE POLICY "ae_insert_staff"
  ON public.attendance_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR (department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', department_id))
    OR (group_id IS NOT NULL AND public.has_role(auth.uid(), 'group_leader', 'group', group_id))
  );

-- Staff and scoped leaders can update
DROP POLICY IF EXISTS "ae_update_staff" ON public.attendance_events;
CREATE POLICY "ae_update_staff"
  ON public.attendance_events FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR (department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', department_id))
    OR (group_id IS NOT NULL AND public.has_role(auth.uid(), 'group_leader', 'group', group_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR (department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', department_id))
    OR (group_id IS NOT NULL AND public.has_role(auth.uid(), 'group_leader', 'group', group_id))
  );

-- Only admin/super_admin can delete
DROP POLICY IF EXISTS "ae_delete_admin" ON public.attendance_events;
CREATE POLICY "ae_delete_admin"
  ON public.attendance_events FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER attendance_events_updated_at BEFORE UPDATE ON public.attendance_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_ae_date ON public.attendance_events (event_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ae_type ON public.attendance_events (event_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ae_department ON public.attendance_events (department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ae_group ON public.attendance_events (group_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ae_status ON public.attendance_events (status) WHERE deleted_at IS NULL;

-- ============================================================================
-- ATTENDANCE RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_event_id uuid NOT NULL REFERENCES public.attendance_events(id) ON DELETE CASCADE,
  member_id           uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'present',
  notes               text,
  recorded_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_status_check CHECK (status IN ('present', 'absent', 'late', 'excused', 'visitor')),
  CONSTRAINT ar_event_member_unique UNIQUE (attendance_event_id, member_id)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- A member can read their own attendance records
-- Staff and scoped leaders can read all records in their scope
DROP POLICY IF EXISTS "ar_select_self_or_staff" ON public.attendance_records;
CREATE POLICY "ar_select_self_or_staff"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = attendance_records.member_id
      AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.attendance_events ae
      WHERE ae.id = attendance_records.attendance_event_id
      AND (
        (ae.department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', ae.department_id))
        OR (ae.group_id IS NOT NULL AND public.has_role(auth.uid(), 'group_leader', 'group', ae.group_id))
      )
    )
  );

-- Only staff and scoped leaders can insert attendance records
DROP POLICY IF EXISTS "ar_insert_staff" ON public.attendance_records;
CREATE POLICY "ar_insert_staff"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.attendance_events ae
      WHERE ae.id = attendance_records.attendance_event_id
      AND (
        (ae.department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', ae.department_id))
        OR (ae.group_id IS NOT NULL AND public.has_role(auth.uid(), 'group_leader', 'group', ae.group_id))
      )
    )
  );

-- Only staff and scoped leaders can update attendance records
DROP POLICY IF EXISTS "ar_update_staff" ON public.attendance_records;
CREATE POLICY "ar_update_staff"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.attendance_events ae
      WHERE ae.id = attendance_records.attendance_event_id
      AND (
        (ae.department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', ae.department_id))
        OR (ae.group_id IS NOT NULL AND public.has_role(auth.uid(), 'group_leader', 'group', ae.group_id))
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (
      SELECT 1 FROM public.attendance_events ae
      WHERE ae.id = attendance_records.attendance_event_id
      AND (
        (ae.department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', ae.department_id))
        OR (ae.group_id IS NOT NULL AND public.has_role(auth.uid(), 'group_leader', 'group', ae.group_id))
      )
    )
  );

-- Only admin/super_admin can delete
DROP POLICY IF EXISTS "ar_delete_admin" ON public.attendance_records;
CREATE POLICY "ar_delete_admin"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER attendance_records_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_ar_event ON public.attendance_records (attendance_event_id);
CREATE INDEX IF NOT EXISTS idx_ar_member ON public.attendance_records (member_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON public.attendance_records (status);

-- ============================================================================
-- EVENTS (public/calendar)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  start_date    timestamptz NOT NULL,
  end_date      timestamptz,
  location      text,
  address       text,
  image_url     text,
  capacity      int,
  is_public     boolean NOT NULL DEFAULT true,
  requires_registration boolean NOT NULL DEFAULT false,
  registration_deadline timestamptz,
  organizer_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'upcoming',
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT events_status_check CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled'))
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public events readable by anyone (including anon for the public website)
DROP POLICY IF EXISTS "events_select_public" ON public.events;
CREATE POLICY "events_select_public"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND deleted_at IS NULL);

-- Members-only events readable by authenticated users
DROP POLICY IF EXISTS "events_select_members" ON public.events;
CREATE POLICY "events_select_members"
  ON public.events FOR SELECT
  TO authenticated
  USING (is_public = false AND deleted_at IS NULL);

-- Staff can insert events
DROP POLICY IF EXISTS "events_insert_staff" ON public.events;
CREATE POLICY "events_insert_staff"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR (department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', department_id))
  );

-- Staff can update events
DROP POLICY IF EXISTS "events_update_staff" ON public.events;
CREATE POLICY "events_update_staff"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR (department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', department_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR (department_id IS NOT NULL AND public.has_role(auth.uid(), 'department_leader', 'department', department_id))
  );

-- Only admin/super_admin can delete events
DROP POLICY IF EXISTS "events_delete_admin" ON public.events;
CREATE POLICY "events_delete_admin"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_events_start ON public.events (start_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_public ON public.events (is_public) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_department ON public.events (department_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- EVENT REGISTRATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id     uuid REFERENCES public.members(id) ON DELETE CASCADE,
  visitor_id    uuid REFERENCES public.visitors(id) ON DELETE SET NULL,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  email         text,
  phone         text,
  num_guests    int NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'registered',
  registered_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cancelled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_status_check CHECK (status IN ('registered', 'confirmed', 'attended', 'cancelled', 'waitlist')),
  CONSTRAINT er_num_guests_check CHECK (num_guests >= 1),
  CONSTRAINT er_person_check CHECK (member_id IS NOT NULL OR visitor_id IS NOT NULL OR (first_name IS NOT NULL AND last_name IS NOT NULL))
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- A member can read their own registrations
-- Staff can read all registrations
DROP POLICY IF EXISTS "er_select_self_or_staff" ON public.event_registrations;
CREATE POLICY "er_select_self_or_staff"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = event_registrations.member_id
      AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- A member can register themselves; staff can register anyone
DROP POLICY IF EXISTS "er_insert_self_or_staff" ON public.event_registrations;
CREATE POLICY "er_insert_self_or_staff"
  ON public.event_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = event_registrations.member_id
      AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- Staff can update registrations; members can cancel their own
DROP POLICY IF EXISTS "er_update_staff_or_self" ON public.event_registrations;
CREATE POLICY "er_update_staff_or_self"
  ON public.event_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = event_registrations.member_id
      AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = event_registrations.member_id
      AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'follow_up_manager')
  );

-- Only staff can delete registrations
DROP POLICY IF EXISTS "er_delete_staff" ON public.event_registrations;
CREATE POLICY "er_delete_staff"
  ON public.event_registrations FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
  );

CREATE TRIGGER event_registrations_updated_at BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_er_event ON public.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_er_member ON public.event_registrations (member_id);
CREATE INDEX IF NOT EXISTS idx_er_status ON public.event_registrations (status);
CREATE INDEX IF NOT EXISTS idx_er_email ON public.event_registrations (email);
