'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { MetricCard } from '@/components/reports/metric-card';
import { CSVExportButton } from '@/components/reports/csv-export-button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Church, Users, CalendarCheck, TrendingUp } from 'lucide-react';
import { resolveDateRange, formatDateLabel, type DateRange } from '@/lib/reports/date-range';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface AttendanceData {
  averageAttendance: number;
  attendancePercentage: number;
  totalEvents: number;
  totalRecords: number;
  presentCount: number;
  visitorAttendance: number;
  trends: { date: string; present: number; total: number }[];
  byDepartment: { department_id: string | null; department_name: string; events: number; present: number; total: number; rate: number }[];
}

export function AttendanceReportClient({ canExport }: { canExport: boolean }) {
  const supabase = createClient();
  const [range, setRange] = useState<DateRange>(resolveDateRange('this_month'));
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: depts } = await supabase.from('departments').select('id, name').is('deleted_at', null).order('name');
      setDepartments((depts as { id: string; name: string }[]) ?? []);
    })();
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    let eventQuery = supabase
      .from('attendance_events')
      .select('id, title, event_date, department_id, event_type')
      .is('deleted_at', null)
      .gte('event_date', range.start)
      .lte('event_date', range.end)
      .order('event_date', { ascending: true });

    if (departmentId !== 'all') {
      eventQuery = eventQuery.eq('department_id', departmentId);
    }

    const { data: events } = await eventQuery;
    const eventIds = (events ?? []).map((e) => (e as { id: string }).id);

    let totalRecords = 0;
    let presentCount = 0;
    const trendsMap = new Map<string, { present: number; total: number }>();
    let visitorAttendance = 0;

    if (eventIds.length > 0) {
      const { data: records } = await supabase
        .from('attendance_records')
        .select('attendance_event_id, member_id, status')
        .in('attendance_event_id', eventIds);

      const eventDateMap = new Map<string, string>();
      for (const e of events ?? []) {
        const ev = e as { id: string; event_date: string };
        eventDateMap.set(ev.id, ev.event_date);
      }

      for (const r of records ?? []) {
        const rec = r as { attendance_event_id: string; member_id: string; status: string };
        totalRecords++;
        const date = eventDateMap.get(rec.attendance_event_id) ?? '';
        const entry = trendsMap.get(date) ?? { present: 0, total: 0 };
        entry.total++;
        if (rec.status === 'present' || rec.status === 'late') {
          entry.present++;
          presentCount++;
        }
      }

      // Visitor attendance
      const { data: visitorMembers } = await supabase
        .from('members')
        .select('id')
        .eq('status_key', 'visitor')
        .is('deleted_at', null);
      const visitorIds = new Set((visitorMembers ?? []).map((m) => (m as { id: string }).id));
      for (const r of records ?? []) {
        if (visitorIds.has((r as { member_id: string }).member_id)) visitorAttendance++;
      }
    }

    const trends = Array.from(trendsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v }));

    // Department breakdown
    const byDepartment: AttendanceData['byDepartment'] = [];
    for (const dept of departments) {
      const deptEvents = (events ?? []).filter((e) => (e as { department_id: string | null }).department_id === dept.id);
      const deptEventIds = deptEvents.map((e) => (e as { id: string }).id);
      if (deptEventIds.length === 0) {
        byDepartment.push({ department_id: dept.id, department_name: dept.name, events: 0, present: 0, total: 0, rate: 0 });
        continue;
      }
      const [{ count: dTotal }, { count: dPresent }] = await Promise.all([
        supabase.from('attendance_records').select('*', { count: 'exact', head: true }).in('attendance_event_id', deptEventIds),
        supabase.from('attendance_records').select('*', { count: 'exact', head: true }).in('attendance_event_id', deptEventIds).in('status', ['present', 'late']),
      ]);
      byDepartment.push({
        department_id: dept.id,
        department_name: dept.name,
        events: deptEvents.length,
        present: dPresent ?? 0,
        total: dTotal ?? 0,
        rate: (dTotal ?? 0) > 0 ? Math.round(((dPresent ?? 0) / (dTotal ?? 0)) * 100) : 0,
      });
    }

    setData({
      averageAttendance: (events?.length ?? 0) > 0 ? Math.round(presentCount / (events?.length ?? 1)) : 0,
      attendancePercentage: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
      totalEvents: events?.length ?? 0,
      totalRecords,
      presentCount,
      visitorAttendance,
      trends,
      byDepartment,
    });
    setLoading(false);
  }, [range, departmentId, departments, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const trendChartData = data?.trends.map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    present: t.present,
    total: t.total,
  })) ?? [];

  const deptChartData = data?.byDepartment
    .filter((d) => d.events > 0)
    .map((d) => ({
      department: d.department_name.length > 12 ? d.department_name.substring(0, 12) + '...' : d.department_name,
      rate: d.rate,
    })) ?? [];

  const deptExportRows = data?.byDepartment.map((d) => ({
    department: d.department_name,
    events: d.events,
    present: d.present,
    total: d.total,
    rate: `${d.rate}%`,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          {departments.length > 0 && (
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {canExport && (
          <CSVExportButton
            rows={deptExportRows}
            headers={[
              { key: 'department', label: 'Department' },
              { key: 'events', label: 'Events' },
              { key: 'present', label: 'Present' },
              { key: 'total', label: 'Total Records' },
              { key: 'rate', label: 'Rate' },
            ]}
            filename={`attendance-report-${range.start}-to-${range.end}`}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Average Attendance" value={data?.averageAttendance ?? 0} icon={Church} tone="blue" loading={loading} empty={!loading && data?.averageAttendance === 0} description="Per event in period" />
        <MetricCard label="Attendance Rate" value={`${data?.attendancePercentage ?? 0}%`} icon={CalendarCheck} tone="green" loading={loading} empty={!loading && data?.attendancePercentage === 0} description="Present / total records" />
        <MetricCard label="Total Events" value={data?.totalEvents ?? 0} icon={CalendarCheck} tone="navy" loading={loading} empty={!loading && data?.totalEvents === 0} description={formatDateLabel(range)} />
        <MetricCard label="Visitor Attendance" value={data?.visitorAttendance ?? 0} icon={Users} tone="amber" loading={loading} empty={!loading && data?.visitorAttendance === 0} description="Visitors in attendance" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#1764c0]" />
              Attendance Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground">Present vs total over {formatDateLabel(range)}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : trendChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No attendance data for the selected period.</p>
            ) : (
              <ChartContainer config={{ present: { label: 'Present', color: '#16a34a' }, total: { label: 'Total', color: '#93c5fd' } }} className="h-[280px] w-full">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="#93c5fd" strokeWidth={1.5} dot={false} name="Total" />
                  <Line type="monotone" dataKey="present" stroke="#16a34a" strokeWidth={2} dot={false} name="Present" />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Attendance</CardTitle>
            <p className="text-sm text-muted-foreground">Attendance rate by department</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : deptChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No department attendance data for the selected period.</p>
            ) : (
              <ChartContainer config={{ rate: { label: 'Rate %', color: '#2563eb' } }} className="h-[280px] w-full">
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="rate" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {data && data.byDepartment.some((d) => d.events > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Department Attendance Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">Department</th>
                    <th className="pb-2 text-right font-medium">Events</th>
                    <th className="pb-2 text-right font-medium">Present</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                    <th className="pb-2 text-left font-medium pl-6">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byDepartment.filter((d) => d.events > 0).map((d) => (
                    <tr key={d.department_id} className="border-b last:border-0">
                      <td className="py-2">{d.department_name}</td>
                      <td className="py-2 text-right">{d.events}</td>
                      <td className="py-2 text-right">{d.present}</td>
                      <td className="py-2 text-right">{d.total}</td>
                      <td className="py-2 pl-6">
                        <div className="flex items-center gap-2">
                          <Progress value={d.rate} className="h-2 w-24" />
                          <span className="text-xs text-muted-foreground">{d.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
