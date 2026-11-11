import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Church, UsersRound, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getUnitStatusLabel, getUnitStatusColor, getGroupTypeLabel } from '@/lib/organization/constants';
import { ROLES } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

export default async function MyUnitsDashboardPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  // Find the user's scoped role assignments
  const deptLeaderScopes = user.roles.filter(
    (r) => r.role_key === ROLES.DEPARTMENT_LEADER && r.scope_type === 'department' && r.scope_id
  );
  const groupLeaderScopes = user.roles.filter(
    (r) => r.role_key === ROLES.GROUP_LEADER && r.scope_type === 'group' && r.scope_id
  );

  const deptIds = deptLeaderScopes.map((r) => r.scope_id!);
  const groupIds = groupLeaderScopes.map((r) => r.scope_id!);

  // Fetch departments where user is leader (either via role assignment or leader_id field)
  const { data: ledDeptsByField } = await supabase
    .from('departments')
    .select('id, name, description, status, created_at')
    .eq('leader_id', user.id)
    .is('deleted_at', null);

  const allDeptIds = Array.from(new Set([...deptIds, ...(ledDeptsByField ?? []).map((d) => d.id)]));

  let departments: { id: string; name: string; description: string | null; status: string; member_count: number }[] = [];
  if (allDeptIds.length > 0) {
    const { data: depts } = await supabase
      .from('departments')
      .select('id, name, description, status')
      .in('id', allDeptIds)
      .is('deleted_at', null);
    
    const { data: dmCounts } = await supabase
      .from('department_members')
      .select('department_id')
      .in('department_id', allDeptIds);
    
    const mcMap = new Map<string, number>();
    (dmCounts ?? []).forEach((r) => mcMap.set(r.department_id, (mcMap.get(r.department_id) ?? 0) + 1));
    
    departments = (depts ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      status: d.status,
      member_count: mcMap.get(d.id) ?? 0,
    }));
  }

  // Fetch groups where user is leader
  const { data: ledGroupsByField } = await supabase
    .from('groups')
    .select('id, name, description, group_type, status')
    .eq('leader_id', user.id)
    .is('deleted_at', null);

  const allGroupIds = Array.from(new Set([...groupIds, ...(ledGroupsByField ?? []).map((g) => g.id)]));

  let groups: { id: string; name: string; description: string | null; group_type: string; status: string; member_count: number }[] = [];
  if (allGroupIds.length > 0) {
    const { data: grpData } = await supabase
      .from('groups')
      .select('id, name, description, group_type, status')
      .in('id', allGroupIds)
      .is('deleted_at', null);
    
    const { data: gmCounts } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', allGroupIds);
    
    const mcMap = new Map<string, number>();
    (gmCounts ?? []).forEach((r) => mcMap.set(r.group_id, (mcMap.get(r.group_id) ?? 0) + 1));
    
    groups = (grpData ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      group_type: g.group_type,
      status: g.status,
      member_count: mcMap.get(g.id) ?? 0,
    }));
  }

  // Fetch ministries where user is leader (via leader_id field)
  const { data: ledMinistries } = await supabase
    .from('ministries')
    .select('id, name, description, status')
    .eq('leader_id', user.id)
    .is('deleted_at', null);

  let ministries: { id: string; name: string; description: string | null; status: string; member_count: number }[] = [];
  if (ledMinistries && ledMinistries.length > 0) {
    const ministryIds = ledMinistries.map((m) => m.id);
    const { data: mmCounts } = await supabase
      .from('ministry_members')
      .select('ministry_id')
      .in('ministry_id', ministryIds);
    
    const mcMap = new Map<string, number>();
    (mmCounts ?? []).forEach((r) => mcMap.set(r.ministry_id, (mcMap.get(r.ministry_id) ?? 0) + 1));
    
    ministries = ledMinistries.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      status: m.status,
      member_count: mcMap.get(m.id) ?? 0,
    }));
  }

  const totalMembers = departments.reduce((s, d) => s + d.member_count, 0) +
    groups.reduce((s, g) => s + g.member_count, 0) +
    ministries.reduce((s, m) => s + m.member_count, 0);

  const stats = [
    { label: 'My Departments', value: departments.length, icon: Building2 },
    { label: 'My Ministries', value: ministries.length, icon: Church },
    { label: 'My Groups', value: groups.length, icon: UsersRound },
    { label: 'Total Members', value: totalMembers, icon: Users },
  ];

  const hasAnyUnits = departments.length > 0 || ministries.length > 0 || groups.length > 0;

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="My Units"
          description="Departments, ministries, and groups you lead"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!hasAnyUnits && (
          <EmptyState
            icon={Building2}
            title="No units assigned to you"
            description="You are not currently assigned as a leader of any department, ministry, or group. Contact an administrator if you believe this is an error."
          />
        )}

        {departments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Departments You Lead
              </CardTitle>
              <CardDescription>Manage members and view details for your departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <Link key={dept.id} href={`/admin/departments/${dept.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <span className="font-medium">{dept.name}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getUnitStatusColor(dept.status)}`}>
                          {getUnitStatusLabel(dept.status)}
                        </span>
                      </div>
                      {dept.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{dept.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {dept.member_count} members
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {ministries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Church className="h-5 w-5 text-primary" />
                Ministries You Lead
              </CardTitle>
              <CardDescription>Manage members and view details for your ministries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ministries.map((m) => (
                  <Link key={m.id} href={`/admin/ministries/${m.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <span className="font-medium">{m.name}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getUnitStatusColor(m.status)}`}>
                          {getUnitStatusLabel(m.status)}
                        </span>
                      </div>
                      {m.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {m.member_count} members
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {groups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-primary" />
                Groups You Lead
              </CardTitle>
              <CardDescription>Manage members and view details for your groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((g) => (
                  <Link key={g.id} href={`/admin/groups/${g.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <span className="font-medium">{g.name}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getUnitStatusColor(g.status)}`}>
                          {getUnitStatusLabel(g.status)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="mt-1">{getGroupTypeLabel(g.group_type)}</Badge>
                      {g.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{g.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {g.member_count} members
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
