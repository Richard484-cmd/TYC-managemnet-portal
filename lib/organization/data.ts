import { createClient } from '@/lib/supabase/server';
import type { LeaderOption } from '@/lib/organization/schema';

export async function getLeaderOptions(): Promise<LeaderOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('users')
    .select('id, display_name, first_name, last_name')
    .eq('status', 'active')
    .order('display_name', { ascending: true })
    .limit(100);
  return (data ?? []).map((u) => ({
    id: u.id,
    display_name: u.display_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.id,
  }));
}
