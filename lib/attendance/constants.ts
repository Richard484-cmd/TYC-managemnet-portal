export const EVENT_TYPES = [
  { value: 'service', label: 'Sunday Service' },
  { value: 'group_meeting', label: 'Group Meeting' },
  { value: 'ministry_meeting', label: 'Department Meeting' },
  { value: 'special', label: 'Special Event' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'other', label: 'Other' },
] as const;

export const EVENT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
] as const;

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700' },
  { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700' },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700' },
  { value: 'visitor', label: 'Visitor', color: 'bg-purple-100 text-purple-700' },
] as const;

export function getEventTypeLabel(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function getEventStatusLabel(value: string): string {
  return EVENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function getEventStatusColor(value: string): string {
  return EVENT_STATUSES.find((s) => s.value === value)?.color ?? 'bg-gray-100 text-gray-700';
}

export function getAttendanceStatusLabel(value: string): string {
  return ATTENDANCE_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function getAttendanceStatusColor(value: string): string {
  return ATTENDANCE_STATUSES.find((s) => s.value === value)?.color ?? 'bg-gray-100 text-gray-700';
}

export const PAGE_SIZE = 10;
