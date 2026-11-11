'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from '@/components/shell/sidebar';
import { MobileNav } from '@/components/shell/mobile-nav';
import { TopNav } from '@/components/shell/top-nav';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import type { NavItem } from '@/lib/navigation';
import type { AppUser } from '@/lib/auth/constants';

interface AppShellProps {
  items: NavItem[];
  label: string;
  user: AppUser;
  isAdmin: boolean;
  children: ReactNode;
}

export function AppShell({ items, label, user, isAdmin, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={items} label={label} />

      <MobileNav
        items={items}
        label={label}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        <TopNav user={user} isAdmin={isAdmin} onMenuClick={() => setMobileNavOpen(true)} />

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
