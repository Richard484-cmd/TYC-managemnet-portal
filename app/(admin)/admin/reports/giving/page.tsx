import { requireFinance } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { GivingReportClient } from '@/components/reports/giving-report-client';

export const dynamic = 'force-dynamic';

export default async function GivingReportPage() {
  const user = await requireFinance();
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <PageHeader
        title="Giving Report"
        description="Total giving, giving by category, trends, and transaction status breakdown"
      />
      <GivingReportClient canExport />
    </AppShell>
  );
}
