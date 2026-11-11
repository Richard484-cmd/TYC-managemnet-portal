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
import { DEPARTMENT_ROLES, getUnitStatusLabel, getUnitStatusColor, getDepartmentRoleLabel } from '@/lib/organization/constants';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Building2, Church, Users } from 'lucide-react';
import type { DepartmentDetail } from '@/lib/organization/schema';

export const dynamic = 'force-dynamic';

export default async function DepartmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: dept, error } = await supabase
    .from('departments')
    .select('id, name, description, leader_id, status, display_order, created_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !dept) notFound();

  let leaderName: string | null = null;
  if (dept.leader_id) {
    const { data: leader } = await supabase
      .from('users')
      .select('display_name, first_name, last_name')
      .eq('id', dept.leader_id)
      .maybeSingle();
    if (leader) leaderName = leader.display_name || `${leader.first_name ?? ''} ${leader.last_name ?? ''}`.trim();
  }

  const { data: dmRaw } = await supabase
    .from('department_members')
    .select('id, member_id, role, joined_at, members(id, first_name, last_name, email, phone, status_key)')
    .eq('department_id', params.id)
    .order('joined_at', { ascending: true });

  const members = (dmRaw ?? []).map((dm: any) => ({
    membership_id: dm.id,
    member_id: dm.member_id,
    role: dm.role,
    joined_at: dm.joined_at,
    first_name: dm.members?.first_name ?? '',
    last_name: dm.members?.last_name ?? '',
    email: dm.members?.email ?? null,
    phone: dm.members?.phone ?? null,
    status_key: dm.members?.status_key ?? 'visitor',
  }));

  const { data: ministries } = await supabase
    .from('ministries')
    .select('id, name, status')
    .eq('department_id', params.id)
    .is('deleted_at', null)
    .order('name');

  const ministryIds = (ministries ?? []).map((m) => m.id);
  let ministryMemberCounts = new Map<string, number>();
  if (ministryIds.length > 0) {
    const { data: mmCounts } = await supabase
      .from('ministry_members')
      .select('ministry_id')
      .in('ministry_id', ministryIds);
    (mmCounts ?? []).forEach((r) => ministryMemberCounts.set(r.ministry_id, (ministryMemberCounts.get(r.ministry_id) ?? 0) + 1));
  }

  const detail: DepartmentDetail = {
    ...dept,
    leader_name: leaderName,
    members,
    ministries: (ministries ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      member_count: ministryMemberCounts.get(m.id) ?? 0,
      status: m.status,
    })),
  };

  const isScopedLeader = userHasRole(user, 'department_leader') &&
    user.roles.some((r) => r.role_key === 'department_leader' && r.scope_type === 'department' && r.scope_id === params.id);
  const canManage = userIsAdmin(user) || userIsPastoral(user) || isScopedLeader;
  const canEdit = canManage;

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={detail.name}
          description={getUnitStatusLabel(detail.status)}
          actions={
            canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/admin/departments/${detail.id}/edit`}>
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
                  <Building2 className="h-6 w-6 text-primary" />
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
              {detail.leader_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Leader: </span>
                  <span className="font-medium">{detail.leader_name}</span>
                </div>
              )}
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
                <TabsTrigger value="ministries">Ministries ({detail.ministries.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <MemberManager
                      entityType="department"
                      entityId={detail.id}
                      members={detail.members}
                      roleOptions={[...DEPARTMENT_ROLES]}
                      canManage={canManage}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ministries" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    {detail.ministries.length === 0 ? (
                      <div className="text-center py-8">
                        <Church className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No ministries in this department yet.</p>
                        {canEdit && (
                          <Button asChild variant="outline" size="sm" className="mt-4">
                            <Link href="/admin/ministries/new">Add Ministry</Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.ministries.map((m) => (
                          <Link key={m.id} href={`/admin/ministries/${m.id}`}>
                            <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <Church className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{m.name}</p>
                                  <p className="text-xs text-muted-foreground">{m.member_count} members</p>
                                </div>
                              </div>
                              <Badge variant="outline">{getUnitStatusLabel(m.status)}</Badge>
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
