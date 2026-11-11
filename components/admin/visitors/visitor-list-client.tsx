'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  UserPlus,
  Mail,
  Phone,
  ArrowUpDown,
} from 'lucide-react';
import type { VisitorListItem, VisitorListResult } from '@/lib/visitors/schema';
import {
  getSourceLabel,
  getVisitorStatusLabel,
  getVisitorStatusColor,
  getLifecycleLabel,
} from '@/lib/visitors/constants';
import { VISITOR_SOURCES } from '@/lib/visitors/constants';

interface VisitorListClientProps {
  initialData: VisitorListResult;
  statuses: { key: string; label: string }[];
  lifecycleStages: { key: string; label: string }[];
  currentPage: number;
  pageSize: number;
  search: string;
  statusFilter: string;
  sourceFilter: string;
  stageFilter: string;
  sort: string;
  canEdit: boolean;
}

export function VisitorListClient({
  initialData,
  statuses,
  lifecycleStages,
  currentPage,
  pageSize,
  search: initialSearch,
  statusFilter: initialStatus,
  sourceFilter: initialSource,
  stageFilter: initialStage,
  sort: initialSort,
  canEdit,
}: VisitorListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      router.push(`/admin/visitors?${params.toString()}`);
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
    (value: string) => updateParams({ status: value === 'all' ? undefined : value, page: undefined }),
    [updateParams]
  );

  const handleSourceChange = useCallback(
    (value: string) => updateParams({ source: value === 'all' ? undefined : value, page: undefined }),
    [updateParams]
  );

  const handleStageChange = useCallback(
    (value: string) => updateParams({ stage: value === 'all' ? undefined : value, page: undefined }),
    [updateParams]
  );

  const handleSortChange = useCallback(
    (value: string) => updateParams({ sort: value, page: undefined }),
    [updateParams]
  );

  const initials = useMemo(
    () => (v: VisitorListItem) => `${v.first_name[0] ?? ''}${v.last_name[0] ?? ''}`.toUpperCase(),
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

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p === 1) params.delete('page'); else params.set('page', String(p));
    return `/admin/visitors?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
            <SearchInput
              placeholder="Search visitors..."
              value={searchValue}
              onChange={handleSearchChange}
              className="lg:max-w-xs"
            />
            <Select defaultValue={initialStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="lg:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={initialSource} onValueChange={handleSourceChange}>
              <SelectTrigger className="lg:w-40">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {VISITOR_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={initialStage} onValueChange={handleStageChange}>
              <SelectTrigger className="lg:w-44">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {lifecycleStages.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={initialSort} onValueChange={handleSortChange}>
              <SelectTrigger className="lg:w-40">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Newest first</SelectItem>
                <SelectItem value="created_asc">Oldest first</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {initialData.visitors.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No visitors found"
          description="Try adjusting your search or filters, or register a new visitor."
          action={
            canEdit && (
              <Button asChild>
                <Link href="/admin/visitors/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register Visitor
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
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                <TableHead className="hidden lg:table-cell">First Visit</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.visitors.map((visitor) => (
                <TableRow key={visitor.id}>
                  <TableCell>
                    <Link href={`/admin/visitors/${visitor.id}`} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{initials(visitor)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium hover:underline">
                        {visitor.first_name} {visitor.last_name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {visitor.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />{visitor.email}
                        </span>
                      )}
                      {visitor.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />{visitor.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{getSourceLabel(visitor.source)}</TableCell>
                  <TableCell>
                    <span className="text-sm">{getLifecycleLabel(visitor.lifecycle_stage)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getVisitorStatusColor(visitor.status_key)}`}>
                      {getVisitorStatusLabel(visitor.status_key)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {visitor.assigned_to_name ?? '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {visitor.first_visit_date
                      ? new Date(visitor.first_visit_date).toLocaleDateString()
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
                          <Link href={`/admin/visitors/${visitor.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/visitors/${visitor.id}/edit`}>
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
                <PaginationPrevious href={buildPageHref(currentPage - 1)} />
              </PaginationItem>
            )}
            {pageNumbers.map((p) => (
              <PaginationItem key={p}>
                <PaginationLink href={buildPageHref(p)} isActive={p === currentPage}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext href={buildPageHref(currentPage + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
