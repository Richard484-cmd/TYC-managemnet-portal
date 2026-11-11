export interface TimelineItem {
  activity_type: string;
  description: string;
  actor_id: string | null;
  actor_name: string | null;
  occurred_at: string;
  source_table: string;
  source_id: string;
}

export interface TimelineResult {
  items: TimelineItem[];
  hasMore: boolean;
}

export const TIMELINE_CATEGORY_LABELS: Record<string, string> = {
  phone_call: 'Phone Call',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
  in_person: 'In-Person',
  note: 'Note',
  stage_change: 'Stage Change',
  task_created: 'Task Created',
  task_completed: 'Task Completed',
  event_registration: 'Event Registration',
  attendance: 'Attendance',
  giving: 'Giving',
  call: 'Phone Call',
  text: 'SMS',
  visit: 'Visit',
  meeting: 'Meeting',
  status_change: 'Status Change',
  other: 'Other',
};

export const TIMELINE_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'phone_call', label: 'Calls' },
  { key: 'sms', label: 'SMS' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'note', label: 'Notes' },
  { key: 'stage_change', label: 'Stage Changes' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'event_registration', label: 'Events' },
  { key: 'task_created', label: 'Tasks' },
  { key: 'giving', label: 'Giving' },
];

export const TIMELINE_ICONS: Record<string, string> = {
  phone_call: 'Phone',
  call: 'Phone',
  sms: 'MessageSquare',
  text: 'MessageSquare',
  whatsapp: 'MessageCircle',
  email: 'Mail',
  in_person: 'Users',
  visit: 'Users',
  note: 'StickyNote',
  stage_change: 'ArrowRightLeft',
  task_created: 'CheckSquare',
  task_completed: 'CheckCircle2',
  event_registration: 'CalendarPlus',
  attendance: 'CalendarCheck',
  giving: 'HeartHandshake',
  meeting: 'Users',
  status_change: 'RefreshCw',
  other: 'Circle',
};
