import { requireStaff, userIsAdmin, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MeetingForm } from '@/components/admin/virtual-meetings/meeting-form';
import { notFound } from 'next/navigation';
import type { MeetingFormValues } from '@/lib/virtual-meetings/schema';

export const dynamic = 'force-dynamic';

export default async function EditMeetingPage({ params }: { params: { id: string } }) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: meeting } = await supabase
    .from('virtual_meetings')
    .select('id, title, description, category, organizer_id, scope_type, scope_id, starts_at, ends_at, timezone, participant_policy, capacity, status')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!meeting) notFound();

  const canManage = userIsAdmin(user) || userIsPastoral(user) || meeting.organizer_id === user.id;
  if (!canManage) {
    return (
      <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
        <PageHeader title="Edit Meeting" description="You do not have permission to edit this meeting." />
      </AppShell>
    );
  }

  const [groupsResult, departmentsResult, ministriesResult] = await Promise.all([
    supabase.from('groups').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('departments').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('ministries').select('id, name').is('deleted_at', null).order('name'),
  ]);

  const defaultValues: Partial<MeetingFormValues> = {
    title: meeting.title,
    description: meeting.description ?? '',
    category: meeting.category as MeetingFormValues['category'],
    scope_type: meeting.scope_type as MeetingFormValues['scope_type'],
    scope_id: meeting.scope_id,
    starts_at: meeting.starts_at,
    ends_at: meeting.ends_at,
    timezone: meeting.timezone,
    participant_policy: meeting.participant_policy as MeetingFormValues['participant_policy'],
    capacity: meeting.capacity,
  };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader title="Edit Meeting" description={meeting.title} />
        <MeetingForm
          mode="edit"
          meetingId={meeting.id}
          defaultValues={defaultValues}
          groups={(groupsResult.data ?? []).map((g) => ({ id: g.id, name: g.name }))}
          departments={(departmentsResult.data ?? []).map((d) => ({ id: d.id, name: d.name }))}
          ministries={(ministriesResult.data ?? []).map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>
    </AppShell>
  );
}
