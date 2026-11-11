'use client';

import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';
import { ChurchLogo } from '@/components/branding/church-logo';
import { NAV_ICONS } from '@/components/shell/nav-icons';
import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface MobileNavProps {
  items: NavItem[];
  label: string;
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ items, label, open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl animate-slide-in-left">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-accent px-4">
              <ChurchLogo compact />
              <span className="text-lg font-bold text-white">TYC</span>
              <button
                onClick={onClose}
                className="text-sidebar-foreground hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="overflow-y-auto px-3 py-4 scrollbar-thin h-[calc(100%-4rem)]">
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
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
