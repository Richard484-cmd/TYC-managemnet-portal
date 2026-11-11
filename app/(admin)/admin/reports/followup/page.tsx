import { requireRole, userHasAnyRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { FollowUpReportClient } from '@/components/reports/followup-report-client';
import { ROLES } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR, ROLES.FOLLOW_UP_MANAGER];

export default async function FollowUpReportPage() {
  const user = await requireRole(...ALLOWED_ROLES);
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canExport = userHasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR]);

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <PageHeader
        title="Follow-Up Report"
        description="Open, completed, and overdue follow-ups, pipeline conversion, and officer activity"
      />
      <FollowUpReportClient canExport={canExport} />
    </AppShell>
  );
}
