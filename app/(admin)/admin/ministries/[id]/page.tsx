import { requireStaff, userIsAdmin, userIsPastoral, userHasRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberManager } from '@/components/admin/organization/member-manager';
import { MINISTRY_ROLES, getUnitStatusLabel, getUnitStatusColor, getMeetingDayLabel } from '@/lib/organization/constants';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Church, UsersRound, Calendar } from 'lucide-react';
import type { MinistryDetail } from '@/lib/organization/schema';

export const dynamic = 'force-dynamic';

export default async function MinistryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: ministry, error } = await supabase
    .from('ministries')
    .select('id, name, description, department_id, leader_id, meeting_day, meeting_time, location, status, created_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !ministry) notFound();

  let deptName = 'Unknown';
  if (ministry.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', ministry.department_id)
      .maybeSingle();
    if (dept) deptName = dept.name;
  }

  let leaderName: string | null = null;
  if (ministry.leader_id) {
    const { data: leader } = await supabase
      .from('users')
      .select('display_name, first_name, last_name')
      .eq('id', ministry.leader_id)
      .maybeSingle();
    if (leader) leaderName = leader.display_name || `${leader.first_name ?? ''} ${leader.last_name ?? ''}`.trim();
  }

  const { data: mmRaw } = await supabase
    .from('ministry_members')
    .select('id, member_id, role, joined_at, members(id, first_name, last_name, email, phone, status_key)')
    .eq('ministry_id', params.id)
    .order('joined_at', { ascending: true });

  const members = (mmRaw ?? []).map((mm: any) => ({
    membership_id: mm.id,
    member_id: mm.member_id,
    role: mm.role,
    joined_at: mm.joined_at,
    first_name: mm.members?.first_name ?? '',
    last_name: mm.members?.last_name ?? '',
    email: mm.members?.email ?? null,
    phone: mm.members?.phone ?? null,
    status_key: mm.members?.status_key ?? 'visitor',
  }));

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, status')
    .eq('ministry_id', params.id)
    .is('deleted_at', null)
    .order('name');

  const groupIds = (groups ?? []).map((g) => g.id);
  let groupMemberCounts = new Map<string, number>();
  if (groupIds.length > 0) {
    const { data: gmCounts } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds);
    (gmCounts ?? []).forEach((r) => groupMemberCounts.set(r.group_id, (groupMemberCounts.get(r.group_id) ?? 0) + 1));
  }

  const detail: MinistryDetail = {
    ...ministry,
    department_name: deptName,
    leader_name: leaderName,
    members,
    groups: (groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      member_count: groupMemberCounts.get(g.id) ?? 0,
      status: g.status,
    })),
  };

  const isScopedLeader = userHasRole(user, 'department_leader') &&
    user.roles.some((r) => r.role_key === 'department_leader' && r.scope_type === 'department' && r.scope_id === ministry.department_id);
  const canManage = userIsAdmin(user) || userIsPastoral(user) || isScopedLeader;
  const canEdit = canManage;

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={detail.name}
          description={`${detail.department_name} · ${getUnitStatusLabel(detail.status)}`}
          actions={
            canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/admin/ministries/${detail.id}/edit`}>
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
                  <Church className="h-6 w-6 text-primary" />
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
              {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Department: </span>
                <Link href={`/admin/departments/${detail.department_id}`} className="font-medium hover:underline">
                  {detail.department_name}
                </Link>
              </div>
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
              {detail.location && <div className="text-sm text-muted-foreground">{detail.location}</div>}
              <div className="text-sm">
                <span className="text-muted-foreground">Created: </span>
                <span>{new Date(detail.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="members">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="members">Members ({detail.members.length})</TabsTrigger>
                <TabsTrigger value="groups">Groups ({detail.groups.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <MemberManager
                      entityType="ministry"
                      entityId={detail.id}
                      members={detail.members}
                      roleOptions={[...MINISTRY_ROLES]}
                      canManage={canManage}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="groups" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    {detail.groups.length === 0 ? (
                      <div className="text-center py-8">
                        <UsersRound className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No groups in this ministry yet.</p>
                        {canEdit && (
                          <Button asChild variant="outline" size="sm" className="mt-4">
                            <Link href="/admin/groups/new">Add Group</Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.groups.map((g) => (
                          <Link key={g.id} href={`/admin/groups/${g.id}`}>
                            <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <UsersRound className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{g.name}</p>
                                  <p className="text-xs text-muted-foreground">{g.member_count} members</p>
                                </div>
                              </div>
                              <Badge variant="outline">{getUnitStatusLabel(g.status)}</Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
