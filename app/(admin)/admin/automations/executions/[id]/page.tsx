import { requireAdmin } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { fetchExecution, fetchExecutionLogs } from '@/lib/automation/queries';
import { ExecutionStatusBadge, LogStatusBadge } from '@/components/admin/automation/automation-badges';
import { getTriggerDef, getConditionDef, getActionDef } from '@/lib/automation/registry';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ExecutionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireAdmin();
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  const [execution, logs] = await Promise.all([
    fetchExecution(params.id),
    fetchExecutionLogs(params.id),
  ]);

  if (!execution) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <div className="p-8 text-center text-muted-foreground">Execution not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={`Execution: ${execution.automation_name ?? 'Unknown'}`}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/automations/executions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Executions
              </Link>
            </Button>
          }
        />

        {/* Execution Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="mt-1"><ExecutionStatusBadge status={execution.status} /></div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Trigger Event</p>
                <p className="mt-1 text-sm">{execution.trigger_event ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Test Execution</p>
                <p className="mt-1 text-sm">{execution.is_test ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Started</p>
                <p className="mt-1 text-sm">{new Date(execution.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Completed</p>
                <p className="mt-1 text-sm">
                  {execution.completed_at
                    ? new Date(execution.completed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                    : '—'}
                </p>
              </div>
              {execution.waiting_until && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Waiting Until</p>
                  <p className="mt-1 text-sm">{new Date(execution.waiting_until).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
            </div>
            {execution.error_message && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">Error</p>
                <p className="mt-1">{execution.error_message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step Logs */}
        <Card>
          <CardHeader><CardTitle className="text-base">Execution Steps</CardTitle></CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No step logs recorded.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log, idx) => {
                  const def = log.step_type === 'trigger' ? getTriggerDef(log.step_key) :
                              log.step_type === 'condition' ? getConditionDef(log.step_key) :
                              log.step_type === 'action' ? getActionDef(log.step_key) : null;
                  const colorClass = log.step_type === 'trigger' ? 'border-amber-200 bg-amber-50' :
                                     log.step_type === 'condition' ? 'border-blue-200 bg-blue-50' :
                                     log.step_type === 'action' ? 'border-green-200 bg-green-50' :
                                     'border-purple-200 bg-purple-50';
                  return (
                    <div key={log.id} className={cn('rounded-lg border p-3', colorClass)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                              {log.step_type}
                            </span>
                            <span className="text-sm font-medium">
                              {def?.label ?? log.step_name ?? log.step_key}
                            </span>
                          </div>
                          {log.error_message && (
                            <p className="mt-1 text-xs text-red-600">{log.error_message}</p>
                          )}
                          {log.config && Object.keys(log.config).length > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {Object.entries(log.config).map(([k, v]) => (
                                <span key={k} className="mr-3">
                                  <span className="opacity-60">{k}:</span> {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                          {log.duration_ms != null && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Duration: {log.duration_ms}ms
                            </p>
                          )}
                        </div>
                        <LogStatusBadge status={log.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
