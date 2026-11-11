'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { ministryFormSchema, type MinistryFormValues } from '@/lib/organization/schema';
import { UNIT_STATUS, MEETING_DAYS } from '@/lib/organization/constants';
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

interface MinistryFormProps {
  mode: 'create' | 'edit';
  ministryId?: string;
  defaultValues?: Partial<MinistryFormValues>;
  leaders: LeaderOption[];
  departments: { id: string; name: string }[];
}

export function MinistryForm({ mode, ministryId, defaultValues, leaders, departments }: MinistryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MinistryFormValues>({
    resolver: zodResolver(ministryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      department_id: '',
      leader_id: null,
      meeting_day: null,
      meeting_time: null,
      location: null,
      status: 'active',
      display_order: 0,
      ...defaultValues,
    },
  });

  const status = watch('status');
  const leaderId = watch('leader_id');
  const departmentId = watch('department_id');
  const meetingDay = watch('meeting_day');

  const onSubmit = async (values: MinistryFormValues) => {
    setSaving(true);
    const supabase = createClient();
    const data = {
      name: values.name,
      description: values.description || null,
      department_id: values.department_id,
      leader_id: values.leader_id || null,
      meeting_day: values.meeting_day || null,
      meeting_time: values.meeting_time || null,
      location: values.location || null,
      status: values.status,
      display_order: values.display_order,
    };

    if (mode === 'create') {
      const { data: result, error } = await supabase.from('ministries').insert(data).select('id').single();
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Ministry created.' });
      router.push(`/admin/ministries/${result.id}`);
      router.refresh();
    } else if (mode === 'edit' && ministryId) {
      const { error } = await supabase.from('ministries').update(data).eq('id', ministryId);
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Ministry updated.' });
      router.push(`/admin/ministries/${ministryId}`);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={mode === 'edit' ? `/admin/ministries/${ministryId}` : '/admin/ministries'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ministry Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Youth, Children, Men, Women..." />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Department *</Label>
            <Select
              value={departmentId ?? ''}
              onValueChange={(v) => setValue('department_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department_id && <p className="text-xs text-destructive">{errors.department_id.message}</p>}
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
            <Input id="meeting_time" {...register('meeting_time')} placeholder="e.g. 6:30 PM" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register('location')} placeholder="e.g. Main Hall" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v as 'active' | 'inactive')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : mode === 'create' ? 'Create Ministry' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
