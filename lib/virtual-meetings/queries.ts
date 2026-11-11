import { createClient } from '@/lib/supabase/server';
import type { VirtualMeeting } from './types';

export async function fetchUpcomingVirtualMeetings(): Promise<VirtualMeeting[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('virtual_meetings')
    .select('id, title, description, category, organizer_id, scope_type, scope_id, starts_at, ends_at, timezone, recurrence_rule, participant_policy, capacity, status, provider, provider_room_name, created_at')
    .in('status', ['scheduled', 'open', 'in_progress'])
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Virtual meetings fetch failed', error.message);
    return [];
  }
  return (data ?? []) as VirtualMeeting[];
}

export async function fetchVirtualMeeting(id: string): Promise<VirtualMeeting | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('virtual_meetings')
    .select('id, title, description, category, organizer_id, scope_type, scope_id, starts_at, ends_at, timezone, recurrence_rule, participant_policy, capacity, status, provider, provider_room_name, created_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Virtual meeting fetch failed', error.message);
    return null;
  }
  return data as VirtualMeeting | null;
}
