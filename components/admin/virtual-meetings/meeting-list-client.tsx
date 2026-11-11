'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar, FilterChip } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Video, Plus, Calendar, Users } from 'lucide-react';
import type { MeetingListItem } from '@/lib/virtual-meetings/schema';
import { getMeetingCategoryLabel, getMeetingStatusLabel } from '@/lib/virtual-meetings/constants';

interface MeetingListClientProps {
  items: MeetingListItem[];
  canCreate: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  open: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

export function MeetingListClient({ items, canCreate }: MeetingListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return items.filter((m) => {
      const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search meetings..." className="sm:max-w-xs" />
        <div className="flex items-center gap-2">
          <FilterBar>
            <FilterChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <FilterChip label="Scheduled" active={statusFilter === 'scheduled'} onClick={() => setStatusFilter('scheduled')} />
            <FilterChip label="Open" active={statusFilter === 'open'} onClick={() => setStatusFilter('open')} />
            <FilterChip label="Completed" active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} />
            <FilterChip label="Cancelled" active={statusFilter === 'cancelled'} onClick={() => setStatusFilter('cancelled')} />
          </FilterBar>
          {canCreate && (
            <Button asChild size="sm">
              <Link href="/admin/virtual-meetings/new">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Link>
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings found"
          description={search ? 'Try a different search term.' : 'Schedule your first virtual meeting to get started.'}
          action={canCreate && !search ? <Button asChild><Link href="/admin/virtual-meetings/new"><Plus className="mr-2 h-4 w-4" />New Meeting</Link></Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} href={`/admin/virtual-meetings/${m.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {getMeetingStatusLabel(m.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold">{m.title}</h3>
                  <Badge variant="secondary" className="mt-1">{getMeetingCategoryLabel(m.category)}</Badge>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(m.starts_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {m.participant_count} registered
                    </span>
                  </div>
                  {m.scope_name && <p className="mt-2 text-xs text-muted-foreground">{m.scope_name}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
