import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { MemberForm } from '@/components/admin/members/member-form';
import { notFound } from 'next/navigation';
import type { MemberFormValues } from '@/lib/members/schema';
import { MEMBER_STATUSES } from '@/lib/members/constants';

export const dynamic = 'force-dynamic';

export default async function EditMemberPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireStaff();
  const navItems = filterNavByRoles(adminNavItems, user.roles);
  const supabase = createClient();

  const { data: member, error } = await supabase
    .from('members')
    .select(`
      id, first_name, last_name, email, phone, date_of_birth, gender,
      marital_status, occupation, status_key, is_baptized, is_active, join_date,
      pastoral_notes, profile_image
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

  const { data: statusRows } = await supabase
    .from('membership_statuses')
    .select('status_key, name, sort_order')
    .order('sort_order', { ascending: true });

  const statuses = (statusRows ?? []).map((s) => ({ key: s.status_key, label: s.name }));
  const fallbackStatuses = MEMBER_STATUSES.map((s) => ({ key: s.key, label: s.label }));

  const defaultValues: Partial<MemberFormValues> = {
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email ?? '',
    phone: member.phone ?? '',
    date_of_birth: member.date_of_birth ?? '',
    gender: (member.gender as MemberFormValues['gender']) ?? '',
    marital_status: (member.marital_status as MemberFormValues['marital_status']) ?? '',
    occupation: member.occupation ?? '',
    status_key: member.status_key,
    join_date: member.join_date ?? '',
    is_baptized: member.is_baptized,
    is_active: member.is_active,
    pastoral_notes: member.pastoral_notes ?? '',
    profile_image: member.profile_image ?? '',
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city: profile?.city ?? '',
    state_province: profile?.state_province ?? '',
    postal_code: profile?.postal_code ?? '',
    country: profile?.country ?? '',
    emergency_contact_name: profile?.emergency_contact_name ?? '',
    emergency_contact_phone: profile?.emergency_contact_phone ?? '',
    emergency_contact_relation: profile?.emergency_contact_relation ?? '',
    baptism_date: profile?.baptism_date ?? '',
    spiritual_background: profile?.spiritual_background ?? '',
    conversion_story: profile?.conversion_story ?? '',
    previous_church: profile?.previous_church ?? '',
  };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Edit Member"
          description={`${member.first_name} ${member.last_name}`}
        />
        <MemberForm mode="edit" memberId={params.id} defaultValues={defaultValues} statuses={statuses.length > 0 ? statuses : fallbackStatuses} />
      </div>
    </AppShell>
  );
}
