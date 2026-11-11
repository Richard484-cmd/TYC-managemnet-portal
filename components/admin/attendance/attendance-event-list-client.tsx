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
import { Progress } from '@/components/ui/progress';
import { CalendarPlus, ArrowUpDown, MapPin, Clock, ChevronRight } from 'lucide-react';
import type { AttendanceEventListResult, AttendanceEventListItem } from '@/lib/attendance/schema';
import {
  getEventTypeLabel,
  getEventStatusLabel,
  getEventStatusColor,
} from '@/lib/attendance/constants';

interface AttendanceEventListClientProps {
  initialData: AttendanceEventListResult;
  eventTypes: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  currentPage: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  statusFilter: string;
  sort: string;
}

export function AttendanceEventListClient({
  initialData,
  eventTypes,
  statuses,
  currentPage,
  pageSize,
  search: initialSearch,
  typeFilter: initialType,
  statusFilter: initialStatus,
  sort: initialSort,
}: AttendanceEventListClientProps) {
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
      router.push(`/admin/attendance?${params.toString()}`);
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

  const handleTypeChange = useCallback(
    (value: string) => updateParams({ type: value === 'all' ? undefined : value, page: undefined }),
    [updateParams]
  );

  const handleStatusChange = useCallback(
    (value: string) => updateParams({ status: value === 'all' ? undefined : value, page: undefined }),
    [updateParams]
  );

  const handleSortChange = useCallback(
    (value: string) => updateParams({ sort: value, page: undefined }),
    [updateParams]
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
    if (p === 1) params.delete('page');
    else params.set('page', String(p));
    return `/admin/attendance?${params.toString()}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${m} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
            <SearchInput
              placeholder="Search services..."
              value={searchValue}
              onChange={handleSearchChange}
              className="lg:max-w-xs"
            />
            <Select defaultValue={initialType} onValueChange={handleTypeChange}>
              <SelectTrigger className="lg:w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {eventTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={initialStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="lg:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={initialSort} onValueChange={handleSortChange}>
              <SelectTrigger className="lg:w-40">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest date</SelectItem>
                <SelectItem value="date_asc">Oldest date</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {initialData.events.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No services found"
          description="Create your first attendance service to start tracking attendance."
          action={
            <Button asChild>
              <Link href="/admin/attendance/new">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Service
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden lg:table-cell">Scope</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.events.map((event) => {
            const rate = event.record_count > 0 ? Math.round((event.present_count / event.record_count) * 100) : 0;
            const scope = event.department_name ?? event.group_name ?? 'Church-wide';
            return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Link href={`/admin/attendance/${event.id}`} className="font-medium hover:underline">
                        {event.title}
                      </Link>
                      {event.location && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{event.location}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <div>{formatDate(event.event_date)}</div>
                      {formatTime(event.start_time) && (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />{formatTime(event.start_time)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{getEventTypeLabel(event.event_type)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{scope}</TableCell>
                    <TableCell>
                      <div className="w-28 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{event.present_count}/{event.record_count}</span>
                          <span className="font-medium">{rate}%</span>
                        </div>
                        <Progress value={rate} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getEventStatusColor(event.status)}`}>
                        {getEventStatusLabel(event.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/attendance/${event.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationPrevious href={buildPageHref(currentPage - 1)} />
            )}
            {pageNumbers.map((p) => (
              <PaginationItem key={p}>
                <PaginationLink href={buildPageHref(p)} isActive={p === currentPage}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            {currentPage < totalPages && (
              <PaginationNext href={buildPageHref(currentPage + 1)} />
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
