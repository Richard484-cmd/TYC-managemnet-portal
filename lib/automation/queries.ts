import { createClient } from '@/lib/supabase/server';
import type {
  Automation,
  AutomationStep,
  AutomationExecution,
  AutomationExecutionLog,
  AutomationEvent,
  AutomationMonitoringStats,
  WorkflowStatus,
} from './types';

export async function fetchAutomations(includeArchived = false): Promise<Automation[]> {
  const supabase = createClient();
  let query = supabase
    .from('automations')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (!includeArchived) {
    query = query.neq('status', 'archived');
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return data as Automation[];
}

export async function fetchAutomation(id: string): Promise<Automation | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return null;
  return data as Automation;
}

export async function fetchAutomationSteps(automationId: string): Promise<AutomationStep[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('automation_steps')
    .select('*')
    .eq('automation_id', automationId)
    .order('position', { ascending: true });
  if (error || !data) return [];
  return data as AutomationStep[];
}

export async function fetchAutomationWithSteps(id: string): Promise<{ automation: Automation | null; steps: AutomationStep[] }> {
  const automation = await fetchAutomation(id);
  if (!automation) return { automation: null, steps: [] };
  const steps = await fetchAutomationSteps(id);
  return { automation: { ...automation, steps }, steps };
}

export async function fetchExecutions(
  filters: {
    automation_id?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    failedOnly?: boolean;
  } = {},
  page = 1,
  pageSize = 20
): Promise<{ executions: AutomationExecution[]; total: number }> {
  const supabase = createClient();
  let query = supabase
    .from('automation_executions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.automation_id) query = query.eq('automation_id', filters.automation_id);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
  if (filters.failedOnly) query = query.eq('status', 'failed');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error || !data) return { executions: [], total: 0 };

  const executions = data as AutomationExecution[];

  // Fetch automation names
  const automationIds = new Set(executions.map((e) => e.automation_id));
  if (automationIds.size > 0) {
    const { data: automations } = await supabase
      .from('automations')
      .select('id, name')
      .in('id', Array.from(automationIds));
    const nameMap = new Map<string, string>();
    (automations ?? []).forEach((a: any) => nameMap.set(a.id, a.name));
    executions.forEach((e) => {
      e.automation_name = nameMap.get(e.automation_id) ?? 'Unknown';
    });
  }

  return { executions, total: count ?? 0 };
}

export async function fetchExecution(id: string): Promise<AutomationExecution | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;

  const execution = data as AutomationExecution;
  // Fetch automation name
  const { data: automation } = await supabase
    .from('automations')
    .select('name')
    .eq('id', execution.automation_id)
    .maybeSingle();
  if (automation) {
    execution.automation_name = (automation as any).name;
  }
  return execution;
}

export async function fetchExecutionLogs(executionId: string): Promise<AutomationExecutionLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('automation_execution_logs')
    .select('*')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as AutomationExecutionLog[];
}

export async function fetchMonitoringStats(): Promise<AutomationMonitoringStats> {
  const supabase = createClient();

  const { data: automations } = await supabase
    .from('automations')
    .select('id, status')
    .is('deleted_at', null);

  const allAutomations = (automations ?? []) as any[];
  const totalWorkflows = allAutomations.length;
  const activeWorkflows = allAutomations.filter((a) => a.status === 'active').length;
  const pausedWorkflows = allAutomations.filter((a) => a.status === 'paused').length;
  const draftWorkflows = allAutomations.filter((a) => a.status === 'draft').length;
  const archivedWorkflows = allAutomations.filter((a) => a.status === 'archived').length;

  const { data: execStats } = await supabase
    .from('automation_executions')
    .select('id, status')
    .order('created_at', { ascending: false })
    .limit(500);

  const allExecs = (execStats ?? []) as any[];
  const totalExecutions = allExecs.length;
  const successfulExecutions = allExecs.filter((e) => e.status === 'successful').length;
  const failedExecutions = allExecs.filter((e) => e.status === 'failed').length;
  const waitingExecutions = allExecs.filter((e) => e.status === 'waiting').length;
  const runningExecutions = allExecs.filter((e) => e.status === 'running').length;

  const { data: recentData } = await supabase
    .from('automation_executions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const recentExecutions = (recentData ?? []) as AutomationExecution[];

  const { data: failedData } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(10);

  const failedExecutionsRecent = (failedData ?? []) as AutomationExecution[];

  const { count: pendingEvents } = await supabase
    .from('automation_event_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return {
    totalWorkflows,
    activeWorkflows,
    pausedWorkflows,
    draftWorkflows,
    archivedWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    waitingExecutions,
    runningExecutions,
    recentExecutions,
    failedExecutionsRecent,
    pendingEvents: pendingEvents ?? 0,
  };
}

export async function fetchPendingEvents(
  filters: { event_type?: string; status?: string } = {},
  page = 1,
  pageSize = 20
): Promise<{ events: AutomationEvent[]; total: number }> {
  const supabase = createClient();
  let query = supabase
    .from('automation_event_queue')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.event_type && filters.event_type !== 'all') query = query.eq('event_type', filters.event_type);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error || !data) return { events: [], total: 0 };
  return { events: data as AutomationEvent[], total: count ?? 0 };
}

export async function fetchUsersForAssignment(): Promise<{ id: string; display_name: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, first_name, last_name')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('display_name');
  if (error || !data) return [];
  return (data as any[]).map((u) => ({
    id: u.id,
    display_name: u.display_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.id.slice(0, 8),
  }));
}

export async function fetchTagsForSelection(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .is('deleted_at', null)
    .order('name');
  if (error || !data) return [];
  return data as { id: string; name: string }[];
}

export async function fetchPipelineStagesForSelection(): Promise<{ id: string; name: string; pipeline_name: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('crm_pipeline_stages')
    .select('id, name, pipeline_id:crm_pipelines(name)')
    .eq('is_active', true)
    .order('position');
  if (error || !data) return [];
  return (data as any[]).map((s) => ({
    id: s.id,
    name: s.name,
    pipeline_name: s.pipeline_id?.name ?? 'Unknown',
  }));
}

export async function fetchDepartmentsForSelection(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('departments')
    .select('id, name')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name');
  if (error || !data) return [];
  return data as { id: string; name: string }[];
}

export async function fetchGroupsForSelection(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('groups')
    .select('id, name')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name');
  if (error || !data) return [];
  return data as { id: string; name: string }[];
}

export async function fetchMembershipStatusesForSelection(): Promise<{ status_key: string; name: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('membership_statuses')
    .select('status_key, name')
    .order('sort_order');
  if (error || !data) return [];
  return data as { status_key: string; name: string }[];
}

export async function fetchCommunicationTemplates(): Promise<{ id: string; name: string; channel: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('communication_templates')
    .select('id, name, channel')
    .eq('is_active', true)
    .order('name');
  if (error || !data) return [];
  return data as { id: string; name: string; channel: string }[];
}
