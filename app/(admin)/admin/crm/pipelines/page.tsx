import { requireAdmin } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { PipelineManagerClient } from '@/components/admin/crm/pipeline-manager-client';
import type { CrmPipeline, CrmPipelineStage } from '@/lib/crm/types';

export const dynamic = 'force-dynamic';

export default async function CrmPipelinesPage() {
  const user = await requireAdmin();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: pipelines } = await supabase
    .from('crm_pipelines')
    .select('*')
    .order('created_at', { ascending: true });

  const pipelineList = (pipelines as CrmPipeline[]) ?? [];

  const stagesByPipeline: Record<string, CrmPipelineStage[]> = {};
  if (pipelineList.length > 0) {
    const { data: allStages } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .in('pipeline_id', pipelineList.map((p) => p.id))
      .order('position', { ascending: true });
    (allStages as CrmPipelineStage[] | null)?.forEach((stage) => {
      if (!stagesByPipeline[stage.pipeline_id]) stagesByPipeline[stage.pipeline_id] = [];
      stagesByPipeline[stage.pipeline_id].push(stage);
    });
  }

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Pipeline Management"
          description="Create and manage follow-up pipelines and their stages"
        />
        <PipelineManagerClient
          pipelines={pipelineList}
          stagesByPipeline={stagesByPipeline}
          canManage={true}
        />
      </div>
    </AppShell>
  );
}
