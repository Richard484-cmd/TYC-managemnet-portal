'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar, FilterChip } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Church, Plus, Users } from 'lucide-react';
import type { MinistryListItem } from '@/lib/organization/schema';
import { getUnitStatusLabel, getUnitStatusColor, getMeetingDayLabel } from '@/lib/organization/constants';

interface MinistryListClientProps {
  items: MinistryListItem[];
  canCreate: boolean;
}

export function MinistryListClient({ items, canCreate }: MinistryListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return items.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        m.department_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search ministries..."
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <FilterBar>
            <FilterChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <FilterChip label="Active" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} />
            <FilterChip label="Inactive" active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} />
          </FilterBar>
          {canCreate && (
            <Button asChild size="sm">
              <Link href="/admin/ministries/new">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Link>
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Church}
          title="No ministries found"
          description={search ? "Try a different search term." : "Create your first ministry to get started."}
          action={canCreate && !search ? <Button asChild><Link href="/admin/ministries/new"><Plus className="mr-2 h-4 w-4" />New Ministry</Link></Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} href={`/admin/ministries/${m.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Church className="h-5 w-5 text-primary" />
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getUnitStatusColor(m.status)}`}>
                      {getUnitStatusLabel(m.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold">{m.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.department_name}</p>
                  {m.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {m.member_count} members
                    </span>
                    {m.meeting_day && <span>{getMeetingDayLabel(m.meeting_day)}{m.meeting_time ? ` ${m.meeting_time}` : ''}</span>}
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
