'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { CrmActivity, CrmTask, CrmStageMovement, CrmPipelineStage } from '@/lib/crm/types';
import {
  ACTIVITY_TYPES,
  TASK_STATUSES,
  CRM_PRIORITIES,
  FOLLOW_UP_TYPES,
  FOLLOW_UP_OUTCOMES,
  getActivityTypeLabel,
  getTaskStatusLabel,
  getTaskStatusBadge,
  getPriorityBadge,
  getFollowUpTypeLabel,
  getOutcomeLabel,
  isTaskOverdue,
} from '@/lib/crm/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, MessageSquare, MessageCircle, Mail, Users, StickyNote, Plus, Calendar, User, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  phone_call: Phone,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  email: Mail,
  in_person: Users,
  note: StickyNote,
};

interface ContactDetailClientProps {
  contactId: string;
  initialActivities: CrmActivity[];
  initialTasks: CrmTask[];
  initialMovements: CrmStageMovement[];
  stages: CrmPipelineStage[];
  currentStageId: string | null;
  currentPriority: string;
  currentFollowUpType: string | null;
  currentNotes: string | null;
  currentOutcome: string | null;
  currentNextFollowUpDate: string | null;
  assignedTo: string | null;
  staffUsers: { id: string; display_name: string }[];
  canEdit: boolean;
}

