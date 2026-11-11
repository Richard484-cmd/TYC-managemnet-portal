import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchDashboardStats, fetchPrayerRequests } from '@/lib/prayer/queries';
import { PrayerRequestList } from '@/components/admin/prayer/prayer-components';
import { Sparkles, UserPlus, Heart, AlertCircle, CheckCircle2, Check, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function PrayerDashboardPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const [stats, { requests: recentReqs }] = await Promise.all([
    fetchDashboardStats(user.id),
    fetchPrayerRequests({}, 1, 5),
  ]);

  const statCards = [
    { label: 'New', value: stats.newCount, icon: Sparkles, color: 'text-blue-600' },
    { label: 'Assigned', value: stats.assignedCount, icon: UserPlus, color: 'text-indigo-600' },
    { label: 'Praying', value: stats.prayingCount, icon: Heart, color: 'text-purple-600' },
    { label: 'Follow-Up Required', value: stats.followUpRequiredCount, icon: AlertCircle, color: 'text-amber-600' },
    { label: 'Answered', value: stats.answeredCount, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Closed', value: stats.closedCount, icon: Check, color: 'text-gray-600' },
    { label: 'Assigned to Me', value: stats.assignedToMe, icon: UserPlus, color: 'text-blue-600' },
    { label: 'Overdue Follow-Ups', value: stats.overdueFollowUps, icon: AlertTriangle, color: 'text-red-600' },
  ];

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Prayer Requests"
          description="Review, manage, and pray over prayer requests"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/prayer/list">View All Requests</Link>
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Prayer Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReqs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No prayer requests yet.</p>
            ) : (
              <PrayerRequestList
                requests={recentReqs}
                canSeeSubmitter={true}
                onCardClick={(id) => {
                  window.location.href = `/admin/prayer/${id}`;
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
