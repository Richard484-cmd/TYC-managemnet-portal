import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLES } from '@/lib/auth/constants';
import { userHasAnyRole } from '@/lib/auth/session';
import Link from 'next/link';
import { Users, CalendarCheck, ClipboardList, CalendarDays, CircleDollarSign, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const reportSections = [
  {
    title: 'Membership',
    description: 'Total members, new members, active vs inactive, visitors, and membership growth over time.',
    href: '/admin/reports/membership',
    icon: Users,
    tone: 'blue',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR, ROLES.FOLLOW_UP_MANAGER, ROLES.DEPARTMENT_LEADER, ROLES.GROUP_LEADER],
  },
  {
    title: 'Attendance',
    description: 'Average attendance, attendance percentage, trends, visitor attendance, and department breakdown.',
    href: '/admin/reports/attendance',
    icon: CalendarCheck,
    tone: 'navy',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR, ROLES.FOLLOW_UP_MANAGER, ROLES.DEPARTMENT_LEADER, ROLES.GROUP_LEADER],
  },
  {
    title: 'Follow-Up',
    description: 'Open, completed, and overdue follow-ups, pipeline conversion, and officer activity.',
    href: '/admin/reports/followup',
    icon: ClipboardList,
    tone: 'amber',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR, ROLES.FOLLOW_UP_MANAGER],
  },
  {
    title: 'Events',
    description: 'Registrations, attendance, capacity utilization, and no-show tracking.',
    href: '/admin/reports/events',
    icon: CalendarDays,
    tone: 'green',
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR, ROLES.FOLLOW_UP_MANAGER, ROLES.DEPARTMENT_LEADER],
  },
  {
    title: 'Giving',
    description: 'Total giving, giving by category, trends, and transaction status breakdown.',
    href: '/admin/reports/giving',
    icon: CircleDollarSign,
    tone: 'gold',
    roles: [ROLES.SUPER_ADMIN, ROLES.FINANCE_OFFICER],
  },
];

const toneClasses: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  navy: 'bg-slate-100 text-[#173b63]',
  gold: 'bg-amber-50 text-amber-700',
  amber: 'bg-amber-50 text-amber-700',
};

export default async function ReportsIndexPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  const availableSections = reportSections.filter((s) => userHasAnyRole(user, s.roles));

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive reporting across membership, attendance, follow-ups, events, and giving"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneClasses[section.tone]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[#0b2340]">{section.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{section.description}</p>
                      <p className="mt-3 flex items-center gap-1 text-sm font-medium text-[#1764c0]">
                        View report <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
