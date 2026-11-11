import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getMeetingCategoryLabel, getMeetingStatusLabel } from '@/lib/virtual-meetings/constants';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Video, Calendar, Clock, Globe, Users, Lock } from 'lucide-react';
import { CancelMeetingButton } from '@/components/admin/virtual-meetings/cancel-meeting-button';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  open: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: meeting } = await supabase
    .from('virtual_meetings')
    .select('id, title, description, category, organizer_id, scope_type, scope_id, starts_at, ends_at, timezone, recurrence_rule, participant_policy, capacity, status, provider, provider_room_name, created_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!meeting) notFound();

  let organizerName: string | null = null;
  if (meeting.organizer_id) {
    const { data: org } = await supabase.from('users').select('display_name, first_name, last_name').eq('id', meeting.organizer_id).maybeSingle();
    if (org) organizerName = org.display_name || `${org.first_name ?? ''} ${org.last_name ?? ''}`.trim();
  }

  let scopeName: string | null = null;
  if (meeting.scope_id) {
    const table = meeting.scope_type === 'group' ? 'groups' : meeting.scope_type === 'department' ? 'departments' : 'ministries';
    const { data: scope } = await supabase.from(table).select('name').eq('id', meeting.scope_id).maybeSingle();
    if (scope) scopeName = scope.name;
  }

  const { data: participants } = await supabase
    .from('virtual_meeting_participants')
    .select('id, member_id, status, joined_at, left_at, members(id, first_name, last_name)')
    .eq('meeting_id', params.id)
    .order('joined_at', { ascending: true });

  const canManage = userIsAdmin(user) || userIsPastoral(user) || meeting.organizer_id === user.id;

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={meeting.title}
          description={`${getMeetingCategoryLabel(meeting.category)} · ${getMeetingStatusLabel(meeting.status)}`}
          actions={canManage ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/virtual-meetings/${meeting.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              {meeting.status !== 'cancelled' && meeting.status !== 'completed' && (
                <CancelMeetingButton meetingId={meeting.id} meetingTitle={meeting.title} />
              )}
            </div>
          ) : undefined}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{meeting.title}</CardTitle>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[meeting.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {getMeetingStatusLabel(meeting.status)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">{getMeetingCategoryLabel(meeting.category)}</Badge>
              {meeting.description && <p className="text-sm text-muted-foreground">{meeting.description}</p>}
              <Separator />
              {organizerName && (
                <div className="text-sm"><span className="text-muted-foreground">Organizer: </span><span className="font-medium">{organizerName}</span></div>
              )}
              {scopeName && (
                <div className="text-sm"><span className="text-muted-foreground">Scope: </span><span className="font-medium">{scopeName}</span></div>
              )}
              <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{new Date(meeting.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
              <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span>Ends {new Date(meeting.ends_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
              <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-muted-foreground" /><span>{meeting.timezone}</span></div>
              {meeting.capacity && <div className="text-sm"><span className="text-muted-foreground">Capacity: </span><span className="font-medium">{meeting.capacity}</span></div>}
              <div className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-muted-foreground" /><span className="capitalize">{meeting.participant_policy.replace('_', ' ')}</span></div>
              <div className="text-sm"><span className="text-muted-foreground">Provider: </span><span className="font-medium capitalize">{meeting.provider}</span></div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Participants</CardTitle></CardHeader>
              <CardContent>
                {(!participants || participants.length === 0) ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No participants registered yet.</p>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{p.members?.first_name} {p.members?.last_name}</p>
                          {p.joined_at && <p className="text-xs text-muted-foreground">Joined {new Date(p.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                        </div>
                        <Badge variant="outline" className="capitalize">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
