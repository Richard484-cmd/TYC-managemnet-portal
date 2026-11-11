import { requireUser } from '@/lib/auth/session';
import { filterNavByRoles, memberNavItems } from '@/lib/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { MediaLibrary } from '@/components/member/media-library';
import type { MediaAsset } from '@/lib/media/types';

export const dynamic = 'force-dynamic';

export default async function MemberMediaPage() {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, title, description, media_type, storage_path, mime_type, size_bytes, published, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  const assets = (data as MediaAsset[] | null) ?? [];
  const navItems = filterNavByRoles(memberNavItems, user.roles);

  return (
    <AppShell items={navItems} label="Member Portal" user={user} isAdmin={false}>
      <div className="space-y-6">
        <PageHeader title="Media library" description="Download church photos and videos shared with members." />
        {error ? <p className="text-sm text-destructive">The media library could not be loaded. Please refresh the page.</p> : <MediaLibrary assets={assets} />}
      </div>
    </AppShell>
  );
}
