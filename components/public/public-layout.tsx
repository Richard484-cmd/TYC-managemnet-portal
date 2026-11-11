import { PublicHeader } from '@/components/public/header';
import { PublicFooter } from '@/components/public/footer';
import { CursorAccent } from '@/components/public/cursor-accent';
import type { ChurchSettings } from '@/lib/church-settings';

export function PublicLayout({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: ChurchSettings;
}) {
  return (
    <div className="public-site flex min-h-screen flex-col overflow-x-clip bg-[#F4F7F6]">
      <CursorAccent />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter settings={settings} />
    </div>
  );
}
