import { requireFinance } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { fetchAllGivingCategories } from '@/lib/giving/queries';
import { GivingCategoriesClient } from '@/components/admin/giving/giving-categories-client';

export const dynamic = 'force-dynamic';

export default async function GivingCategoriesPage() {
  const user = await requireFinance();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const categories = await fetchAllGivingCategories();

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Giving Categories"
          description="Manage the categories members can select when making contributions"
        />
        <GivingCategoriesClient initialCategories={categories} />
      </div>
    </AppShell>
  );
}
