'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  TIMELINE_CATEGORIES,
  TIMELINE_CATEGORY_LABELS,
  TIMELINE_ICONS,
} from '@/lib/crm/activity-constants';
import type { TimelineItem } from '@/lib/crm/activity-constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Phone, MessageSquare, MessageCircle, Mail, Users, StickyNote,
  ArrowRightLeft, CheckSquare, CheckCircle2, CalendarPlus, CalendarCheck,
  HeartHandshake, RefreshCw, Circle, Loader2,
} from 'lucide-react';

const ICON_MAP: Record<string, typeof Phone> = {
  Phone, MessageSquare, MessageCircle, Mail, Users, StickyNote,
  ArrowRightLeft, CheckSquare, CheckCircle2, CalendarPlus, CalendarCheck,
  HeartHandshake, RefreshCw, Circle,
};

interface ActivityTimelineProps {
  contactId: string;
  initialItems: TimelineItem[];
  initialHasMore: boolean;
  canViewGiving?: boolean;
}

export function ActivityTimeline({
  contactId,
  initialItems,
  initialHasMore,
  canViewGiving,
}: ActivityTimelineProps) {
  const supabase = createClient();
  const [items, setItems] = useState<TimelineItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const visibleCategories = canViewGiving
    ? TIMELINE_CATEGORIES
    : TIMELINE_CATEGORIES.filter((c) => c.key !== 'giving');

  const filteredItems = activeFilter === 'all'
    ? items
    : items.filter((i) => i.activity_type === activeFilter);

  const loadMore = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_contact_timeline', {
      p_contact_id: contactId,
      p_limit: 26,
      p_offset: items.length,
    });
    setLoading(false);

    if (error || !data) {
      return;
    }

    const newItems = data as TimelineItem[];
    const more = newItems.length > 25;
    setItems((prev) => [...prev, ...(more ? newItems.slice(0, 25) : newItems)]);
    setHasMore(more);
  }, [supabase, contactId, items.length]);

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {visibleCategories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveFilter(cat.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeFilter === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filteredItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? 'No activity has been recorded for this contact yet.'
            : 'No activities in this category.'}
        </p>
      ) : (
        <div className="space-y-1">
          {filteredItems.map((item, index) => {
            const iconName = TIMELINE_ICONS[item.activity_type] ?? 'Circle';
            const Icon = ICON_MAP[iconName] ?? Circle;
            const label = TIMELINE_CATEGORY_LABELS[item.activity_type] ?? item.activity_type;

            return (
              <div key={`${item.source_table}-${item.source_id}-${index}`} className="flex gap-3">
                {/* Icon + connector line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {index < filteredItems.length - 1 && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium">{label}</p>
                  {item.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {item.actor_name && <span>By: {item.actor_name}</span>}
                    <span>
                      {new Date(item.occurred_at).toLocaleString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && activeFilter === 'all' && (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load More'
          )}
        </Button>
      )}
    </div>
  );
}
