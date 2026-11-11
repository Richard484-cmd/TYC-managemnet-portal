import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { PAGE_SIZE, DEFAULT_VISITOR_STATUSES, DEFAULT_LIFECYCLE_STAGES } from '@/lib/visitors/constants';
import type { VisitorListItem, VisitorListResult } from '@/lib/visitors/schema';
import { VisitorListClient } from '@/components/admin/visitors/visitor-list-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  search?: string;
  status?: string;
  source?: string;
  stage?: string;
  sort?: string;
  page?: string;
}

export default async function AdminVisitorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const search = searchParams.search ?? '';
  const statusFilter = searchParams.status ?? 'all';
  const sourceFilter = searchParams.source ?? 'all';
  const stageFilter = searchParams.stage ?? 'all';
  const sort = searchParams.sort ?? 'created_desc';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  let query = supabase
    .from('visitors')
    .select(
      `id, first_name, last_name, email, phone, source, lifecycle_stage, status_key,
       first_visit_date, assigned_to, converted_to_member_id, converted_at, created_at, updated_at`,
      { count: 'exact' }
    )
    .is('deleted_at', null);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  if (statusFilter !== 'all') {
    query = query.eq('status_key', statusFilter);
  }

  if (sourceFilter !== 'all') {
    query = query.eq('source', sourceFilter);
  }

  if (stageFilter !== 'all') {
    query = query.eq('lifecycle_stage', stageFilter);
  }

  switch (sort) {
    case 'name_asc':
      query = query.order('last_name', { ascending: true }).order('first_name', { ascending: true });
      break;
    case 'name_desc':
      query = query.order('last_name', { ascending: false });
      break;
    case 'created_asc':
      query = query.order('created_at', { ascending: true });
      break;
    case 'created_desc':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  let visitors: VisitorListItem[] = [];
  let total = 0;
  try {
    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching visitors:', error.message);
    }
    visitors = (data as VisitorListItem[]) ?? [];
    total = count ?? 0;
  } catch {
    visitors = [];
    total = 0;
  }

  // Fetch assigned_to names
  const assignedIds = visitors.map((v) => v.assigned_to).filter(Boolean) as string[];
  let assigneeMap = new Map<string, string>();
  if (assignedIds.length > 0) {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, first_name, last_name')
        .in('id', assignedIds);
      (users ?? []).forEach((u: any) => {
        assigneeMap.set(u.id, u.display_name || `${u.first_name} ${u.last_name}`);
      });
    } catch {
      // Keep empty map
    }
  }

  const visitorsWithNames = visitors.map((v) => ({
    ...v,
    assigned_to_name: v.assigned_to ? assigneeMap.get(v.assigned_to) ?? null : null,
  }));

  const result: VisitorListResult = { visitors: visitorsWithNames, total };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Visitors"
          description={`${total} ${total === 1 ? 'visitor' : 'visitors'} in your church`}
          actions={
            <Button asChild>
              <Link href="/admin/visitors/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Register Visitor
              </Link>
            </Button>
          }
        />
        <VisitorListClient
          initialData={result}
          statuses={DEFAULT_VISITOR_STATUSES.map((s) => ({ key: s.status_key, label: s.name }))}
          lifecycleStages={DEFAULT_LIFECYCLE_STAGES.map((s) => ({ key: s.stage_key, label: s.name }))}
          currentPage={page}
          pageSize={PAGE_SIZE}
          search={search}
          statusFilter={statusFilter}
          sourceFilter={sourceFilter}
          stageFilter={stageFilter}
          sort={sort}
          canEdit={true}
        />
      </div>
    </AppShell>
  );
}
