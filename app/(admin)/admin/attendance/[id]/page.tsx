import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Pencil, ArrowLeft } from 'lucide-react';
import type { AttendanceEventDetail, AttendanceRecordWithMember } from '@/lib/attendance/schema';
import { AttendanceRecordingClient } from '@/components/admin/attendance/attendance-recording-client';

export const dynamic = 'force-dynamic';

export default async function AttendanceEventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: rawEvent, error: eventError } = await supabase
    .from('attendance_events')
    .select(`id, title, event_type, event_date, start_time, end_time, department_id, group_id, location, notes, status`)
    .eq('id', params.id)
    .maybeSingle();

  if (eventError || !rawEvent) {
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

  const deptId = (rawEvent as any).department_id as string | null;
  const groupId = (rawEvent as any).group_id as string | null;

  const [{ data: records }, { data: dept }, { data: group }] = await Promise.all([
    supabase
      .from('attendance_records')
      .select(`id, member_id, status, notes, check_in_time, recorded_by`)
      .eq('attendance_event_id', params.id),
    deptId ? supabase.from('departments').select('name').eq('id', deptId).maybeSingle() : Promise.resolve({ data: null }),
    groupId ? supabase.from('groups').select('name').eq('id', groupId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const memberIds = ((records ?? []) as Array<{ member_id: string }>).map((r) => r.member_id);
  let memberMap = new Map<string, { first_name: string; last_name: string; email: string | null; phone: string | null; status_key: string | null }>();
  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, phone, status_key')
      .in('id', memberIds);
    for (const m of (members ?? []) as Array<any>) {
      memberMap.set(m.id, {
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
        phone: m.phone,
        status_key: m.status_key,
      });
    }
  }

  const eventDetail: AttendanceEventDetail = {
    ...rawEvent,
    department_name: (dept as any)?.name ?? null,
    group_name: (group as any)?.name ?? null,
    record_count: 0,
    present_count: 0,
  };

  const recordsWithMembers: AttendanceRecordWithMember[] = ((records ?? []) as Array<any>).map((r) => {
    const m = memberMap.get(r.member_id);
    return {
      id: r.id,
      member_id: r.member_id,
      status: r.status,
      notes: r.notes,
      check_in_time: r.check_in_time,
      recorded_by: r.recorded_by,
      member_first_name: m?.first_name ?? '',
      member_last_name: m?.last_name ?? '',
      member_email: m?.email ?? null,
      member_phone: m?.phone ?? null,
      member_status_key: m?.status_key ?? null,
    };
  });

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <div className="space-y-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href="/admin/attendance"><ArrowLeft className="mr-2 h-4 w-4" /> Back to attendance</Link>
        </Button>
        <PageHeader
          title={eventDetail.title}
          description={eventDetail.department_name ?? eventDetail.group_name ?? 'Church-wide'}
          actions={
            <Button asChild variant="outline">
              <Link href={`/admin/attendance/${eventDetail.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          }
        />
        <AttendanceRecordingClient
          event={eventDetail}
          initialRecords={recordsWithMembers}
        />
      </div>
    </AppShell>
  );
}
