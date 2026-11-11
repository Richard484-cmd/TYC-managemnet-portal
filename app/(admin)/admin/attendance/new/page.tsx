import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { AttendanceEventForm } from '@/components/admin/attendance/attendance-event-form';

export const dynamic = 'force-dynamic';

export default async function NewAttendanceEventPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const [{ data: departments }, { data: groups }] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('groups').select('id, name, group_type').order('name'),
  ]);

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Create Service"
          description="Schedule a new attendance service or meeting"
        />
        <AttendanceEventForm
          mode="create"
          departments={(departments ?? []).map((d: any) => ({ id: d.id, name: d.name }))}
          groups={(groups ?? []).map((g: any) => ({ id: g.id, name: g.name }))}
        />
      </div>
    </AppShell>
  );
}
