'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  PRAYER_STATUSES,
  PRAYER_CATEGORIES,
  PRAYER_VISIBILITIES,
  getStatusLabel,
  getStatusBadge,
  getCategoryLabel,
  getVisibilityLabel,
  isFollowUpOverdue,
  isFollowUpDueToday,
} from '@/lib/prayer/constants';
import type { PrayerRequest, PrayerStatusHistory, PrayerPastoralNote, PrayerMemberUpdate } from '@/lib/prayer/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Heart, UserPlus, AlertCircle, CheckCircle2, Check, Clock,
  Sparkles, Circle, Send, Loader2, Plus, Lock, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_ICONS: Record<string, typeof Heart> = {
  new: Sparkles, assigned: UserPlus, praying: Heart,
  follow_up_required: AlertCircle, answered: CheckCircle2, closed: Check,
  open: Circle, in_progress: Clock,
};

// ============================================================================
// PrayerStatusBadge
// ============================================================================

export function PrayerStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', getStatusBadge(status))}>
      {getStatusLabel(status)}
    </span>
  );
}

// ============================================================================
// PrayerRequestCard
// ============================================================================

export function PrayerRequestCard({
  request,
  canSeeSubmitter = true,
  onClick,
}: {
  request: PrayerRequest;
  canSeeSubmitter?: boolean;
  onClick?: (id: string) => void;
}) {
  const displayName = request.is_anonymous
    ? 'Anonymous'
    : canSeeSubmitter
      ? (request.submitted_by_name ?? 'Community Member')
      : 'Community Member';

  return (
    <Card
      className={cn('transition-shadow hover:shadow-md', onClick && 'cursor-pointer')}
      onClick={() => onClick?.(request.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold">{request.title}</h4>
          <PrayerStatusBadge status={request.status} />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {request.category && <span className="rounded-full bg-muted px-2 py-0.5">{getCategoryLabel(request.category)}</span>}
          <span>{displayName}</span>
          <span>· {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          {request.prayer_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {request.prayer_count}
            </span>
          )}
          {request.visibility === 'private' && <Lock className="h-3 w-3" />}
          {request.visibility === 'pastoral_only' && <EyeOff className="h-3 w-3" />}
          {isFollowUpOverdue(request.follow_up_date, request.status) && (
            <span className="text-red-600 font-medium">Follow-up overdue</span>
          )}
          {isFollowUpDueToday(request.follow_up_date, request.status) && (
            <span className="text-amber-600 font-medium">Follow-up due today</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PrayerRequestList
// ============================================================================

export function PrayerRequestList({
  requests,
  canSeeSubmitter = true,
  onCardClick,
  emptyMessage = 'No prayer requests found.',
}: {
  requests: PrayerRequest[];
  canSeeSubmitter?: boolean;
  onCardClick?: (id: string) => void;
  emptyMessage?: string;
}) {
  if (requests.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <PrayerRequestCard key={r.id} request={r} canSeeSubmitter={canSeeSubmitter} onClick={onCardClick} />
      ))}
    </div>
  );
}

// ============================================================================
// PrayerRequestFilters
// ============================================================================

export function PrayerRequestFilters({
  search,
  status,
  category,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
}: {
  search: string;
  status: string;
  category: string;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Search prayer requests..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 w-full sm:w-64"
      />
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {PRAYER_STATUSES.map((s) => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {PRAYER_CATEGORIES.map((c) => (
            <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// MemberPrayerForm — for members to submit prayer requests
// ============================================================================

export function MemberPrayerForm({
  userId,
  memberId,
  onSubmitted,
}: {
  userId: string;
  memberId?: string | null;
  onSubmitted?: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'members_only' | 'pastoral_only' | 'private'>('members_only');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Subject and prayer request are required');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('prayer_requests').insert({
      title,
      body,
      category: category || null,
      is_anonymous: isAnonymous,
      visibility,
      status: 'new',
      submitted_by: userId,
      member_id: memberId ?? null,
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to submit prayer request');
      return;
    }

    toast.success('Your prayer request has been submitted');
    setSuccess(true);
    setTitle('');
    setBody('');
    setCategory('');
    setIsAnonymous(false);
    setVisibility('members_only');
    onSubmitted?.();
  };

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <div>
            <p className="font-medium">Thank you for sharing your prayer request.</p>
            <p className="text-sm text-muted-foreground">Our pastoral team will be praying over your request.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSuccess(false)}>
            Submit Another Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Subject</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title for your prayer request"
        />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
          <SelectContent>
            {PRAYER_CATEGORIES.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Prayer Request</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your prayer request..."
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label>Who can see this request?</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRAYER_VISIBILITIES.map((v) => (
              <SelectItem key={v.key} value={v.key}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {PRAYER_VISIBILITIES.find((v) => v.key === visibility)?.description}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isAnonymous}
          onCheckedChange={(v) => setIsAnonymous(!!v)}
        />
        <span className="text-sm">Submit anonymously</span>
        <span className="text-xs text-muted-foreground">— your identity will not be shown to other members</span>
      </div>
      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : <><Send className="mr-2 h-4 w-4" />Submit Prayer Request</>}
      </Button>
    </div>
  );
}

// ============================================================================
// PrayerDetailClient — pastoral/admin detail view with workflow
// ============================================================================

export function PrayerDetailClient({
  prayerRequest,
  statusHistory,
  pastoralNotes,
  memberUpdates,
  staffUsers,
  currentUserId,
  canManage,
  canSeePastoralNotes,
  isAssignedToMe,
}: {
  prayerRequest: PrayerRequest;
  statusHistory: PrayerStatusHistory[];
  pastoralNotes: PrayerPastoralNote[];
  memberUpdates: PrayerMemberUpdate[];
  staffUsers: { id: string; display_name: string }[];
  currentUserId: string;
  canManage: boolean;
  canSeePastoralNotes: boolean;
  isAssignedToMe: boolean;
}) {
  const supabase = createClient();
  const [status, setStatus] = useState(prayerRequest.status);
  const [assignedTo, setAssignedTo] = useState(prayerRequest.assigned_to ?? '');
  const [followUpDate, setFollowUpDate] = useState(prayerRequest.follow_up_date ?? '');
  const [pastoralNote, setPastoralNote] = useState('');
  const [memberUpdate, setMemberUpdate] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [praying, setPraying] = useState(false);

  const canEdit = canManage || isAssignedToMe;

  const handleStatusChange = async () => {
    if (status === prayerRequest.status) return;
    setSavingStatus(true);
    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'answered') updateData.answered_at = new Date().toISOString();
    if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by = currentUserId;
    }

    const { error } = await supabase.from('prayer_requests').update(updateData).eq('id', prayerRequest.id);
    if (error) {
      toast.error('Failed to update status');
      setSavingStatus(false);
      return;
    }

    await supabase.from('prayer_status_history').insert({
      prayer_request_id: prayerRequest.id,
      previous_status: prayerRequest.status,
      new_status: status,
      changed_by: currentUserId,
    });

    setSavingStatus(false);
    toast.success(`Status updated to ${getStatusLabel(status)}`);
  };

  const handleAssignment = async () => {
    setSavingAssignment(true);
    const updateData: Record<string, unknown> = {
      assigned_to: assignedTo || null,
      assigned_at: assignedTo ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (assignedTo && prayerRequest.status === 'new') {
      updateData.status = 'assigned';
      setStatus('assigned');
    }

    const { error } = await supabase.from('prayer_requests').update(updateData).eq('id', prayerRequest.id);
    if (error) {
      toast.error('Failed to update assignment');
      setSavingAssignment(false);
      return;
    }

    if (assignedTo && prayerRequest.status === 'new') {
      await supabase.from('prayer_status_history').insert({
        prayer_request_id: prayerRequest.id,
        previous_status: prayerRequest.status,
        new_status: 'assigned',
        changed_by: currentUserId,
      });
    }

    setSavingAssignment(false);
    toast.success(assignedTo ? 'Prayer request assigned' : 'Assignment removed');
  };

  const handleAddPastoralNote = async () => {
    if (!pastoralNote.trim()) return;
    setAddingNote(true);
    const { error } = await supabase.from('prayer_pastoral_notes').insert({
      prayer_request_id: prayerRequest.id,
      author_id: currentUserId,
      content: pastoralNote,
    });
    setAddingNote(false);
    if (error) {
      toast.error('Failed to add note');
      return;
    }
    await supabase.from('prayer_requests').update({
      pastoral_notes_summary: pastoralNote,
      updated_at: new Date().toISOString(),
    }).eq('id', prayerRequest.id);
    setPastoralNote('');
    toast.success('Pastoral note added');
  };

  const handleAddMemberUpdate = async () => {
    if (!memberUpdate.trim()) return;
    setAddingUpdate(true);
    const { error } = await supabase.from('prayer_member_updates').insert({
      prayer_request_id: prayerRequest.id,
      author_id: currentUserId,
      content: memberUpdate,
    });
    setAddingUpdate(false);
    if (error) {
      toast.error('Failed to add update');
      return;
    }
    await supabase.from('prayer_requests').update({
      member_update: memberUpdate,
      updated_at: new Date().toISOString(),
    }).eq('id', prayerRequest.id);
    setMemberUpdate('');
    toast.success('Member update sent');
  };

  const handlePray = async () => {
    setPraying(true);
    const { error } = await supabase.rpc('increment_prayer_count', { p_prayer_id: prayerRequest.id });
    setPraying(false);
    if (error) {
      toast.error('Failed to record prayer');
      return;
    }
    toast.success('Thank you for praying');
  };

  return (
    <div className="space-y-6">
      {/* Prayer Request Content */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{prayerRequest.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {prayerRequest.category && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{getCategoryLabel(prayerRequest.category)}</span>
                )}
                <PrayerStatusBadge status={prayerRequest.status} />
                {prayerRequest.is_anonymous && <span className="text-xs">Anonymous</span>}
                {!prayerRequest.is_anonymous && prayerRequest.submitted_by_name && (
                  <span>by {prayerRequest.submitted_by_name}</span>
                )}
                <span>· {new Date(prayerRequest.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handlePray} disabled={praying}>
              {praying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="mr-1 h-4 w-4" />}
              Pray
            </Button>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{prayerRequest.body}</p>
          {prayerRequest.answered_description && (
            <div className="mt-4 rounded-lg bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">Answered</p>
              <p className="mt-1 text-sm text-green-700">{prayerRequest.answered_description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pastoral Workflow (admin/pastor only) */}
      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status + Assignment */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="font-semibold">Status & Assignment</h3>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRAYER_STATUSES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {status !== prayerRequest.status && (
                  <Button size="sm" onClick={handleStatusChange} disabled={savingStatus}>
                    {savingStatus ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    Save Status
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignedTo !== (prayerRequest.assigned_to ?? '') && (
                  <Button size="sm" onClick={handleAssignment} disabled={savingAssignment}>
                    {savingAssignment ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    Save Assignment
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Follow-Up Date</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const { error } = await supabase.from('prayer_requests').update({
                      follow_up_date: followUpDate || null,
                      updated_at: new Date().toISOString(),
                    }).eq('id', prayerRequest.id);
                    if (error) { toast.error('Failed to update follow-up date'); return; }
                    toast.success('Follow-up date updated');
                  }}
                >
                  Save Follow-Up Date
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Member-Visible Update */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="font-semibold">Member Update</h3>
              <p className="text-xs text-muted-foreground">This message will be visible to the member who submitted the request.</p>
              <Textarea
                value={memberUpdate}
                onChange={(e) => setMemberUpdate(e.target.value)}
                placeholder="Write a message to the member..."
                rows={4}
              />
              <Button size="sm" onClick={handleAddMemberUpdate} disabled={addingUpdate || !memberUpdate.trim()}>
                {addingUpdate ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                Send Update to Member
              </Button>
              {memberUpdates.length > 0 && (
                <div className="space-y-2 pt-2">
                  {memberUpdates.map((u) => (
                    <div key={u.id} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm">{u.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {u.author_name ?? 'Staff'} · {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pastoral Notes (pastor/admin only) */}
      {canSeePastoralNotes && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Pastoral Notes</h3>
              <span className="text-xs text-muted-foreground">— Internal, not visible to members</span>
            </div>
            <Textarea
              value={pastoralNote}
              onChange={(e) => setPastoralNote(e.target.value)}
              placeholder="Add an internal pastoral note..."
              rows={3}
            />
            <Button size="sm" variant="outline" onClick={handleAddPastoralNote} disabled={addingNote || !pastoralNote.trim()}>
              {addingNote ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Add Note
            </Button>
            {pastoralNotes.length > 0 && (
              <div className="space-y-2 pt-2">
                {pastoralNotes.map((n) => (
                  <div key={n.id} className="rounded-lg border p-3">
                    <p className="text-sm">{n.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.author_name ?? 'Pastoral'} · {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      {statusHistory.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Status History</h3>
            <div className="space-y-1">
              {statusHistory.map((h) => {
                const Icon = STATUS_ICONS[h.new_status] ?? Circle;
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {statusHistory.indexOf(h) < statusHistory.length - 1 && <div className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">
                        {h.previous_status ? getStatusLabel(h.previous_status) : 'Created'} → {getStatusLabel(h.new_status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.changed_by_name ?? 'System'} · {new Date(h.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Updates (visible to member) */}
      {!canEdit && memberUpdates.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Updates from Our Pastoral Team</h3>
            <div className="space-y-2">
              {memberUpdates.map((u) => (
                <div key={u.id} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm">{u.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
