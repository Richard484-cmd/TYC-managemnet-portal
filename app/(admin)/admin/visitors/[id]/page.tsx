import { requireStaff } from '@/lib/auth/session';
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
  MapPin,
  Tag as TagIcon,
  ClipboardList,
  Activity,
  ArrowRightCircle,
  Calendar,
  UserCheck,
  Clock,
} from 'lucide-react';
import {
  getSourceLabel,
  getVisitorStatusLabel,
  getVisitorStatusColor,
  getLifecycleLabel,
  DEFAULT_LIFECYCLE_STAGES,
  DEFAULT_VISITOR_STATUSES,
} from '@/lib/visitors/constants';
import { VisitorActions } from '@/components/admin/visitors/visitor-actions';

export const dynamic = 'force-dynamic';

export default async function VisitorProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: visitor, error } = await supabase
    .from('visitors')
    .select(`
      id, first_name, last_name, email, phone, source, lifecycle_stage, status_key,
      first_visit_date, assigned_to, converted_to_member_id, converted_at,
      notes, address_line1, address_line2, city, state_province, postal_code, country,
      contact_id, created_by, updated_by, created_at, updated_at, deleted_at
    `)
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !visitor) {
    notFound();
  }

  // Fetch assigned_to name
  let assignedToName: string | null = null;
  if (visitor.assigned_to) {
    const { data: assignee } = await supabase
      .from('users')
      .select('display_name, first_name, last_name')
      .eq('id', visitor.assigned_to)
      .maybeSingle();
    if (assignee) {
      assignedToName = assignee.display_name || `${assignee.first_name} ${assignee.last_name}`;
    }
  }

  // Fetch tags
  const { data: tagAssignments } = await supabase
    .from('tag_assignments')
    .select('tag_id, tags(id, name, color, slug)')
    .eq('entity_type', 'visitor')
    .eq('entity_id', params.id);

  const tags = (tagAssignments ?? [])
    .map((ta: any) => ({ id: ta.tags?.id, name: ta.tags?.name, color: ta.tags?.color, slug: ta.tags?.slug }))
    .filter((t: any) => t.id);

  // Fetch follow-ups
  const { data: followUpsRaw } = await supabase
    .from('follow_ups')
    .select('id, type, status, priority, due_date, completed_at, assigned_to')
    .eq('visitor_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch assignee names for follow-ups
  const fuAssigneeIds = (followUpsRaw ?? []).map((fu: any) => fu.assigned_to).filter(Boolean) as string[];
  let fuAssigneeMap = new Map<string, string>();
  if (fuAssigneeIds.length > 0) {
    const { data: fuUsers } = await supabase
      .from('users')
      .select('id, display_name, first_name, last_name')
      .in('id', fuAssigneeIds);
    (fuUsers ?? []).forEach((u: any) => {
      fuAssigneeMap.set(u.id, u.display_name || `${u.first_name} ${u.last_name}`);
    });
  }

  const followUps = (followUpsRaw ?? []).map((fu: any) => ({
    id: fu.id,
    type: fu.type,
    status: fu.status,
    priority: fu.priority,
    due_date: fu.due_date,
    completed_at: fu.completed_at,
    assigned_to_name: fu.assigned_to ? fuAssigneeMap.get(fu.assigned_to) ?? null : null,
  }));

  // Fetch follow-up activities
  const followUpIds = followUps.map((fu) => fu.id);
  let activities: { id: string; follow_up_type: string; activity_type: string; notes: string | null; performed_at: string }[] = [];
  if (followUpIds.length > 0) {
    const { data: activitiesRaw } = await supabase
      .from('follow_up_activities')
      .select('id, follow_up_id, activity_type, notes, performed_at')
      .in('follow_up_id', followUpIds)
      .order('performed_at', { ascending: false })
      .limit(20);

    const fuTypeMap = new Map(followUps.map((fu) => [fu.id, fu.type]));
    activities = (activitiesRaw ?? []).map((a: any) => ({
      id: a.id,
      follow_up_type: fuTypeMap.get(a.follow_up_id) ?? 'unknown',
      activity_type: a.activity_type,
      notes: a.notes,
      performed_at: a.performed_at,
    }));
  }

  // Fetch contact movements (history)
  let movements: { id: string; from_stage: string | null; to_stage: string; reason: string | null; moved_at: string }[] = [];
  if (visitor.contact_id) {
    const { data: movementsRaw } = await supabase
      .from('contact_movements')
      .select('id, from_stage, to_stage, reason, moved_at')
      .eq('contact_id', visitor.contact_id)
      .order('moved_at', { ascending: false })
      .limit(20);
    movements = (movementsRaw ?? []).map((m: any) => ({
      id: m.id,
      from_stage: m.from_stage,
      to_stage: m.to_stage,
      reason: m.reason,
      moved_at: m.moved_at,
    }));
  }

  // Fetch tasks
  const { data: tasksRaw } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, assigned_to')
    .eq('entity_type', 'visitor')
    .eq('entity_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  const taskAssigneeIds = (tasksRaw ?? []).map((t: any) => t.assigned_to).filter(Boolean) as string[];
  let taskAssigneeMap = new Map<string, string>();
  if (taskAssigneeIds.length > 0) {
    const { data: taskUsers } = await supabase
      .from('users')
      .select('id, display_name, first_name, last_name')
      .in('id', taskAssigneeIds);
    (taskUsers ?? []).forEach((u: any) => {
      taskAssigneeMap.set(u.id, u.display_name || `${u.first_name} ${u.last_name}`);
    });
  }

  const tasks = (tasksRaw ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    assigned_to_name: t.assigned_to ? taskAssigneeMap.get(t.assigned_to) ?? null : null,
  }));

  const lifecycleStages = DEFAULT_LIFECYCLE_STAGES.map((s) => ({ key: s.stage_key, label: s.name }));
  const initials = `${visitor.first_name[0] ?? ''}${visitor.last_name[0] ?? ''}`.toUpperCase();
  const isConverted = visitor.status_key === 'converted' || visitor.lifecycle_stage === 'new_member';

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title={`${visitor.first_name} ${visitor.last_name}`}
          description={`${getLifecycleLabel(visitor.lifecycle_stage)} · ${getSourceLabel(visitor.source)}`}
          actions={
            <Button asChild variant="outline">
              <Link href={`/admin/visitors/${visitor.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Visitor
              </Link>
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <Avatar className="mx-auto h-20 w-20">
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-3">{visitor.first_name} {visitor.last_name}</CardTitle>
              <CardDescription>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getVisitorStatusColor(visitor.status_key)}`}>
                  {getVisitorStatusLabel(visitor.status_key)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {visitor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{visitor.email}</span>
                </div>
              )}
              {visitor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{visitor.phone}</span>
                </div>
              )}
              {visitor.first_visit_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    First visit {new Date(visitor.first_visit_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {assignedToName && (
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned to {assignedToName}</span>
                </div>
              )}
              {visitor.converted_to_member_id && (
                <>
                  <Separator />
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                    <p className="text-xs font-medium text-green-700">Converted to Member</p>
                    {visitor.converted_at && (
                      <p className="text-xs text-green-600 mt-1">
                        {new Date(visitor.converted_at).toLocaleDateString()}
                      </p>
                    )}
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <Link href={`/admin/members/${visitor.converted_to_member_id}`}>
                        View Member Profile
                      </Link>
                    </Button>
                  </div>
                </>
              )}
              {tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TagIcon className="h-4 w-4 text-muted-foreground" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
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

          {/* Main content */}
          <div className="lg:col-span-2">
            {!isConverted && (
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Visitor Lifecycle</h3>
                      <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {DEFAULT_LIFECYCLE_STAGES.map((stage, i) => {
                          const stageIndex = DEFAULT_LIFECYCLE_STAGES.findIndex((s) => s.stage_key === visitor.lifecycle_stage);
                          const isCompleted = i < stageIndex;
                          const isCurrent = i === stageIndex;
                          return (
                            <div key={stage.stage_key} className="flex items-center">
                              <div className={`flex flex-col items-center gap-1 min-w-[80px] ${isCurrent ? '' : ''}`}>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium border-2 ${
                                  isCompleted ? 'bg-primary text-primary-foreground border-primary'
                                  : isCurrent ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted text-muted-foreground border-muted-foreground/30'
                                }`}>
                                  {isCompleted ? '✓' : i + 1}
                                </div>
                                <span className={`text-[10px] text-center leading-tight ${isCurrent ? 'font-semibold' : 'text-muted-foreground'}`}>
                                  {stage.name}
                                </span>
                              </div>
                              {i < DEFAULT_LIFECYCLE_STAGES.length - 1 && (
                                <div className={`h-0.5 w-6 ${i < stageIndex ? 'bg-primary' : 'bg-muted'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <VisitorActions
                      visitorId={visitor.id}
                      currentStage={visitor.lifecycle_stage}
                      lifecycleStages={lifecycleStages}
                      followUps={followUps}
                      canEdit={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="overview">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>

              {/* Overview tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Visitor Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="First Name" value={visitor.first_name} />
                    <InfoField label="Last Name" value={visitor.last_name} />
                    <InfoField label="Email" value={visitor.email} />
                    <InfoField label="Phone" value={visitor.phone} />
                    <InfoField label="Source" value={getSourceLabel(visitor.source)} />
                    <InfoField label="Lifecycle Stage" value={getLifecycleLabel(visitor.lifecycle_stage)} />
                    <InfoField label="Status" value={getVisitorStatusLabel(visitor.status_key)} />
                    <InfoField label="Assigned To" value={assignedToName} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4" />
                      Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {[
                        visitor.address_line1,
                        visitor.address_line2,
                        visitor.city,
                        visitor.state_province,
                        visitor.postal_code,
                        visitor.country,
                      ].filter(Boolean).join(', ') || 'Not provided'}
                    </p>
                  </CardContent>
                </Card>

                {visitor.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{visitor.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Follow-ups tab */}
              <TabsContent value="followups" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="h-4 w-4" />
                      Follow-ups
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {followUps.length === 0 ? (
                      <EmptyState title="No follow-ups" description="There are no follow-ups for this visitor." />
                    ) : (
                      <div className="space-y-2">
                        {followUps.map((fu) => (
                          <div key={fu.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium capitalize">{fu.type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-muted-foreground">
                                {fu.due_date ? `Due ${new Date(fu.due_date).toLocaleDateString()}` : 'No due date'}
                                {fu.assigned_to_name && ` · ${fu.assigned_to_name}`}
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

                {activities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4" />
                        Activity Log
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {activities.map((a) => (
                          <div key={a.id} className="flex items-start gap-3 border-l-2 border-muted pl-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium capitalize">
                                {a.activity_type.replace(/_/g, ' ')}
                                <span className="text-muted-foreground font-normal ml-1">
                                  on {a.follow_up_type.replace(/_/g, ' ')}
                                </span>
                              </p>
                              {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                              <p className="text-xs text-muted-foreground">
                                {new Date(a.performed_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* History tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowRightCircle className="h-4 w-4" />
                      Lifecycle History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {movements.length === 0 ? (
                      <EmptyState title="No lifecycle changes" description="This visitor has not moved through any stages yet." />
                    ) : (
                      <div className="space-y-3">
                        {movements.map((m) => (
                          <div key={m.id} className="flex items-start gap-3 border-l-2 border-muted pl-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {m.from_stage ? getLifecycleLabel(m.from_stage) : 'None'} → {getLifecycleLabel(m.to_stage)}
                              </p>
                              {m.reason && <p className="text-xs text-muted-foreground">{m.reason}</p>}
                              <p className="text-xs text-muted-foreground">
                                {new Date(m.moved_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tasks tab */}
              <TabsContent value="tasks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasks.length === 0 ? (
                      <EmptyState title="No tasks" description="There are no tasks for this visitor." />
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((t) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">{t.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString()}` : 'No due date'}
                                {t.assigned_to_name && ` · ${t.assigned_to_name}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">{t.priority}</Badge>
                              <Badge variant="secondary" className="capitalize">{t.status.replace(/_/g, ' ')}</Badge>
                            </div>
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
