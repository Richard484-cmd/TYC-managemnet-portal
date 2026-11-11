'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { visitorFormSchema, type VisitorFormValues } from '@/lib/visitors/schema';
import { VISITOR_SOURCES } from '@/lib/visitors/constants';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

interface VisitorFormProps {
  mode: 'create' | 'edit';
  visitorId?: string;
  defaultValues?: Partial<VisitorFormValues>;
  followUpOfficers: { id: string; name: string }[];
}

export function VisitorForm({ mode, visitorId, defaultValues, followUpOfficers }: VisitorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      source: 'walk_in',
      ...defaultValues,
    },
  });

  const source = watch('source');
  const assignedTo = watch('assigned_to');

  const onSubmit = async (values: VisitorFormValues) => {
    setSaving(true);
    const supabase = createClient();

    if (mode === 'create') {
      const { data, error } = await supabase.rpc('register_visitor', {
        p_first_name: values.first_name,
        p_last_name: values.last_name,
        p_email: values.email || null,
        p_phone: values.phone || null,
        p_source: values.source,
        p_assigned_to: values.assigned_to || null,
        p_notes: values.notes || null,
        p_address_line1: values.address_line1 || null,
        p_address_line2: values.address_line2 || null,
        p_city: values.city || null,
        p_state_province: values.state_province || null,
        p_postal_code: values.postal_code || null,
        p_country: values.country || null,
      });

      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'Visitor registered successfully. Follow-up record and task created.' });
      router.push(`/admin/visitors/${data}`);
      router.refresh();
    } else if (mode === 'edit' && visitorId) {
      const { error } = await supabase
        .from('visitors')
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email || null,
          phone: values.phone || null,
          source: values.source,
          assigned_to: values.assigned_to || null,
          notes: values.notes || null,
          address_line1: values.address_line1 || null,
          address_line2: values.address_line2 || null,
          city: values.city || null,
          state_province: values.state_province || null,
          postal_code: values.postal_code || null,
          country: values.country || null,
        })
        .eq('id', visitorId);

      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'Visitor updated successfully' });
      router.push(`/admin/visitors/${visitorId}`);
      router.refresh();
    }

    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={mode === 'edit' ? `/admin/visitors/${visitorId}` : '/admin/visitors'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visitor Information</CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Register a new visitor. A contact record, follow-up, and task will be created automatically.'
              : 'Edit visitor details'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" {...register('first_name')} />
            {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input id="last_name" {...register('last_name')} />
            {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>
          <div className="space-y-2">
            <Label>Source *</Label>
            <Select
              value={source}
              onValueChange={(v) => setValue('source', v as VisitorFormValues['source'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                {VISITOR_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Follow-up Officer</Label>
            <Select
              value={assignedTo ?? ''}
              onValueChange={(v) => setValue('assigned_to', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {followUpOfficers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input id="address_line1" {...register('address_line1')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input id="address_line2" {...register('address_line2')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('city')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state_province">State / Province</Label>
            <Input id="state_province" {...register('state_province')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input id="postal_code" {...register('postal_code')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register('country')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Visitor Notes</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={mode === 'edit' ? `/admin/visitors/${visitorId}` : '/admin/visitors'}>
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : mode === 'create' ? 'Register Visitor' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
