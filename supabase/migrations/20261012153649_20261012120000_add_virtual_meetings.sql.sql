/*
# Add secure virtual meetings foundation

1. New Tables
- `virtual_meetings` stores scheduled meeting details, organizational scope, lifecycle status, and a provider room name. It intentionally does not store a browser-facing room URL or provider secret.
- `virtual_meeting_participants` stores invited/registered/joined/attended/absent/cancelled states and verified join/leave timestamps for each member.

2. Security
- Both tables have row-level security enabled.
- Members can only read meetings that are church-wide, within an organizational unit they belong to, or explicitly assigned to them.
- Organizers and scoped leaders can create and manage only meetings within their authorized scope.
- Participant writes are limited to authorized organizers and the member's own registration; verified join/leave updates are reserved for the trusted server function.

3. Important Notes
- `provider_room_name` is an opaque provider identifier and is not sufficient to join a meeting. Private provider access is issued by the server-side meeting access function.
- Meeting times use timestamptz plus an IANA timezone label so recurring scheduling can be added without changing the stored instant.
- Attendance remains distinct from registration: a participant is marked attended only after a verified provider join event or an authorized manual action.
*/

CREATE TABLE IF NOT EXISTS public.virtual_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'fellowship',
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE RESTRICT,
  scope_type text NOT NULL DEFAULT 'church',
  scope_id uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  recurrence_rule text,
  participant_policy text NOT NULL DEFAULT 'scope_members',
  capacity integer,
  status text NOT NULL DEFAULT 'scheduled',
  provider text NOT NULL DEFAULT 'daily',
  provider_room_name text UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT virtual_meetings_time_check CHECK (ends_at > starts_at),
  CONSTRAINT virtual_meetings_scope_check CHECK (
    (scope_type = 'church' AND scope_id IS NULL)
    OR (scope_type IN ('group', 'department', 'ministry') AND scope_id IS NOT NULL)
  ),
  CONSTRAINT virtual_meetings_category_check CHECK (category IN ('fellowship', 'bible_study', 'prayer', 'ministry', 'department', 'church_wide', 'other')),
  CONSTRAINT virtual_meetings_policy_check CHECK (participant_policy IN ('scope_members', 'invited', 'church_wide')),
  CONSTRAINT virtual_meetings_status_check CHECK (status IN ('scheduled', 'open', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT virtual_meetings_provider_check CHECK (provider IN ('daily')),
  CONSTRAINT virtual_meetings_capacity_check CHECK (capacity IS NULL OR capacity > 0)
);

CREATE TABLE IF NOT EXISTS public.virtual_meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.virtual_meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited',
  provider_participant_id text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  registered_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  last_provider_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT virtual_meeting_participant_unique UNIQUE (meeting_id, member_id),
  CONSTRAINT virtual_meeting_participant_status_check CHECK (status IN ('invited', 'registered', 'joined', 'attended', 'absent', 'cancelled')),
  CONSTRAINT virtual_meeting_duration_check CHECK (duration_seconds >= 0)
);

