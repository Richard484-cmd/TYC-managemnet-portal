import { requireRole, userHasAnyRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { AttendanceReportClient } from '@/components/reports/attendance-report-client';
import { ROLES } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR,
  ROLES.FOLLOW_UP_MANAGER, ROLES.DEPARTMENT_LEADER, ROLES.GROUP_LEADER,
];

export default async function AttendanceReportPage() {
  const user = await requireRole(...ALLOWED_ROLES);
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canExport = userHasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR]);

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <PageHeader
        title="Attendance Report"
        description="Average attendance, attendance trends, visitor attendance, and department breakdown"
      />
      <AttendanceReportClient canExport={canExport} />
    </AppShell>
  );
}
