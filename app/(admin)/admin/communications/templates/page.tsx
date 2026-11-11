import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { TemplateManagementClient } from '@/components/admin/communication/template-management-client';
import { fetchTemplates } from '@/lib/communication/queries';
import type { CommunicationTemplate } from '@/lib/communication/types';

export const dynamic = 'force-dynamic';

export default async function CommunicationTemplatesPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const templates = await fetchTemplates();

  const canManage = user.roles.some(
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
          title="Communication Templates"
          description="Manage reusable message templates for email, SMS, WhatsApp, and in-app"
        />
        <TemplateManagementClient
          templates={templates}
          currentUserId={user.id}
          canManage={canManage}
        />
      </div>
    </AppShell>
  );
}
