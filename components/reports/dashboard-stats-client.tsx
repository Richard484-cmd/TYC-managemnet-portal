'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/reports/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowRight, Users, UserPlus, Church, CircleDollarSign, ClipboardList, TrendingUp } from 'lucide-react';
import { formatAmount } from '@/lib/giving/constants';

interface DashboardStats {
  totalMembers: number;
  newMembersThisMonth: number;
  visitors: number;
  openFollowUps: number;
  overdueFollowUps: number;
  avgAttendance: number;
  attendanceRate: number;
  totalGiving: number;
  givingCurrency: string;
  givingCount: number;
  recentEvents: { id: string; title: string; event_date: string; present: number; total: number }[];
}

export function DashboardStatsClient({ canViewGiving }: { canViewGiving: boolean }) {
  const supabase = createClient();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const [
        { count: totalMembers },
        { count: newMembersThisMonth },
        { count: visitors },
        { count: openFollowUps },
        { count: overdueFollowUps },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', monthStart).lte('created_at', monthEnd),
        supabase.from('visitors').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).not('status', 'in', '("completed","cancelled")'),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).not('status', 'in', '("completed","cancelled")').lt('due_date', now.toISOString().split('T')[0]),
      ]);

      // Attendance: last 5 events
      const { data: recentEvents } = await supabase
        .from('attendance_events')
        .select('id, title, event_date')
        .is('deleted_at', null)
        .order('event_date', { ascending: false })
        .limit(5);

      const eventIds = (recentEvents ?? []).map((e) => (e as { id: string }).id);
      let totalPresent = 0;
      let totalRecords = 0;
      const eventsWithCounts: DashboardStats['recentEvents'] = [];

      if (eventIds.length > 0) {
        const { data: records } = await supabase
          .from('attendance_records')
          .select('attendance_event_id, status')
          .in('attendance_event_id', eventIds);

        const counts = new Map<string, { present: number; total: number }>();
        for (const r of records ?? []) {
          const rec = r as { attendance_event_id: string; status: string };
          const e = counts.get(rec.attendance_event_id) ?? { present: 0, total: 0 };
          e.total++;
          if (rec.status === 'present' || rec.status === 'late') e.present++;
          counts.set(rec.attendance_event_id, e);
        }

        for (const e of recentEvents ?? []) {
          const ev = e as { id: string; title: string; event_date: string };
          const c = counts.get(ev.id) ?? { present: 0, total: 0 };
          totalPresent += c.present;
          totalRecords += c.total;
          eventsWithCounts.push({ id: ev.id, title: ev.title, event_date: ev.event_date, present: c.present, total: c.total });
        }
      }

      const avgAttendance = eventsWithCounts.length > 0 ? Math.round(totalPresent / eventsWithCounts.length) : 0;
      const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

      // Giving
      let totalGiving = 0;
      let givingCount = 0;
      let givingCurrency = 'NGN';
      if (canViewGiving) {
        const { data: givingData } = await supabase
          .from('giving_transactions')
          .select('amount, currency')
          .in('status', ['successful', 'verified'])
          .gte('transaction_date', monthStart)
          .lte('transaction_date', monthEnd);
        for (const t of givingData ?? []) {
          const tx = t as { amount: number; currency: string };
          totalGiving += Number(tx.amount);
          givingCount++;
          givingCurrency = tx.currency;
        }
      }

      setData({
        totalMembers: totalMembers ?? 0,
        newMembersThisMonth: newMembersThisMonth ?? 0,
        visitors: visitors ?? 0,
        openFollowUps: openFollowUps ?? 0,
        overdueFollowUps: overdueFollowUps ?? 0,
        avgAttendance,
        attendanceRate,
        totalGiving,
        givingCurrency,
        givingCount,
        recentEvents: eventsWithCounts,
      });
      setLoading(false);
    })();
  }, [supabase, canViewGiving]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/reports/membership">
          <MetricCard
            label="Total Members"
            value={loading ? '...' : data?.totalMembers ?? 0}
            icon={Users}
            tone="blue"
            loading={loading}
            description={`${data?.newMembersThisMonth ?? 0} new this month`}
          />
        </Link>
        <Link href="/admin/reports/attendance">
          <MetricCard
            label="Avg Attendance"
            value={loading ? '...' : data?.avgAttendance ?? 0}
            icon={Church}
            tone="navy"
            loading={loading}
            description={`${data?.attendanceRate ?? 0}% attendance rate`}
          />
        </Link>
        <Link href="/admin/reports/followup">
          <MetricCard
            label="Open Follow-Ups"
            value={loading ? '...' : data?.openFollowUps ?? 0}
            icon={ClipboardList}
            tone="amber"
            loading={loading}
            description={`${data?.overdueFollowUps ?? 0} overdue`}
          />
        </Link>
        {canViewGiving ? (
          <Link href="/admin/reports/giving">
            <MetricCard
              label="Giving This Month"
              value={loading ? '...' : formatAmount(data?.totalGiving ?? 0, data?.givingCurrency ?? 'NGN')}
              icon={CircleDollarSign}
              tone="green"
              loading={loading}
              description={`${data?.givingCount ?? 0} transactions`}
            />
          </Link>
        ) : (
          <Link href="/admin/reports/events">
            <MetricCard
              label="Visitors"
              value={loading ? '...' : data?.visitors ?? 0}
              icon={UserPlus}
              tone="green"
              loading={loading}
              description="Registered visitors"
            />
          </Link>
        )}
      </div>

      {data && data.recentEvents.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Attendance</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Latest services and their attendance rates</p>
            </div>
            <Link href="/admin/reports/attendance" className="text-sm text-[#1764c0] hover:underline">
              View report
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentEvents.map((e) => {
              const rate = e.total > 0 ? Math.round((e.present / e.total) * 100) : 0;
              return (
                <Link key={e.id} href={`/admin/attendance/${e.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {e.present}/{e.total} present
                      </p>
                    </div>
                    <div className="w-20 text-right">
                      <p className="font-semibold text-[#0b2340]">{rate}%</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Skeleton className="h-[200px] w-full" />
      )}
    </div>
  );
}
