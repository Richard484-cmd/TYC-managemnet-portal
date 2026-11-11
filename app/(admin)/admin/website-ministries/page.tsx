import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { WebsiteMinistryPhotoManager } from '@/components/admin/website-ministries/website-ministry-photo-manager';
import type { WebsiteMinistry } from '@/components/admin/website-ministries/website-ministry-types';

export const dynamic = 'force-dynamic';

export default async function WebsiteMinistriesPage() {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const canManage = userIsAdmin(user) || userIsPastoral(user);
  const supabase = createClient();

  const { data, error } = await supabase
    .from('public_ministries')
    .select('id, slug, name, meeting_text, photos:public_ministry_photos(id, image_url, storage_path, sort_order)')
    .order('sort_order', { ascending: true });

  if (error) console.error('website ministries load failed', error);

  const ministries: WebsiteMinistry[] = (data ?? []).map(({ photos, ...ministry }) => ({
    ...ministry,
    photos: [...photos].sort((a, b) => a.sort_order - b.sort_order),
  }));

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Website Ministries"
          description="Add photos for each ministry. They rotate as a slideshow on the public Ministries page."
        />
        {error ? (
          <p className="text-sm text-destructive">The ministries could not be loaded. Please refresh the page.</p>
        ) : (
          <WebsiteMinistryPhotoManager ministries={ministries} canManage={canManage} />
        )}
      </div>
    </AppShell>
  );
}
