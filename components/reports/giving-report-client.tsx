'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { MetricCard } from '@/components/reports/metric-card';
import { CSVExportButton } from '@/components/reports/csv-export-button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleDollarSign, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { resolveDateRange, formatDateLabel, type DateRange } from '@/lib/reports/date-range';
import { formatAmount, CURRENCIES } from '@/lib/giving/constants';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface GivingData {
  totalGiving: number;
  currency: string;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  byCurrency: { currency: string; total: number; count: number }[];
  byCategory: { category_id: string | null; category_name: string; total: number; count: number; currency: string }[];
  trends: { date: string; total: number; count: number }[];
}

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#06b6d4', '#dc2626', '#8b5cf6', '#6b7280', '#ec4899'];

export function GivingReportClient({ canExport }: { canExport: boolean }) {
  const supabase = createClient();
  const [range, setRange] = useState<DateRange>(resolveDateRange('this_month'));
  const [categoryId, setCategoryId] = useState<string>('all');
  const [currency, setCurrency] = useState<string>('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<GivingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('giving_categories').select('id, name').eq('is_active', true).order('sort_order');
      setCategories((cats as { id: string; name: string }[]) ?? []);
    })();
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(range.start + 'T00:00:00').toISOString();
    const endDate = new Date(range.end + 'T23:59:59').toISOString();

    const [
      { count: successfulCount },
      { count: failedCount },
      { count: pendingCount },
      { count: refundedCount },
    ] = await Promise.all([
      supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).in('status', ['successful', 'verified']).gte('transaction_date', startDate).lte('transaction_date', endDate),
      supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('transaction_date', startDate).lte('transaction_date', endDate),
      supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('transaction_date', startDate).lte('transaction_date', endDate),
      supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).eq('status', 'refunded').gte('transaction_date', startDate).lte('transaction_date', endDate),
    ]);

    // Total successful giving
    let totalQuery = supabase
      .from('giving_transactions')
      .select('amount, currency')
      .in('status', ['successful', 'verified'])
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);
    if (categoryId !== 'all') totalQuery = totalQuery.eq('category_id', categoryId);
    if (currency !== 'all') totalQuery = totalQuery.eq('currency', currency);
    const { data: totalData } = await totalQuery;

    let totalGiving = 0;
    const byCurrencyMap = new Map<string, { total: number; count: number }>();
    for (const t of totalData ?? []) {
      const tx = t as { amount: number; currency: string };
      totalGiving += Number(tx.amount);
      const entry = byCurrencyMap.get(tx.currency) ?? { total: 0, count: 0 };
      entry.total += Number(tx.amount);
      entry.count++;
      byCurrencyMap.set(tx.currency, entry);
    }

    const primaryCurrency = currency !== 'all' ? currency : (Array.from(byCurrencyMap.keys())[0] ?? 'NGN');

    // By category
    const categoryNameMap = new Map((categories).map((c) => [c.id, c.name]));
    let catQuery = supabase
      .from('giving_transactions')
      .select('category_id, amount, currency')
      .in('status', ['successful', 'verified'])
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);
    if (currency !== 'all') catQuery = catQuery.eq('currency', currency);
    const { data: catData } = await catQuery;

    const catMap = new Map<string, { total: number; count: number; currency: string }>();
    for (const c of catData ?? []) {
      const tx = c as { category_id: string | null; amount: number; currency: string };
      const key = tx.category_id ?? 'uncategorized';
      const entry = catMap.get(key) ?? { total: 0, count: 0, currency: tx.currency };
      entry.total += Number(tx.amount);
      entry.count++;
      catMap.set(key, entry);
    }

    const byCategory = Array.from(catMap.entries()).map(([key, v]) => ({
      category_id: key === 'uncategorized' ? null : key,
      category_name: key === 'uncategorized' ? 'Uncategorized' : (categoryNameMap.get(key) ?? 'Unknown'),
      total: v.total,
      count: v.count,
      currency: v.currency,
    })).sort((a, b) => b.total - a.total);

    // Trends
    let trendQuery = supabase
      .from('giving_transactions')
      .select('transaction_date, amount')
      .in('status', ['successful', 'verified'])
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);
    if (currency !== 'all') trendQuery = trendQuery.eq('currency', currency);
    const { data: trendData } = await trendQuery;

    const trendMap = new Map<string, { total: number; count: number }>();
    for (const t of trendData ?? []) {
      const tx = t as { transaction_date: string; amount: number };
      const day = tx.transaction_date.split('T')[0];
      const entry = trendMap.get(day) ?? { total: 0, count: 0 };
      entry.total += Number(tx.amount);
      entry.count++;
      trendMap.set(day, entry);
    }
    const trends = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, total: v.total, count: v.count }));

    setData({
      totalGiving,
      currency: primaryCurrency,
      successfulCount: successfulCount ?? 0,
      failedCount: failedCount ?? 0,
      pendingCount: pendingCount ?? 0,
      refundedCount: refundedCount ?? 0,
      byCurrency: Array.from(byCurrencyMap.entries()).map(([curr, v]) => ({ currency: curr, total: v.total, count: v.count })),
      byCategory,
      trends,
    });
    setLoading(false);
  }, [range, categoryId, currency, categories, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const trendChartData = data?.trends.map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: t.total,
  })) ?? [];

  const categoryChartData = data?.byCategory.map((c) => ({
    name: c.category_name,
    value: c.total,
  })) ?? [];

  const exportRows = data?.byCategory.map((c) => ({
    category: c.category_name,
    total: c.total,
    currency: c.currency,
    count: c.count,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          {categories.length > 0 && (
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All currencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canExport && (
          <CSVExportButton
            rows={exportRows}
            headers={[
              { key: 'category', label: 'Category' },
              { key: 'total', label: 'Total' },
              { key: 'currency', label: 'Currency' },
              { key: 'count', label: 'Count' },
            ]}
            filename={`giving-report-${range.start}-to-${range.end}`}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Giving"
          value={loading ? '...' : formatAmount(data?.totalGiving ?? 0, data?.currency ?? 'NGN')}
          icon={CircleDollarSign}
          tone="green"
          loading={loading}
          empty={!loading && data?.totalGiving === 0}
          description={`Successful ${formatDateLabel(range)}`}
        />
        <MetricCard label="Successful" value={data?.successfulCount ?? 0} icon={CheckCircle} tone="green" loading={loading} empty={!loading && data?.successfulCount === 0} description="Transactions" />
        <MetricCard label="Failed" value={data?.failedCount ?? 0} icon={XCircle} tone="red" loading={loading} empty={!loading && data?.failedCount === 0} description="Transactions" />
        <MetricCard label="Pending" value={data?.pendingCount ?? 0} icon={Clock} tone="amber" loading={loading} empty={!loading && data?.pendingCount === 0} description="Transactions" />
      </div>

      {data && data.byCurrency.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              {data.byCurrency.map((c) => (
                <div key={c.currency} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{c.currency}</p>
                  <p className="mt-1 text-lg font-bold text-[#0b2340]">{formatAmount(c.total, c.currency)}</p>
                  <p className="text-xs text-muted-foreground">{c.count} transactions</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#1764c0]" />
              Giving Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">Daily giving totals for {formatDateLabel(range)}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : trendChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No giving data for the selected period.</p>
            ) : (
              <ChartContainer config={{ amount: { label: 'Amount', color: '#16a34a' } }} className="h-[280px] w-full">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Giving by Category</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution across giving categories</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : categoryChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No giving category data for the selected period.</p>
            ) : (
              <ChartContainer config={{ value: { label: 'Amount', color: '#2563eb' } }} className="h-[280px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(entry: { name: string }) => entry.name}>
                    {categoryChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {data && data.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">Category</th>
                    <th className="pb-2 text-right font-medium">Transactions</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((c) => (
                    <tr key={c.category_id ?? 'uncat'} className="border-b last:border-0">
                      <td className="py-2 font-medium">{c.category_name}</td>
                      <td className="py-2 text-right">{c.count}</td>
                      <td className="py-2 text-right font-semibold">{formatAmount(c.total, c.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
