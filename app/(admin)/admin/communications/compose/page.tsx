import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { CommunicationComposerClient } from '@/components/admin/communication/communication-composer-client';
import { fetchTemplates, fetchAudienceOptions } from '@/lib/communication/queries';
import { getChurchSettings } from '@/lib/church-settings';

export const dynamic = 'force-dynamic';

export default async function CommunicationComposerPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const [templates, audienceOptions, churchSettings] = await Promise.all([
    fetchTemplates(),
    fetchAudienceOptions(),
    getChurchSettings(),
  ]);

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="New Communication"
          description="Compose and send a message to your audience"
        />
        <CommunicationComposerClient
          templates={templates}
          tags={audienceOptions.tags}
          departments={audienceOptions.departments}
          groups={audienceOptions.groups}
          stages={audienceOptions.stages}
          membershipStatuses={audienceOptions.membershipStatuses}
          churchName={churchSettings.church_name}
          currentUserId={user.id}
        />
      </div>
    </AppShell>
  );
}
