export const MEMBER_STATUSES = [
  { key: 'visitor', label: 'Visitor', color: 'bg-blue-100 text-blue-700' },
  { key: 'regular_attender', label: 'New Member', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'member', label: 'Active Member', color: 'bg-green-100 text-green-700' },
  { key: 'worker', label: 'Worker', color: 'bg-cyan-100 text-cyan-700' },
  { key: 'inactive', label: 'Inactive Member', color: 'bg-amber-100 text-amber-700' },
  { key: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-700' },
] as const;

export const MEMBER_STATUS_KEYS = MEMBER_STATUSES.map((s) => s.key);

export function getStatusLabel(key: string): string {
  return MEMBER_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function getStatusColor(key: string): string {
  return MEMBER_STATUSES.find((s) => s.key === key)?.color ?? 'bg-gray-100 text-gray-700';
}

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const DEPARTMENT_ROLES = [
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

export const PAGE_SIZE = 10;
