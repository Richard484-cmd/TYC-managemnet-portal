import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MinistryForm } from '@/components/admin/organization/ministry-form';
import { getLeaderOptions } from '@/lib/organization/data';

export const dynamic = 'force-dynamic';

export default async function EditMinistryPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canEdit = userIsAdmin(user) || userIsPastoral(user);

  const supabase = createClient();
  const { data: ministry, error } = await supabase
    .from('ministries')
    .select('id, name, description, department_id, leader_id, meeting_day, meeting_time, location, status, display_order')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !ministry) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="Edit Ministry" description="Ministry not found." />
      </AppShell>
    );
  }

  if (!canEdit) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="Edit Ministry" description="You do not have permission to edit ministries." />
      </AppShell>
    );
  }

  const [{ data: depts }, leaders] = await Promise.all([
    supabase.from('departments').select('id, name').is('deleted_at', null).order('name'),
    getLeaderOptions(),
  ]);

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Edit Ministry" description={ministry.name} />
        <MinistryForm
          mode="edit"
          ministryId={ministry.id}
          defaultValues={{
            name: ministry.name,
            description: ministry.description ?? '',
            department_id: ministry.department_id,
            leader_id: ministry.leader_id,
            meeting_day: ministry.meeting_day,
            meeting_time: ministry.meeting_time ?? '',
            location: ministry.location ?? '',
            status: ministry.status as 'active' | 'inactive',
            display_order: ministry.display_order,
          }}
          leaders={leaders}
          departments={(depts ?? []).map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </AppShell>
  );
}
