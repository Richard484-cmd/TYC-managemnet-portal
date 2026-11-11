'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { memberFormSchema, type MemberFormValues } from '@/lib/members/schema';
import { MEMBER_STATUSES, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from '@/lib/members/constants';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface MemberFormProps {
  mode: 'create' | 'edit';
  memberId?: string;
  defaultValues?: Partial<MemberFormValues>;
  statuses?: { key: string; label: string }[];
}

export function MemberForm({ mode, memberId, defaultValues, statuses }: MemberFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      is_baptized: false,
      is_active: true,
      status_key: 'visitor',
      ...defaultValues,
    },
  });

  const isBaptized = watch('is_baptized');
  const isActive = watch('is_active');
  const statusKey = watch('status_key');
  const gender = watch('gender');
  const maritalStatus = watch('marital_status');

  const onSubmit = async (values: MemberFormValues) => {
    setSaving(true);
    const supabase = createClient();

    const memberData = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email || null,
      phone: values.phone || null,
      date_of_birth: values.date_of_birth || null,
      gender: values.gender || null,
      marital_status: values.marital_status || null,
      occupation: values.occupation || null,
      status_key: values.status_key,
      join_date: values.join_date || null,
      is_baptized: values.is_baptized,
      is_active: values.is_active,
      pastoral_notes: values.pastoral_notes || null,
      profile_image: values.profile_image || null,
    };

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('members')
        .insert(memberData)
        .select('id')
        .single();

      if (error) {
        setSaving(false);
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        return;
      }

      const newId = data.id;

      const profileData = {
        member_id: newId,
        address_line1: values.address_line1 || null,
        address_line2: values.address_line2 || null,
        city: values.city || null,
        state_province: values.state_province || null,
        postal_code: values.postal_code || null,
        country: values.country || null,
        emergency_contact_name: values.emergency_contact_name || null,
        emergency_contact_phone: values.emergency_contact_phone || null,
        emergency_contact_relation: values.emergency_contact_relation || null,
        baptism_date: values.baptism_date || null,
        spiritual_background: values.spiritual_background || null,
        conversion_story: values.conversion_story || null,
        previous_church: values.previous_church || null,
      };

      await supabase.from('member_profiles').insert(profileData);

      toast({ title: 'Success', description: 'Member created successfully' });
      router.push(`/admin/members/${newId}`);
      router.refresh();
    } else if (mode === 'edit' && memberId) {
      const { error: memberError } = await supabase
        .from('members')
        .update(memberData)
        .eq('id', memberId);

      if (memberError) {
        setSaving(false);
        toast({ title: 'Error', description: memberError.message, variant: 'destructive' });
        return;
      }

      const profileData = {
        address_line1: values.address_line1 || null,
        address_line2: values.address_line2 || null,
        city: values.city || null,
        state_province: values.state_province || null,
        postal_code: values.postal_code || null,
        country: values.country || null,
        emergency_contact_name: values.emergency_contact_name || null,
        emergency_contact_phone: values.emergency_contact_phone || null,
        emergency_contact_relation: values.emergency_contact_relation || null,
        baptism_date: values.baptism_date || null,
        spiritual_background: values.spiritual_background || null,
        conversion_story: values.conversion_story || null,
        previous_church: values.previous_church || null,
      };

      await supabase
        .from('member_profiles')
        .upsert({ member_id: memberId, ...profileData }, { onConflict: 'member_id' });

      toast({ title: 'Success', description: 'Member updated successfully' });
      router.push(`/admin/members/${memberId}`);
      router.refresh();
    }

    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={mode === 'edit' ? `/admin/members/${memberId}` : '/admin/members'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Basic details about this member</CardDescription>
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
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input id="occupation" {...register('occupation')} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={gender ?? ''}
              onValueChange={(v) => setValue('gender', v as MemberFormValues['gender'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Marital Status</Label>
            <Select
              value={maritalStatus ?? ''}
              onValueChange={(v) => setValue('marital_status', v as MemberFormValues['marital_status'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership Information</CardTitle>
          <CardDescription>Church membership and baptism details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select
              value={statusKey}
              onValueChange={(v) => setValue('status_key', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {(statuses ?? MEMBER_STATUSES.map((s) => ({ key: s.key, label: s.label }))).map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status_key && <p className="text-xs text-destructive">{errors.status_key.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="join_date">Join Date</Label>
            <Input id="join_date" type="date" {...register('join_date')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baptism_date">Baptism Date</Label>
            <Input id="baptism_date" type="date" {...register('baptism_date')} />
          </div>
          <div className="flex items-center gap-6 pt-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_baptized"
                checked={isBaptized}
                onCheckedChange={(v) => setValue('is_baptized', v === true)}
              />
              <Label htmlFor="is_baptized">Baptized</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(v) => setValue('is_active', v === true)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address & Emergency Contact</CardTitle>
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
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
            <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
            <Input id="emergency_contact_phone" {...register('emergency_contact_phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_relation">Relationship</Label>
            <Input id="emergency_contact_relation" {...register('emergency_contact_relation')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spiritual Background</CardTitle>
          <CardDescription>Optional spiritual and church history details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spiritual_background">Spiritual Background</Label>
            <Textarea id="spiritual_background" rows={2} {...register('spiritual_background')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conversion_story">Conversion Story</Label>
            <Textarea id="conversion_story" rows={3} {...register('conversion_story')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previous_church">Previous Church</Label>
            <Input id="previous_church" {...register('previous_church')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pastoral_notes">Pastoral Notes</Label>
            <Textarea id="pastoral_notes" rows={3} {...register('pastoral_notes')} />
            <p className="text-xs text-muted-foreground">Visible to pastoral staff only</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={mode === 'edit' ? `/admin/members/${memberId}` : '/admin/members'}>
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : mode === 'create' ? 'Create Member' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
