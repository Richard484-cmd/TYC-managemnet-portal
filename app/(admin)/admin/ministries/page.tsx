import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MinistryListClient } from '@/components/admin/organization/ministry-list-client';
import type { MinistryListItem } from '@/lib/organization/schema';

export const dynamic = 'force-dynamic';

export default async function MinistriesPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();
  const canCreate = userIsAdmin(user) || userIsPastoral(user);

  const { data: ministries } = await supabase
    .from('ministries')
    .select('id, name, description, department_id, leader_id, meeting_day, meeting_time, status, created_at')
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  const deptIds = Array.from(new Set((ministries ?? []).map((m) => m.department_id).filter(Boolean))) as string[];
  let deptMap = new Map<string, string>();
  if (deptIds.length > 0) {
    const { data: depts } = await supabase.from('departments').select('id, name').in('id', deptIds);
    (depts ?? []).forEach((d) => deptMap.set(d.id, d.name));
  }

  const leaderIds = Array.from(new Set((ministries ?? []).map((m) => m.leader_id).filter(Boolean))) as string[];
  let leaderMap = new Map<string, string>();
  if (leaderIds.length > 0) {
    const { data: leaders } = await supabase
      .from('users')
      .select('id, display_name, first_name, last_name')
      .in('id', leaderIds);
    (leaders ?? []).forEach((l) => leaderMap.set(l.id, l.display_name || `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim()));
  }

  const ministryIds = (ministries ?? []).map((m) => m.id);
  const [{ data: memberCounts }, { data: groupCounts }] = await Promise.all([
    ministryIds.length > 0
      ? supabase.from('ministry_members').select('ministry_id').in('ministry_id', ministryIds)
      : Promise.resolve({ data: [] as { ministry_id: string }[] | null }),
    ministryIds.length > 0
      ? supabase.from('groups').select('ministry_id').in('ministry_id', ministryIds).is('deleted_at', null)
      : Promise.resolve({ data: [] as { ministry_id: string }[] | null }),
  ]);

  const mcMap = new Map<string, number>();
  (memberCounts ?? []).forEach((r) => mcMap.set(r.ministry_id, (mcMap.get(r.ministry_id) ?? 0) + 1));
  const gcMap = new Map<string, number>();
  (groupCounts ?? []).forEach((r) => gcMap.set(r.ministry_id, (gcMap.get(r.ministry_id) ?? 0) + 1));

  const items: MinistryListItem[] = (ministries ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    department_name: deptMap.get(m.department_id) ?? 'Unknown',
    leader_name: m.leader_id ? leaderMap.get(m.leader_id) ?? null : null,
    meeting_day: m.meeting_day,
    meeting_time: m.meeting_time,
    status: m.status,
    member_count: mcMap.get(m.id) ?? 0,
    group_count: gcMap.get(m.id) ?? 0,
    created_at: m.created_at,
  }));

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Ministries" description="Ministries within departments" />
        <MinistryListClient items={items} canCreate={canCreate} />
      </div>
    </AppShell>
  );
}
