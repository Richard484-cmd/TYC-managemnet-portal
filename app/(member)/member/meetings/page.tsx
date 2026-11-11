import Link from 'next/link';
import { Video } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { filterNavByRoles, memberNavItems } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchUpcomingVirtualMeetings } from '@/lib/virtual-meetings/queries';
import { getMeetingCategoryLabel } from '@/lib/virtual-meetings/constants';

export const dynamic = 'force-dynamic';

export default async function MemberMeetingsPage() {
  const user = await requireUser();
  const meetings = await fetchUpcomingVirtualMeetings();
  const navItems = filterNavByRoles(memberNavItems, user.roles);

  return (
    <AppShell items={navItems} label="Member Portal" user={user} isAdmin={false}>
      <div className="space-y-6">
        <PageHeader title="Virtual meetings" description="Join fellowship, prayer, and study sessions inside the portal." />
        {meetings.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Video className="h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">No upcoming meetings</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">When you are eligible for an upcoming meeting, it will appear here.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4"><div><Badge variant="secondary">{getMeetingCategoryLabel(meeting.category)}</Badge><h2 className="mt-3 text-xl font-semibold">{meeting.title}</h2></div><Video className="h-5 w-5 text-primary" /></div>
                  {meeting.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{meeting.description}</p>}
                  <p className="mt-4 text-sm font-medium text-foreground">{new Date(meeting.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  <Link href={`/member/meetings/${meeting.id}`} className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">View meeting</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
