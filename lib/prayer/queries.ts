import { createClient } from '@/lib/supabase/server';
import type {
  PrayerRequest,
  PrayerCategory,
  PrayerStatusHistory,
  PrayerPastoralNote,
  PrayerMemberUpdate,
  PrayerDashboardStats,
} from './types';

export async function fetchPrayerCategories(): Promise<PrayerCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('prayer_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error || !data) return [];
  return data as PrayerCategory[];
}

export async function fetchPrayerRequests(
  filters: {
    status?: string;
    category?: string;
    assigned_to?: string;
    visibility?: string;
    search?: string;
    overdue_only?: boolean;
  } = {},
  page = 1,
  pageSize = 20
): Promise<{ requests: PrayerRequest[]; total: number }> {
  const supabase = createClient();
  let query = supabase
    .from('prayer_requests')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.assigned_to && filters.assigned_to !== 'all') query = query.eq('assigned_to', filters.assigned_to);
  if (filters.visibility && filters.visibility !== 'all') query = query.eq('visibility', filters.visibility);
  if (filters.search) query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`);
  if (filters.overdue_only) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lt('follow_up_date', today).not('status', 'in', '("answered","closed")');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error || !data) return { requests: [], total: 0 };

  const requests = data as PrayerRequest[];

  // Fetch names for submitted_by and assigned_to
  const userIds = new Set<string>();
  requests.forEach((r) => {
    if (r.submitted_by) userIds.add(r.submitted_by);
    if (r.assigned_to) userIds.add(r.assigned_to);
  });

  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', Array.from(userIds));
    const nameMap = new Map<string, string>();
    (users ?? []).forEach((u: any) => nameMap.set(u.id, u.display_name));
    requests.forEach((r) => {
      r.submitted_by_name = r.submitted_by ? nameMap.get(r.submitted_by) ?? null : null;
      r.assigned_to_name = r.assigned_to ? nameMap.get(r.assigned_to) ?? null : null;
    });
  }

  return { requests, total: count ?? 0 };
}

export async function fetchPrayerRequest(id: string): Promise<PrayerRequest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return null;
  return data as PrayerRequest;
}

export async function fetchStatusHistory(prayerId: string): Promise<PrayerStatusHistory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('prayer_status_history')
    .select('*')
    .eq('prayer_request_id', prayerId)
    .order('changed_at', { ascending: false });
  if (error || !data) return [];

  const history = data as PrayerStatusHistory[];
  const userIds = new Set(history.map((h) => h.changed_by).filter(Boolean) as string[]);
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', Array.from(userIds));
    const nameMap = new Map<string, string>();
    (users ?? []).forEach((u: any) => nameMap.set(u.id, u.display_name));
    history.forEach((h) => {
      h.changed_by_name = h.changed_by ? nameMap.get(h.changed_by) ?? null : null;
    });
  }
  return history;
}

export async function fetchPastoralNotes(prayerId: string): Promise<PrayerPastoralNote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('prayer_pastoral_notes')
    .select('*')
    .eq('prayer_request_id', prayerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const notes = data as PrayerPastoralNote[];
  const userIds = new Set(notes.map((n) => n.author_id).filter(Boolean) as string[]);
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', Array.from(userIds));
    const nameMap = new Map<string, string>();
    (users ?? []).forEach((u: any) => nameMap.set(u.id, u.display_name));
    notes.forEach((n) => {
      n.author_name = n.author_id ? nameMap.get(n.author_id) ?? null : null;
    });
  }
  return notes;
}

export async function fetchMemberUpdates(prayerId: string): Promise<PrayerMemberUpdate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('prayer_member_updates')
    .select('*')
    .eq('prayer_request_id', prayerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const updates = data as PrayerMemberUpdate[];
  const userIds = new Set(updates.map((u) => u.author_id).filter(Boolean) as string[]);
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', Array.from(userIds));
    const nameMap = new Map<string, string>();
    (users ?? []).forEach((u: any) => nameMap.set(u.id, u.display_name));
    updates.forEach((u) => {
      u.author_name = u.author_id ? nameMap.get(u.author_id) ?? null : null;
    });
  }
  return updates;
}

export async function fetchMyPrayerRequests(userId: string): Promise<PrayerRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('*')
    .eq('submitted_by', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as PrayerRequest[];
}

export async function fetchDashboardStats(userId: string): Promise<PrayerDashboardStats> {
  const supabase = createClient();
  const { data: allReqs } = await supabase
    .from('prayer_requests')
    .select('status, assigned_to, follow_up_date')
    .is('deleted_at', null);

  const reqs = allReqs ?? [];
  const today = new Date().toISOString().split('T')[0];

  return {
    newCount: reqs.filter((r: any) => r.status === 'new' || r.status === 'open').length,
    assignedCount: reqs.filter((r: any) => r.status === 'assigned').length,
    prayingCount: reqs.filter((r: any) => r.status === 'praying' || r.status === 'in_progress').length,
    followUpRequiredCount: reqs.filter((r: any) => r.status === 'follow_up_required').length,
    answeredCount: reqs.filter((r: any) => r.status === 'answered').length,
    closedCount: reqs.filter((r: any) => r.status === 'closed').length,
    assignedToMe: reqs.filter((r: any) => r.assigned_to === userId).length,
    followUpsDue: reqs.filter((r: any) =>
      r.follow_up_date === today &&
      r.status !== 'answered' && r.status !== 'closed'
    ).length,
    overdueFollowUps: reqs.filter((r: any) =>
      r.follow_up_date < today &&
      r.follow_up_date !== null &&
      r.status !== 'answered' && r.status !== 'closed'
    ).length,
  };
}
