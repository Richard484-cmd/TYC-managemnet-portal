export interface VirtualMeeting {
  id: string;
  title: string;
  description: string | null;
  category: string;
  organizer_id: string;
  scope_type: string;
  scope_id: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  recurrence_rule: string | null;
  participant_policy: string;
  capacity: number | null;
  status: string;
  provider: string;
  provider_room_name: string | null;
  created_at: string;
}

export interface MeetingAccessResponse {
  provider: 'daily';
  roomUrl: string;
  token: string;
  meeting: { id: string; title: string; startsAt: string; endsAt: string };
}
