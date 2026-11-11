'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';
import { ChurchLogo } from '@/components/branding/church-logo';
import { NAV_ICONS } from '@/components/shell/nav-icons';

interface SidebarProps {
  items: NavItem[];
  label: string;
}

export function Sidebar({ items, label }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-sidebar-accent bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-accent px-6">
        <ChurchLogo compact />
        <span className="text-lg font-bold text-white">TYC</span>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          {label}
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = NAV_ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
