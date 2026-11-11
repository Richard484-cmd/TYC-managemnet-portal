'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { MetricCard } from '@/components/reports/metric-card';
import { CSVExportButton } from '@/components/reports/csv-export-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, UserCheck, Users, XCircle } from 'lucide-react';
import { resolveDateRange, formatDateLabel, type DateRange } from '@/lib/reports/date-range';

interface EventData {
  id: string;
  title: string;
  start_date: string;
  capacity: number | null;
  registrations: number;
  attended: number;
  noShows: number;
}

interface EventsData {
  totalEvents: number;
  totalRegistrations: number;
  totalAttended: number;
  totalNoShows: number;
  totalCapacity: number;
  events: EventData[];
}

export function EventsReportClient({ canExport }: { canExport: boolean }) {
  const supabase = createClient();
  const [range, setRange] = useState<DateRange>(resolveDateRange('this_year'));
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [eventOptions, setEventOptions] = useState<{ id: string; title: string }[]>([]);
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: events } = await supabase
        .from('events')
        .select('id, title')
        .is('deleted_at', null)
        .order('start_date', { ascending: false })
        .limit(100);
      setEventOptions((events as { id: string; title: string }[]) ?? []);
    })();
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(range.start + 'T00:00:00').toISOString();
    const endDate = new Date(range.end + 'T23:59:59').toISOString();

    let query = supabase
      .from('events')
      .select('id, title, start_date, capacity')
      .is('deleted_at', null)
      .gte('start_date', startDate)
      .lte('start_date', endDate)
      .order('start_date', { ascending: false });

    if (selectedEventId !== 'all') query = query.eq('id', selectedEventId);
    const { data: events } = await query;

    const eventsData: EventData[] = [];
    let totalRegistrations = 0;
    let totalAttended = 0;
    let totalNoShows = 0;
    let totalCapacity = 0;

    for (const e of events ?? []) {
      const ev = e as { id: string; title: string; start_date: string; capacity: number | null };
      const { count: regCount } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id)
        .neq('status', 'cancelled');
      const regNum = regCount ?? 0;
      totalRegistrations += regNum;
      if (ev.capacity) totalCapacity += ev.capacity;

      // Check attendance
      const { data: regData } = await supabase
        .from('event_registrations')
        .select('member_id')
        .eq('event_id', ev.id)
        .neq('status', 'cancelled');
      const regMemberIds = (regData ?? []).map((r) => (r as { member_id: string }).member_id).filter(Boolean);
      let attended = 0;
      if (regMemberIds.length > 0) {
        const eventDate = ev.start_date.split('T')[0];
        const { data: attEvents } = await supabase
          .from('attendance_events')
          .select('id')
          .eq('event_date', eventDate)
          .is('deleted_at', null);
        const attEventIds = (attEvents ?? []).map((a) => (a as { id: string }).id);
        if (attEventIds.length > 0) {
          const { count: attCount } = await supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .in('attendance_event_id', attEventIds)
            .in('member_id', regMemberIds)
            .in('status', ['present', 'late']);
          attended = attCount ?? 0;
        }
      }

      totalAttended += attended;
      const noShows = regNum - attended;
      totalNoShows += noShows;

      eventsData.push({
        id: ev.id,
        title: ev.title,
        start_date: ev.start_date,
        capacity: ev.capacity,
        registrations: regNum,
        attended,
        noShows,
      });
    }

    setData({
      totalEvents: events?.length ?? 0,
      totalRegistrations,
      totalAttended,
      totalNoShows,
      totalCapacity,
      events: eventsData,
    });
    setLoading(false);
  }, [range, selectedEventId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportRows = data?.events.map((e) => ({
    title: e.title,
    date: e.start_date.split('T')[0],
    capacity: e.capacity ?? 'N/A',
    registrations: e.registrations,
    attended: e.attended,
    noShows: e.noShows,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          {eventOptions.length > 0 && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {eventOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {canExport && (
          <CSVExportButton
            rows={exportRows}
            headers={[
              { key: 'title', label: 'Event' },
              { key: 'date', label: 'Date' },
              { key: 'capacity', label: 'Capacity' },
              { key: 'registrations', label: 'Registrations' },
              { key: 'attended', label: 'Attended' },
              { key: 'noShows', label: 'No-Shows' },
            ]}
            filename={`events-report-${range.start}-to-${range.end}`}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Events" value={data?.totalEvents ?? 0} icon={CalendarDays} tone="blue" loading={loading} empty={!loading && data?.totalEvents === 0} description={formatDateLabel(range)} />
        <MetricCard label="Registrations" value={data?.totalRegistrations ?? 0} icon={Users} tone="green" loading={loading} empty={!loading && data?.totalRegistrations === 0} description="Non-cancelled registrations" />
        <MetricCard label="Attended" value={data?.totalAttended ?? 0} icon={UserCheck} tone="navy" loading={loading} empty={!loading && data?.totalAttended === 0} description="Registered who attended" />
        <MetricCard label="No-Shows" value={data?.totalNoShows ?? 0} icon={XCircle} tone="red" loading={loading} empty={!loading && data?.totalNoShows === 0} description="Registered but not recorded" />
      </div>

      {data && data.totalCapacity > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Total Capacity" value={data.totalCapacity} icon={CalendarDays} tone="amber" description="Sum of event capacities" />
          <MetricCard label="Capacity Utilization" value={`${data.totalCapacity > 0 ? Math.round((data.totalRegistrations / data.totalCapacity) * 100) : 0}%`} icon={UserCheck} tone="green" description="Registrations / capacity" />
        </div>
      )}

      {data && data.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <p className="text-sm text-muted-foreground">Registration and attendance breakdown per event</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">Event</th>
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Capacity</th>
                    <th className="pb-2 text-right font-medium">Registered</th>
                    <th className="pb-2 text-right font-medium">Attended</th>
                    <th className="pb-2 text-right font-medium">No-Shows</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{e.title}</td>
                      <td className="py-2 text-muted-foreground">{new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="py-2 text-right">{e.capacity ?? '—'}</td>
                      <td className="py-2 text-right">{e.registrations}</td>
                      <td className="py-2 text-right text-emerald-600">{e.attended}</td>
                      <td className="py-2 text-right text-red-600">{e.noShows > 0 ? e.noShows : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data && data.events.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No events found for the selected period.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
