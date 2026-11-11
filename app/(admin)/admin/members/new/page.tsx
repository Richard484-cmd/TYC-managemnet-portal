import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MemberForm } from '@/components/admin/members/member-form';
import { MEMBER_STATUSES } from '@/lib/members/constants';

export const dynamic = 'force-dynamic';

export default async function NewMemberPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: statusRows } = await supabase
    .from('membership_statuses')
    .select('status_key, name, sort_order')
    .order('sort_order', { ascending: true });

  const statuses = (statusRows ?? []).map((s) => ({ key: s.status_key, label: s.name }));
  const fallbackStatuses = MEMBER_STATUSES.map((s) => ({ key: s.key, label: s.label }));

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Add Member"
          description="Create a new member record"
        />
        <MemberForm mode="create" statuses={statuses.length > 0 ? statuses : fallbackStatuses} />
      </div>
    </AppShell>
  );
}
