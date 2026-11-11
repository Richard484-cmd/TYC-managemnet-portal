import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { VisitorForm } from '@/components/admin/visitors/visitor-form';

export const dynamic = 'force-dynamic';

export default async function NewVisitorPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: officers } = await supabase
    .from('users')
    .select('id, display_name, first_name, last_name')
    .order('display_name', { ascending: true });

  const followUpOfficers = (officers ?? []).map((o: any) => ({
    id: o.id,
    name: o.display_name || `${o.first_name} ${o.last_name}`,
  }));

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Register Visitor"
          description="Create a new visitor record with follow-up"
        />
        <VisitorForm mode="create" followUpOfficers={followUpOfficers} />
      </div>
    </AppShell>
  );
}
