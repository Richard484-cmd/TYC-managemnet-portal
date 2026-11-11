'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/browser';
import { EVENT_TYPES } from '@/lib/attendance/constants';

interface AttendanceEventFormProps {
  mode: 'create' | 'edit';
  event?: {
    id: string;
    title: string;
    event_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    department_id: string | null;
    group_id: string | null;
    location: string | null;
    notes: string | null;
    status: string;
  };
  departments: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}

export function AttendanceEventForm({
  mode,
  event,
  departments,
  groups,
}: AttendanceEventFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(event?.title ?? '');
  const [eventType, setEventType] = useState(event?.event_type ?? 'service');
  const [eventDate, setEventDate] = useState(event?.event_date ?? '');
  const [startTime, setStartTime] = useState(event?.start_time ?? '');
  const [endTime, setEndTime] = useState(event?.end_time ?? '');
  const [scope, setScope] = useState<'church' | 'department' | 'group'>(
    event?.department_id ? 'department' : event?.group_id ? 'group' : 'church'
  );
  const [departmentId, setDepartmentId] = useState(event?.department_id ?? '');
  const [groupId, setGroupId] = useState(event?.group_id ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [status, setStatus] = useState(event?.status ?? 'scheduled');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      toast.error('Title and date are required');
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      event_type: eventType,
      event_date: eventDate,
      start_time: startTime || null,
      end_time: endTime || null,
      department_id: scope === 'department' && departmentId ? departmentId : null,
      group_id: scope === 'group' && groupId ? groupId : null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      status,
    };

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('attendance_events')
        .insert(payload)
        .select('id')
        .maybeSingle();

      if (error) {
        toast.error('Failed to create service. Please try again.');
        setSaving(false);
        return;
      }

      toast.success('Service created successfully');
      router.push(`/admin/attendance/${data?.id}`);
    } else if (event) {
      const { error } = await supabase
        .from('attendance_events')
        .update(payload)
        .eq('id', event.id);

      if (error) {
        toast.error('Failed to update service. Please try again.');
        setSaving(false);
        return;
      }

      toast.success('Service updated successfully');
      router.push(`/admin/attendance/${event.id}`);
      router.refresh();
    }

    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sunday Worship Service"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start time</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End time</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Main Sanctuary"
            />
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as 'church' | 'department' | 'group')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="church">Church-wide</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'department' && (
            <div className="space-y-2">
              <Label htmlFor="dept">Department *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="group">Group *</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="group">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this service"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Create service' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
