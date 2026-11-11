import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchDashboardStats } from '@/lib/communication/queries';
import { CommunicationHistory } from '@/components/admin/communication/communication-components';
import { getChannelLabel } from '@/lib/communication/constants';
import { Mail, MessageSquare, MessageCircle, Bell, Send, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function CommunicationDashboardPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const stats = await fetchDashboardStats();

  const statCards = [
    { label: 'Total Sent', value: stats.totalSent, icon: Send, color: 'text-blue-600' },
    { label: 'Email', value: stats.emailCount, icon: Mail, color: 'text-indigo-600' },
    { label: 'SMS', value: stats.smsCount, icon: MessageSquare, color: 'text-green-600' },
    { label: 'WhatsApp', value: stats.whatsappCount, icon: MessageCircle, color: 'text-emerald-600' },
    { label: 'In-App', value: stats.inAppCount, icon: Bell, color: 'text-amber-600' },
    { label: 'Delivered', value: stats.delivered, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Failed', value: stats.failed, icon: AlertCircle, color: 'text-red-600' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
  ];

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Communications"
          description="Send and track church communications"
          actions={
            <Button asChild size="sm">
              <Link href="/admin/communications/compose">
                <Send className="mr-2 h-4 w-4" />
                New Communication
              </Link>
            </Button>
          }
        />

        {/* Stats grid */}
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

        {/* Quick links */}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/communications/compose">New Communication</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/communications/templates">Templates</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/communications/history">History</Link>
          </Button>
        </div>

        {/* Recent communications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Communications</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentCommunications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No communications have been sent yet.
              </p>
            ) : (
              <CommunicationHistory logs={stats.recentCommunications} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
