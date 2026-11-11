import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  fetchPrayerRequest,
  fetchStatusHistory,
  fetchPastoralNotes,
  fetchMemberUpdates,
} from '@/lib/prayer/queries';
import { PrayerDetailClient } from '@/components/admin/prayer/prayer-components';
import { ROLES } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

export default async function PrayerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const prayerRequest = await fetchPrayerRequest(params.id);
  if (!prayerRequest) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <div className="p-8 text-center text-muted-foreground">Prayer request not found.</div>
      </AppShell>
    );
  }

  // Fetch names for submitted_by and assigned_to
  const userIds = new Set<string>();
  if (prayerRequest.submitted_by) userIds.add(prayerRequest.submitted_by);
  if (prayerRequest.assigned_to) userIds.add(prayerRequest.assigned_to);
  let nameMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', Array.from(userIds));
    (users ?? []).forEach((u: any) => nameMap.set(u.id, u.display_name));
  }
  prayerRequest.submitted_by_name = prayerRequest.submitted_by ? nameMap.get(prayerRequest.submitted_by) ?? null : null;
  prayerRequest.assigned_to_name = prayerRequest.assigned_to ? nameMap.get(prayerRequest.assigned_to) ?? null : null;

  const [statusHistory, pastoralNotes, memberUpdates, { data: staffUsers }] = await Promise.all([
    fetchStatusHistory(params.id),
    fetchPastoralNotes(params.id),
    fetchMemberUpdates(params.id),
    supabase.from('users').select('id, display_name').eq('status', 'active').order('display_name'),
  ]);

  const canManage = user.roles.some(
    (r) =>
      r.role_key === ROLES.SUPER_ADMIN ||
      r.role_key === ROLES.ADMIN ||
      r.role_key === ROLES.PASTOR ||
      r.role_key === ROLES.FOLLOW_UP_MANAGER
  );
  const canSeePastoralNotes = user.roles.some(
    (r) => r.role_key === ROLES.SUPER_ADMIN || r.role_key === ROLES.PASTOR
  );
  const isAssignedToMe = prayerRequest.assigned_to === user.id;

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={prayerRequest.title}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/prayer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Prayer Dashboard
              </Link>
            </Button>
          }
        />
        <PrayerDetailClient
          prayerRequest={prayerRequest}
          statusHistory={statusHistory}
          pastoralNotes={pastoralNotes}
          memberUpdates={memberUpdates}
          staffUsers={(staffUsers as { id: string; display_name: string }[]) ?? []}
          currentUserId={user.id}
          canManage={canManage}
          canSeePastoralNotes={canSeePastoralNotes}
          isAssignedToMe={isAssignedToMe}
        />
      </div>
    </AppShell>
  );
}
