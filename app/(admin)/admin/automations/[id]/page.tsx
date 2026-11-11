import { requireAdmin } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { fetchAutomationWithSteps } from '@/lib/automation/queries';
import {
  fetchUsersForAssignment,
  fetchTagsForSelection,
  fetchPipelineStagesForSelection,
  fetchDepartmentsForSelection,
  fetchGroupsForSelection,
  fetchMembershipStatusesForSelection,
  fetchCommunicationTemplates,
} from '@/lib/automation/queries';
import { AutomationBuilderClient } from '@/components/admin/automation/automation-builder-client';

export const dynamic = 'force-dynamic';

export default async function AutomationBuilderPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireAdmin();
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  const { automation, steps } = await fetchAutomationWithSteps(params.id);

  if (!automation) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <div className="p-8 text-center text-muted-foreground">Workflow not found.</div>
      </AppShell>
    );
  }

  const [
    users, tags, pipelineStages, departments, groups, membershipStatuses, templates,
  ] = await Promise.all([
    fetchUsersForAssignment(),
    fetchTagsForSelection(),
    fetchPipelineStagesForSelection(),
    fetchDepartmentsForSelection(),
    fetchGroupsForSelection(),
    fetchMembershipStatusesForSelection(),
    fetchCommunicationTemplates(),
  ]);

  const selectionData = {
    users, tags, pipelineStages, departments, groups, membershipStatuses, templates,
  };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Workflow Builder"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/automations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Automations
              </Link>
            </Button>
          }
        />
        <AutomationBuilderClient
          automation={automation}
          steps={steps}
          selectionData={selectionData}
        />
      </div>
    </AppShell>
  );
}
