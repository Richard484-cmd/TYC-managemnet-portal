'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { groupFormSchema, type GroupFormValues } from '@/lib/organization/schema';
import { UNIT_STATUS, GROUP_TYPES, MEETING_DAYS } from '@/lib/organization/constants';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import type { LeaderOption } from '@/lib/organization/schema';

interface GroupFormProps {
  mode: 'create' | 'edit';
  groupId?: string;
  defaultValues?: Partial<GroupFormValues>;
  leaders: LeaderOption[];
  ministries: { id: string; name: string }[];
}

export function GroupForm({ mode, groupId, defaultValues, leaders, ministries }: GroupFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
      description: '',
      ministry_id: null,
      group_type: 'small_group',
      leader_id: null,
      meeting_day: null,
      meeting_time: null,
      location: null,
      max_capacity: null,
      status: 'active',
      display_order: 0,
      ...defaultValues,
    },
  });

  const status = watch('status');
  const leaderId = watch('leader_id');
  const groupType = watch('group_type');
  const ministryId = watch('ministry_id');
  const meetingDay = watch('meeting_day');

  const onSubmit = async (values: GroupFormValues) => {
    setSaving(true);
    const supabase = createClient();
    const data = {
      name: values.name,
      description: values.description || null,
      ministry_id: values.ministry_id || null,
      group_type: values.group_type,
      leader_id: values.leader_id || null,
      meeting_day: values.meeting_day || null,
      meeting_time: values.meeting_time || null,
      location: values.location || null,
      max_capacity: values.max_capacity || null,
      status: values.status,
      display_order: values.display_order,
    };

    if (mode === 'create') {
      const { data: result, error } = await supabase.from('groups').insert(data).select('id').single();
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Group created.' });
      router.push(`/admin/groups/${result.id}`);
      router.refresh();
    } else if (mode === 'edit' && groupId) {
      const { error } = await supabase.from('groups').update(data).eq('id', groupId);
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Group updated.' });
      router.push(`/admin/groups/${groupId}`);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={mode === 'edit' ? `/admin/groups/${groupId}` : '/admin/groups'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Cell Group A, Bible Study Group..." />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Group Type</Label>
            <Select value={groupType} onValueChange={(v) => setValue('group_type', v as GroupFormValues['group_type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ministry (optional)</Label>
            <Select
              value={ministryId ?? '__none__'}
              onValueChange={(v) => setValue('ministry_id', v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No ministry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No ministry</SelectItem>
                {ministries.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Leader</Label>
            <Select
              value={leaderId ?? '__none__'}
              onValueChange={(v) => setValue('leader_id', v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leader..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No leader assigned</SelectItem>
                {leaders.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Meeting Day</Label>
            <Select
              value={meetingDay ?? '__none__'}
              onValueChange={(v) => setValue('meeting_day', v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No fixed day</SelectItem>
                {MEETING_DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting_time">Meeting Time</Label>
            <Input id="meeting_time" {...register('meeting_time')} placeholder="e.g. 7:00 PM" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register('location')} placeholder="e.g. Room 201" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_capacity">Max Capacity</Label>
            <Input
              id="max_capacity"
              type="number"
              {...register('max_capacity', { setValueAs: (v) => v === '' || v === null ? null : Number(v) })}
              placeholder="No limit"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v as 'active' | 'inactive' | 'full')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : mode === 'create' ? 'Create Group' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
