import { createClient } from '@/lib/supabase/server';
import type {
  GivingCategory,
  GivingTransaction,
  GivingCampaign,
  FinanceDashboardStats,
  MemberGivingSummary,
  GivingProviderConfig,
} from './types';
import { isSuccessfulStatus } from './constants';

export async function fetchGivingCategories(): Promise<GivingCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('giving_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error || !data) return [];
  return data as GivingCategory[];
}

export async function fetchAllGivingCategories(): Promise<GivingCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('giving_categories')
    .select('*')
    .order('sort_order');
  if (error || !data) return [];
  return data as GivingCategory[];
}

export async function fetchTransactions(
  filters: {
    status?: string;
    category_id?: string;
    member_id?: string;
    currency?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  page = 1,
  pageSize = 20
): Promise<{ transactions: GivingTransaction[]; total: number }> {
  const supabase = createClient();
  let query = supabase
    .from('giving_transactions')
    .select('*', { count: 'exact' })
    .order('transaction_date', { ascending: false });

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.category_id && filters.category_id !== 'all') query = query.eq('category_id', filters.category_id);
  if (filters.member_id && filters.member_id !== 'all') query = query.eq('member_id', filters.member_id);
  if (filters.currency && filters.currency !== 'all') query = query.eq('currency', filters.currency);
  if (filters.search) query = query.or(`payment_reference.ilike.%${filters.search}%,giver_name.ilike.%${filters.search}%`);
  if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error || !data) return { transactions: [], total: 0 };

  const transactions = data as GivingTransaction[];

  // Fetch related names
  const memberIds = new Set(transactions.map((t) => t.member_id).filter(Boolean) as string[]);
  const categoryIds = new Set(transactions.map((t) => t.category_id).filter(Boolean) as string[]);

  if (memberIds.size > 0) {
    const { data: members } = await supabase
      .from('members')
      .select('id, first_name, last_name')
      .in('id', Array.from(memberIds));
    const nameMap = new Map<string, string>();
    (members ?? []).forEach((m: any) => nameMap.set(m.id, `${m.first_name} ${m.last_name}`.trim()));
    transactions.forEach((t) => {
      t.member_name = t.member_id ? nameMap.get(t.member_id) ?? null : null;
    });
  }
  if (categoryIds.size > 0) {
    const { data: cats } = await supabase
      .from('giving_categories')
      .select('id, name')
      .in('id', Array.from(categoryIds));
    const nameMap = new Map<string, string>();
    (cats ?? []).forEach((c: any) => nameMap.set(c.id, c.name));
    transactions.forEach((t) => {
      t.category_name = t.category_id ? nameMap.get(t.category_id) ?? null : null;
    });
  }

  return { transactions, total: count ?? 0 };
}

export async function fetchTransaction(id: string): Promise<GivingTransaction | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('giving_transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as GivingTransaction;
}

export async function fetchMemberTransactions(memberId: string): Promise<GivingTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('giving_transactions')
    .select('*')
    .eq('member_id', memberId)
    .order('transaction_date', { ascending: false });
  if (error || !data) return [];
  return data as GivingTransaction[];
}

export async function fetchMemberGivingSummary(memberId: string): Promise<MemberGivingSummary> {
  const transactions = await fetchMemberTransactions(memberId);
  const successful = transactions.filter((t) => isSuccessfulStatus(t.status));
  const pending = transactions.filter((t) => t.status === 'pending');
  const currency = successful[0]?.currency ?? 'NGN';

  const byCategoryMap = new Map<string, { total: number; count: number }>();
  successful.forEach((t) => {
    const key = t.category_name ?? t.category_id ?? 'Other';
    const existing = byCategoryMap.get(key) ?? { total: 0, count: 0 };
    existing.total += Number(t.amount);
    existing.count += 1;
    byCategoryMap.set(key, existing);
  });

  return {
    totalGiving: successful.reduce((sum, t) => sum + Number(t.amount), 0),
    successfulCount: successful.length,
    pendingCount: pending.length,
    byCategory: Array.from(byCategoryMap.entries()).map(([name, v]) => ({ category_name: name, ...v })),
    recentTransactions: transactions.slice(0, 5),
    currency,
  };
}

export async function fetchFinanceDashboardStats(): Promise<FinanceDashboardStats> {
  const supabase = createClient();
  const { data: allTxns } = await supabase
    .from('giving_transactions')
    .select('id, amount, currency, status, category_id, transaction_date, is_reversal')
    .order('transaction_date', { ascending: false })
    .limit(500);

  const txns = (allTxns ?? []) as any[];
  const successful = txns.filter((t) => isSuccessfulStatus(t.status) && !t.is_reversal);
  const pending = txns.filter((t) => t.status === 'pending');
  const failed = txns.filter((t) => t.status === 'failed');
  const refunded = txns.filter((t) => t.status === 'refunded' || t.status === 'reversed');

  // By category
  const byCatMap = new Map<string, { total: number; count: number; currency: string }>();
  successful.forEach((t) => {
    const key = t.category_id ?? 'uncategorized';
    const existing = byCatMap.get(key) ?? { total: 0, count: 0, currency: t.currency };
    existing.total += Number(t.amount);
    existing.count += 1;
    byCatMap.set(key, existing);
  });

  // Fetch category names
  const catIds = Array.from(byCatMap.keys()).filter((k) => k !== 'uncategorized');
  let catNameMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await supabase
      .from('giving_categories')
      .select('id, name')
      .in('id', catIds);
    (cats ?? []).forEach((c: any) => catNameMap.set(c.id, c.name));
  }

  // By currency
  const byCurMap = new Map<string, { total: number; count: number }>();
  successful.forEach((t) => {
    const existing = byCurMap.get(t.currency) ?? { total: 0, count: 0 };
    existing.total += Number(t.amount);
    existing.count += 1;
    byCurMap.set(t.currency, existing);
  });

  const { data: recent } = await supabase
    .from('giving_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(10);

  return {
    totalSuccessful: successful.reduce((s, t) => s + Number(t.amount), 0),
    totalPending: pending.reduce((s, t) => s + Number(t.amount), 0),
    totalFailed: failed.reduce((s, t) => s + Number(t.amount), 0),
    totalRefunded: refunded.reduce((s, t) => s + Number(t.amount), 0),
    successfulCount: successful.length,
    pendingCount: pending.length,
    failedCount: failed.length,
    refundedCount: refunded.length,
    byCategory: Array.from(byCatMap.entries()).map(([id, v]) => ({
      category_id: id,
      category_name: catNameMap.get(id) ?? 'Uncategorized',
      ...v,
    })),
    byCurrency: Array.from(byCurMap.entries()).map(([currency, v]) => ({ currency, ...v })),
    recentTransactions: (recent as GivingTransaction[]) ?? [],
  };
}

export async function fetchPublicCampaigns(): Promise<GivingCampaign[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('giving_campaigns')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as GivingCampaign[];
}

export async function fetchProviderConfigs(): Promise<GivingProviderConfig[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('giving_provider_configs')
    .select('*')
    .order('channel');
  if (error || !data) return [];
  return data as GivingProviderConfig[];
}
