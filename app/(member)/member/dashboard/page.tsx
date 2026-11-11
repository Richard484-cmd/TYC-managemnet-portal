import { requireUser } from '@/lib/auth/session';
import { memberNavItems } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/auth/constants';
import { createClient } from '@/lib/supabase/server';
import { getChurchSettings } from '@/lib/church-settings';
import {
  CalendarDays,
  UsersRound,
  Heart,
  ArrowUpRight,
  Bell,
  Clock3,
  IdCard,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

interface MemberRecord {
  join_date: string | null;
  is_active: boolean;
}

function formatEventDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatStartTime(time: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function MemberDashboard() {
  const user = await requireUser();
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [settings, memberResult, eventsResult, notificationsResult] = await Promise.all([
    getChurchSettings(),
    supabase
      .from('members')
      .select('join_date, is_active')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('attendance_events')
      .select('id, title, event_date, start_time, location')
      .is('deleted_at', null)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(4),
    supabase
      .from('notifications')
      .select('id, title, body, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const member = (memberResult.data as MemberRecord | null) ?? null;
  const upcomingEvents = (eventsResult.data as UpcomingEvent[] | null) ?? [];
  const notifications = (notificationsResult.data as NotificationItem[] | null) ?? [];
  const hasLoadError = Boolean(memberResult.error || eventsResult.error || notificationsResult.error);

  const quickLinks = [
    { label: 'Upcoming Events', description: 'See what is happening', icon: CalendarDays, href: '/events' },
    { label: 'Prayer Requests', description: 'Share or pray for others', icon: Heart, href: '/prayer' },
    { label: 'Give', description: 'Support the church', icon: UsersRound, href: '/give' },
    { label: 'Contact Us', description: 'Reach out to the church', icon: ArrowUpRight, href: '/contact' },
  ];

  return (
    <AppShell items={memberNavItems} label="Member Portal" user={user} isAdmin={false}>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${user.display_name.split(' ')[0]}`}
          description="Your church community at a glance"
        />

        {hasLoadError && (
          <Card>
            <CardContent className="p-4 text-sm text-destructive">
              Some of your dashboard could not be loaded. Please refresh the page to try again.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} href={link.href}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Upcoming events from the church calendar</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Clock3 className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No upcoming events scheduled yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Regular services: {settings.service_times}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const time = formatStartTime(event.start_time);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <CalendarDays className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatEventDate(event.event_date)}
                              {time ? ` at ${time}` : ''}
                              {event.location ? ` | ${event.location}` : ''}
                            </p>
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="shrink-0">
                          <Link href="/events">View</Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membership</CardTitle>
              <CardDescription>Your standing with the church</CardDescription>
            </CardHeader>
            <CardContent>
              {member ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <IdCard className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="secondary">{member.is_active ? 'Active member' : 'Inactive'}</Badge>
                  </div>
                  {member.join_date && (
                    <p className="text-xs text-muted-foreground">
                      Member since{' '}
                      {new Date(`${member.join_date}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your membership profile is not linked yet. Contact the church office to complete your membership record.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent updates for you</CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You have no notifications yet.
              </p>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground">{notification.body}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {user.roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Roles</CardTitle>
              <CardDescription>Roles assigned to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {ROLE_LABELS[role.role_key] ?? role.role_key.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
