'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { CrmContactWithRelations, CrmPipelineStage, CrmPipeline } from '@/lib/crm/types';
import { getPriorityBadge, getFollowUpTypeLabel, isFollowUpOverdue, isFollowUpDueToday } from '@/lib/crm/constants';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { AlertCircle, Calendar, User, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanBoardProps {
  pipeline: CrmPipeline;
  stages: CrmPipelineStage[];
  contacts: CrmContactWithRelations[];
  canEdit: boolean;
}

export function KanbanBoard({ pipeline, stages, contacts: initialContacts, canEdit }: KanbanBoardProps) {
  const supabase = createClient();
  const [contacts, setContacts] = useState<CrmContactWithRelations[]>(initialContacts);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [optimisticStage, setOptimisticStage] = useState<Record<string, string>>({});

  const contactsByStage = (stageId: string) =>
    contacts.filter((c) => (optimisticStage[c.id] ?? c.crm_stage_id) === stageId);

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    if (!canEdit) return;
    setDraggedId(contactId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', contactId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      setDragOverStage(null);
      if (!canEdit || !draggedId) return;

      const contact = contacts.find((c) => c.id === draggedId);
      if (!contact) return;

      const currentStage = optimisticStage[contact.id] ?? contact.crm_stage_id;
      if (currentStage === stageId) {
        setDraggedId(null);
        return;
      }

      const previousStage = currentStage;
      setOptimisticStage((prev) => ({ ...prev, [contact.id]: stageId }));
      setDraggedId(null);

      const { error } = await supabase
        .from('contacts')
        .update({ crm_stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', contact.id);

      if (error) {
        setOptimisticStage((prev) => {
          const next = { ...prev };
          delete next[contact.id];
          return next;
        });
        toast.error('Failed to move contact. Please try again.');
        return;
      }

      const { error: movementError } = await supabase.from('contact_movements').insert({
        contact_id: contact.id,
        from_stage: previousStage,
        to_stage: stages.find((s) => s.id === stageId)?.name ?? stageId,
        reason: 'Kanban drag-and-drop',
        moved_by: null,
      });

      if (movementError) {
        console.error('Failed to log stage movement:', movementError.message);
      }

      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, crm_stage_id: stageId } : c))
      );
      setOptimisticStage((prev) => {
        const next = { ...prev };
        delete next[contact.id];
        return next;
      });

      const stageName = stages.find((s) => s.id === stageId)?.name ?? 'new stage';
      toast.success(`Moved ${contact.first_name} ${contact.last_name} to ${stageName}`);
    },
    [canEdit, draggedId, contacts, optimisticStage, stages, supabase]
  );

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageContacts = contactsByStage(stage.id);
        return (
          <div
            key={stage.id}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30',
              dragOverStage === stage.id && 'border-primary bg-primary/5 ring-1 ring-primary'
            )}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color ?? '#3b82f6' }}
                />
                <h3 className="text-sm font-semibold">{stage.name}</h3>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {stageContacts.length}
              </span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin">
              {stageContacts.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No contacts
                </p>
              )}
              {stageContacts.map((contact) => (
                <KanbanCard
                  key={contact.id}
                  contact={contact}
                  canEdit={canEdit}
                  isDragging={draggedId === contact.id}
                  onDragStart={(e) => handleDragStart(e, contact.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  contact,
  canEdit,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  contact: CrmContactWithRelations;
  canEdit: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const overdue = isFollowUpOverdue(contact.next_follow_up_date);
  const dueToday = isFollowUpDueToday(contact.next_follow_up_date);

  return (
    <Link
      href={`/admin/crm/${contact.id}`}
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'block rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50',
        canEdit && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {contact.first_name} {contact.last_name}
          </p>
          {contact.email && (
            <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold',
            getPriorityBadge(contact.priority)
          )}
        >
          {contact.priority}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {contact.assigned_to_name && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {contact.assigned_to_name}
          </span>
        )}
        {contact.follow_up_type && (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {getFollowUpTypeLabel(contact.follow_up_type)}
          </span>
        )}
      </div>

      {(overdue || dueToday) && contact.next_follow_up_date && (
        <div
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.65rem] font-medium',
            overdue
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-600'
          )}
        >
          {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          <Calendar className="h-3 w-3" />
          {new Date(contact.next_follow_up_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}

      {contact.open_task_count && contact.open_task_count > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-blue-600">
          <CheckCircle2 className="h-3 w-3" />
          {contact.open_task_count} open task{contact.open_task_count > 1 ? 's' : ''}
        </div>
      )}
    </Link>
  );
}
