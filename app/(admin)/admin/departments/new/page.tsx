import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { DepartmentForm } from '@/components/admin/organization/department-form';
import { getLeaderOptions } from '@/lib/organization/data';

export const dynamic = 'force-dynamic';

export default async function NewDepartmentPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canCreate = userIsAdmin(user) || userIsPastoral(user);
  if (!canCreate) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="New Department" description="You do not have permission to create departments." />
      </AppShell>
    );
  }

  const leaders = await getLeaderOptions();

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="New Department" description="Create a new department" />
        <DepartmentForm mode="create" leaders={leaders} />
      </div>
    </AppShell>
  );
}
