import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { filterNavByRoles, memberNavItems } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { fetchVirtualMeeting } from '@/lib/virtual-meetings/queries';
import { DailyMeetingRoom } from '@/components/member/virtual-meetings/daily-meeting-room';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MemberMeetingPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const meeting = await fetchVirtualMeeting(params.id);
  if (!meeting) notFound();
  const navItems = filterNavByRoles(memberNavItems, user.roles);

  return (
    <AppShell items={navItems} label="Member Portal" user={user} isAdmin={false}>
      <div className="space-y-5">
        <Link href="/member/meetings" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to meetings</Link>
        <div><h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>{meeting.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{meeting.description}</p>}</div>
        <DailyMeetingRoom meetingId={meeting.id} />
      </div>
    </AppShell>
  );
}
