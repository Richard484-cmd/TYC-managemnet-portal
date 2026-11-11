import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, UserPlus, CalendarClock, AlertCircle, Flame, CheckCircle2, ListTodo, Clock } from 'lucide-react';
import type { CrmDashboardStats } from '@/lib/crm/types';

export const dynamic = 'force-dynamic';

export default async function CrmDashboardPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalContacts },
    { count: newVisitors },
    { count: followUpsDueToday },
    { count: overdueFollowUps },
    { count: highPriorityFollowUps },
    { count: activeMembers },
    { count: tasksPending },
    { count: tasksOverdue },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('crm_stage_id', 'a1b2c3d4-0000-0000-0000-000000000101')
      .is('deleted_at', null),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('next_follow_up_date', today)
      .is('deleted_at', null),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .lt('next_follow_up_date', today)
      .is('deleted_at', null),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .in('priority', ['high', 'urgent'])
      .is('deleted_at', null),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('crm_stage_id', 'a1b2c3d4-0000-0000-0000-000000000107')
      .is('deleted_at', null),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .lt('due_date', today)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null),
  ]);

  const stats: CrmDashboardStats = {
    totalContacts: totalContacts ?? 0,
    newVisitors: newVisitors ?? 0,
    followUpsDueToday: followUpsDueToday ?? 0,
    overdueFollowUps: overdueFollowUps ?? 0,
    highPriorityFollowUps: highPriorityFollowUps ?? 0,
    activeMembers: activeMembers ?? 0,
    tasksPending: tasksPending ?? 0,
    tasksOverdue: tasksOverdue ?? 0,
  };

  const statCards = [
    { label: 'Total Contacts', value: stats.totalContacts, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'New Visitors', value: stats.newVisitors, icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Follow-Ups Due Today', value: stats.followUpsDueToday, icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Overdue Follow-Ups', value: stats.overdueFollowUps, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'High Priority', value: stats.highPriorityFollowUps, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Members', value: stats.activeMembers, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Tasks Pending', value: stats.tasksPending, icon: ListTodo, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tasks Overdue', value: stats.tasksOverdue, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="CRM Dashboard"
          description="Operational overview of your follow-up pipeline"
          actions={
            <Button asChild>
              <Link href="/admin/crm">Open Kanban</Link>
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/admin/crm">View Kanban Board</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/crm/pipelines">Manage Pipelines</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/visitors">View Visitors</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
