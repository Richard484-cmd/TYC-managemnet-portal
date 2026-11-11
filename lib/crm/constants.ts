export const CRM_PRIORITIES = [
  { key: 'low', label: 'Low', color: '#6b7280', badge: 'bg-gray-100 text-gray-700' },
  { key: 'medium', label: 'Medium', color: '#3b82f6', badge: 'bg-blue-100 text-blue-700' },
  { key: 'high', label: 'High', color: '#f59e0b', badge: 'bg-amber-100 text-amber-700' },
  { key: 'urgent', label: 'Urgent', color: '#ef4444', badge: 'bg-red-100 text-red-700' },
] as const;

export const FOLLOW_UP_TYPES = [
  { key: 'general', label: 'General Follow-Up' },
  { key: 'first_time_visitor', label: 'First-Time Visitor' },
  { key: 'second_visit', label: 'Second Visit' },
  { key: 'membership', label: 'Membership' },
  { key: 'pastoral', label: 'Pastoral' },
  { key: 'event', label: 'Event' },
  { key: 'other', label: 'Other' },
] as const;

export const FOLLOW_UP_OUTCOMES = [
  { key: 'contacted_successfully', label: 'Contacted successfully' },
  { key: 'no_response', label: 'No response' },
  { key: 'requested_callback', label: 'Requested callback' },
  { key: 'interested_in_membership', label: 'Interested in membership' },
  { key: 'attended_second_service', label: 'Attended second service' },
  { key: 'joined_membership_class', label: 'Joined membership class' },
  { key: 'became_member', label: 'Became member' },
  { key: 'other', label: 'Other' },
] as const;

export const ACTIVITY_TYPES = [
  { key: 'phone_call', label: 'Phone Call', icon: 'Phone' },
  { key: 'sms', label: 'SMS', icon: 'MessageSquare' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { key: 'email', label: 'Email', icon: 'Mail' },
  { key: 'in_person', label: 'In-Person', icon: 'Users' },
  { key: 'note', label: 'Note', icon: 'StickyNote' },
] as const;

export const TASK_STATUSES = [
  { key: 'pending', label: 'Pending', badge: 'bg-gray-100 text-gray-700' },
  { key: 'in_progress', label: 'In Progress', badge: 'bg-blue-100 text-blue-700' },
  { key: 'completed', label: 'Completed', badge: 'bg-green-100 text-green-700' },
  { key: 'cancelled', label: 'Cancelled', badge: 'bg-gray-100 text-gray-500' },
] as const;

export const CONTACT_SOURCES = [
  { key: 'website', label: 'Website' },
  { key: 'event', label: 'Event' },
  { key: 'referral', label: 'Referral' },
  { key: 'social_media', label: 'Social Media' },
  { key: 'walk_in', label: 'Walk-In' },
  { key: 'other', label: 'Other' },
] as const;

export const DEFAULT_PIPELINE_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export function getPriorityLabel(key: string): string {
  return CRM_PRIORITIES.find((p) => p.key === key)?.label ?? key;
}

export function getPriorityColor(key: string): string {
  return CRM_PRIORITIES.find((p) => p.key === key)?.color ?? '#6b7280';
}

export function getPriorityBadge(key: string): string {
  return CRM_PRIORITIES.find((p) => p.key === key)?.badge ?? 'bg-gray-100 text-gray-700';
}

export function getFollowUpTypeLabel(key: string): string {
  return FOLLOW_UP_TYPES.find((t) => t.key === key)?.label ?? key;
}

export function getOutcomeLabel(key: string): string {
  return FOLLOW_UP_OUTCOMES.find((o) => o.key === key)?.label ?? key;
}

export function getActivityTypeLabel(key: string): string {
  return ACTIVITY_TYPES.find((a) => a.key === key)?.label ?? key;
}

export function getActivityTypeIcon(key: string): string {
  return ACTIVITY_TYPES.find((a) => a.key === key)?.icon ?? 'StickyNote';
}

export function getTaskStatusLabel(key: string): string {
  return TASK_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function getTaskStatusBadge(key: string): string {
  return TASK_STATUSES.find((s) => s.key === key)?.badge ?? 'bg-gray-100 text-gray-700';
}

export function isTaskOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function isFollowUpOverdue(nextDate: string | null): boolean {
  if (!nextDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function isFollowUpDueToday(nextDate: string | null): boolean {
  if (!nextDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}
