import { requireStaff, userIsPastoral } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Pencil,
  Mail,
  Phone,
  Calendar,
  MapPin,
  User,
  Heart,
  Briefcase,
  Users as UsersIcon,
  CalendarCheck,
  HandCoins,
  ClipboardList,
  MessageSquare,
  Tag as TagIcon,
  Church,
  Activity,
} from 'lucide-react';
import type { MemberDetail } from '@/lib/members/schema';
import { getStatusLabel, getStatusColor, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from '@/lib/members/constants';

export const dynamic = 'force-dynamic';

export default async function MemberProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();
  const isPastoral = userIsPastoral(user);

  const { data: statusRows } = await supabase
    .from('membership_statuses')
    .select('status_key, name')
    .order('sort_order', { ascending: true });

  const statusMap = new Map((statusRows ?? []).map((s) => [s.status_key, s.name]));
  const dbGetStatusLabel = (key: string): string => statusMap.get(key) ?? getStatusLabel(key);

  const { data: member, error } = await supabase
    .from('members')
    .select(`
      id, user_id, first_name, last_name, email, phone, date_of_birth, gender,
      marital_status, occupation, status_key, is_baptized, is_active, join_date,
      pastoral_notes, profile_image, created_by, updated_by, created_at, updated_at, deleted_at
    `)
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !member) {
    notFound();
  }

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('member_id', params.id)
    .maybeSingle();

  const { data: tagAssignments } = await supabase
    .from('tag_assignments')
    .select('tag_id, tags(id, name, color)')
    .eq('entity_type', 'member')
    .eq('entity_id', params.id);

  const { data: departmentMembers } = await supabase
    .from('department_members')
    .select('department_id, role, departments(id, name)')
    .eq('member_id', params.id);

  const { data: groupMembers } = await supabase
    .from('group_members')
    .select('group_id, role, groups(id, name, group_type)')
    .eq('member_id', params.id);

  const { data: membershipHistory } = await supabase
    .from('membership_history')
    .select('id, previous_status, new_status, reason, changed_at, changed_by')
    .eq('member_id', params.id)
    .order('changed_at', { ascending: false })
    .limit(20);

  const { data: attendanceRecords } = await supabase
    .from('attendance_records')
    .select('attendance_event_id, status, attendance_events(title, event_date)')
    .eq('member_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: eventRegs } = await supabase
    .from('event_registrations')
    .select('event_id, status, num_guests, events(title, start_date)')
    .eq('member_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('id, type, status, priority, due_date, assigned_to')
    .eq('member_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: messageRecipients } = await supabase
    .from('message_recipients')
    .select('message_id, delivery_status, messages(subject, channel, sent_at)')
    .eq('recipient_member_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  let givingSummary: MemberDetail['giving_summary'] = null;
  if (isPastoral) {
    const { data: giving } = await supabase
      .from('giving_transactions')
      .select('amount, transaction_date')
      .eq('member_id', params.id)
      .eq('is_reversal', false);
    if (giving && giving.length > 0) {
      const total = giving.reduce((sum, t) => sum + Number(t.amount), 0);
      const sorted = [...giving].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      givingSummary = {
        total_given: total,
        transaction_count: giving.length,
        last_gift_date: sorted[0]?.transaction_date ?? null,
      };
    }
  }

  const detail: MemberDetail = {
    ...member,
    profile: profile as MemberDetail['profile'],
    tags: (tagAssignments ?? []).map((ta: any) => ({ id: ta.tags?.id, name: ta.tags?.name, color: ta.tags?.color })).filter((t: any) => t.id),
    departments: (departmentMembers ?? []).map((dm: any) => ({ id: dm.departments?.id, name: dm.departments?.name, role: dm.role })).filter((d: any) => d.id),
    groups: (groupMembers ?? []).map((gm: any) => ({ id: gm.groups?.id, name: gm.groups?.name, role: gm.role, group_type: gm.groups?.group_type })).filter((g: any) => g.id),
    membership_history: (membershipHistory ?? []).map((mh: any) => ({ id: mh.id, previous_status: mh.previous_status, new_status: mh.new_status, reason: mh.reason, changed_at: mh.changed_at, changed_by_name: null })),
    attendance: (attendanceRecords ?? []).map((ar: any) => ({ event_title: ar.attendance_events?.title ?? 'Unknown', event_date: ar.attendance_events?.event_date ?? '', status: ar.status })),
    event_registrations: (eventRegs ?? []).map((er: any) => ({ event_title: er.events?.title ?? 'Unknown', event_date: er.events?.start_date ?? '', status: er.status, num_guests: er.num_guests })),
    giving_summary: givingSummary,
    follow_ups: (followUps ?? []).map((fu: any) => ({ id: fu.id, type: fu.type, status: fu.status, priority: fu.priority, due_date: fu.due_date, assigned_to_name: null })),
    communications: (messageRecipients ?? []).map((mr: any) => ({ subject: mr.messages?.subject ?? '', channel: mr.messages?.channel ?? '', sent_at: mr.messages?.sent_at, delivery_status: mr.delivery_status })),
  };

  const genderLabel = GENDER_OPTIONS.find((g) => g.value === detail.gender)?.label ?? detail.gender;
  const maritalLabel = MARITAL_STATUS_OPTIONS.find((m) => m.value === detail.marital_status)?.label ?? detail.marital_status;
  const initials = `${detail.first_name[0] ?? ''}${detail.last_name[0] ?? ''}`.toUpperCase();

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={`${detail.first_name} ${detail.last_name}`}
          description={dbGetStatusLabel(detail.status_key)}
          actions={
            <Button asChild variant="outline">
              <Link href={`/admin/members/${detail.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Member
              </Link>
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <Avatar className="mx-auto h-20 w-20">
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-3">{detail.first_name} {detail.last_name}</CardTitle>
              <CardDescription>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(detail.status_key)}`}>
                  {dbGetStatusLabel(detail.status_key)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{detail.email}</span>
                </div>
              )}
              {detail.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{detail.phone}</span>
                </div>
              )}
              {detail.date_of_birth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Born {new Date(detail.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              )}
              {detail.occupation && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{detail.occupation}</span>
                </div>
              )}
              {detail.join_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined {new Date(detail.join_date).toLocaleDateString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {detail.is_baptized && <Badge variant="secondary">Baptized</Badge>}
                {detail.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
              </div>
              {detail.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TagIcon className="h-4 w-4 text-muted-foreground" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline" style={tag.color ? { borderColor: tag.color } : undefined}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="personal">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="membership">Membership</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="giving">Giving</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="comms">Comms</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="First Name" value={detail.first_name} />
                    <InfoField label="Last Name" value={detail.last_name} />
                    <InfoField label="Gender" value={genderLabel} />
                    <InfoField label="Marital Status" value={maritalLabel} />
                    <InfoField label="Date of Birth" value={detail.date_of_birth ? new Date(detail.date_of_birth).toLocaleDateString() : null} />
                    <InfoField label="Occupation" value={detail.occupation} />
                  </CardContent>
                </Card>

                {detail.profile && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4" />
                        Address & Emergency Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Address</p>
                        <p className="text-sm">
                          {[
                            detail.profile.address_line1,
                            detail.profile.address_line2,
                            detail.profile.city,
                            detail.profile.state_province,
                            detail.profile.postal_code,
                            detail.profile.country,
                          ].filter(Boolean).join(', ') || 'Not provided'}
                        </p>
                      </div>
                      <InfoField label="Emergency Contact" value={detail.profile.emergency_contact_name} />
                      <InfoField label="Emergency Phone" value={detail.profile.emergency_contact_phone} />
                      <InfoField label="Relationship" value={detail.profile.emergency_contact_relation} />
                    </CardContent>
                  </Card>
                )}

                {detail.profile && (detail.profile.spiritual_background || detail.profile.conversion_story || detail.profile.previous_church) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Heart className="h-4 w-4" />
                        Spiritual Background
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {detail.profile.spiritual_background && (
                        <InfoField label="Background" value={detail.profile.spiritual_background} />
                      )}
                      {detail.profile.conversion_story && (
                        <InfoField label="Conversion Story" value={detail.profile.conversion_story} />
                      )}
                      {detail.profile.previous_church && (
                        <InfoField label="Previous Church" value={detail.profile.previous_church} />
                      )}
                    </CardContent>
                  </Card>
                )}

                {isPastoral && detail.pastoral_notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Church className="h-4 w-4" />
                        Pastoral Notes
                      </CardTitle>
                      <CardDescription>Visible to pastoral staff only</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{detail.pastoral_notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="membership" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      Membership Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Current Status" value={dbGetStatusLabel(detail.status_key)} />
                    <InfoField label="Join Date" value={detail.join_date ? new Date(detail.join_date).toLocaleDateString() : null} />
                    <InfoField label="Baptized" value={detail.is_baptized ? 'Yes' : 'No'} />
                    <InfoField
                      label="Baptism Date"
                      value={detail.profile?.baptism_date ? new Date(detail.profile.baptism_date).toLocaleDateString() : null}
                    />
                  </CardContent>
                </Card>

                {detail.membership_history.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4" />
                        Status History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {detail.membership_history.map((mh) => (
                          <div key={mh.id} className="flex items-start gap-3 border-l-2 border-muted pl-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {mh.previous_status ? dbGetStatusLabel(mh.previous_status) : 'None'} → {dbGetStatusLabel(mh.new_status)}
                              </p>
                              {mh.reason && <p className="text-xs text-muted-foreground">{mh.reason}</p>}
                              <p className="text-xs text-muted-foreground">
                                {new Date(mh.changed_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {detail.departments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <UsersIcon className="h-4 w-4" />
                        Departments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detail.departments.map((dept) => (
                        <div key={dept.id} className="flex items-center justify-between rounded-lg border p-3">
                          <Link href={`/admin/departments`} className="font-medium hover:underline">
                            {dept.name}
                          </Link>
                          <Badge variant="secondary" className="capitalize">{dept.role}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {detail.groups.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <UsersIcon className="h-4 w-4" />
                        Groups
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detail.groups.map((grp) => (
                        <div key={grp.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{grp.name}</p>
                            {grp.group_type && (
                              <p className="text-xs text-muted-foreground capitalize">{grp.group_type.replace(/_/g, ' ')}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="capitalize">{grp.role}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarCheck className="h-4 w-4" />
                      Recent Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detail.attendance.length === 0 ? (
                      <EmptyState title="No attendance records" description="This member has no recorded attendance." />
                    ) : (
                      <div className="space-y-2">
                        {detail.attendance.map((att, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">{att.event_title}</p>
                              <p className="text-xs text-muted-foreground">
                                {att.event_date ? new Date(att.event_date).toLocaleDateString() : ''}
                              </p>
                            </div>
                            <Badge variant="outline" className="capitalize">{att.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4" />
                      Event Registrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detail.event_registrations.length === 0 ? (
                      <EmptyState title="No event registrations" description="This member has not registered for any events." />
                    ) : (
                      <div className="space-y-2">
                        {detail.event_registrations.map((reg, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">{reg.event_title}</p>
                              <p className="text-xs text-muted-foreground">
                                {reg.event_date ? new Date(reg.event_date).toLocaleDateString() : ''} · {reg.num_guests} guest(s)
                              </p>
                            </div>
                            <Badge variant="outline" className="capitalize">{reg.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="giving" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <HandCoins className="h-4 w-4" />
                      Giving Summary
                    </CardTitle>
                    {!isPastoral && (
                      <CardDescription>Giving details are visible to pastoral staff only.</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isPastoral && detail.giving_summary ? (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border p-4">
                          <p className="text-xs text-muted-foreground">Total Given</p>
                          <p className="text-xl font-bold">
                            ${detail.giving_summary.total_given.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <p className="text-xs text-muted-foreground">Transactions</p>
                          <p className="text-xl font-bold">{detail.giving_summary.transaction_count}</p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <p className="text-xs text-muted-foreground">Last Gift</p>
                          <p className="text-sm font-medium">
                            {detail.giving_summary.last_gift_date
                              ? new Date(detail.giving_summary.last_gift_date).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>
                      </div>
                    ) : isPastoral ? (
                      <EmptyState title="No giving records" description="This member has no recorded giving." />
                    ) : (
                      <p className="text-sm text-muted-foreground">You do not have permission to view giving details.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="followups" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="h-4 w-4" />
                      Follow-ups
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detail.follow_ups.length === 0 ? (
                      <EmptyState title="No follow-ups" description="There are no follow-ups for this member." />
                    ) : (
                      <div className="space-y-2">
                        {detail.follow_ups.map((fu) => (
                          <div key={fu.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium capitalize">{fu.type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-muted-foreground">
                                {fu.due_date ? `Due ${new Date(fu.due_date).toLocaleDateString()}` : 'No due date'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">{fu.priority}</Badge>
                              <Badge variant="secondary" className="capitalize">{fu.status.replace(/_/g, ' ')}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comms" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4" />
                      Communication History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detail.communications.length === 0 ? (
                      <EmptyState title="No communications" description="No messages have been sent to this member." />
                    ) : (
                      <div className="space-y-2">
                        {detail.communications.map((comm, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">{comm.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {comm.channel.toUpperCase()}
                                {comm.sent_at ? ` · ${new Date(comm.sent_at).toLocaleDateString()}` : ''}
                              </p>
                            </div>
                            <Badge variant="outline" className="capitalize">{comm.delivery_status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || 'Not provided'}</p>
    </div>
  );
}
