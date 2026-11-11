export const VISITOR_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'event', label: 'Event' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'member_invitation', label: 'Member Invitation' },
  { value: 'other', label: 'Other' },
] as const;

export function getSourceLabel(key: string): string {
  return VISITOR_SOURCES.find((s) => s.value === key)?.label ?? key;
}

export const DEFAULT_LIFECYCLE_STAGES = [
  { stage_key: 'new_visitor', name: 'New Visitor', sort_order: 1, description: 'A first-time visitor who has just been registered' },
  { stage_key: 'first_followup', name: 'First Follow-up', sort_order: 2, description: 'Initial follow-up contact is being made' },
  { stage_key: 'contacted', name: 'Contacted', sort_order: 3, description: 'Visitor has been successfully contacted' },
  { stage_key: 'second_visit', name: 'Second Visit', sort_order: 4, description: 'Visitor has attended a second time' },
  { stage_key: 'membership_class', name: 'Membership Class', sort_order: 5, description: 'Visitor is attending membership classes' },
  { stage_key: 'new_member', name: 'New Member', sort_order: 6, description: 'Visitor has been converted to a member' },
] as const;

export const DEFAULT_VISITOR_STATUSES = [
  { status_key: 'active', name: 'Active', sort_order: 1, description: 'Visitor is actively being followed up' },
  { status_key: 'converted', name: 'Converted', sort_order: 2, description: 'Visitor has been converted to a member' },
  { status_key: 'dropped_off', name: 'Dropped Off', sort_order: 3, description: 'Visitor has stopped responding to follow-up' },
  { status_key: 'archived', name: 'Archived', sort_order: 4, description: 'Visitor record has been archived' },
] as const;

export function getVisitorStatusLabel(key: string): string {
  return DEFAULT_VISITOR_STATUSES.find((s) => s.status_key === key)?.name ?? key;
}

export function getVisitorStatusColor(key: string): string {
  switch (key) {
    case 'active': return 'bg-blue-100 text-blue-700';
    case 'converted': return 'bg-green-100 text-green-700';
    case 'dropped_off': return 'bg-amber-100 text-amber-700';
    case 'archived': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getLifecycleLabel(key: string): string {
  return DEFAULT_LIFECYCLE_STAGES.find((s) => s.stage_key === key)?.name ?? key;
}

export const PAGE_SIZE = 10;
