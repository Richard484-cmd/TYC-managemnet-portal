import { requireStaff } from '@/lib/auth/session';
import { userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { DepartmentListClient } from '@/components/admin/organization/department-list-client';
import type { DepartmentListItem } from '@/lib/organization/schema';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();
  const canCreate = userIsAdmin(user) || userIsPastoral(user);

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, description, leader_id, status, created_at')
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  const leaderIds = (departments ?? []).map((d) => d.leader_id).filter(Boolean) as string[];
  let leaderMap = new Map<string, string>();
  if (leaderIds.length > 0) {
    const { data: leaders } = await supabase
      .from('users')
      .select('id, display_name, first_name, last_name')
      .in('id', leaderIds);
    (leaders ?? []).forEach((l) => {
      leaderMap.set(l.id, l.display_name || `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim());
    });
  }

  const deptIds = (departments ?? []).map((d) => d.id);

  const [{ data: memberCounts }, { data: ministryCounts }] = await Promise.all([
    deptIds.length > 0
      ? supabase.from('department_members').select('department_id').in('department_id', deptIds)
      : Promise.resolve({ data: [] as { department_id: string }[] | null }),
    deptIds.length > 0
      ? supabase.from('ministries').select('department_id').in('department_id', deptIds).is('deleted_at', null)
      : Promise.resolve({ data: [] as { department_id: string }[] | null }),
  ]);

  const mcMap = new Map<string, number>();
  (memberCounts ?? []).forEach((r) => mcMap.set(r.department_id, (mcMap.get(r.department_id) ?? 0) + 1));
  const ministryCountMap = new Map<string, number>();
  (ministryCounts ?? []).forEach((r) => ministryCountMap.set(r.department_id, (ministryCountMap.get(r.department_id) ?? 0) + 1));

  const items: DepartmentListItem[] = (departments ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    leader_name: d.leader_id ? leaderMap.get(d.leader_id) ?? null : null,
    status: d.status,
    member_count: mcMap.get(d.id) ?? 0,
    ministry_count: ministryCountMap.get(d.id) ?? 0,
    created_at: d.created_at,
  }));

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Departments" description="Top-level organizational units of the church" />
        <DepartmentListClient items={items} canCreate={canCreate} />
      </div>
    </AppShell>
  );
}
