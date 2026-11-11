export const DEPARTMENT_ROLES = [
  { value: 'leader', label: 'Leader' },
  { value: 'assistant_leader', label: 'Assistant Leader' },
  { value: 'member', label: 'Member' },
  { value: 'volunteer', label: 'Volunteer' },
] as const;

export const MINISTRY_ROLES = [
  { value: 'leader', label: 'Leader' },
  { value: 'assistant_leader', label: 'Assistant Leader' },
  { value: 'member', label: 'Member' },
  { value: 'volunteer', label: 'Volunteer' },
] as const;

export const GROUP_ROLES = [
  { value: 'leader', label: 'Leader' },
  { value: 'assistant_leader', label: 'Assistant Leader' },
  { value: 'member', label: 'Member' },
  { value: 'visitor', label: 'Visitor' },
] as const;

export const GROUP_TYPES = [
  { value: 'cell_group', label: 'Cell Group' },
  { value: 'bible_study', label: 'Bible Study' },
  { value: 'small_group', label: 'Small Group' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'prayer_group', label: 'Prayer Group' },
  { value: 'youth_group', label: 'Youth Group' },
  { value: 'other', label: 'Other' },
] as const;

export const MEETING_DAYS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
] as const;

export const UNIT_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const UNIT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  full: 'bg-amber-100 text-amber-800',
};

export const ENTITY_TYPES = {
  DEPARTMENT: 'department',
  MINISTRY: 'ministry',
  GROUP: 'group',
} as const;

export function getDepartmentRoleLabel(role: string): string {
  return DEPARTMENT_ROLES.find((r) => r.value === role)?.label ?? role.replace(/_/g, ' ');
}

export function getMinistryRoleLabel(role: string): string {
  return MINISTRY_ROLES.find((r) => r.value === role)?.label ?? role.replace(/_/g, ' ');
}

export function getGroupRoleLabel(role: string): string {
  return GROUP_ROLES.find((r) => r.value === role)?.label ?? role.replace(/_/g, ' ');
}

export function getGroupTypeLabel(type: string): string {
  return GROUP_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export function getUnitStatusLabel(status: string): string {
  return UNIT_STATUS.find((s) => s.value === status)?.label ?? status;
}

export function getUnitStatusColor(status: string): string {
  return UNIT_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
}

export function getMeetingDayLabel(day: string | null): string {
  if (!day) return null as unknown as string;
  return MEETING_DAYS.find((d) => d.value === day)?.label ?? day;
}

export const PAGE_SIZE = 10;
