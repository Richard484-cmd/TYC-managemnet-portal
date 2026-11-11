import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { TaskManagementClient } from '@/components/admin/crm/task-management-client';
import { fetchTasks } from '@/lib/crm/task-queries';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface SearchParams {
  search?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  mode?: string;
  page?: string;
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const mode = searchParams.mode === 'my_tasks' ? 'my_tasks' : 'all';
  const search = searchParams.search ?? '';
  const status = searchParams.status ?? 'all';
  const priority = searchParams.priority ?? 'all';
  const assignee = searchParams.assigned_to ?? 'all';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const { tasks, total } = await fetchTasks(
    {
      search,
      status: status === 'overdue' ? undefined : status,
      priority,
      assigned_to: assignee,
      overdue_only: status === 'overdue',
    },
    page,
    PAGE_SIZE,
    mode,
    user.id
  );

  const { data: staffUsers } = await supabase
    .from('users')
    .select('id, display_name')
    .eq('status', 'active')
    .order('display_name');

  const canEdit = user.roles.some(
    (r) =>
      r.role_key === 'super_admin' ||
      r.role_key === 'admin' ||
      r.role_key === 'pastor' ||
      r.role_key === 'follow_up_manager' ||
      r.role_key === 'department_leader' ||
      r.role_key === 'group_leader'
  );

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          description="Manage follow-up tasks, assignments, and deadlines"
        />
        <TaskManagementClient
          initialTasks={tasks}
          total={total}
          staffUsers={(staffUsers as { id: string; display_name: string }[]) ?? []}
          currentUserId={user.id}
          canEdit={canEdit}
          initialMode={mode}
          search={search}
          status={status}
          priority={priority}
          assigneeFilter={assignee}
          page={page}
          pageSize={PAGE_SIZE}
        />
      </div>
    </AppShell>
  );
}
