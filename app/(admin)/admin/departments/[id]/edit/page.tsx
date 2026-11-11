import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { DepartmentForm } from '@/components/admin/organization/department-form';
import { getLeaderOptions } from '@/lib/organization/data';

export const dynamic = 'force-dynamic';

export default async function EditDepartmentPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canEdit = userIsAdmin(user) || userIsPastoral(user);

  const supabase = createClient();
  const { data: dept, error } = await supabase
    .from('departments')
    .select('id, name, description, leader_id, status, display_order')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !dept) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="Edit Department" description="Department not found." />
      </AppShell>
    );
  }

  if (!canEdit) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="Edit Department" description="You do not have permission to edit departments." />
      </AppShell>
    );
  }

  const leaders = await getLeaderOptions();

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Edit Department" description={dept.name} />
        <DepartmentForm
          mode="edit"
          departmentId={dept.id}
          defaultValues={{
            name: dept.name,
            description: dept.description ?? '',
            leader_id: dept.leader_id,
            status: dept.status as 'active' | 'inactive',
            display_order: dept.display_order,
          }}
          leaders={leaders}
        />
      </div>
    </AppShell>
  );
}
