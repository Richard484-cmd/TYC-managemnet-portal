import { requireAdmin } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAutomations, fetchMonitoringStats } from '@/lib/automation/queries';
import { AutomationListClient } from '@/components/admin/automation/automation-list-client';
import { ExecutionStatusBadge } from '@/components/admin/automation/automation-badges';
import {
  Zap, Clock, CheckCircle2, AlertCircle, Activity, PlayCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AutomationListPage() {
  const user = await requireAdmin();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const [automations, stats] = await Promise.all([
    fetchAutomations(),
    fetchMonitoringStats(),
  ]);

  const statCards = [
    { label: 'Total Workflows', value: stats.totalWorkflows, icon: Zap, color: 'text-blue-600' },
    { label: 'Active', value: stats.activeWorkflows, icon: PlayCircle, color: 'text-green-600' },
    { label: 'Successful Runs', value: stats.successfulExecutions, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Failed Runs', value: stats.failedExecutions, icon: AlertCircle, color: 'text-red-600' },
    { label: 'Waiting', value: stats.waitingExecutions, icon: Clock, color: 'text-yellow-600' },
    { label: 'Pending Events', value: stats.pendingEvents, icon: Activity, color: 'text-blue-600' },
  ];

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Automation Engine"
          description="Create and manage automated church workflows"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/automations/executions">Execution Logs</Link>
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {stats.failedExecutionsRecent.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Failures</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.failedExecutionsRecent.slice(0, 5).map((exec) => (
                  <Link
                    key={exec.id}
                    href={`/admin/automations/executions/${exec.id}`}
                    className="flex items-center justify-between rounded-lg border p-2 hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{exec.automation_name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exec.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <ExecutionStatusBadge status={exec.status} />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium">Workflows</h3>
          <AutomationListClient initialAutomations={automations} />
        </div>
      </div>
    </AppShell>
  );
}
