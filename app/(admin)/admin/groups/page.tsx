import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { GroupListClient } from '@/components/admin/organization/group-list-client';
import type { GroupListItem } from '@/lib/organization/schema';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();
  const canCreate = userIsAdmin(user) || userIsPastoral(user) || userHasRole(user, 'department_leader');

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, description, group_type, ministry_id, leader_id, meeting_day, meeting_time, location, max_capacity, status, created_at')
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  const ministryIds = Array.from(new Set((groups ?? []).map((g) => g.ministry_id).filter(Boolean))) as string[];
  let ministryMap = new Map<string, string>();
  if (ministryIds.length > 0) {
    const { data: ministries } = await supabase.from('ministries').select('id, name').in('id', ministryIds);
    (ministries ?? []).forEach((m) => ministryMap.set(m.id, m.name));
  }

  const leaderIds = Array.from(new Set((groups ?? []).map((g) => g.leader_id).filter(Boolean))) as string[];
  let leaderMap = new Map<string, string>();
  if (leaderIds.length > 0) {
    const { data: leaders } = await supabase
      .from('users')
      .select('id, display_name, first_name, last_name')
      .in('id', leaderIds);
    (leaders ?? []).forEach((l) => leaderMap.set(l.id, l.display_name || `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim()));
  }

  const groupIds = (groups ?? []).map((g) => g.id);
  let mcMap = new Map<string, number>();
  if (groupIds.length > 0) {
    const { data: memberCounts } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds);
    (memberCounts ?? []).forEach((r) => mcMap.set(r.group_id, (mcMap.get(r.group_id) ?? 0) + 1));
  }

  const items: GroupListItem[] = (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    group_type: g.group_type,
    ministry_name: g.ministry_id ? ministryMap.get(g.ministry_id) ?? null : null,
    leader_name: g.leader_id ? leaderMap.get(g.leader_id) ?? null : null,
    meeting_day: g.meeting_day,
    meeting_time: g.meeting_time,
    location: g.location,
    max_capacity: g.max_capacity,
    status: g.status,
    member_count: mcMap.get(g.id) ?? 0,
    created_at: g.created_at,
  }));

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Groups" description="Cell groups, Bible study groups, and small groups" />
        <GroupListClient items={items} canCreate={canCreate} />
      </div>
    </AppShell>
  );
}

function userHasRole(user: { roles: { role_key: string }[] }, roleKey: string): boolean {
  return user.roles.some((r) => r.role_key === roleKey);
}
