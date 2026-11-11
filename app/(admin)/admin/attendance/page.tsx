import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { PAGE_SIZE, EVENT_TYPES, EVENT_STATUSES } from '@/lib/attendance/constants';
import type { AttendanceEventListItem, AttendanceEventListResult } from '@/lib/attendance/schema';
import { AttendanceEventListClient } from '@/components/admin/attendance/attendance-event-list-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  search?: string;
  type?: string;
  status?: string;
  sort?: string;
  page?: string;
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const search = searchParams.search ?? '';
  const typeFilter = searchParams.type ?? 'all';
  const statusFilter = searchParams.status ?? 'all';
  const sort = searchParams.sort ?? 'date_desc';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  let query = supabase
    .from('attendance_events')
    .select(
      `id, title, event_type, event_date, start_time, end_time, department_id, group_id, location, status, deleted_at`,
      { count: 'exact' }
    )
    .is('deleted_at', null);

  if (search) {
    query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
  }

  if (typeFilter !== 'all') {
    query = query.eq('event_type', typeFilter);
  }

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  switch (sort) {
    case 'date_asc':
      query = query.order('event_date', { ascending: true });
      break;
    case 'title_asc':
      query = query.order('title', { ascending: true });
      break;
    case 'title_desc':
      query = query.order('title', { ascending: false });
      break;
    case 'date_desc':
    default:
      query = query.order('event_date', { ascending: false });
      break;
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching attendance events:', error.message);
  }

  const rawEvents = (data ?? []) as Array<{
    id: string;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    department_id: string | null;
    group_id: string | null;
    location: string | null;
    status: string;
  }>;

  const eventIds = rawEvents.map((e) => e.id);

  const deptIds = rawEvents.map((e) => e.department_id).filter(Boolean) as string[];
  const groupIds = rawEvents.map((e) => e.group_id).filter(Boolean) as string[];

  const [recordsResult, deptsResult, groupsResult] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from('attendance_records')
          .select('attendance_event_id, status')
          .in('attendance_event_id', eventIds)
      : Promise.resolve({ data: [], error: null }),
    deptIds.length > 0
      ? supabase.from('departments').select('id, name').in('id', deptIds)
      : Promise.resolve({ data: [], error: null }),
    groupIds.length > 0
      ? supabase.from('groups').select('id, name').in('id', groupIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const recordCounts = new Map<string, { total: number; present: number }>();
  for (const r of (recordsResult.data ?? []) as Array<{ attendance_event_id: string; status: string }>) {
    const entry = recordCounts.get(r.attendance_event_id) ?? { total: 0, present: 0 };
    entry.total += 1;
    if (r.status === 'present' || r.status === 'late') entry.present += 1;
    recordCounts.set(r.attendance_event_id, entry);
  }

  const deptMap = new Map<string, string>();
  for (const d of (deptsResult.data ?? []) as Array<{ id: string; name: string }>) {
    deptMap.set(d.id, d.name);
  }

  const groupMap = new Map<string, string>();
  for (const g of (groupsResult.data ?? []) as Array<{ id: string; name: string }>) {
    groupMap.set(g.id, g.name);
  }

  const events: AttendanceEventListItem[] = rawEvents.map((e) => {
    const counts = recordCounts.get(e.id) ?? { total: 0, present: 0 };
    return {
      id: e.id,
      title: e.title,
      event_type: e.event_type,
      event_date: e.event_date,
      start_time: e.start_time,
      end_time: e.end_time,
      department_id: e.department_id,
      group_id: e.group_id,
      location: e.location,
      status: e.status,
      department_name: e.department_id ? deptMap.get(e.department_id) ?? null : null,
      group_name: e.group_id ? groupMap.get(e.group_id) ?? null : null,
      record_count: counts.total,
      present_count: counts.present,
    };
  });

  const result: AttendanceEventListResult = { events, total: count ?? 0 };

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Attendance"
          description={`${result.total} ${result.total === 1 ? 'service' : 'services'} tracked`}
          actions={
            <Button asChild>
              <Link href="/admin/attendance/new">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Service
              </Link>
            </Button>
          }
        />
        <AttendanceEventListClient
          initialData={result}
          eventTypes={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          statuses={EVENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          currentPage={page}
          pageSize={PAGE_SIZE}
          search={search}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          sort={sort}
        />
      </div>
    </AppShell>
  );
}
