import { requireFinance } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { fetchTransactions, fetchGivingCategories } from '@/lib/giving/queries';
import { TransactionFiltersClient } from '@/components/admin/giving/transaction-filters-client';
import { getStatusBadge, getStatusLabel, formatAmount } from '@/lib/giving/constants';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function FinanceTransactionsPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    category?: string;
    currency?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  };
}) {
  const user = await requireFinance();
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const [result, categories] = await Promise.all([
    fetchTransactions(
      {
        status: searchParams.status,
        category_id: searchParams.category,
        currency: searchParams.currency,
        search: searchParams.search,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
      },
      page,
      PAGE_SIZE
    ),
    fetchGivingCategories(),
  ]);

  const { transactions, total } = result;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.currency) params.set('currency', searchParams.currency);
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.dateFrom) params.set('dateFrom', searchParams.dateFrom);
    if (searchParams.dateTo) params.set('dateTo', searchParams.dateTo);
    params.set('page', String(p));
    return `/admin/giving/transactions?${params.toString()}`;
  };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Financial Transactions"
          description="Search, filter, and manage all giving transactions"
        />

        <TransactionFiltersClient
          categories={categories}
          initialSearch={searchParams.search ?? ''}
          initialStatus={searchParams.status ?? 'all'}
          initialCategory={searchParams.category ?? 'all'}
          initialCurrency={searchParams.currency ?? 'all'}
          initialDateFrom={searchParams.dateFrom ?? ''}
          initialDateTo={searchParams.dateTo ?? ''}
        />

        <p className="text-sm text-muted-foreground">
          {total} transaction{total !== 1 ? 's' : ''}
        </p>

        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(t.transaction_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-2">
                      {t.is_anonymous
                        ? 'Anonymous'
                        : t.member_name ?? t.giver_name ?? '—'}
                    </td>
                    <td className="px-4 py-2">{t.category_name ?? '—'}</td>
                    <td className="px-4 py-2 font-medium">
                      {formatAmount(Number(t.amount), t.currency)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      <a
                        href={`/admin/giving/transactions/${t.id}`}
                        className="text-primary hover:underline"
                      >
                        {t.payment_reference ?? '—'}
                      </a>
                    </td>
                    <td className="px-4 py-2">{t.provider_name ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(t.status)}`}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <a href={buildUrl(page - 1)}>
                <button className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  Previous
                </button>
              </a>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a href={buildUrl(page + 1)}>
                <button className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  Next
                </button>
              </a>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