export function ContactDetailClient({
  contactId,
  initialActivities,
  initialTasks,
  initialMovements,
  stages,
  currentStageId,
  currentPriority,
  currentFollowUpType,
  currentNotes,
  currentOutcome,
  currentNextFollowUpDate,
  assignedTo,
  staffUsers,
  canEdit,
}: ContactDetailClientProps) {
  const supabase = createClient();
  const [activities, setActivities] = useState<CrmActivity[]>(initialActivities);
  const [tasks, setTasks] = useState<CrmTask[]>(initialTasks);
  const [movements] = useState<CrmStageMovement[]>(initialMovements);
  const [stageId, setStageId] = useState(currentStageId);
  const [priority, setPriority] = useState(currentPriority);
  const [followUpType, setFollowUpType] = useState(currentFollowUpType ?? 'general');
  const [notes, setNotes] = useState(currentNotes ?? '');
  const [outcome, setOutcome] = useState(currentOutcome ?? '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(currentNextFollowUpDate ?? '');
  const [assignedToId, setAssignedToId] = useState(assignedTo ?? '');

  const [newActivityType, setNewActivityType] = useState('phone_call');
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [newActivityOutcome, setNewActivityOutcome] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const [savingDetails, setSavingDetails] = useState(false);

  const updateContact = useCallback(
    async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', contactId);
      if (error) {
        toast.error('Failed to update contact');
        return false;
      }
      return true;
    },
    [contactId, supabase]
  );

  const handleStageChange = async (newStageId: string) => {
    const oldStageId = stageId;
    setStageId(newStageId);
    const success = await updateContact({ crm_stage_id: newStageId });
    if (!success) {
      setStageId(oldStageId);
      return;
    }
    const { error: moveError } = await supabase.from('contact_movements').insert({
      contact_id: contactId,
      from_stage: stages.find((s) => s.id === oldStageId)?.name ?? null,
      to_stage: stages.find((s) => s.id === newStageId)?.name ?? newStageId,
      reason: 'Manual stage change from detail view',
    });
    if (moveError) console.error('Movement log failed:', moveError.message);
    toast.success('Stage updated');
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    const success = await updateContact({
      priority,
      follow_up_type: followUpType,
      notes,
      outcome: outcome || null,
      next_follow_up_date: nextFollowUpDate || null,
      assigned_to: assignedToId || null,
    });
    setSavingDetails(false);
    if (success) toast.success('Contact details saved');
  };

  const handleAddActivity = async () => {
    if (!newActivityNotes.trim()) {
      toast.error('Please add activity notes');
      return;
    }
    setAddingActivity(true);
    const { data, error } = await supabase
      .from('follow_up_activities')
      .insert({
        contact_id: contactId,
        activity_type: newActivityType,
        notes: newActivityNotes,
        outcome: newActivityOutcome || null,
      })
      .select('id, follow_up_id, contact_id, activity_type, notes, outcome, performed_by, performed_at, created_at')
      .single();
    setAddingActivity(false);
    if (error || !data) {
      toast.error('Failed to add activity');
      return;
    }
    setActivities((prev) => [data as CrmActivity, ...prev]);
    setNewActivityNotes('');
    setNewActivityOutcome('');
    toast.success('Activity recorded');
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Please add a task title');
      return;
    }
    setAddingTask(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: newTaskTitle,
        description: newTaskDesc || null,
        contact_id: contactId,
        entity_type: 'contact',
        entity_id: contactId,
        priority: newTaskPriority,
        status: 'pending',
        due_date: newTaskDue || null,
        assigned_to: newTaskAssignee || null,
      })
      .select('id, title, description, entity_type, entity_id, contact_id, assigned_to, assigned_by, priority, status, due_date, completed_at, created_by, created_at, updated_at, deleted_at')
      .single();
    setAddingTask(false);
    if (error || !data) {
      toast.error('Failed to create task');
      return;
    }
    setTasks((prev) => [data as CrmTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDue('');
    toast.success('Task created');
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
      .eq('id', taskId);
    if (error) {
      toast.error('Failed to update task');
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
          : t
      )
    );
    toast.success('Task updated');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column: Contact details */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-Up Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Pipeline Stage</Label>
                  <Select value={stageId ?? ''} onValueChange={handleStageChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_PRIORITIES.map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Follow-Up Type</Label>
                  <Select value={followUpType} onValueChange={setFollowUpType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOW_UP_TYPES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Assigned Officer</Label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Next Follow-Up Date</Label>
                  <Input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Outcome</Label>
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger>
                      <SelectValue placeholder="No outcome set" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOW_UP_OUTCOMES.map((o) => (
                        <SelectItem key={o.key} value={o.key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Follow-up notes..."
                  />
                </div>

                <Button onClick={handleSaveDetails} disabled={savingDetails} className="w-full">
                  {savingDetails ? 'Saving...' : 'Save Details'}
                </Button>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Stage: </span>
                  <span className="font-medium">{stages.find((s) => s.id === stageId)?.name ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority: </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', getPriorityBadge(priority))}>
                    {priority}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-medium">{getFollowUpTypeLabel(followUpType)}</span>
                </div>
                {nextFollowUpDate && (
                  <div>
                    <span className="text-muted-foreground">Next Follow-Up: </span>
                    <span className="font-medium">{new Date(nextFollowUpDate).toLocaleDateString()}</span>
                  </div>
                )}
                {outcome && (
                  <div>
                    <span className="text-muted-foreground">Outcome: </span>
                    <span className="font-medium">{getOutcomeLabel(outcome)}</span>
                  </div>
                )}
                {notes && (
                  <div>
                    <span className="text-muted-foreground">Notes: </span>
                    <p className="mt-1">{notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle column: Activity timeline */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit && (
              <div className="mb-6 space-y-3 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newActivityType} onValueChange={setNewActivityType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((a) => (
                        <SelectItem key={a.key} value={a.key}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newActivityOutcome} onValueChange={setNewActivityOutcome}>
                    <SelectTrigger>
                      <SelectValue placeholder="Outcome (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOW_UP_OUTCOMES.map((o) => (
                        <SelectItem key={o.key} value={o.key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={newActivityNotes}
                  onChange={(e) => setNewActivityNotes(e.target.value)}
                  rows={2}
                  placeholder="Describe the interaction..."
                />
                <Button onClick={handleAddActivity} disabled={addingActivity} size="sm" className="w-full">
                  <Plus className="mr-1 h-4 w-4" />
                  Record Activity
                </Button>
              </div>
            )}

            {activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activities recorded yet</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.activity_type] ?? StickyNote;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 border-l border-border pl-3 pb-4">
                        <p className="text-sm font-medium">{getActivityTypeLabel(activity.activity_type)}</p>
                        {activity.notes && <p className="mt-1 text-sm text-muted-foreground">{activity.notes}</p>}
                        {activity.outcome && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Outcome: {getOutcomeLabel(activity.outcome)}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(activity.performed_at).toLocaleString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column: Tasks + Stage history */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit && (
              <div className="mb-4 space-y-2 rounded-lg border p-4">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                />
                <Input
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Description (optional)"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} />
                  <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_PRIORITIES.map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddTask} disabled={addingTask} size="sm" className="w-full">
                  <Plus className="mr-1 h-4 w-4" />
                  Create Task
                </Button>
              </div>
            )}

            {tasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tasks yet</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const overdue = isTaskOverdue(task.due_date, task.status);
                  return (
                    <div key={task.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        {canEdit && (
                          <Select
                            value={task.status}
                            onValueChange={(v) => handleTaskStatusChange(task.id, v)}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_STATUSES.map((s) => (
                                <SelectItem key={s.key} value={s.key}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={cn('rounded-full px-2 py-0.5 font-medium', getTaskStatusBadge(task.status))}>
                          {getTaskStatusLabel(task.status)}
                        </span>
                        {task.due_date && (
                          <span className={cn('inline-flex items-center gap-1', overdue ? 'text-red-600' : 'text-muted-foreground')}>
                            {overdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.assigned_to_name && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {task.assigned_to_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage History</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No stage transitions yet</p>
            ) : (
              <div className="space-y-3">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{m.from_stage_name ?? m.from_stage ?? '—'}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{m.to_stage_name ?? m.to_stage}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(m.moved_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