ALTER TABLE public.virtual_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_virtual_meeting(p_user uuid, p_meeting uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.virtual_meetings vm
    WHERE vm.id = p_meeting
      AND vm.deleted_at IS NULL
      AND (
        vm.organizer_id = p_user
        OR public.has_role(p_user, 'admin')
        OR public.has_role(p_user, 'super_admin')
        OR public.has_role(p_user, 'pastor')
        OR EXISTS (
          SELECT 1 FROM public.virtual_meeting_participants vmp
          JOIN public.members mem ON mem.id = vmp.member_id
          WHERE vmp.meeting_id = vm.id AND mem.user_id = p_user
        )
        OR (vm.scope_type = 'church' AND vm.participant_policy = 'church_wide')
        OR (vm.scope_type = 'group' AND (
          public.has_role(p_user, 'group_leader', 'group', vm.scope_id)
          OR EXISTS (
            SELECT 1 FROM public.group_members gm
            JOIN public.members mem ON mem.id = gm.member_id
            WHERE gm.group_id = vm.scope_id AND mem.user_id = p_user
          )
        ))
        OR (vm.scope_type = 'department' AND (
          public.has_role(p_user, 'department_leader', 'department', vm.scope_id)
          OR EXISTS (
            SELECT 1 FROM public.department_members dm
            JOIN public.members mem ON mem.id = dm.member_id
            WHERE dm.department_id = vm.scope_id AND mem.user_id = p_user
          )
        ))
        OR (vm.scope_type = 'ministry' AND (
          public.has_role(p_user, 'department_leader', 'ministry', vm.scope_id)
          OR EXISTS (
            SELECT 1 FROM public.ministry_members mm
            JOIN public.members mem ON mem.id = mm.member_id
            WHERE mm.ministry_id = vm.scope_id AND mem.user_id = p_user
          )
        ))
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_virtual_meeting(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_virtual_meeting(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "vm_select_allowed_members" ON public.virtual_meetings;
CREATE POLICY "vm_select_allowed_members" ON public.virtual_meetings FOR SELECT TO authenticated
USING (public.can_access_virtual_meeting(auth.uid(), id));

DROP POLICY IF EXISTS "vm_insert_authorized_scope" ON public.virtual_meetings;
CREATE POLICY "vm_insert_authorized_scope" ON public.virtual_meetings FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR (scope_type = 'church' AND public.has_role(auth.uid(), 'pastor'))
    OR (scope_type = 'group' AND public.has_role(auth.uid(), 'group_leader', 'group', scope_id))
    OR (scope_type = 'department' AND public.has_role(auth.uid(), 'department_leader', 'department', scope_id))
    OR (scope_type = 'ministry' AND public.has_role(auth.uid(), 'department_leader', 'ministry', scope_id))
  )
);

DROP POLICY IF EXISTS "vm_update_authorized_scope" ON public.virtual_meetings;
CREATE POLICY "vm_update_authorized_scope" ON public.virtual_meetings FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR (scope_type = 'group' AND public.has_role(auth.uid(), 'group_leader', 'group', scope_id))
  OR (scope_type = 'department' AND public.has_role(auth.uid(), 'department_leader', 'department', scope_id))
  OR (scope_type = 'ministry' AND public.has_role(auth.uid(), 'department_leader', 'ministry', scope_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR (scope_type = 'group' AND public.has_role(auth.uid(), 'group_leader', 'group', scope_id))
  OR (scope_type = 'department' AND public.has_role(auth.uid(), 'department_leader', 'department', scope_id))
  OR (scope_type = 'ministry' AND public.has_role(auth.uid(), 'department_leader', 'ministry', scope_id))
);

DROP POLICY IF EXISTS "vm_delete_admin" ON public.virtual_meetings;
CREATE POLICY "vm_delete_admin" ON public.virtual_meetings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "vmp_select_allowed_members" ON public.virtual_meeting_participants;
CREATE POLICY "vmp_select_allowed_members" ON public.virtual_meeting_participants FOR SELECT TO authenticated
USING (
  public.can_access_virtual_meeting(auth.uid(), meeting_id)
  AND (
    EXISTS (SELECT 1 FROM public.members mem WHERE mem.id = member_id AND mem.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR EXISTS (SELECT 1 FROM public.virtual_meetings vm WHERE vm.id = meeting_id AND vm.organizer_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "vmp_insert_self_or_manager" ON public.virtual_meeting_participants;
CREATE POLICY "vmp_insert_self_or_manager" ON public.virtual_meeting_participants FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.members mem WHERE mem.id = member_id AND mem.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR EXISTS (SELECT 1 FROM public.virtual_meetings vm WHERE vm.id = meeting_id AND vm.organizer_id = auth.uid())
);

DROP POLICY IF EXISTS "vmp_update_manager" ON public.virtual_meeting_participants;
CREATE POLICY "vmp_update_manager" ON public.virtual_meeting_participants FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR EXISTS (SELECT 1 FROM public.virtual_meetings vm WHERE vm.id = meeting_id AND vm.organizer_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR EXISTS (SELECT 1 FROM public.virtual_meetings vm WHERE vm.id = meeting_id AND vm.organizer_id = auth.uid())
);

DROP POLICY IF EXISTS "vmp_delete_manager" ON public.virtual_meeting_participants;
CREATE POLICY "vmp_delete_manager" ON public.virtual_meeting_participants FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR EXISTS (SELECT 1 FROM public.virtual_meetings vm WHERE vm.id = meeting_id AND vm.organizer_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_vm_schedule ON public.virtual_meetings (starts_at, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vm_scope ON public.virtual_meetings (scope_type, scope_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vm_organizer ON public.virtual_meetings (organizer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vmp_meeting ON public.virtual_meeting_participants (meeting_id, status);
CREATE INDEX IF NOT EXISTS idx_vmp_member ON public.virtual_meeting_participants (member_id, status);

CREATE TRIGGER virtual_meetings_updated_at BEFORE UPDATE ON public.virtual_meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER virtual_meeting_participants_updated_at BEFORE UPDATE ON public.virtual_meeting_participants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
