export const MEETING_CATEGORIES = [
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'bible_study', label: 'Bible study' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'ministry', label: 'Ministry' },
  { value: 'department', label: 'Department' },
  { value: 'church_wide', label: 'Church-wide' },
  { value: 'other', label: 'Other' },
] as const;

export const MEETING_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export function getMeetingCategoryLabel(value: string): string {
  return MEETING_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export function getMeetingStatusLabel(value: string): string {
  return MEETING_STATUSES.find((item) => item.value === value)?.label ?? value;
}
