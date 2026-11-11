import { requireRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { KanbanBoard } from '@/components/admin/crm/kanban-board';
import type { CrmPipeline, CrmPipelineStage, CrmContactWithRelations } from '@/lib/crm/types';
import { DEFAULT_PIPELINE_ID } from '@/lib/crm/constants';
import { ROLES } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

const CRM_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR, ROLES.FOLLOW_UP_MANAGER];

export default async function CrmKanbanPage({
  searchParams,
}: {
  searchParams: { pipeline?: string };
}) {
  const user = await requireRole(...CRM_ROLES);
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const pipelineId = searchParams.pipeline ?? DEFAULT_PIPELINE_ID;

  const [{ data: pipeline }, { data: stages }, { data: contacts }] = await Promise.all([
    supabase.from('crm_pipelines').select('*').eq('id', pipelineId).maybeSingle(),
    supabase
      .from('crm_pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('is_active', true)
      .order('position', { ascending: true }),
    supabase
      .from('contacts')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const stageList = (stages as CrmPipelineStage[]) ?? [];
  const contactList = (contacts as CrmContactWithRelations[]) ?? [];

  const assignedIds = contactList.map((c) => c.assigned_to).filter(Boolean) as string[];
  let assigneeMap = new Map<string, string>();
  if (assignedIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, first_name, last_name')
      .in('id', assignedIds);
    (users ?? []).forEach((u: any) => {
      assigneeMap.set(u.id, u.display_name || `${u.first_name} ${u.last_name}`);
    });
  }

  const contactIds = contactList.map((c) => c.id);
  let taskCountMap = new Map<string, number>();
  if (contactIds.length > 0) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('contact_id')
      .in('contact_id', contactIds)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null);
    (tasks ?? []).forEach((t: any) => {
      taskCountMap.set(t.contact_id, (taskCountMap.get(t.contact_id) ?? 0) + 1);
    });
  }

  const contactsWithRelations = contactList.map((c) => ({
    ...c,
    assigned_to_name: c.assigned_to ? assigneeMap.get(c.assigned_to) ?? null : null,
    open_task_count: taskCountMap.get(c.id) ?? 0,
  }));

  const canEdit = user.roles.some(
    (r) =>
      r.role_key === 'super_admin' ||
      r.role_key === 'admin' ||
      r.role_key === 'pastor' ||
      r.role_key === 'follow_up_manager'
  );

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="CRM Kanban"
          description={
            pipeline
              ? `${pipeline.name} — drag contacts between stages to update their pipeline position`
              : 'Drag contacts between stages to update their pipeline position'
          }
        />
        {stageList.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No pipeline stages found. Please configure your pipeline first.
          </div>
        ) : (
          <KanbanBoard
            pipeline={pipeline as CrmPipeline}
            stages={stageList}
            contacts={contactsWithRelations}
            canEdit={canEdit}
          />
        )}
      </div>
    </AppShell>
  );
}
