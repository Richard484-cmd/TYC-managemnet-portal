'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Check } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

const sampleNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'New visitor registered',
    description: 'Sarah Johnson checked in for Sunday service.',
    time: '5m ago',
    unread: true,
  },
  {
    id: '2',
    title: 'Follow-up due',
    description: 'Michael Chen has a follow-up scheduled for today.',
    time: '1h ago',
    unread: true,
  },
  {
    id: '3',
    title: 'Giving report ready',
    description: 'Your weekly giving summary is available to view.',
    time: '3h ago',
    unread: false,
  },
];

export function NotificationBell() {
  const unreadCount = sampleNotifications.filter((n) => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sampleNotifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          sampleNotifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start gap-1 py-3"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-sm font-medium">{notification.title}</span>
                {notification.unread && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{notification.description}</p>
              <span className="text-xs text-muted-foreground">{notification.time}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm text-primary">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
