'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { meetingFormSchema, type MeetingFormValues } from '@/lib/virtual-meetings/schema';
import { MEETING_CATEGORIES } from '@/lib/virtual-meetings/constants';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface MeetingFormProps {
  mode: 'create' | 'edit';
  meetingId?: string;
  defaultValues?: Partial<MeetingFormValues>;
  groups: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  ministries: { id: string; name: string }[];
}

function generateRoomName(): string {
  return `church-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function toLocalDatetimeInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingForm({ mode, meetingId, defaultValues, groups, departments, ministries }: MeetingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'fellowship',
      scope_type: 'church',
      scope_id: null,
      timezone: 'UTC',
      participant_policy: 'scope_members',
      capacity: null,
      ...defaultValues,
      starts_at: defaultValues?.starts_at ? toLocalDatetimeInput(defaultValues.starts_at) : '',
      ends_at: defaultValues?.ends_at ? toLocalDatetimeInput(defaultValues.ends_at) : '',
    },
  });

  const category = watch('category');
  const scopeType = watch('scope_type');
  const scopeId = watch('scope_id');
  const participantPolicy = watch('participant_policy');

  const onSubmit = async (values: MeetingFormValues) => {
    setSaving(true);
    const supabase = createClient();
    const startsAtIso = new Date(values.starts_at).toISOString();
    const endsAtIso = new Date(values.ends_at).toISOString();

    if (endsAtIso <= startsAtIso) {
      setSaving(false);
      toast({ title: 'Invalid schedule', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    const data: Record<string, unknown> = {
      title: values.title,
      description: values.description || null,
      category: values.category,
      scope_type: values.scope_type,
      scope_id: values.scope_type === 'church' ? null : (values.scope_id || null),
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      timezone: values.timezone || 'UTC',
      participant_policy: values.participant_policy,
      capacity: values.capacity || null,
    };

    if (mode === 'create') {
      data.provider = 'daily';
      data.provider_room_name = generateRoomName();
      data.status = 'scheduled';
      const { data: result, error } = await supabase.from('virtual_meetings').insert(data).select('id').single();
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }

      // Attempt to create the Daily room server-side; meeting is still saved if this fails
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/virtual-meeting-manage`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ meetingId: result.id, action: 'create_room' }),
          });
        }
      } catch {
        // Room creation is best-effort here; the manage function can be called later
      }

      toast({ title: 'Success', description: 'Meeting scheduled. The video room will be available when the provider is configured.' });
      router.push(`/admin/virtual-meetings/${result.id}`);
      router.refresh();
    } else if (mode === 'edit' && meetingId) {
      const { error } = await supabase.from('virtual_meetings').update(data).eq('id', meetingId);
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Meeting updated.' });
      router.push(`/admin/virtual-meetings/${meetingId}`);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={mode === 'edit' ? `/admin/virtual-meetings/${meetingId}` : '/admin/virtual-meetings'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Meeting Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register('title')} placeholder="e.g. Wednesday Bible Study" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setValue('category', v as MeetingFormValues['category'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEETING_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Participant eligibility</Label>
            <Select value={participantPolicy} onValueChange={(v) => setValue('participant_policy', v as MeetingFormValues['participant_policy'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scope_members">Members of this unit</SelectItem>
                <SelectItem value="invited">Invited only</SelectItem>
                <SelectItem value="church_wide">Church-wide (all members)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scope & Schedule</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Organizational scope</Label>
            <Select value={scopeType} onValueChange={(v) => { setValue('scope_type', v as MeetingFormValues['scope_type']); setValue('scope_id', null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="church">Church-wide</SelectItem>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scopeType !== 'church' && (
            <div className="space-y-2">
              <Label>{scopeType === 'group' ? 'Group' : scopeType === 'department' ? 'Department' : 'Ministry'} *</Label>
              <Select value={scopeId ?? '__none__'} onValueChange={(v) => setValue('scope_id', v === '__none__' ? null : v)}>
                <SelectTrigger><SelectValue placeholder={`Select ${scopeType}...`} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None selected</SelectItem>
                  {(scopeType === 'group' ? groups : scopeType === 'department' ? departments : ministries).map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="starts_at">Starts at *</Label>
            <Input id="starts_at" type="datetime-local" {...register('starts_at')} />
            {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ends_at">Ends at *</Label>
            <Input id="ends_at" type="datetime-local" {...register('ends_at')} />
            {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" {...register('timezone')} placeholder="e.g. Africa/Lagos" />
            <p className="text-xs text-muted-foreground">IANA timezone identifier. Defaults to UTC.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (optional)</Label>
            <Input id="capacity" type="number" {...register('capacity', { setValueAs: (v) => v === '' || v === null ? null : Number(v) })} placeholder="No limit" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : mode === 'create' ? 'Schedule Meeting' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
