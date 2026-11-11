import { createClient } from '@/lib/supabase/server';
import type { DateRange } from './date-range';
import { getPreviousRange, computePercentChange } from './date-range';

// ============================================================================
// TYPES
// ============================================================================

export interface MetricCardData {
  label: string;
  value: number;
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
  changePercent?: number | null;
  changeLabel?: string;
  description?: string;
}

export interface MembershipReport {
  totalMembers: number;
  newMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  visitors: number;
  growth: { date: string; count: number }[];
  byStatus: { status_key: string; label: string; count: number }[];
  previousTotalMembers: number;
  previousNewMembers: number;
}

export interface AttendanceReport {
  averageAttendance: number;
  attendancePercentage: number;
  totalEvents: number;
  totalRecords: number;
  presentCount: number;
  visitorAttendance: number;
  trends: { date: string; present: number; total: number }[];
  byDepartment: { department_id: string | null; department_name: string; events: number; present: number; total: number; rate: number }[];
}

export interface FollowUpReport {
  open: number;
  completed: number;
  overdue: number;
  byType: { type: string; count: number }[];
  pipelineConversion: { stage_id: string; stage_name: string; position: number; contacts: number }[];
  officerActivity: { user_id: string; display_name: string; assigned: number; completed: number; open: number; overdue: number; completionRate: number }[];
}

export interface EventsReport {
  totalEvents: number;
  totalRegistrations: number;
  totalAttended: number;
  totalNoShows: number;
  totalCapacity: number;
  events: {
    id: string;
    title: string;
    start_date: string;
    capacity: number | null;
    registrations: number;
    attended: number;
    noShows: number;
  }[];
}

export interface GivingReport {
  totalGiving: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  byCurrency: { currency: string; total: number; count: number }[];
  byCategory: { category_id: string | null; category_name: string; total: number; count: number; currency: string }[];
  trends: { date: string; total: number; count: number }[];
  byStatus: { status: string; count: number; total: number }[];
}

// ============================================================================
// MEMBERSHIP REPORTS
// ============================================================================

export async function getMembershipReport(range: DateRange): Promise<MembershipReport> {
  const supabase = createClient();

  const [{ count: totalMembers }, { count: newMembers }, { count: activeMembers }, { count: inactiveMembers }, { count: visitors }, { count: prevNewMembers }] =
    await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', range.start).lte('created_at', range.end + 'T23:59:59'),
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status_key', 'member'),
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).in('status_key', ['inactive', 'archived']),
      supabase.from('visitors').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', getPreviousRange(range).start).lte('created_at', getPreviousRange(range).end + 'T23:59:59'),
    ]);

  // Growth over time - new members per day in range
  const { data: growthData } = await supabase
    .from('members')
    .select('created_at')
    .is('deleted_at', null)
    .gte('created_at', range.start)
    .lte('created_at', range.end + 'T23:59:59')
    .order('created_at', { ascending: true });

  const growthMap = new Map<string, number>();
  for (const m of growthData ?? []) {
    const day = (m as { created_at: string }).created_at.split('T')[0];
    growthMap.set(day, (growthMap.get(day) ?? 0) + 1);
  }

  // Cumulative growth
  let cumulative = (totalMembers ?? 0) - (newMembers ?? 0);
  const growth: { date: string; count: number }[] = [];
  const start = new Date(range.start);
  const end = new Date(range.end);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayKey = d.toISOString().split('T')[0];
    cumulative += growthMap.get(dayKey) ?? 0;
    growth.push({ date: dayKey, count: cumulative });
  }

  // By status breakdown
  const { data: statusData } = await supabase.rpc('count_members_by_status');

  const STATUS_LABELS: Record<string, string> = {
    visitor: 'Visitor',
    regular_attender: 'New Member',
    member: 'Active Member',
    worker: 'Worker',
    inactive: 'Inactive',
    archived: 'Archived',
  };

  const byStatus = (statusData as { status_key: string; count: number }[] ?? []).map((s) => ({
    status_key: s.status_key,
    label: STATUS_LABELS[s.status_key] ?? s.status_key,
    count: s.count,
  }));

  return {
    totalMembers: totalMembers ?? 0,
    newMembers: newMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    inactiveMembers: inactiveMembers ?? 0,
    visitors: visitors ?? 0,
    growth,
    byStatus,
    previousTotalMembers: totalMembers ?? 0,
    previousNewMembers: prevNewMembers ?? 0,
  };
}

// ============================================================================
// ATTENDANCE REPORTS
// ============================================================================

