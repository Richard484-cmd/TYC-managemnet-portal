import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ContactDetailClient } from '@/components/admin/crm/contact-detail-client';
import { ActivityTimeline } from '@/components/admin/crm/activity-timeline';
import { QuickSendFromContact } from '@/components/admin/communication/communication-components';
import { fetchTemplates } from '@/lib/communication/queries';

import { fetchContactTimeline } from '@/lib/crm/activity-queries';
import { isTaskOverdue } from '@/lib/crm/constants';
import type { CrmActivity, CrmTask, CrmStageMovement, CrmPipelineStage } from '@/lib/crm/types';
import { ROLES } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

export default async function CrmContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!contact) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <div className="p-8 text-center text-muted-foreground">Contact not found.</div>
      </AppShell>
    );
  }

  const pipelineId = (contact as any).pipeline_id;

  const [
    { data: stages },
    { data: activities },
    { data: tasks },
    { data: movements },
    { data: staffUsers },
    timelineResult,
    templates,
  ] = await Promise.all([
    supabase
      .from('crm_pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('is_active', true)
      .order('position', { ascending: true }),
    supabase
      .from('follow_up_activities')
      .select('id, follow_up_id, contact_id, activity_type, notes, outcome, performed_by, performed_at, created_at')
      .eq('contact_id', params.id)
      .order('performed_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, title, description, entity_type, entity_id, contact_id, assigned_to, assigned_by, priority, status, due_date, completed_at, created_by, created_at, updated_at, deleted_at, completed_by, notes')
      .eq('contact_id', params.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_movements')
      .select('id, contact_id, from_stage, to_stage, reason, moved_by, moved_at')
      .eq('contact_id', params.id)
      .order('moved_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, display_name')
      .eq('status', 'active')
      .order('display_name'),
    fetchContactTimeline(params.id, 25, 0),
    fetchTemplates(),
  ]);

  const stageList = (stages as CrmPipelineStage[]) ?? [];
  const activityList = (activities as CrmActivity[]) ?? [];
  const taskList = (tasks as CrmTask[]) ?? [];
  const movementList = (movements as CrmStageMovement[]) ?? [];
  const staffList = (staffUsers as { id: string; display_name: string }[]) ?? [];

  const assigneeIds = taskList.map((t) => t.assigned_to).filter(Boolean) as string[];
  let assigneeMap = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: taskAssignees } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', assigneeIds);
    (taskAssignees ?? []).forEach((u: any) => assigneeMap.set(u.id, u.display_name));
  }

  const tasksWithNames = taskList.map((t) => ({
    ...t,
    assigned_to_name: t.assigned_to ? assigneeMap.get(t.assigned_to) ?? null : null,
    is_overdue: isTaskOverdue(t.due_date, t.status),
  }));

  const canEdit = user.roles.some(
    (r) =>
      r.role_key === 'super_admin' ||
      r.role_key === 'admin' ||
      r.role_key === 'pastor' ||
      r.role_key === 'follow_up_manager'
  );

  const canViewGiving = user.roles.some(
    (r) => r.role_key === 'super_admin' || r.role_key === ROLES.FINANCE_OFFICER
  );

  const c = contact as any;

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={`${c.first_name} ${c.last_name}`}
          description={
            [c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'
          }
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/crm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Kanban
              </Link>
            </Button>
          }
        />
        {/* Quick Communication */}
        {canEdit && (
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-semibold">Quick Communication</h3>
            <QuickSendFromContact
              contactId={params.id}
              contactName={`${c.first_name} ${c.last_name}`}
              contactEmail={c.email}
              contactPhone={c.phone}
              templates={templates}
              onSent={() => {}}
            />
          </div>
        )}

        <ContactDetailClient
          contactId={params.id}
          initialActivities={activityList}
          initialTasks={tasksWithNames}
          initialMovements={movementList}
          stages={stageList}
          currentStageId={c.crm_stage_id}
          currentPriority={c.priority}
          currentFollowUpType={c.follow_up_type}
          currentNotes={c.notes}
          currentOutcome={c.outcome}
          currentNextFollowUpDate={c.next_follow_up_date}
          assignedTo={c.assigned_to}
          staffUsers={staffList}
          canEdit={canEdit}
        />

        {/* Unified Activity Timeline */}
        <div className="rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">Activity Timeline</h3>
          <ActivityTimeline
            contactId={params.id}
            initialItems={timelineResult.items}
            initialHasMore={timelineResult.hasMore}
            canViewGiving={canViewGiving}
          />
        </div>
      </div>
    </AppShell>
  );
}
