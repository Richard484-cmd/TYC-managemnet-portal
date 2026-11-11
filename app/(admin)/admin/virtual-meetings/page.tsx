import { requireStaff, userIsAdmin, userIsPastoral, userHasRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MeetingListClient } from '@/components/admin/virtual-meetings/meeting-list-client';
import type { MeetingListItem, MeetingListResult } from '@/lib/virtual-meetings/schema';

export const dynamic = 'force-dynamic';

export default async function VirtualMeetingsPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();
  const canCreate = userIsAdmin(user) || userIsPastoral(user) || userHasRole(user, 'group_leader') || userHasRole(user, 'department_leader');

  const { data: meetings } = await supabase
    .from('virtual_meetings')
    .select('id, title, category, scope_type, scope_id, starts_at, ends_at, status, organizer_id')
    .is('deleted_at', null)
    .order('starts_at', { ascending: false });

  const scopeIds = Array.from(new Set((meetings ?? []).map((m) => m.scope_id).filter(Boolean))) as string[];
  const organizerIds = Array.from(new Set((meetings ?? []).map((m) => m.organizer_id).filter(Boolean))) as string[];
  const meetingIds = (meetings ?? []).map((m) => m.id);

  const [groupsResult, departmentsResult, ministriesResult, organizersResult, participantsResult] = await Promise.all([
    scopeIds.length > 0 ? supabase.from('groups').select('id, name').in('id', scopeIds) : Promise.resolve({ data: [] }),
    scopeIds.length > 0 ? supabase.from('departments').select('id, name').in('id', scopeIds) : Promise.resolve({ data: [] }),
    scopeIds.length > 0 ? supabase.from('ministries').select('id, name').in('id', scopeIds) : Promise.resolve({ data: [] }),
    organizerIds.length > 0 ? supabase.from('users').select('id, display_name, first_name, last_name').in('id', organizerIds) : Promise.resolve({ data: [] }),
    meetingIds.length > 0 ? supabase.from('virtual_meeting_participants').select('meeting_id').in('meeting_id', meetingIds) : Promise.resolve({ data: [] }),
  ]);

  const scopeMap = new Map<string, string>();
  (groupsResult.data ?? []).forEach((g: { id: string; name: string }) => scopeMap.set(g.id, g.name));
  (departmentsResult.data ?? []).forEach((d: { id: string; name: string }) => scopeMap.set(d.id, d.name));
  (ministriesResult.data ?? []).forEach((m: { id: string; name: string }) => scopeMap.set(m.id, m.name));

  const organizerMap = new Map<string, string>();
  (organizersResult.data ?? []).forEach((u: { id: string; display_name: string; first_name: string | null; last_name: string | null }) =>
    organizerMap.set(u.id, u.display_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.id));

  const participantCounts = new Map<string, number>();
  (participantsResult.data ?? []).forEach((p: { meeting_id: string }) =>
    participantCounts.set(p.meeting_id, (participantCounts.get(p.meeting_id) ?? 0) + 1));

  const items: MeetingListItem[] = (meetings ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    category: m.category,
    scope_type: m.scope_type,
    scope_name: m.scope_id ? scopeMap.get(m.scope_id) ?? null : null,
    starts_at: m.starts_at,
    ends_at: m.ends_at,
    status: m.status,
    organizer_name: organizerMap.get(m.organizer_id) ?? null,
    participant_count: participantCounts.get(m.id) ?? 0,
  }));

  const result: MeetingListResult = { meetings: items, total: items.length };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Virtual Meetings" description={`${result.total} ${result.total === 1 ? 'meeting' : 'meetings'} scheduled`} />
        <MeetingListClient items={items} canCreate={canCreate} />
      </div>
    </AppShell>
  );
}
