export interface PrayerCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PrayerRequest {
  id: string;
  title: string;
  body: string;
  submitted_by: string | null;
  member_id: string | null;
  visibility: 'public' | 'members_only' | 'pastoral_only' | 'private';
  status: string;
  is_anonymous: boolean;
  category: string | null;
  prayer_count: number;
  answered_at: string | null;
  answered_description: string | null;
  tags: string[] | null;
  assigned_to: string | null;
  assigned_at: string | null;
  follow_up_date: string | null;
  closed_at: string | null;
  closed_by: string | null;
  pastoral_notes_summary: string | null;
  member_update: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  submitted_by_name?: string | null;
  assigned_to_name?: string | null;
}

export interface PrayerStatusHistory {
  id: string;
  prayer_request_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  changed_by_name?: string | null;
}

export interface PrayerPastoralNote {
  id: string;
  prayer_request_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author_name?: string | null;
}

export interface PrayerMemberUpdate {
  id: string;
  prayer_request_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  author_name?: string | null;
}

export interface PrayerDashboardStats {
  newCount: number;
  assignedCount: number;
  prayingCount: number;
  followUpRequiredCount: number;
  answeredCount: number;
  closedCount: number;
  assignedToMe: number;
  followUpsDue: number;
  overdueFollowUps: number;
}
