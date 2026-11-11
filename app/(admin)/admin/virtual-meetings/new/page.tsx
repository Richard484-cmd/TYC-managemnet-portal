import { requireStaff, userIsAdmin, userIsPastoral, userHasRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MeetingForm } from '@/components/admin/virtual-meetings/meeting-form';

export const dynamic = 'force-dynamic';

export default async function NewMeetingPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canCreate = userIsAdmin(user) || userIsPastoral(user) || userHasRole(user, 'group_leader') || userHasRole(user, 'department_leader');

  if (!canCreate) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="New Meeting" description="You do not have permission to schedule meetings." />
      </AppShell>
    );
  }

  const supabase = createClient();
  const [groupsResult, departmentsResult, ministriesResult] = await Promise.all([
    supabase.from('groups').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('departments').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('ministries').select('id, name').is('deleted_at', null).order('name'),
  ]);

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="New Meeting" description="Schedule a virtual meeting or fellowship session" />
        <MeetingForm
          mode="create"
          groups={(groupsResult.data ?? []).map((g) => ({ id: g.id, name: g.name }))}
          departments={(departmentsResult.data ?? []).map((d) => ({ id: d.id, name: d.name }))}
          ministries={(ministriesResult.data ?? []).map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>
    </AppShell>
  );
}
