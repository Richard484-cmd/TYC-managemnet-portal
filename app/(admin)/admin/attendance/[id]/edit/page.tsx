import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AttendanceEventForm } from '@/components/admin/attendance/attendance-event-form';

export const dynamic = 'force-dynamic';

export default async function EditAttendanceEventPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: rawEvent, error } = await supabase
    .from('attendance_events')
    .select(`id, title, event_type, event_date, start_time, end_time, department_id, group_id, location, notes, status`)
    .eq('id', params.id)
    .maybeSingle();

  if (error || !rawEvent) {
    return (
      <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
        <div className="space-y-4">
          <Button asChild variant="ghost">
            <Link href="/admin/attendance"><ArrowLeft className="mr-2 h-4 w-4" /> Back to attendance</Link>
          </Button>
          <p className="text-muted-foreground">This service could not be found.</p>
        </div>
      </AppShell>
    );
  }

  const [{ data: departments }, { data: groups }] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('groups').select('id, name, group_type').order('name'),
  ]);

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <div className="space-y-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href={`/admin/attendance/${params.id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to service</Link>
        </Button>
        <PageHeader
          title="Edit service"
          description={rawEvent.title}
        />
        <AttendanceEventForm
          mode="edit"
          event={rawEvent as any}
          departments={(departments ?? []).map((d: any) => ({ id: d.id, name: d.name }))}
          groups={(groups ?? []).map((g: any) => ({ id: g.id, name: g.name }))}
        />
      </div>
    </AppShell>
  );
}
