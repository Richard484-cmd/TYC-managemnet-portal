'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRightCircle, UserCheck, Activity } from 'lucide-react';

interface LifecycleStage {
  key: string;
  label: string;
}

interface FollowUp {
  id: string;
  type: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  assigned_to_name: string | null;
}

interface VisitorActionsProps {
  visitorId: string;
  currentStage: string;
  lifecycleStages: LifecycleStage[];
  followUps: FollowUp[];
  canEdit: boolean;
}

export function VisitorActions({
  visitorId,
  currentStage,
  lifecycleStages,
  followUps,
  canEdit,
}: VisitorActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [stageOpen, setStageOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newStage, setNewStage] = useState(currentStage);
  const [stageReason, setStageReason] = useState('');
  const [activityFollowUp, setActivityFollowUp] = useState('');
  const [activityType, setActivityType] = useState('called');
  const [activityNotes, setActivityNotes] = useState('');

  const sortedStages = [...lifecycleStages].sort((a, b) => a.label.localeCompare(b.label));
  const currentIndex = lifecycleStages.findIndex((s) => s.key === currentStage);
  const nextStage = currentIndex >= 0 && currentIndex < lifecycleStages.length - 1
    ? lifecycleStages[currentIndex + 1]
    : null;

  const handleAdvance = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('advance_visitor_stage', {
      p_visitor_id: visitorId,
      p_new_stage: newStage,
      p_reason: stageReason || null,
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'Visitor lifecycle stage updated.' });
    setStageOpen(false);
    setStageReason('');
    router.refresh();
  };

  const handleConvert = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('convert_visitor_to_member', {
      p_visitor_id: visitorId,
      p_status_key: 'regular_attender',
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'Visitor converted to member successfully.' });
    setConvertOpen(false);
    router.push(`/admin/members/${data}`);
    router.refresh();
  };

  const handleAddActivity = async () => {
    if (!activityFollowUp) {
      toast({ title: 'Error', description: 'Please select a follow-up.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('follow_up_activities').insert({
      follow_up_id: activityFollowUp,
      activity_type: activityType,
      notes: activityNotes || null,
      performed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'Activity logged.' });
    setActivityOpen(false);
    setActivityNotes('');
    router.refresh();
  };

  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {nextStage && (
        <Dialog open={stageOpen} onOpenChange={setStageOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              Advance to {nextStage.label}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Advance Lifecycle Stage</DialogTitle>
              <DialogDescription>
                Move this visitor to the next stage in the lifecycle pipeline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>New Stage</Label>
                <Select value={newStage} onValueChange={setNewStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedStages.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason / Notes (optional)</Label>
                <Textarea
                  rows={3}
                  value={stageReason}
                  onChange={(e) => setStageReason(e.target.value)}
                  placeholder="e.g. Completed welcome call, visitor attended second service..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStageOpen(false)}>Cancel</Button>
              <Button onClick={handleAdvance} disabled={saving}>
                {saving ? 'Saving...' : 'Update Stage'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!nextStage && currentStage !== 'new_member' && (
        <Dialog open={stageOpen} onOpenChange={setStageOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              Change Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Lifecycle Stage</DialogTitle>
              <DialogDescription>
                Manually set the lifecycle stage for this visitor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={newStage} onValueChange={setNewStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedStages.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason / Notes (optional)</Label>
                <Textarea
                  rows={3}
                  value={stageReason}
                  onChange={(e) => setStageReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStageOpen(false)}>Cancel</Button>
              <Button onClick={handleAdvance} disabled={saving}>
                {saving ? 'Saving...' : 'Update Stage'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {currentStage !== 'new_member' && (
        <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default">
              <UserCheck className="mr-2 h-4 w-4" />
              Convert to Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert Visitor to Member</DialogTitle>
              <DialogDescription>
                This will create a new member record, copy the visitor&apos;s contact details and address,
                and mark this visitor as converted. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
              <Button onClick={handleConvert} disabled={saving}>
                {saving ? 'Converting...' : 'Convert to Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {followUps.length > 0 && (
        <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Follow-up Activity</DialogTitle>
              <DialogDescription>
                Record an interaction related to a follow-up for this visitor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Follow-up</Label>
                <Select value={activityFollowUp} onValueChange={setActivityFollowUp}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select follow-up..." />
                  </SelectTrigger>
                  <SelectContent>
                    {followUps.map((fu) => (
                      <SelectItem key={fu.id} value={fu.id}>
                        {fu.type.replace(/_/g, ' ')} — {fu.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="called">Called</SelectItem>
                    <SelectItem value="left_voicemail">Left Voicemail</SelectItem>
                    <SelectItem value="texted">Texted</SelectItem>
                    <SelectItem value="emailed">Emailed</SelectItem>
                    <SelectItem value="visited">Visited</SelectItem>
                    <SelectItem value="scheduled_meeting">Scheduled Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="What happened during this interaction?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivityOpen(false)}>Cancel</Button>
              <Button onClick={handleAddActivity} disabled={saving}>
                {saving ? 'Saving...' : 'Log Activity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
