import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { GroupForm } from '@/components/admin/organization/group-form';
import { getLeaderOptions } from '@/lib/organization/data';
import type { GroupFormValues } from '@/lib/organization/schema';

export const dynamic = 'force-dynamic';

export default async function EditGroupPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canEdit = userIsAdmin(user) || userIsPastoral(user);

  const supabase = createClient();
  const { data: group, error } = await supabase
    .from('groups')
    .select('id, name, description, ministry_id, group_type, leader_id, meeting_day, meeting_time, location, max_capacity, status, display_order')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !group) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="Edit Group" description="Group not found." />
      </AppShell>
    );
  }

  if (!canEdit) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="Edit Group" description="You do not have permission to edit groups." />
      </AppShell>
    );
  }

  const [{ data: ministries }, leaders] = await Promise.all([
    supabase.from('ministries').select('id, name').is('deleted_at', null).order('name'),
    getLeaderOptions(),
  ]);

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Edit Group" description={group.name} />
        <GroupForm
          mode="edit"
          groupId={group.id}
          defaultValues={{
            name: group.name,
            description: group.description ?? '',
            ministry_id: group.ministry_id,
            group_type: group.group_type as GroupFormValues['group_type'],
            leader_id: group.leader_id,
            meeting_day: group.meeting_day,
            meeting_time: group.meeting_time ?? '',
            location: group.location ?? '',
            max_capacity: group.max_capacity,
            status: group.status as 'active' | 'inactive' | 'full',
            display_order: group.display_order,
          }}
          leaders={leaders}
          ministries={(ministries ?? []).map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>
    </AppShell>
  );
}
