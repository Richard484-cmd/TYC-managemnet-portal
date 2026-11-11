'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  TASK_STATUSES,
  CRM_PRIORITIES,
  getTaskStatusLabel,
  getTaskStatusBadge,
  getPriorityBadge,
  isTaskOverdue,
} from '@/lib/crm/constants';
import type { CrmTask } from '@/lib/crm/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, User, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export interface StaffUser {
  id: string;
  display_name: string;
}

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
}

// ============================================================================
// Task Card
// ============================================================================

interface TaskCardProps {
  task: CrmTask & {
    assigned_to_name?: string | null;
    contact_name?: string | null;
    is_overdue?: boolean;
  };
  onStatusChange?: (taskId: string, newStatus: string) => void;
  canEdit?: boolean;
  compact?: boolean;
}

export function TaskCard({ task, onStatusChange, canEdit, compact }: TaskCardProps) {
  const overdue = isTaskOverdue(task.due_date, task.status);

  return (
    <Card className={cn('transition-shadow hover:shadow-md', task.status === 'completed' && 'opacity-75')}>
      <CardContent className={cn(compact ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={cn('font-medium', compact ? 'text-sm' : 'text-sm')}>{task.title}</p>
            {!compact && task.description && (
              <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
            )}
          </div>
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold', getPriorityBadge(task.priority))}>
            {task.priority}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={cn('rounded-full px-2 py-0.5 font-medium', getTaskStatusBadge(task.status))}>
            {getTaskStatusLabel(task.status)}
          </span>
          {task.due_date && (
            <span className={cn('inline-flex items-center gap-1', overdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
              {overdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.assigned_to_name && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              {task.assigned_to_name}
            </span>
          )}
          {task.contact_name && (
            <Link
              href={`/admin/crm/${task.contact_id}`}
              className="text-blue-600 hover:underline"
            >
              {task.contact_name}
            </Link>
          )}
        </div>

        {canEdit && onStatusChange && task.status !== 'completed' && task.status !== 'cancelled' && (
          <div className="mt-2 flex gap-2">
            {task.status !== 'in_progress' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(task.id, 'in_progress')}>
                Start
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(task.id, 'completed')}>
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Task List
// ============================================================================

interface TaskListProps {
  tasks: (CrmTask & {
    assigned_to_name?: string | null;
    contact_name?: string | null;
    is_overdue?: boolean;
  })[];
  onStatusChange?: (taskId: string, newStatus: string) => void;
  canEdit?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

export function TaskList({ tasks, onStatusChange, canEdit, compact, emptyMessage }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? 'No tasks yet.'}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={onStatusChange}
          canEdit={canEdit}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Task Creation Form
// ============================================================================

interface TaskFormProps {
  contactId?: string;
  staffUsers: StaffUser[];
  contacts?: ContactOption[];
  onCreated?: (task: CrmTask) => void;
  defaultAssignee?: string;
}

export function TaskForm({ contactId, staffUsers, contacts, onCreated, defaultAssignee }: TaskFormProps) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState(defaultAssignee ?? '');
  const [selectedContact, setSelectedContact] = useState(contactId ?? '');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setCreating(true);
    const insertData: Record<string, unknown> = {
      title,
      description: description || null,
      notes: notes || null,
      priority,
      status: 'pending',
      due_date: dueDate || null,
      assigned_to: assignee || null,
      entity_type: selectedContact ? 'contact' : null,
      entity_id: selectedContact || null,
      contact_id: selectedContact || null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select('id, title, description, entity_type, entity_id, contact_id, assigned_to, assigned_by, priority, status, due_date, completed_at, created_by, notes, created_at, updated_at, deleted_at, completed_by')
      .single();

    setCreating(false);

    if (error || !data) {
      toast.error('Failed to create task');
      return;
    }

    toast.success('Task created');
    setTitle('');
    setDescription('');
    setNotes('');
    setDueDate('');
    setPriority('medium');
    setExpanded(false);
    onCreated?.(data as CrmTask);
  };

  if (!expanded) {
    return (
      <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
        <Plus className="mr-1 h-4 w-4" />
        New Task
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        autoFocus
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
      />
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRM_PRIORITIES.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Assign To</Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {staffUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {!contactId && contacts && contacts.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Related Contact</Label>
          <Select value={selectedContact} onValueChange={setSelectedContact}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={handleCreate} disabled={creating} size="sm">
          {creating ? 'Creating...' : 'Create Task'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
      </div>
    </div>
  );
}

// ============================================================================
// Task Filters
// ============================================================================

interface TaskFiltersProps {
  search: string;
  status: string;
  priority: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  staffUsers?: StaffUser[];
  assigneeFilter?: string;
  onAssigneeChange?: (v: string) => void;
}

export function TaskFiltersBar({
  search,
  status,
  priority,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  staffUsers,
  assigneeFilter,
  onAssigneeChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 w-full sm:w-64"
      />
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger className="h-9 w-36">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {CRM_PRIORITIES.map((p) => (
            <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {staffUsers && onAssigneeChange && (
        <Select value={assigneeFilter ?? 'all'} onValueChange={onAssigneeChange}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {staffUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ============================================================================
// Task Status Update Hook (reusable client-side status update)
// ============================================================================

export function useTaskStatusUpdate(onSuccess?: (taskId: string, status: string) => void) {
  const supabase = createClient();

  return useCallback(
    async (taskId: string, newStatus: string) => {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus !== 'completed') {
        updateData.completed_at = null;
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) {
        toast.error('Failed to update task status');
        return false;
      }
      toast.success(`Task marked as ${getTaskStatusLabel(newStatus)}`);
      onSuccess?.(taskId, newStatus);
      return true;
    },
    [supabase, onSuccess]
  );
}
