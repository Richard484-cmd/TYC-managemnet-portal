import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { GroupForm } from '@/components/admin/organization/group-form';
import { getLeaderOptions } from '@/lib/organization/data';

export const dynamic = 'force-dynamic';

export default async function NewGroupPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canCreate = userIsAdmin(user) || userIsPastoral(user);
  if (!canCreate) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="New Group" description="You do not have permission to create groups." />
      </AppShell>
    );
  }

  const supabase = createClient();
  const { data: ministries } = await supabase
    .from('ministries')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');
  const leaders = await getLeaderOptions();

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="New Group" description="Create a new small group, cell group, or Bible study" />
        <GroupForm
          mode="create"
          leaders={leaders}
          ministries={(ministries ?? []).map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>
    </AppShell>
  );
}
