import { requireStaff } from '@/lib/auth/session';
import { adminNavItems, filterNavByRoles } from '@/lib/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { VisitorForm } from '@/components/admin/visitors/visitor-form';
import { notFound } from 'next/navigation';
import type { VisitorFormValues } from '@/lib/visitors/schema';

export const dynamic = 'force-dynamic';

export default async function EditVisitorPage({
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
      id, first_name, last_name, email, phone, source, assigned_to, notes,
      address_line1, address_line2, city, state_province, postal_code, country
    `)
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !visitor) {
    notFound();
  }

  const { data: officers } = await supabase
    .from('users')
    .select('id, display_name, first_name, last_name')
    .order('display_name', { ascending: true });

  const followUpOfficers = (officers ?? []).map((o: any) => ({
    id: o.id,
    name: o.display_name || `${o.first_name} ${o.last_name}`,
  }));

  const defaultValues: Partial<VisitorFormValues> = {
    first_name: visitor.first_name,
    last_name: visitor.last_name,
    email: visitor.email ?? '',
    phone: visitor.phone ?? '',
    source: visitor.source as VisitorFormValues['source'],
    assigned_to: visitor.assigned_to ?? '',
    notes: visitor.notes ?? '',
    address_line1: visitor.address_line1 ?? '',
    address_line2: visitor.address_line2 ?? '',
    city: visitor.city ?? '',
    state_province: visitor.state_province ?? '',
    postal_code: visitor.postal_code ?? '',
    country: visitor.country ?? '',
  };

  return (
    <AppShell items={navItems} label="Admin Panel" user={user} isAdmin>
      <div className="space-y-6">
        <PageHeader
          title="Edit Visitor"
          description={`${visitor.first_name} ${visitor.last_name}`}
        />
        <VisitorForm
          mode="edit"
          visitorId={params.id}
          defaultValues={defaultValues}
          followUpOfficers={followUpOfficers}
        />
      </div>
    </AppShell>
  );
}
