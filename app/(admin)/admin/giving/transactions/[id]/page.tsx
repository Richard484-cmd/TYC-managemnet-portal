import { requireFinance } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { fetchTransaction, fetchGivingCategories } from '@/lib/giving/queries';
import { TransactionDetailClient } from '@/components/admin/giving/transaction-detail-client';
import { getChurchSettings } from '@/lib/church-settings';

export const dynamic = 'force-dynamic';

export default async function FinanceTransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireFinance();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const [transaction, categories, churchSettings] = await Promise.all([
    fetchTransaction(params.id),
    fetchGivingCategories(),
    getChurchSettings(),
  ]);

  if (!transaction) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <div className="p-8 text-center text-muted-foreground">Transaction not found.</div>
      </AppShell>
    );
  }

  // Fetch member name
  let memberName: string | null = null;
  if (transaction.member_id) {
    const { data: member } = await supabase
      .from('members')
      .select('first_name, last_name')
      .eq('id', transaction.member_id)
      .maybeSingle();
    if (member) {
      memberName = `${(member as any).first_name} ${(member as any).last_name}`.trim();
    }
  }

  // Fetch category name
  let categoryName: string | null = null;
  if (transaction.category_id) {
    const cat = categories.find((c) => c.id === transaction.category_id);
    categoryName = cat?.name ?? null;
  }

  const enrichedTransaction = {
    ...transaction,
    member_name: memberName,
    category_name: categoryName,
  };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={`Transaction ${transaction.payment_reference ?? transaction.id.slice(0, 8)}`}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/giving/transactions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Transactions
              </Link>
            </Button>
          }
        />
        <TransactionDetailClient
          transaction={enrichedTransaction}
          churchName={churchSettings.church_name}
          canVerify={true}
          canRefund={true}
        />
      </div>
    </AppShell>
  );
}
