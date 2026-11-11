'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Download, Search, UserPlus, CheckCircle2, XCircle, Clock3, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/browser';
import {
  ATTENDANCE_STATUSES,
  getEventTypeLabel,
  getEventStatusLabel,
  getEventStatusColor,
  getAttendanceStatusLabel,
  getAttendanceStatusColor,
} from '@/lib/attendance/constants';
import type { AttendanceEventDetail, AttendanceRecordWithMember } from '@/lib/attendance/schema';

interface AttendanceRecordingClientProps {
  event: AttendanceEventDetail;
  initialRecords: AttendanceRecordWithMember[];
}

interface MemberSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status_key: string | null;
}

export function AttendanceRecordingClient({
  event,
  initialRecords,
}: AttendanceRecordingClientProps) {
  const supabase = createClient();
  const [records, setRecords] = useState(initialRecords);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const presentCount = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const attendanceRate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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

  const formatCheckIn = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      return new Date(timeStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, phone, status_key')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(10);

    if (error) {
      toast.error('Search failed. Please try again.');
      setSearching(false);
      return;
    }

    setSearchResults((data ?? []) as MemberSearchResult[]);
    setShowResults(true);
    setSearching(false);
  }, [supabase]);

  const addMember = async (member: MemberSearchResult) => {
    const existing = records.find((r) => r.member_id === member.id);
    if (existing) {
      toast.error('This member is already on the attendance list');
      return;
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        attendance_event_id: event.id,
        member_id: member.id,
        status: 'present',
        check_in_time: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (error) {
      toast.error('Failed to add member. Please try again.');
      return;
    }

    setRecords((prev) => [
      ...prev,
      {
        id: data?.id ?? '',
        member_id: member.id,
        status: 'present',
        notes: null,
        check_in_time: new Date().toISOString(),
        recorded_by: null,
        member_first_name: member.first_name,
        member_last_name: member.last_name,
        member_email: member.email,
        member_phone: member.phone,
        member_status_key: member.status_key,
      },
    ]);

    toast.success(`${member.first_name} ${member.last_name} marked present`);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const updateStatus = async (recordId: string, memberId: string, newStatus: string) => {
    const { error } = await supabase
      .from('attendance_records')
      .update({
        status: newStatus,
        check_in_time: newStatus === 'present' || newStatus === 'late' ? new Date().toISOString() : null,
      })
      .eq('id', recordId);

    if (error) {
      toast.error('Failed to update. Please try again.');
      return;
    }

    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: newStatus,
              check_in_time: newStatus === 'present' || newStatus === 'late' ? new Date().toISOString() : null,
            }
          : r
      )
    );
  };

  const removeRecord = async (recordId: string) => {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      toast.error('Failed to remove. Please try again.');
      return;
    }

    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    toast.success('Record removed');
  };

  const markAllPresent = async () => {
    const absentRecords = records.filter((r) => r.status === 'absent');
    for (const r of absentRecords) {
      await updateStatus(r.id, r.member_id, 'present');
    }
    if (absentRecords.length === 0) {
      toast.info('All recorded members are already present or late');
    } else {
      toast.success(`${absentRecords.length} member(s) marked present`);
    }
  };

  const handleExport = () => {
    const headers = ['Member', 'Email', 'Phone', 'Status', 'Check-in Time', 'Notes'];
    const rows = records.map((r) => [
      `${r.member_first_name} ${r.member_last_name}`,
      r.member_email ?? '',
      r.member_phone ?? '',
      getAttendanceStatusLabel(r.status),
      r.check_in_time ? new Date(r.check_in_time).toLocaleString() : '',
      r.notes ?? '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${event.title.replace(/\s+/g, '-')}-${event.event_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance exported');
  };

  const statusIcons: Record<string, React.ReactNode> = {
    present: <CheckCircle2 className="h-3.5 w-3.5" />,
    absent: <XCircle className="h-3.5 w-3.5" />,
    late: <Clock3 className="h-3.5 w-3.5" />,
    excused: <FileEdit className="h-3.5 w-3.5" />,
    visitor: <UserPlus className="h-3.5 w-3.5" />,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="mt-1 font-semibold text-[#0b2340]">{formatDate(event.event_date)}</p>
            {formatTime(event.start_time) && (
              <p className="text-sm text-muted-foreground">{formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="mt-1 font-semibold text-[#0b2340]">{getEventTypeLabel(event.event_type)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Status</p>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getEventStatusColor(event.status)}`}>
              {getEventStatusLabel(event.status)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Attendance Rate</p>
            <div className="mt-1 space-y-1.5">
              <p className="font-semibold text-[#0b2340]">{attendanceRate}%</p>
              <Progress value={attendanceRate} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{presentCount} of {records.length} present</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record attendance</CardTitle>
          <CardDescription>Search and add members, then mark their status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <SearchInput
              placeholder="Search members by name or email..."
              value={searchQuery}
              onChange={(v) => handleSearch(v)}
              className="w-full"
            />
            {searching && (
              <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
            )}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 mt-2 w-full rounded-md border bg-background shadow-lg">
                {searchResults.map((m) => {
                  const alreadyAdded = records.some((r) => r.member_id === m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addMember(m)}
                      className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm transition-colors last:border-0 ${
                        alreadyAdded ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {m.first_name[0]}{m.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{m.first_name} {m.last_name}</p>
                        <p className="text-xs text-muted-foreground">{m.email ?? 'No email'}</p>
                      </div>
                      {alreadyAdded ? (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <UserPlus className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {showResults && searchResults.length === 0 && !searching && (
              <div className="absolute z-50 mt-2 w-full rounded-md border bg-background p-4 text-center text-sm text-muted-foreground shadow-lg">
                No members found. Try a different search.
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark all present
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={records.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {records.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No attendance recorded yet"
              description="Search for members above to add them to this service."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="hidden md:table-cell">Check-in</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {r.member_first_name[0]}{r.member_last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{r.member_first_name} {r.member_last_name}</p>
                            <p className="text-xs text-muted-foreground">{r.member_email ?? 'No email'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatCheckIn(r.check_in_time)}
                      </TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, r.member_id, v)}>
                          <SelectTrigger className="h-8 w-32">
                            <span className="flex items-center gap-1.5 text-xs">
                              {statusIcons[r.status]}
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {ATTENDANCE_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className="flex items-center gap-2">
                                  {statusIcons[s.value]}
                                  {s.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRecord(r.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
