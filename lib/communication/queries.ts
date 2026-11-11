import { createClient } from '@/lib/supabase/server';
import type {
  CommunicationTemplate,
  CommunicationJob,
  CommunicationLog,
  AudienceResolutionResult,
  AudienceRecipient,
  AudienceCriteria,
  CommunicationDashboardStats,
  ProviderConfig,
} from './types';
import { isChannelEligible } from './constants';
import type { CommunicationChannel } from './types';

export async function fetchTemplates(channel?: string): Promise<CommunicationTemplate[]> {
  const supabase = createClient();
  let query = supabase
    .from('communication_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (channel) query = query.eq('channel', channel);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as CommunicationTemplate[];
}

export async function fetchTemplate(id: string): Promise<CommunicationTemplate | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('communication_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as CommunicationTemplate;
}

export async function fetchJobs(
  page = 1,
  pageSize = 20
): Promise<{ jobs: CommunicationJob[]; total: number }> {
  const supabase = createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from('communication_jobs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error || !data) return { jobs: [], total: 0 };
  return { jobs: data as CommunicationJob[], total: count ?? 0 };
}

export async function fetchLogs(
  filters: { channel?: string; status?: string; template_id?: string; contact_id?: string } = {},
  page = 1,
  pageSize = 20
): Promise<{ logs: CommunicationLog[]; total: number }> {
  const supabase = createClient();
  let query = supabase
    .from('communication_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (filters.channel) query = query.eq('channel', filters.channel);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.template_id) query = query.eq('template_id', filters.template_id);
  if (filters.contact_id) query = query.eq('contact_id', filters.contact_id);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error || !data) return { logs: [], total: 0 };
  return { logs: data as CommunicationLog[], total: count ?? 0 };
}

export async function resolveAudience(
  criteria: AudienceCriteria,
  channel: CommunicationChannel
): Promise<AudienceResolutionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('resolve_communication_audience', {
    p_criteria: criteria,
  });
  if (error || !data) {
    return { recipients: [], total: 0, eligible: 0, excluded: 0, excludedReasons: { missing_email: 0, missing_phone: 0, inactive: 0 } };
  }

  const allRecipients = data as AudienceRecipient[];
  const eligible = allRecipients.filter((r) => isChannelEligible(channel, r));
  const excluded = allRecipients.length - eligible.length;
  let missingEmail = 0;
  let missingPhone = 0;
  if (channel === 'email') missingEmail = excluded;
  if (channel === 'sms' || channel === 'whatsapp') missingPhone = excluded;

  return {
    recipients: eligible,
    total: allRecipients.length,
    eligible: eligible.length,
    excluded,
    excludedReasons: { missing_email: missingEmail, missing_phone: missingPhone, inactive: 0 },
  };
}

export async function fetchDashboardStats(): Promise<CommunicationDashboardStats> {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from('communication_logs')
    .select('channel, status')
    .order('created_at', { ascending: false })
    .limit(500);

  const allLogs = logs ?? [];
  const totalSent = allLogs.filter((l: any) => l.status === 'sent' || l.status === 'delivered').length;
  const emailCount = allLogs.filter((l: any) => l.channel === 'email').length;
  const smsCount = allLogs.filter((l: any) => l.channel === 'sms').length;
  const whatsappCount = allLogs.filter((l: any) => l.channel === 'whatsapp').length;
  const inAppCount = allLogs.filter((l: any) => l.channel === 'in_app').length;
  const delivered = allLogs.filter((l: any) => l.status === 'delivered').length;
  const failed = allLogs.filter((l: any) => l.status === 'failed').length;
  const pending = allLogs.filter((l: any) => l.status === 'pending' || l.status === 'sending').length;

  const { data: recent } = await supabase
    .from('communication_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    totalSent,
    emailCount,
    smsCount,
    whatsappCount,
    inAppCount,
    delivered,
    failed,
    pending,
    recentCommunications: (recent as CommunicationLog[]) ?? [],
  };
}

export async function fetchProviderConfigs(): Promise<ProviderConfig[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('communication_provider_configs')
    .select('*')
    .order('channel');
  if (error || !data) return [];
  return data as ProviderConfig[];
}

export async function fetchAudienceOptions() {
  const supabase = createClient();
  const [tags, departments, groups, stages, membershipStatuses] = await Promise.all([
    supabase.from('tags').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('departments').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('groups').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('crm_pipeline_stages').select('id, name').eq('is_active', true).order('position'),
    supabase.from('membership_statuses').select('status_key, name').order('sort_order'),
  ]);
  return {
    tags: (tags.data as { id: string; name: string }[]) ?? [],
    departments: (departments.data as { id: string; name: string }[]) ?? [],
    groups: (groups.data as { id: string; name: string }[]) ?? [],
    stages: (stages.data as { id: string; name: string }[]) ?? [],
    membershipStatuses: (membershipStatuses.data as { status_key: string; name: string }[]) ?? [],
  };
}
