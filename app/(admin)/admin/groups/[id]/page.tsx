import { requireStaff, userIsAdmin, userIsPastoral, userHasRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MemberManager } from '@/components/admin/organization/member-manager';
import { GROUP_ROLES, getUnitStatusLabel, getUnitStatusColor, getGroupTypeLabel, getMeetingDayLabel } from '@/lib/organization/constants';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, UsersRound, Calendar, MapPin } from 'lucide-react';
import type { GroupDetail } from '@/lib/organization/schema';

export const dynamic = 'force-dynamic';

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: group, error } = await supabase
    .from('groups')
    .select('id, name, description, ministry_id, group_type, leader_id, meeting_day, meeting_time, location, max_capacity, status, created_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !group) notFound();

  let ministryName: string | null = null;
  if (group.ministry_id) {
    const { data: ministry } = await supabase
      .from('ministries')
      .select('name')
      .eq('id', group.ministry_id)
      .maybeSingle();
    if (ministry) ministryName = ministry.name;
  }

  let leaderName: string | null = null;
  if (group.leader_id) {
    const { data: leader } = await supabase
      .from('users')
      .select('display_name, first_name, last_name')
      .eq('id', group.leader_id)
      .maybeSingle();
    if (leader) leaderName = leader.display_name || `${leader.first_name ?? ''} ${leader.last_name ?? ''}`.trim();
  }

  const { data: gmRaw } = await supabase
    .from('group_members')
    .select('id, member_id, role, joined_at, members(id, first_name, last_name, email, phone, status_key)')
    .eq('group_id', params.id)
    .order('joined_at', { ascending: true });

  const members = (gmRaw ?? []).map((gm: any) => ({
    membership_id: gm.id,
    member_id: gm.member_id,
    role: gm.role,
    joined_at: gm.joined_at,
    first_name: gm.members?.first_name ?? '',
    last_name: gm.members?.last_name ?? '',
    email: gm.members?.email ?? null,
    phone: gm.members?.phone ?? null,
    status_key: gm.members?.status_key ?? 'visitor',
  }));

  const detail: GroupDetail = {
    ...group,
    ministry_name: ministryName,
    leader_name: leaderName,
    members,
  };

  const isScopedLeader = userHasRole(user, 'group_leader') &&
    user.roles.some((r) => r.role_key === 'group_leader' && r.scope_type === 'group' && r.scope_id === params.id);
  const canManage = userIsAdmin(user) || userIsPastoral(user) || isScopedLeader;
  const canEdit = canManage;

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={detail.name}
          description={`${getGroupTypeLabel(detail.group_type)} · ${getUnitStatusLabel(detail.status)}`}
          actions={
            canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/admin/groups/${detail.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : undefined
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <UsersRound className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{detail.name}</CardTitle>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getUnitStatusColor(detail.status)}`}>
                    {getUnitStatusLabel(detail.status)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">{getGroupTypeLabel(detail.group_type)}</Badge>
              {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}
              <Separator />
              {detail.ministry_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Ministry: </span>
                  {detail.ministry_id && (
                    <Link href={`/admin/ministries/${detail.ministry_id}`} className="font-medium hover:underline">
                      {detail.ministry_name}
                    </Link>
                  )}
                </div>
              )}
              {detail.leader_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Leader: </span>
                  <span className="font-medium">{detail.leader_name}</span>
                </div>
              )}
              {detail.meeting_day && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{getMeetingDayLabel(detail.meeting_day)}{detail.meeting_time ? ` at ${detail.meeting_time}` : ''}</span>
                </div>
              )}
              {detail.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{detail.location}</span>
                </div>
              )}
              {detail.max_capacity && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Capacity: </span>
                  <span className="font-medium">{detail.members.length}/{detail.max_capacity}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-muted-foreground">Created: </span>
                <span>{new Date(detail.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <MemberManager
                  entityType="group"
                  entityId={detail.id}
                  members={detail.members}
                  roleOptions={[...GROUP_ROLES]}
                  canManage={canManage}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
