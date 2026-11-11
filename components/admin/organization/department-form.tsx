'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { departmentFormSchema, type DepartmentFormValues } from '@/lib/organization/schema';
import { UNIT_STATUS } from '@/lib/organization/constants';
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

interface DepartmentFormProps {
  mode: 'create' | 'edit';
  departmentId?: string;
  defaultValues?: Partial<DepartmentFormValues>;
  leaders: LeaderOption[];
}

export function DepartmentForm({ mode, departmentId, defaultValues, leaders }: DepartmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: '',
      description: '',
      leader_id: null,
      status: 'active',
      display_order: 0,
      ...defaultValues,
    },
  });

  const status = watch('status');
  const leaderId = watch('leader_id');

  const onSubmit = async (values: DepartmentFormValues) => {
    setSaving(true);
    const supabase = createClient();
    const data = {
      name: values.name,
      description: values.description || null,
      leader_id: values.leader_id || null,
      status: values.status,
      display_order: values.display_order,
    };

    if (mode === 'create') {
      const { data: result, error } = await supabase.from('departments').insert(data).select('id').single();
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Department created.' });
      router.push(`/admin/departments/${result.id}`);
      router.refresh();
    } else if (mode === 'edit' && departmentId) {
      const { error } = await supabase.from('departments').update(data).eq('id', departmentId);
      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Department updated.' });
      router.push(`/admin/departments/${departmentId}`);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={mode === 'edit' ? `/admin/departments/${departmentId}` : '/admin/departments'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Media, Choir, Ushering..." />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} placeholder="What does this department do?" />
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
          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input id="display_order" type="number" {...register('display_order', { valueAsNumber: true })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : mode === 'create' ? 'Create Department' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
