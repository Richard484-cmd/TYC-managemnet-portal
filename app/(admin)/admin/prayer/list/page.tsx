import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { fetchPrayerRequests, fetchPrayerCategories } from '@/lib/prayer/queries';
import { PrayerRequestList } from '@/components/admin/prayer/prayer-components';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function PrayerListPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string; search?: string; page?: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const status = searchParams.status ?? 'all';
  const category = searchParams.category ?? 'all';
  const search = searchParams.search ?? '';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const [{ requests, total }, categories] = await Promise.all([
    fetchPrayerRequests({ status, category, search }, page, PAGE_SIZE),
    fetchPrayerCategories(),
  ]);

  const { data: staffUsers } = await supabase
    .from('users')
    .select('id, display_name')
    .eq('status', 'active')
    .order('display_name');

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="All Prayer Requests"
          description="Browse and manage all prayer requests"
        />
        <PrayerRequestList
          requests={requests}
          canSeeSubmitter={true}
          onCardClick={(id) => {
            window.location.href = `/admin/prayer/${id}`;
          }}
          emptyMessage="No prayer requests match your filters."
        />
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <a href={`/admin/prayer/list?status=${status}&category=${category}&search=${search}&page=${page - 1}`}>
                <button className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Previous</button>
              </a>
            )}
            <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
            {page * PAGE_SIZE < total && (
              <a href={`/admin/prayer/list?status=${status}&category=${category}&search=${search}&page=${page + 1}`}>
                <button className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Next</button>
              </a>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
