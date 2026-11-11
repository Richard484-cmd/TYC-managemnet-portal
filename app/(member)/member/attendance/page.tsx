import { requireUser } from '@/lib/auth/session';
import { memberNavItems } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { CalendarCheck, Clock3, TrendingUp } from 'lucide-react';
import type { MemberAttendanceRecord } from '@/lib/attendance/schema';
import {
  getEventTypeLabel,
  getAttendanceStatusLabel,
  getAttendanceStatusColor,
} from '@/lib/attendance/constants';

export const dynamic = 'force-dynamic';

export default async function MemberAttendancePage() {
  const user = await requireUser();
  const supabase = createClient();

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) {
    return (
      <AppShell items={memberNavItems} label="Member Portal" user={user} isAdmin={false}>
        <PageHeader title="My Attendance" description="Your attendance history" />
        <EmptyState
          icon={CalendarCheck}
          title="No member profile linked"
          description="Your account is not linked to a member record yet. Please contact your church administrator."
        />
      </AppShell>
    );
  }

  const { data: rawRecords, error } = await supabase
    .from('attendance_records')
    .select(`id, status, check_in_time, notes, member_id`)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching member attendance:', error.message);
  }

  const eventIds = ((rawRecords ?? []) as Array<{ id: string }>).map(() => '');

  const records = (rawRecords ?? []) as Array<any>;

  const eventIdsFromRecords = records.map((r) => r.attendance_event_id).filter(Boolean);

  let eventMap = new Map<string, { title: string; event_type: string; event_date: string; start_time: string | null }>();
  if (eventIdsFromRecords.length > 0) {
    const { data: events } = await supabase
      .from('attendance_events')
      .select('id, title, event_type, event_date, start_time')
      .in('id', eventIdsFromRecords);
    for (const e of (events ?? []) as Array<any>) {
      eventMap.set(e.id, {
        title: e.title,
        event_type: e.event_type,
        event_date: e.event_date,
        start_time: e.start_time,
      });
    }
  }

  const attendanceRecords: MemberAttendanceRecord[] = records.map((r) => {
    const e = eventMap.get(r.attendance_event_id);
    return {
      id: r.id,
      status: r.status,
      check_in_time: r.check_in_time,
      notes: r.notes,
      event_title: e?.title ?? 'Unknown service',
      event_type: e?.event_type ?? 'other',
      event_date: e?.event_date ?? '',
      start_time: e?.start_time ?? null,
    };
  });

  const total = attendanceRecords.length;
  const present = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const byType = new Map<string, { total: number; present: number }>();
  for (const r of attendanceRecords) {
    const entry = byType.get(r.event_type) ?? { total: 0, present: 0 };
    entry.total += 1;
    if (r.status === 'present' || r.status === 'late') entry.present += 1;
    byType.set(r.event_type, entry);
  }

  const formatCheckIn = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      return new Date(timeStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <AppShell items={memberNavItems} label="Member Portal" user={user} isAdmin={false}>
      <div className="space-y-6">
        <PageHeader
          title="My Attendance"
          description="Your attendance history and statistics"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Overall rate</p>
              <p className="mt-2 text-3xl font-bold text-[#0b2340]">{rate}%</p>
              <Progress value={rate} className="mt-3 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Services attended</p>
              <p className="mt-2 text-3xl font-bold text-[#0b2340]">{present}</p>
              <p className="mt-1 text-xs text-muted-foreground">out of {total} recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total records</p>
              <p className="mt-2 text-3xl font-bold text-[#0b2340]">{total}</p>
            </CardContent>
          </Card>
        </div>

        {byType.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance by service type</CardTitle>
              <CardDescription>Your attendance breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from(byType.entries()).map(([type, stats]) => {
                const typeRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{getEventTypeLabel(type)}</span>
                      <span className="text-muted-foreground">{stats.present}/{stats.total} ({typeRate}%)</span>
                    </div>
                    <Progress value={typeRate} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {attendanceRecords.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No attendance records yet"
            description="Your attendance will appear here once your church starts recording it."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Attendance history</CardTitle>
              <CardDescription>All your recorded attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attendanceRecords.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-[#eef5ff] text-[#1764c0]">
                        <CalendarCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{r.event_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.event_date)} · {getEventTypeLabel(r.event_type)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="h-3 w-3" /> Check-in: {formatCheckIn(r.check_in_time)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getAttendanceStatusColor(r.status)}`}>
                      {getAttendanceStatusLabel(r.status)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
