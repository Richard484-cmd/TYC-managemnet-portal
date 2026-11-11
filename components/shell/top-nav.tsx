'use client';

import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationBell } from '@/components/shell/notification-bell';
import { UserMenu } from '@/components/shell/user-menu';
import type { AppUser } from '@/lib/auth/constants';

interface TopNavProps {
  user: AppUser;
  isAdmin: boolean;
  onMenuClick: () => void;
}

export function TopNav({ user, isAdmin, onMenuClick }: TopNavProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {searchOpen ? (
        <div className="flex flex-1 items-center gap-2 lg:max-w-md">
          <Input
            autoFocus
            placeholder="Search members, events, groups..."
            onBlur={() => setSearchOpen(false)}
            className="h-9"
          />
        </div>
      ) : (
        <div className="hidden flex-1 lg:block lg:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members, events, groups..."
              className="h-9 pl-9"
            />
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSearchOpen(!searchOpen)}
      >
        <Search className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-1">
        <NotificationBell />
        <UserMenu user={user} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
