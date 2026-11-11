'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar, FilterChip } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Plus, Users } from 'lucide-react';
import type { DepartmentListItem } from '@/lib/organization/schema';
import { getUnitStatusLabel, getUnitStatusColor } from '@/lib/organization/constants';

interface DepartmentListClientProps {
  items: DepartmentListItem[];
  canCreate: boolean;
}

export function DepartmentListClient({ items, canCreate }: DepartmentListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return items.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search departments..."
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
              <Link href="/admin/departments/new">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Link>
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments found"
          description={search ? "Try a different search term." : "Create your first department to get started."}
          action={canCreate && !search ? <Button asChild><Link href="/admin/departments/new"><Plus className="mr-2 h-4 w-4" />New Department</Link></Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dept) => (
            <Link key={dept.id} href={`/admin/departments/${dept.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getUnitStatusColor(dept.status)}`}>
                      {getUnitStatusLabel(dept.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold">{dept.name}</h3>
                  {dept.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{dept.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {dept.member_count} members
                    </span>
                    {dept.leader_name && (
                      <span className="truncate">Led by {dept.leader_name}</span>
                    )}
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