export async function getAttendanceReport(range: DateRange, departmentId?: string): Promise<AttendanceReport> {
  const supabase = createClient();

  let eventQuery = supabase
    .from('attendance_events')
    .select('id, title, event_date, department_id, event_type')
    .is('deleted_at', null)
    .gte('event_date', range.start)
    .lte('event_date', range.end)
    .order('event_date', { ascending: true });

  if (departmentId) {
    eventQuery = eventQuery.eq('department_id', departmentId);
  }

  const { data: events } = await eventQuery;
  const eventIds = (events ?? []).map((e) => (e as { id: string }).id);

  let totalRecords = 0;
  let presentCount = 0;
  let visitorAttendance = 0;
  const trendsMap = new Map<string, { present: number; total: number }>();

  if (eventIds.length > 0) {
    const { data: records } = await supabase
      .from('attendance_records')
      .select('attendance_event_id, member_id, status')
      .in('attendance_event_id', eventIds);

    const eventDateMap = new Map<string, string>();
    for (const e of events ?? []) {
      const ev = e as { id: string; event_date: string };
      eventDateMap.set(ev.id, ev.event_date);
    }

    for (const r of records ?? []) {
      const rec = r as { attendance_event_id: string; member_id: string; status: string };
      totalRecords++;
      const date = eventDateMap.get(rec.attendance_event_id) ?? '';
      const entry = trendsMap.get(date) ?? { present: 0, total: 0 };
      entry.total++;
      if (rec.status === 'present' || rec.status === 'late') {
        entry.present++;
        presentCount++;
      }
      // Visitor attendance: records where member has status_key = 'visitor'
      // We'd need a join - for now count records for events of type 'service'
    }

    // Check visitor attendance via member status
    const { data: visitorMembers } = await supabase
      .from('members')
      .select('id')
      .eq('status_key', 'visitor')
      .is('deleted_at', null);
    const visitorMemberIds = new Set((visitorMembers ?? []).map((m) => (m as { id: string }).id));
    for (const r of records ?? []) {
      const rec = r as { member_id: string };
      if (visitorMemberIds.has(rec.member_id)) visitorAttendance++;
    }
  }

  const trends = Array.from(trendsMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));

  const averageAttendance = events && events.length > 0 ? Math.round(presentCount / events.length) : 0;
  const attendancePercentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  // Department attendance breakdown
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');

  const byDepartment: AttendanceReport['byDepartment'] = [];
  for (const dept of departments ?? []) {
    const d = dept as { id: string; name: string };
    const deptEvents = (events ?? []).filter((e) => (e as { department_id: string | null }).department_id === d.id);
    const deptEventIds = deptEvents.map((e) => (e as { id: string }).id);
    if (deptEventIds.length === 0) {
      byDepartment.push({ department_id: d.id, department_name: d.name, events: 0, present: 0, total: 0, rate: 0 });
      continue;
    }
    const { count: deptTotal } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .in('attendance_event_id', deptEventIds);
    const { count: deptPresent } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .in('attendance_event_id', deptEventIds)
      .in('status', ['present', 'late']);
    const deptTotalNum = deptTotal ?? 0;
    const deptPresentNum = deptPresent ?? 0;
    byDepartment.push({
      department_id: d.id,
      department_name: d.name,
      events: deptEvents.length,
      present: deptPresentNum,
      total: deptTotalNum,
      rate: deptTotalNum > 0 ? Math.round((deptPresentNum / deptTotalNum) * 100) : 0,
    });
  }

  return {
    averageAttendance,
    attendancePercentage,
    totalEvents: events?.length ?? 0,
    totalRecords,
    presentCount,
    visitorAttendance,
    trends,
    byDepartment,
  };
}

// ============================================================================
// FOLLOW-UP REPORTS
// ============================================================================

