'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { MetricCard } from '@/components/reports/metric-card';
import { CSVExportButton } from '@/components/reports/csv-export-button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { resolveDateRange, formatDateLabel, type DateRange } from '@/lib/reports/date-range';
import { MEMBER_STATUSES } from '@/lib/members/constants';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MembershipData {
  totalMembers: number;
  newMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  visitors: number;
  growth: { date: string; count: number }[];
  byStatus: { status_key: string; label: string; count: number }[];
  previousNewMembers: number;
}

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#06b6d4', '#dc2626', '#6b7280'];

export function MembershipReportClient({ canExport }: { canExport: boolean }) {
  const supabase = createClient();
  const [range, setRange] = useState<DateRange>(resolveDateRange('this_year'));
  const [data, setData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [startYear, startMonth, startDay] = range.start.split('-').map(Number);
    const [endYear, endMonth, endDay] = range.end.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay).toISOString();
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59).toISOString();

    const [
      { count: totalMembers },
      { count: newMembers },
      { count: activeMembers },
      { count: inactiveMembers },
      { count: visitors },
      { data: growthData },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', startDate).lte('created_at', endDate),
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status_key', 'member'),
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).in('status_key', ['inactive', 'archived']),
      supabase.from('visitors').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('members').select('created_at').is('deleted_at', null).gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: true }),
    ]);

    // Growth cumulative
    const growthMap = new Map<string, number>();
    for (const m of growthData ?? []) {
      const day = (m as { created_at: string }).created_at.split('T')[0];
      growthMap.set(day, (growthMap.get(day) ?? 0) + 1);
    }
    let cumulative = (totalMembers ?? 0) - (newMembers ?? 0);
    const growth: { date: string; count: number }[] = [];
    const sDate = new Date(range.start);
    const eDate = new Date(range.end);
    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0];
      cumulative += growthMap.get(dayKey) ?? 0;
      growth.push({ date: dayKey, count: cumulative });
    }

    // By status
    const { data: statusRows } = await supabase.rpc('count_members_by_status');
    const STATUS_LABELS: Record<string, string> = {
      visitor: 'Visitor', regular_attender: 'New Member', member: 'Active Member',
      worker: 'Worker', inactive: 'Inactive', archived: 'Archived',
    };
    const byStatus = (statusRows as { status_key: string; count: number }[] ?? []).map((s) => ({
      status_key: s.status_key,
      label: STATUS_LABELS[s.status_key] ?? s.status_key,
      count: s.count,
    }));

    setData({
      totalMembers: totalMembers ?? 0,
      newMembers: newMembers ?? 0,
      activeMembers: activeMembers ?? 0,
      inactiveMembers: inactiveMembers ?? 0,
      visitors: visitors ?? 0,
      growth,
      byStatus,
      previousNewMembers: 0,
    });
    setLoading(false);
  }, [range, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const growthChartData = data?.growth.map((g) => ({
    date: new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    members: g.count,
  })) ?? [];

  const statusChartData = data?.byStatus.map((s) => ({
    name: s.label,
    value: s.count,
  })) ?? [];

  const exportRows = data?.byStatus.map((s) => ({
    status: s.label,
    count: s.count,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DateRangeFilter value={range} onChange={setRange} />
        {canExport && (
          <CSVExportButton
            rows={exportRows}
            headers={[{ key: 'status', label: 'Status' }, { key: 'count', label: 'Count' }]}
            filename={`membership-report-${range.start}-to-${range.end}`}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Members" value={data?.totalMembers ?? 0} icon={Users} tone="blue" loading={loading} empty={!loading && data?.totalMembers === 0} description="All member records" />
        <MetricCard label="New Members" value={data?.newMembers ?? 0} icon={UserPlus} tone="green" loading={loading} empty={!loading && data?.newMembers === 0} description={`Added ${formatDateLabel(range)}`} />
        <MetricCard label="Active Members" value={data?.activeMembers ?? 0} icon={UserCheck} tone="green" loading={loading} empty={!loading && data?.activeMembers === 0} description="Status: Active Member" />
        <MetricCard label="Inactive Members" value={data?.inactiveMembers ?? 0} icon={UserX} tone="amber" loading={loading} empty={!loading && data?.inactiveMembers === 0} description="Status: Inactive/Archived" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Visitors" value={data?.visitors ?? 0} icon={UserPlus} tone="navy" loading={loading} empty={!loading && data?.visitors === 0} description="Registered visitors" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#1764c0]" />
              Membership Growth
            </CardTitle>
            <p className="text-sm text-muted-foreground">Cumulative member count over {formatDateLabel(range)}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : growthChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No membership data for the selected period.</p>
            ) : (
              <ChartContainer config={{ members: { label: 'Members', color: '#2563eb' } }} className="h-[280px] w-full">
                <LineChart data={growthChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="members" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members by Status</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution across membership statuses</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : statusChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No member status data available.</p>
            ) : (
              <ChartContainer config={{ value: { label: 'Members', color: '#2563eb' } }} className="h-[280px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(entry: { name: string }) => entry.name}>
                    {statusChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {data && data.byStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Membership Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Count</th>
                    <th className="pb-2 text-right font-medium">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byStatus.map((s) => (
                    <tr key={s.status_key} className="border-b last:border-0">
                      <td className="py-2">{s.label}</td>
                      <td className="py-2 text-right">{s.count}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {data.totalMembers > 0 ? ((s.count / data.totalMembers) * 100).toFixed(1) : 0}%
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
