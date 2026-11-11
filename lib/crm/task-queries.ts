import { createClient } from '@/lib/supabase/server';
import type { CrmTask } from './types';
import { isTaskOverdue } from './constants';

export interface TaskWithNames extends CrmTask {
  assigned_to_name: string | null;
  created_by_name: string | null;
  completed_by_name: string | null;
  contact_name: string | null;
  is_overdue: boolean;
}

export interface TaskAssignmentHistoryEntry {
  id: string;
  task_id: string;
  previous_assignee: string | null;
  new_assignee: string | null;
  changed_by: string | null;
  changed_at: string;
  previous_assignee_name: string | null;
  new_assignee_name: string | null;
  changed_by_name: string | null;
}

export interface TaskListResult {
  tasks: TaskWithNames[];
  total: number;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  contact_id?: string;
  overdue_only?: boolean;
}

export async function fetchTasks(
  filters: TaskFilters = {},
  page = 1,
  pageSize = 20,
  mode: 'all' | 'my_tasks' = 'all',
  currentUserId?: string
): Promise<TaskListResult> {
  const supabase = createClient();

  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (mode === 'my_tasks' && currentUserId) {
    query = query.eq('assigned_to', currentUserId);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }
  if (filters.assigned_to && filters.assigned_to !== 'all') {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters.contact_id) {
    query = query.eq('contact_id', filters.contact_id);
  }
  if (filters.overdue_only) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lt('due_date', today).in('status', ['pending', 'in_progress']);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching tasks:', error.message);
    return { tasks: [], total: 0 };
  }

  const taskList = (data as CrmTask[]) ?? [];

  const userIds = new Set<string>();
  taskList.forEach((t) => {
    if (t.assigned_to) userIds.add(t.assigned_to);
    if (t.created_by) userIds.add(t.created_by);
    if (t.completed_by) userIds.add(t.completed_by);
  });
  const contactIds = taskList.map((t) => t.contact_id).filter(Boolean) as string[];

  const [userMap, contactMap] = await Promise.all([
    userIds.size > 0
      ? supabase.from('users').select('id, display_name').in('id', Array.from(userIds))
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase.from('contacts').select('id, first_name, last_name').in('id', contactIds)
      : Promise.resolve({ data: [] }),
  ]);

  const uMap = new Map<string, string>();
  (userMap.data ?? []).forEach((u: any) => uMap.set(u.id, u.display_name));
  const cMap = new Map<string, string>();
  (contactMap.data ?? []).forEach((c: any) => cMap.set(c.id, `${c.first_name} ${c.last_name}`));

  const tasksWithNames: TaskWithNames[] = taskList.map((t) => ({
    ...t,
    assigned_to_name: t.assigned_to ? uMap.get(t.assigned_to) ?? null : null,
    created_by_name: t.created_by ? uMap.get(t.created_by) ?? null : null,
    completed_by_name: t.completed_by ? uMap.get(t.completed_by) ?? null : null,
    contact_name: t.contact_id ? cMap.get(t.contact_id) ?? null : null,
    is_overdue: isTaskOverdue(t.due_date, t.status),
  }));

  return { tasks: tasksWithNames, total: count ?? 0 };
}

export async function fetchTaskAssignmentHistory(taskId: string): Promise<TaskAssignmentHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('task_assignment_history')
    .select('*')
    .eq('task_id', taskId)
    .order('changed_at', { ascending: false });

  if (error || !data) return [];

  const entries = data as any[];
  const userIds = new Set<string>();
  entries.forEach((e) => {
    if (e.previous_assignee) userIds.add(e.previous_assignee);
    if (e.new_assignee) userIds.add(e.new_assignee);
    if (e.changed_by) userIds.add(e.changed_by);
  });

  let nameMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabase.from('users').select('id, display_name').in('id', Array.from(userIds));
    (users ?? []).forEach((u: any) => nameMap.set(u.id, u.display_name));
  }

  return entries.map((e) => ({
    id: e.id,
    task_id: e.task_id,
    previous_assignee: e.previous_assignee,
    new_assignee: e.new_assignee,
    changed_by: e.changed_by,
    changed_at: e.changed_at,
    previous_assignee_name: e.previous_assignee ? nameMap.get(e.previous_assignee) ?? null : null,
    new_assignee_name: e.new_assignee ? nameMap.get(e.new_assignee) ?? null : null,
    changed_by_name: e.changed_by ? nameMap.get(e.changed_by) ?? null : null,
  }));
}