export async function getFollowUpReport(range: DateRange, pipelineId?: string): Promise<FollowUpReport> {
  const supabase = createClient();
  const now = new Date().toISOString().split('T')[0];

  let baseQuery = supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null);
  if (pipelineId) baseQuery = baseQuery.eq('pipeline_id', pipelineId);

  const [{ count: open }, { count: completed }, { count: overdue }] = await Promise.all([
    supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).not('status', 'in', '("completed","cancelled")'),
    supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'completed').gte('completed_at', range.start).lte('completed_at', range.end + 'T23:59:59'),
    supabase.from('follow_ups').select('*', { count: 'exact', head: true }).is('deleted_at', null).not('status', 'in', '("completed","cancelled")').lt('due_date', now),
  ]);

  // By type
  const { data: typeData } = await supabase.rpc('count_followups_by_type');
  const byType = (typeData as { type: string; count: number }[] ?? []).map((t) => ({ type: t.type, count: t.count }));

  // Pipeline conversion
  let pipelineQuery = supabase.from('crm_pipeline_stages').select('id, name, position, pipeline_id').order('position', { ascending: true });
  if (pipelineId) pipelineQuery = pipelineQuery.eq('pipeline_id', pipelineId);
  const { data: stages } = await pipelineQuery;

  const pipelineConversion: FollowUpReport['pipelineConversion'] = [];
  for (const stage of stages ?? []) {
    const s = stage as { id: string; name: string; position: number };
    const { count } = await supabase
      .from('follow_ups')
      .select('*', { count: 'exact', head: true })
      .eq('stage_id', s.id)
      .is('deleted_at', null);
    pipelineConversion.push({ stage_id: s.id, stage_name: s.name, position: s.position, contacts: count ?? 0 });
  }

  // Officer activity
  const { data: officers } = await supabase
    .from('follow_ups')
    .select('assigned_to')
    .is('deleted_at', null)
    .not('assigned_to', 'is', null);

  const officerIds = Array.from(new Set((officers ?? []).map((o) => (o as { assigned_to: string }).assigned_to)));
  const officerActivity: FollowUpReport['officerActivity'] = [];

  if (officerIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', officerIds);
    const userMap = new Map((users ?? []).map((u) => [(u as { id: string }).id, (u as { display_name: string }).display_name]));

    for (const officerId of officerIds) {
      const [{ count: assigned }, { count: officerCompleted }, { count: officerOpen }, { count: officerOverdue }] = await Promise.all([
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).is('deleted_at', null),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).eq('status', 'completed').is('deleted_at', null).gte('completed_at', range.start).lte('completed_at', range.end + 'T23:59:59'),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).not('status', 'in', '("completed","cancelled")').is('deleted_at', null),
        supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', officerId).not('status', 'in', '("completed","cancelled")').lt('due_date', now).is('deleted_at', null),
      ]);
      const assignedNum = assigned ?? 0;
      const completedNum = officerCompleted ?? 0;
      officerActivity.push({
        user_id: officerId,
        display_name: userMap.get(officerId) ?? 'Unknown',
        assigned: assignedNum,
        completed: completedNum,
        open: officerOpen ?? 0,
        overdue: officerOverdue ?? 0,
        completionRate: assignedNum > 0 ? Math.round((completedNum / assignedNum) * 100) : 0,
      });
    }
  }

  return {
    open: open ?? 0,
    completed: completed ?? 0,
    overdue: overdue ?? 0,
    byType,
    pipelineConversion,
    officerActivity: officerActivity.sort((a, b) => b.assigned - a.assigned),
  };
}

// ============================================================================
// EVENTS REPORTS
// ============================================================================

export async function getEventsReport(range: DateRange, eventId?: string): Promise<EventsReport> {
  const supabase = createClient();

  let query = supabase
    .from('events')
    .select('id, title, start_date, capacity')
    .is('deleted_at', null)
    .gte('start_date', range.start + 'T00:00:00')
    .lte('start_date', range.end + 'T23:59:59')
    .order('start_date', { ascending: false });

  if (eventId) query = query.eq('id', eventId);
  const { data: events } = await query;

  const eventsReport: EventsReport['events'] = [];
  let totalRegistrations = 0;
  let totalAttended = 0;
  let totalNoShows = 0;
  let totalCapacity = 0;

  for (const e of events ?? []) {
    const ev = e as { id: string; title: string; start_date: string; capacity: number | null };
    const [{ count: regs }, { data: regData }] = await Promise.all([
      supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', ev.id).neq('status', 'cancelled'),
      supabase.from('event_registrations').select('member_id').eq('event_id', ev.id).neq('status', 'cancelled'),
    ]);

    const regCount = regs ?? 0;
    totalRegistrations += regCount;
    if (ev.capacity) totalCapacity += ev.capacity;

    // Check attendance: attendance_events linked to this event or members who registered and attended any attendance event that day
    const regMemberIds = (regData ?? []).map((r) => (r as { member_id: string }).member_id).filter(Boolean);
    let attended = 0;
    if (regMemberIds.length > 0) {
      const eventDate = ev.start_date.split('T')[0];
      const { data: attendanceEvents } = await supabase
        .from('attendance_events')
        .select('id')
        .eq('event_date', eventDate)
        .is('deleted_at', null);
      const attEventIds = (attendanceEvents ?? []).map((a) => (a as { id: string }).id);
      if (attEventIds.length > 0) {
        const { count: attCount } = await supabase
          .from('attendance_records')
          .select('*', { count: 'exact', head: true })
          .in('attendance_event_id', attEventIds)
          .in('member_id', regMemberIds)
          .in('status', ['present', 'late']);
        attended = attCount ?? 0;
      }
    }

    totalAttended += attended;
    const noShows = regCount - attended;
    totalNoShows += noShows;

    eventsReport.push({
      id: ev.id,
      title: ev.title,
      start_date: ev.start_date,
      capacity: ev.capacity,
      registrations: regCount,
      attended,
      noShows,
    });
  }

  return {
    totalEvents: events?.length ?? 0,
    totalRegistrations,
    totalAttended,
    totalNoShows,
    totalCapacity,
    events: eventsReport,
  };
}

