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
import { ClipboardList, CheckCircle, AlertTriangle, GitBranch } from 'lucide-react';
import { resolveDateRange, formatDateLabel, type DateRange } from '@/lib/reports/date-range';
import { getFollowUpTypeLabel } from '@/lib/crm/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface FollowUpData {
  open: number;
  completed: number;
  overdue: number;
  byType: { type: string; count: number }[];
  pipelineConversion: { stage_id: string; stage_name: string; position: number; contacts: number }[];
  officerActivity: { user_id: string; display_name: string; assigned: number; completed: number; open: number; overdue: number; completionRate: number }[];
}

export function FollowUpReportClient({ canExport }: { canExport: boolean }) {
  const supabase = createClient();
  const [range, setRange] = useState<DateRange>(resolveDateRange('this_month'));
  const [pipelineId, setPipelineId] = useState<string>('all');
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<FollowUpData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: pipes } = await supabase.from('crm_pipelines').select('id, name').eq('is_active', true).order('name');
      setPipelines((pipes as { id: string; name: string }[]) ?? []);
    })();
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(range.start).toISOString();
    const endDate = new Date(range.end + 'T23:59:59').toISOString();
    const now = new Date().toISOString().split('T')[0];

    const [{ count: open }, { count: completed }, { count: overdue }] = await Promise.all([
      supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).not('status', 'in', '("completed","cancelled")'),
      supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'completed').gte('completed_at', startDate).lte('completed_at', endDate),
      supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).not('status', 'in', '("completed","cancelled")').lt('due_date', now),
    ]);

    // By type
    const { data: typeData } = await supabase.rpc('count_followups_by_type');
    const byType = (typeData as { type: string; count: number }[] ?? []).map((t) => ({ type: t.type, count: t.count }));

    // Pipeline conversion
    let stageQuery = supabase.from('crm_pipeline_stages').select('id, name, position, pipeline_id').order('position', { ascending: true });
    if (pipelineId !== 'all') stageQuery = stageQuery.eq('pipeline_id', pipelineId);
    const { data: stages } = await stageQuery;

    const pipelineConversion: FollowUpData['pipelineConversion'] = [];
    for (const stage of stages ?? []) {
      const s = stage as { id: string; name: string; position: number };
      const { count } = await supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('stage_id', s.id).is('deleted_at', null);
      pipelineConversion.push({ stage_id: s.id, stage_name: s.name, position: s.position, contacts: count ?? 0 });
    }

    // Officer activity
    const { data: officers } = await supabase
      .from('follow_ups')
      .select('assigned_to')
      .is('deleted_at', null)
      .not('assigned_to', 'is', null);
    const officerIds = Array.from(new Set((officers ?? []).map((o) => (o as { assigned_to: string }).assigned_to)));

    const officerActivity: FollowUpData['officerActivity'] = [];
    if (officerIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, display_name').in('id', officerIds);
      const userMap = new Map((users ?? []).map((u) => [(u as { id: string }).id, (u as { display_name: string }).display_name]));

      for (const officerId of officerIds) {
        const [{ count: assigned }, { count: officerCompleted }, { count: officerOpen }, { count: officerOverdue }] = await Promise.all([
          supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).is('deleted_at', null),
          supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).eq('status', 'completed').is('deleted_at', null).gte('completed_at', startDate).lte('completed_at', endDate),
          supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).not('status', 'in', '("completed","cancelled")').is('deleted_at', null),
          supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).not('status', 'in', '("completed","cancelled")').lt('due_date', now).is('deleted_at', null),
        ]);
        const assignedNum = assigned ?? 0;
        const completedNum = officerCompleted ?? 0;
        officerActivity.push({
          user_id: officerId,
          display_name: userMap.get(officerId) ?? 'Unknown',
          assigned: assignedNum,
          completed: completedNum,
          open: officerOpen ?? 0,
          overdue: officerOverdue ?? 0,
          completionRate: assignedNum > 0 ? Math.round((completedNum / assignedNum) * 100) : 0,
        });
      }
    }

    setData({
      open: open ?? 0,
      completed: completed ?? 0,
      overdue: overdue ?? 0,
      byType,
      pipelineConversion,
      officerActivity: officerActivity.sort((a, b) => b.assigned - a.assigned),
    });
    setLoading(false);
  }, [range, pipelineId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pipelineChartData = data?.pipelineConversion.map((p) => ({
    stage: p.stage_name.length > 15 ? p.stage_name.substring(0, 15) + '...' : p.stage_name,
    contacts: p.contacts,
  })) ?? [];

  const typeChartData = data?.byType.map((t) => ({
    type: getFollowUpTypeLabel(t.type),
    count: t.count,
  })) ?? [];

  const officerExportRows = data?.officerActivity.map((o) => ({
    officer: o.display_name,
    assigned: o.assigned,
    completed: o.completed,
    open: o.open,
    overdue: o.overdue,
    completionRate: `${o.completionRate}%`,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          {pipelines.length > 0 && (
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All pipelines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pipelines</SelectItem>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {canExport && (
          <CSVExportButton
            rows={officerExportRows}
            headers={[
              { key: 'officer', label: 'Officer' },
              { key: 'assigned', label: 'Assigned' },
              { key: 'completed', label: 'Completed' },
              { key: 'open', label: 'Open' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'completionRate', label: 'Completion Rate' },
            ]}
            filename={`followup-report-${range.start}-to-${range.end}`}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Open Follow-Ups" value={data?.open ?? 0} icon={ClipboardList} tone="blue" loading={loading} empty={!loading && data?.open === 0} description="Not completed or cancelled" />
        <MetricCard label="Completed Follow-Ups" value={data?.completed ?? 0} icon={CheckCircle} tone="green" loading={loading} empty={!loading && data?.completed === 0} description={`Completed ${formatDateLabel(range)}`} />
        <MetricCard label="Overdue Follow-Ups" value={data?.overdue ?? 0} icon={AlertTriangle} tone="red" loading={loading} empty={!loading && data?.overdue === 0} description="Due date passed, still open" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-[#1764c0]" />
              Pipeline Conversion
            </CardTitle>
            <p className="text-sm text-muted-foreground">Follow-ups across pipeline stages</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : pipelineChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No pipeline stage data available.</p>
            ) : (
              <ChartContainer config={{ contacts: { label: 'Contacts', color: '#2563eb' } }} className="h-[280px] w-full">
                <BarChart data={pipelineChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="contacts" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-Ups by Type</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution across follow-up types</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : typeChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No follow-up type data available.</p>
            ) : (
              <ChartContainer config={{ count: { label: 'Count', color: '#16a34a' } }} className="h-[280px] w-full">
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {data && data.officerActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Officer Activity</CardTitle>
            <p className="text-sm text-muted-foreground">Follow-up performance by assigned officer</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">Officer</th>
                    <th className="pb-2 text-right font-medium">Assigned</th>
                    <th className="pb-2 text-right font-medium">Completed</th>
                    <th className="pb-2 text-right font-medium">Open</th>
                    <th className="pb-2 text-right font-medium">Overdue</th>
                    <th className="pb-2 text-right font-medium">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.officerActivity.map((o) => (
                    <tr key={o.user_id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{o.display_name}</td>
                      <td className="py-2 text-right">{o.assigned}</td>
                      <td className="py-2 text-right text-emerald-600">{o.completed}</td>
                      <td className="py-2 text-right">{o.open}</td>
                      <td className="py-2 text-right text-red-600">{o.overdue}</td>
                      <td className="py-2 text-right font-semibold">{o.completionRate}%</td>
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
