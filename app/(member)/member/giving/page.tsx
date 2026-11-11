import { getCurrentUser } from '@/lib/auth/session';
import { memberNavItems } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { GivingForm, GivingSummary, TransactionCard } from '@/components/admin/giving/giving-components';
import { fetchGivingCategories, fetchMemberTransactions, fetchMemberGivingSummary } from '@/lib/giving/queries';
import type { GivingTransaction } from '@/lib/giving/types';
import { Heart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MemberGivingPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please sign in to access giving.</p>
      </div>
    );
  }

  const supabase = createClient();

  // Get the member record for this user
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  const memberId = member?.id ?? null;
  const [categories] = await Promise.all([
    fetchGivingCategories(),
  ]);

  let summary = null;
  let myTransactions: GivingTransaction[] = [];

  if (memberId) {
    [summary, myTransactions] = await Promise.all([
      fetchMemberGivingSummary(memberId),
      fetchMemberTransactions(memberId),
    ]);
  }

  return (
    <AppShell items={memberNavItems} label="Member Portal" user={user} isAdmin={false}>
      <div className="space-y-6">
        <PageHeader
          title="Giving"
          description="Contribute to the church and track your giving history"
        />

        {!memberId && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Your member profile needs to be linked before you can make contributions. Please contact church administration.
            </CardContent>
          </Card>
        )}

        {memberId && summary && (
          <GivingSummary
            totalGiving={summary.totalGiving}
            successfulCount={summary.successfulCount}
            pendingCount={summary.pendingCount}
            byCategory={summary.byCategory}
            currency={summary.currency}
          />
        )}

        {memberId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-5 w-5 text-primary" />
                Make a Contribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GivingForm categories={categories} memberId={memberId} />
            </CardContent>
          </Card>
        )}

        {memberId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Giving History</CardTitle>
            </CardHeader>
            <CardContent>
              {myTransactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  You haven&apos;t made any contributions yet.
                </p>
              ) : (
                <div>
                  {myTransactions.map((t) => (
                    <TransactionCard key={t.id} transaction={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