// ============================================================================
// GIVING REPORTS
// ============================================================================

export async function getGivingReport(range: DateRange, categoryId?: string, currency?: string): Promise<GivingReport> {
  const supabase = createClient();

  let baseQuery = supabase
    .from('giving_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('transaction_date', range.start + 'T00:00:00')
    .lte('transaction_date', range.end + 'T23:59:59');

  if (categoryId) baseQuery = baseQuery.eq('category_id', categoryId);
  if (currency) baseQuery = baseQuery.eq('currency', currency);

  const [{ count: successfulCount }, { count: failedCount }, { count: pendingCount }, { count: refundedCount }] = await Promise.all([
    supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).in('status', ['successful', 'verified']).gte('transaction_date', range.start + 'T00:00:00').lte('transaction_date', range.end + 'T23:59:59'),
    supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('transaction_date', range.start + 'T00:00:00').lte('transaction_date', range.end + 'T23:59:59'),
    supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('transaction_date', range.start + 'T00:00:00').lte('transaction_date', range.end + 'T23:59:59'),
    supabase.from('giving_transactions').select('*', { count: 'exact', head: true }).eq('status', 'refunded').gte('transaction_date', range.start + 'T00:00:00').lte('transaction_date', range.end + 'T23:59:59'),
  ]);

  // Total successful giving
  let totalQuery = supabase
    .from('giving_transactions')
    .select('amount, currency')
    .in('status', ['successful', 'verified'])
    .gte('transaction_date', range.start + 'T00:00:00')
    .lte('transaction_date', range.end + 'T23:59:59');
  if (categoryId) totalQuery = totalQuery.eq('category_id', categoryId);
  if (currency) totalQuery = totalQuery.eq('currency', currency);
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

  // By category
  const { data: categories } = await supabase.from('giving_categories').select('id, name').eq('is_active', true).order('sort_order');
  const categoryNameMap = new Map((categories ?? []).map((c) => [(c as { id: string }).id, (c as { name: string }).name]));

  let catQuery = supabase
    .from('giving_transactions')
    .select('category_id, amount, currency')
    .in('status', ['successful', 'verified'])
    .gte('transaction_date', range.start + 'T00:00:00')
    .lte('transaction_date', range.end + 'T23:59:59');
  if (currency) catQuery = catQuery.eq('currency', currency);
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

  const byCategory: GivingReport['byCategory'] = Array.from(catMap.entries()).map(([key, v]) => ({
    category_id: key === 'uncategorized' ? null : key,
    category_name: key === 'uncategorized' ? 'Uncategorized' : (categoryNameMap.get(key) ?? 'Unknown'),
    total: v.total,
    count: v.count,
    currency: v.currency,
  }));

  // Trends - daily totals
  const { data: trendData } = await supabase
    .from('giving_transactions')
    .select('transaction_date, amount')
    .in('status', ['successful', 'verified'])
    .gte('transaction_date', range.start + 'T00:00:00')
    .lte('transaction_date', range.end + 'T23:59:59')
    .order('transaction_date', { ascending: true });

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

  // By status
  const byStatus: GivingReport['byStatus'] = [
    { status: 'successful', count: successfulCount ?? 0, total: 0 },
    { status: 'failed', count: failedCount ?? 0, total: 0 },
    { status: 'pending', count: pendingCount ?? 0, total: 0 },
    { status: 'refunded', count: refundedCount ?? 0, total: 0 },
  ];

  return {
    totalGiving,
    successfulCount: successfulCount ?? 0,
    failedCount: failedCount ?? 0,
    pendingCount: pendingCount ?? 0,
    refundedCount: refundedCount ?? 0,
    byCurrency: Array.from(byCurrencyMap.entries()).map(([curr, v]) => ({ currency: curr, total: v.total, count: v.count })),
    byCategory: byCategory.sort((a, b) => b.total - a.total),
    trends,
    byStatus,
  };
}


