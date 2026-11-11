import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { CommunicationHistoryClient } from '@/components/admin/communication/communication-history-client';
import { fetchLogs } from '@/lib/communication/queries';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function CommunicationHistoryPage({
  searchParams,
}: {
  searchParams: { channel?: string; status?: string; page?: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  const channel = searchParams.channel ?? 'all';
  const status = searchParams.status ?? 'all';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const { logs, total } = await fetchLogs(
    {
      channel: channel !== 'all' ? channel : undefined,
      status: status !== 'all' ? status : undefined,
    },
    page,
    PAGE_SIZE
  );

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Communication History"
          description="View all communication delivery logs"
        />
        <CommunicationHistoryClient
          logs={logs}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          channel={channel}
          status={status}
        />
      </div>
    </AppShell>
  );
}
