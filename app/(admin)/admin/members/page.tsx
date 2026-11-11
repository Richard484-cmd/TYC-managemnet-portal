import { requireRole, userHasAnyRole } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { MemberListClient } from '@/components/admin/members/member-list-client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { MEMBER_STATUSES, PAGE_SIZE } from '@/lib/members/constants';
import { ROLES } from '@/lib/auth/constants';
import type { MemberListItem, MemberListResult } from '@/lib/members/schema';

export const dynamic = 'force-dynamic';

const MEMBER_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR,
  ROLES.FOLLOW_UP_MANAGER, ROLES.DEPARTMENT_LEADER, ROLES.GROUP_LEADER,
];
const EDIT_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR, ROLES.FOLLOW_UP_MANAGER];

interface SearchParams {
  search?: string;
  status?: string;
  sort?: string;
  page?: string;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireRole(...MEMBER_ROLES);
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();
  const canEdit = userHasAnyRole(user, EDIT_ROLES);

  const search = searchParams.search ?? '';
  const statusFilter = searchParams.status ?? 'all';
  const sort = searchParams.sort ?? 'name_asc';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  let query = supabase
    .from('members')
    .select(
      'id, first_name, last_name, email, phone, status_key, is_baptized, is_active, join_date, profile_image, created_at, updated_at',
      { count: 'exact' }
    )
    .is('deleted_at', null);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (statusFilter !== 'all') {
    query = query.eq('status_key', statusFilter);
  }

  switch (sort) {
    case 'name_desc':
      query = query.order('last_name', { ascending: false });
      break;
    case 'created_desc':
      query = query.order('created_at', { ascending: false });
      break;
    case 'created_asc':
      query = query.order('created_at', { ascending: true });
      break;
    case 'name_asc':
    default:
      query = query.order('last_name', { ascending: true }).order('first_name', { ascending: true });
      break;
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  let members: MemberListItem[] = [];
  let total = 0;
  try {
    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching members:', error.message);
    }
    members = (data as MemberListItem[]) ?? [];
    total = count ?? 0;
  } catch {
    members = [];
    total = 0;
  }
  const result: MemberListResult = { members, total };

  let statuses: { key: string; label: string }[] = [];
  try {
    const { data: statusRows } = await supabase
      .from('membership_statuses')
      .select('status_key, name, sort_order')
      .order('sort_order', { ascending: true });
    statuses = (statusRows ?? []).map((s) => ({ key: s.status_key, label: s.name }));
  } catch {
    statuses = [];
  }

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Members"
          description={`${total} ${total === 1 ? 'member' : 'members'} in your church`}
          actions={
            <Button asChild>
              <Link href="/admin/members/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Link>
            </Button>
          }
        />
        <MemberListClient
          initialData={result}
          statuses={statuses.length > 0 ? statuses : MEMBER_STATUSES.map((s) => ({ key: s.key, label: s.label }))}
          currentPage={page}
          pageSize={PAGE_SIZE}
          search={search}
          statusFilter={statusFilter}
          sort={sort}
          canEdit={canEdit}
        />
      </div>
    </AppShell>
  );
}
