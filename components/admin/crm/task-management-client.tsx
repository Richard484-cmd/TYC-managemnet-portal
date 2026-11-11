'use client';

import { useState, useCallback } from 'react';
import {
  TaskList,
  TaskForm,
  TaskFiltersBar,
  useTaskStatusUpdate,
} from '@/components/admin/crm/task-components';
import type { CrmTask } from '@/lib/crm/types';
import type { TaskWithNames } from '@/lib/crm/task-queries';
import type { StaffUser } from '@/components/admin/crm/task-components';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface TaskManagementClientProps {
  initialTasks: TaskWithNames[];
  total: number;
  staffUsers: StaffUser[];
  currentUserId: string;
  canEdit: boolean;
  initialMode: 'all' | 'my_tasks';
  search: string;
  status: string;
  priority: string;
  assigneeFilter: string;
  page: number;
  pageSize: number;
}

export function TaskManagementClient({
  initialTasks,
  total,
  staffUsers,
  currentUserId,
  canEdit,
  initialMode,
  search: initialSearch,
  status: initialStatus,
  priority: initialPriority,
  assigneeFilter: initialAssignee,
  page,
  pageSize,
}: TaskManagementClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithNames[]>(initialTasks);
  const [mode, setMode] = useState<'all' | 'my_tasks'>(initialMode);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [priorityVal, setPriorityVal] = useState(initialPriority);
  const [assignee, setAssignee] = useState(initialAssignee);

  const handleStatusUpdate = useCallback(
    (taskId: string, newStatus: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                completed_by: newStatus === 'completed' ? currentUserId : null,
              }
            : t
        )
      );
    },
    [currentUserId]
  );

  const updateStatus = useTaskStatusUpdate(handleStatusUpdate);

  const handleCreated = (task: CrmTask) => {
    router.refresh();
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (priorityVal !== 'all') params.set('priority', priorityVal);
    if (assignee !== 'all') params.set('assigned_to', assignee);
    if (mode === 'my_tasks') params.set('mode', 'my_tasks');
    router.push(`/admin/tasks?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'my_tasks' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('my_tasks');
            const params = new URLSearchParams();
            params.set('mode', 'my_tasks');
            if (search) params.set('search', search);
            if (status !== 'all') params.set('status', status);
            router.push(`/admin/tasks?${params.toString()}`);
          }}
        >
          My Tasks
        </Button>
        <Button
          variant={mode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('all');
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (status !== 'all') params.set('status', status);
            router.push(`/admin/tasks?${params.toString()}`);
          }}
        >
          All Tasks
        </Button>
      </div>

      {/* Task creation */}
      {canEdit && (
        <TaskForm
          staffUsers={staffUsers}
          onCreated={handleCreated}
          defaultAssignee={currentUserId}
        />
      )}

      {/* Filters */}
      <TaskFiltersBar
        search={search}
        status={status}
        priority={priorityVal}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPriorityChange={setPriorityVal}
        staffUsers={staffUsers}
        assigneeFilter={assignee}
        onAssigneeChange={setAssignee}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'task' : 'tasks'}
        </p>
        <Button variant="outline" size="sm" onClick={applyFilters}>
          Apply Filters
        </Button>
      </div>

      {/* Task list */}
      <TaskList
        tasks={tasks}
        onStatusChange={updateStatus}
        canEdit={canEdit}
        emptyMessage="No tasks match your filters."
      />

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(page - 1));
                router.push(`/admin/tasks?${params.toString()}`);
              }}
            >
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          {page * pageSize < total && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(page + 1));
                router.push(`/admin/tasks?${params.toString()}`);
              }}
            >
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
