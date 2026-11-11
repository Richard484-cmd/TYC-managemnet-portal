import { requireFinance } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchFinanceDashboardStats } from '@/lib/giving/queries';
import { TransactionTable } from '@/components/admin/giving/giving-components';
import { formatAmount } from '@/lib/giving/constants';
import { Clock, AlertCircle, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function FinanceDashboardPage() {
  const user = await requireFinance();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const [stats] = await Promise.all([
    fetchFinanceDashboardStats(),
  ]);

  const statCards = [
    { label: 'Total Successful', value: stats.byCurrency.length > 0 ? stats.byCurrency.map((c) => formatAmount(c.total, c.currency)).join(', ') : formatAmount(0, 'NGN'), icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Pending', value: `${stats.pendingCount} txns`, icon: Clock, color: 'text-yellow-600' },
    { label: 'Failed', value: `${stats.failedCount} txns`, icon: AlertCircle, color: 'text-red-600' },
    { label: 'Refunded/Reversed', value: `${stats.refundedCount} txns`, icon: ArrowDownRight, color: 'text-blue-600' },
  ];

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Finance Dashboard"
          description="Overview of church giving and financial transactions"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/giving/transactions">View All Transactions</Link>
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
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Giving by Category */}
        {stats.byCategory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Giving by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.byCategory.map((c) => (
                  <div key={c.category_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.category_name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} transactions</p>
                    </div>
                    <p className="text-sm font-semibold">{formatAmount(c.total, c.currency)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Giving by Currency */}
        {stats.byCurrency.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Giving by Currency</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.byCurrency.map((c) => (
                  <div key={c.currency} className="flex items-center justify-between text-sm">
                    <span>{c.currency} ({c.count} txns)</span>
                    <span className="font-semibold">{formatAmount(c.total, c.currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {stats.recentTransactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <TransactionTable transactions={stats.recentTransactions} />
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/giving/transactions">All Transactions</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/giving/categories">Manage Categories</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
