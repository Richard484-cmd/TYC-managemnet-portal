export const PRAYER_STATUSES = [
  { key: 'new', label: 'New', badgeClass: 'bg-blue-100 text-blue-700', icon: 'Sparkles' },
  { key: 'assigned', label: 'Assigned', badgeClass: 'bg-indigo-100 text-indigo-700', icon: 'UserPlus' },
  { key: 'praying', label: 'Praying', badgeClass: 'bg-purple-100 text-purple-700', icon: 'Heart' },
  { key: 'follow_up_required', label: 'Follow-Up Required', badgeClass: 'bg-amber-100 text-amber-700', icon: 'AlertCircle' },
  { key: 'answered', label: 'Answered', badgeClass: 'bg-green-100 text-green-700', icon: 'CheckCircle2' },
  { key: 'closed', label: 'Closed', badgeClass: 'bg-gray-100 text-gray-600', icon: 'Check' },
  { key: 'open', label: 'Open', badgeClass: 'bg-blue-100 text-blue-700', icon: 'Circle' },
  { key: 'in_progress', label: 'In Progress', badgeClass: 'bg-amber-100 text-amber-700', icon: 'Clock' },
];

export const PRAYER_VISIBILITIES = [
  { key: 'public', label: 'Public', description: 'Visible to everyone, including visitors' },
  { key: 'members_only', label: 'Members Only', description: 'Visible to church members' },
  { key: 'pastoral_only', label: 'Pastoral Only', description: 'Only authorized pastoral staff can see this' },
  { key: 'private', label: 'Private', description: 'Only you and authorized pastoral staff can see this' },
];

export const PRAYER_CATEGORIES = [
  { slug: 'personal', label: 'Personal' },
  { slug: 'family', label: 'Family' },
  { slug: 'health', label: 'Health' },
  { slug: 'finances', label: 'Finances' },
  { slug: 'career', label: 'Career' },
  { slug: 'relationships', label: 'Relationships' },
  { slug: 'spiritual_growth', label: 'Spiritual Growth' },
  { slug: 'academic', label: 'Academic' },
  { slug: 'ministry', label: 'Ministry' },
  { slug: 'thanksgiving', label: 'Thanksgiving' },
  { slug: 'other', label: 'Other' },
];

export function getStatusLabel(status: string): string {
  return PRAYER_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function getStatusBadge(status: string): string {
  return PRAYER_STATUSES.find((s) => s.key === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';
}

export function getCategoryLabel(slug: string): string {
  return PRAYER_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function getVisibilityLabel(vis: string): string {
  return PRAYER_VISIBILITIES.find((v) => v.key === vis)?.label ?? vis;
}

export function isFollowUpOverdue(followUpDate: string | null, status: string): boolean {
  if (!followUpDate) return false;
  if (status === 'answered' || status === 'closed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(followUpDate) < today;
}

export function isFollowUpDueToday(followUpDate: string | null, status: string): boolean {
  if (!followUpDate) return false;
  if (status === 'answered' || status === 'closed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(followUpDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}
