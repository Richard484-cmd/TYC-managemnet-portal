import { createClient } from '@/lib/supabase/server';
import type { TimelineItem, TimelineResult } from './activity-constants';

export async function fetchContactTimeline(
  contactId: string,
  limit = 25,
  offset = 0
): Promise<TimelineResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_contact_timeline', {
    p_contact_id: contactId,
    p_limit: limit + 1,
    p_offset: offset,
  });

  if (error) {
    console.error('Timeline RPC error:', error.message);
    return { items: [], hasMore: false };
  }

  const allItems = (data as TimelineItem[]) ?? [];
  const hasMore = allItems.length > limit;
  const items = hasMore ? allItems.slice(0, limit) : allItems;

  return { items, hasMore };
}
