import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { MediaLibrary } from '@/components/member/media-library';
import { MediaUploadPanel } from '@/components/admin/media/media-upload-panel';
import type { MediaAsset } from '@/lib/media/types';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const user = await requireStaff();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, title, description, media_type, storage_path, mime_type, size_bytes, published, created_at')
    .order('created_at', { ascending: false });

  const assets = (data as MediaAsset[] | null) ?? [];
  const navItems = filterNavByRoles(adminNavItems, user.roles);

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Media library" description="Upload photos and videos for signed-in members." />
        <MediaUploadPanel />
        {error ? <p className="text-sm text-destructive">The media library could not be loaded. Please refresh the page.</p> : <MediaLibrary assets={assets} />}
      </div>
    </AppShell>
  );
}
