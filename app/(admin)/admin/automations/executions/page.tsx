import { requireAdmin } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { fetchExecutions, fetchAutomations } from '@/lib/automation/queries';
import { ExecutionFiltersClient } from '@/components/admin/automation/execution-filters-client';
import { ExecutionStatusBadge } from '@/components/admin/automation/automation-badges';
import { getExecutionStatusLabel } from '@/lib/automation/constants';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function ExecutionMonitoringPage({
  searchParams,
}: {
  searchParams: {
    automation_id?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    failedOnly?: string;
    page?: string;
  };
}) {
  const user = await requireAdmin();
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const failedOnly = searchParams.failedOnly === 'true';

  const [{ executions, total }, automations] = await Promise.all([
    fetchExecutions(
      {
        automation_id: searchParams.automation_id,
        status: searchParams.status,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
        failedOnly,
      },
      page,
      PAGE_SIZE
    ),
    fetchAutomations(true),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.automation_id) params.set('automation_id', searchParams.automation_id);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.dateFrom) params.set('dateFrom', searchParams.dateFrom);
    if (searchParams.dateTo) params.set('dateTo', searchParams.dateTo);
    if (failedOnly) params.set('failedOnly', 'true');
    params.set('page', String(p));
    return `/admin/automations/executions?${params.toString()}`;
  };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Execution Monitoring"
          description="View automation execution history and diagnose failures"
        />

        <ExecutionFiltersClient
          automations={automations}
          initialAutomationId={searchParams.automation_id ?? 'all'}
          initialStatus={searchParams.status ?? 'all'}
          initialDateFrom={searchParams.dateFrom ?? ''}
          initialDateTo={searchParams.dateTo ?? ''}
          initialFailedOnly={failedOnly}
        />

        <p className="text-sm text-muted-foreground">{total} execution{total !== 1 ? 's' : ''}</p>

        {executions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No executions found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Workflow</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => (
                  <tr key={exec.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <a href={`/admin/automations/executions/${exec.id}`} className="text-primary hover:underline">
                        {exec.automation_name ?? 'Unknown'}
                      </a>
                      {exec.is_test && (
                        <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Test</span>
                      )}
                    </td>
                    <td className="px-4 py-2"><ExecutionStatusBadge status={exec.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{exec.trigger_event ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(exec.started_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {exec.completed_at
                        ? new Date(exec.completed_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
                        : exec.waiting_until
                          ? `Waiting until ${new Date(exec.waiting_until).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}`
                          : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-600">
                      {exec.error_message ? exec.error_message.slice(0, 60) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && <a href={buildUrl(page - 1)}><button className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Previous</button></a>}
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            {page < totalPages && <a href={buildUrl(page + 1)}><button className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Next</button></a>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
