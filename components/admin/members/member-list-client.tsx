'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  Users,
  Mail,
  Phone,
  ArrowUpDown,
} from 'lucide-react';
import type { MemberListItem, MemberListResult } from '@/lib/members/schema';
import { getStatusLabel, getStatusColor } from '@/lib/members/constants';

interface MemberListClientProps {
  initialData: MemberListResult;
  statuses: { key: string; label: string }[];
  currentPage: number;
  pageSize: number;
  search: string;
  statusFilter: string;
  sort: string;
  canEdit: boolean;
}

export function MemberListClient({
  initialData,
  statuses,
  currentPage,
  pageSize,
  search: initialSearch,
  statusFilter: initialStatus,
  sort: initialSort,
  canEdit,
}: MemberListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);
  const [searchValue, setSearchValue] = useState(initialSearch);

  const totalPages = Math.max(1, Math.ceil(initialData.total / pageSize));

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`/admin/members?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      updateParams({ search: value || undefined, page: undefined });
    },
    [updateParams]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      updateParams({ status: value === 'all' ? undefined : value, page: undefined });
    },
    [updateParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      updateParams({ sort: value, page: undefined });
    },
    [updateParams]
  );

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === initialData.members.length) return new Set();
      return new Set(initialData.members.map((m) => m.id));
    });
  }, [initialData.members]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkArchive = useCallback(async () => {
    if (selected.size === 0) return;
    setArchiving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('members')
      .update({ is_active: false, status_key: 'inactive' })
      .in('id', Array.from(selected));

    setArchiving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to archive members', variant: 'destructive' });
      return;
    }
    toast({ title: 'Success', description: `${selected.size} member(s) archived` });
    setSelected(new Set());
    router.refresh();
  }, [selected, toast, router]);

  const initials = useMemo(
    () => (m: MemberListItem) => `${m.first_name[0] ?? ''}${m.last_name[0] ?? ''}`.toUpperCase(),
    []
  );

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                placeholder="Search by name or email..."
                value={searchValue}
                onChange={handleSearchChange}
                className="sm:max-w-xs"
              />
              <Select defaultValue={initialStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select defaultValue={initialSort} onValueChange={handleSortChange}>
                <SelectTrigger className="sm:w-44">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="created_desc">Newest first</SelectItem>
                  <SelectItem value="created_asc">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selected.size > 0 && canEdit && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selected.size} selected</span>
                <Button variant="outline" size="sm" onClick={handleBulkArchive} disabled={archiving}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Selected
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {initialData.members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members found"
          description="Try adjusting your search or filters, or add a new member."
          action={
            canEdit && (
              <Button asChild>
                <Link href="/admin/members/new">
                  <Users className="mr-2 h-4 w-4" />
                  Add Member
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.size === initialData.members.length && initialData.members.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Baptized</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(member.id)}
                      onCheckedChange={() => toggleSelect(member.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/members/${member.id}`} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {initials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium hover:underline">
                          {member.first_name} {member.last_name}
                        </span>
                        {!member.is_active && (
                          <span className="text-xs text-muted-foreground">Inactive</span>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {member.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                      )}
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(member.status_key)}`}>
                      {getStatusLabel(member.status_key)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {member.is_baptized ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {member.join_date
                      ? new Date(member.join_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/members/${member.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/members/${member.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  href={`/admin/members?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(currentPage - 1) }).toString()}`}
                />
              </PaginationItem>
            )}
            {pageNumbers.map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href={`/admin/members?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(p) }).toString()}`}
                  isActive={p === currentPage}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext
                  href={`/admin/members?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(currentPage + 1) }).toString()}`}
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
