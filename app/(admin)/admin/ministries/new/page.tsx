import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MinistryForm } from '@/components/admin/organization/ministry-form';
import { getLeaderOptions } from '@/lib/organization/data';

export const dynamic = 'force-dynamic';

export default async function NewMinistryPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canCreate = userIsAdmin(user) || userIsPastoral(user);
  if (!canCreate) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="New Ministry" description="You do not have permission to create ministries." />
      </AppShell>
    );
  }

  const supabase = createClient();
  const { data: depts } = await supabase
    .from('departments')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');
  const leaders = await getLeaderOptions();

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="New Ministry" description="Create a new ministry within a department" />
        <MinistryForm
          mode="create"
          leaders={leaders}
          departments={(depts ?? []).map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </AppShell>
  );
}
