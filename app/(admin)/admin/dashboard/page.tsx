import { requireStaff, userIsFinance } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Heart,
  Plus,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardStatsClient } from '@/components/reports/dashboard-stats-client';

export const dynamic = 'force-dynamic';

const quickActions = [
  { label: 'Add member', href: '/admin/members/new', icon: UserPlus, primary: true },
  { label: 'Add visitor', href: '/admin/visitors/new', icon: UsersRound, primary: false },
  { label: 'Create service', href: '/admin/attendance/new', icon: CalendarCheck, primary: false },
  { label: 'New department', href: '/admin/departments/new', icon: Plus, primary: false },
  { label: 'View visitors', href: '/admin/visitors', icon: ClipboardList, primary: false },
];

const activity = [
  { title: 'New member registered', detail: 'A new member profile was created', time: '2h ago', icon: UserPlus, tone: 'blue' },
  { title: 'Visitor follow-up updated', detail: 'A visitor record moved to contacted', time: '3h ago', icon: ClipboardList, tone: 'green' },
  { title: 'New group created', detail: 'A new fellowship group is ready', time: '5h ago', icon: UsersRound, tone: 'gold' },
  { title: 'Prayer request received', detail: 'A new request is waiting for care', time: '6h ago', icon: Heart, tone: 'navy' },
];

const upcomingEvents = [
  { date: '05', month: 'OCT', title: 'Sunday Worship Service', detail: '9:00 AM – 12:00 PM', location: 'Main Sanctuary' },
  { date: '12', month: 'OCT', title: 'Youth Fellowship', detail: '4:00 PM – 6:00 PM', location: 'Youth Hall' },
  { date: '18', month: 'OCT', title: 'Leadership Meeting', detail: '10:00 AM – 12:00 PM', location: 'Conference Room' },
  { date: '26', month: 'OCT', title: 'Thanksgiving Service', detail: '9:00 AM – 12:00 PM', location: 'Main Sanctuary' },
];

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  navy: 'bg-slate-100 text-[#173b63]',
  gold: 'bg-amber-50 text-amber-700',
};

export default async function AdminDashboard() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const firstName = user.first_name || user.display_name.split(' ')[0] || 'there';
  const canViewGiving = userIsFinance(user);

  return (
    <AppShell items={navItems} label="Management Portal" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of your church's activities and key metrics"
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/reports">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Reports
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/events">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  View calendar
                </Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <Card className="overflow-hidden border-[#c9d9ec] bg-gradient-to-br from-[#eef5ff] via-white to-[#dcecff]">
              <CardContent className="relative p-6 sm:p-8">
                <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[28px] border-[#173b63]/10" />
                <div className="relative max-w-xl border-l-2 border-[#e7a923] pl-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1764c0]">Welcome back</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0b2340]">{firstName}</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#45617e]">
                    Here is what is happening across The Youth Church today.
                  </p>
                </div>
              </CardContent>
            </Card>

            <DashboardStatsClient canViewGiving={canViewGiving} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
              <Card>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>Recent activity</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Latest updates</p>
                  </div>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {activity.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses[item.tone as keyof typeof toneClasses]}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button key={action.label} asChild variant={action.primary ? 'default' : 'outline'} className="h-auto min-h-20 flex-col gap-2 px-3 py-3 text-center">
                        <Link href={action.href}>
                          <Icon className="h-5 w-5" />
                          <span className="text-xs leading-4">{action.label}</span>
                        </Link>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Upcoming events</CardTitle>
                <Button asChild variant="link" size="sm" className="px-0">
                  <Link href="/events">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-1">
                {upcomingEvents.map((event) => (
                  <Link key={event.title} href="/events" className="flex gap-3 rounded-lg border-b border-border/60 py-3 transition-colors last:border-0 hover:bg-muted/40">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[#eef5ff] text-[#1764c0]">
                      <span className="text-[10px] font-bold tracking-wider">{event.month}</span>
                      <span className="text-lg font-bold leading-5">{event.date}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{event.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{event.detail}</span>
                      <span className="block text-xs text-muted-foreground">{event.location}</span>
                    </span>
                    <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-[#c9d9ec] bg-[#eef5ff]">
              <CardContent className="p-6">
                <Heart className="h-6 w-6 text-[#1764c0]" />
                <h3 className="mt-4 font-semibold text-[#0b2340]">Care starts here</h3>
                <p className="mt-2 text-sm leading-6 text-[#45617e]">Keep member care, follow-ups, and ministry connections moving forward.</p>
                <Button asChild variant="outline" className="mt-4 border-[#9bb9dc] bg-white">
                  <Link href="/admin/visitors">Open follow-ups <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
