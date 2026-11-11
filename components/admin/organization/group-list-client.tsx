'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar, FilterChip } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { UsersRound, Plus, Users } from 'lucide-react';
import type { GroupListItem } from '@/lib/organization/schema';
import { getUnitStatusLabel, getUnitStatusColor, getGroupTypeLabel, getMeetingDayLabel } from '@/lib/organization/constants';

interface GroupListClientProps {
  items: GroupListItem[];
  canCreate: boolean;
}

export function GroupListClient({ items, canCreate }: GroupListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return items.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search groups..."
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <FilterBar>
            <FilterChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <FilterChip label="Active" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} />
            <FilterChip label="Inactive" active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} />
            <FilterChip label="Full" active={statusFilter === 'full'} onClick={() => setStatusFilter('full')} />
          </FilterBar>
          {canCreate && (
            <Button asChild size="sm">
              <Link href="/admin/groups/new">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Link>
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No groups found"
          description={search ? "Try a different search term." : "Create your first group to get started."}
          action={canCreate && !search ? <Button asChild><Link href="/admin/groups/new"><Plus className="mr-2 h-4 w-4" />New Group</Link></Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <Link key={g.id} href={`/admin/groups/${g.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <UsersRound className="h-5 w-5 text-primary" />
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getUnitStatusColor(g.status)}`}>
                      {getUnitStatusLabel(g.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold">{g.name}</h3>
                  <Badge variant="secondary" className="mt-1">{getGroupTypeLabel(g.group_type)}</Badge>
                  {g.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {g.member_count}{g.max_capacity ? `/${g.max_capacity}` : ''} members
                    </span>
                    {g.meeting_day && <span>{getMeetingDayLabel(g.meeting_day)}{g.meeting_time ? ` ${g.meeting_time}` : ''}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
