export interface AttendanceEventListItem {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  department_id: string | null;
  group_id: string | null;
  location: string | null;
  status: string;
  department_name: string | null;
  group_name: string | null;
  record_count: number;
  present_count: number;
}

export interface AttendanceEventDetail extends AttendanceEventListItem {
  notes: string | null;
}

export interface AttendanceRecordWithMember {
  id: string;
  member_id: string;
  status: string;
  notes: string | null;
  check_in_time: string | null;
  recorded_by: string | null;
  member_first_name: string;
  member_last_name: string;
  member_email: string | null;
  member_phone: string | null;
  member_status_key: string | null;
}

export interface AttendanceEventListResult {
  events: AttendanceEventListItem[];
  total: number;
}

export interface MemberAttendanceRecord {
  id: string;
  status: string;
  check_in_time: string | null;
  notes: string | null;
  event_title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
}

export interface AttendanceStats {
  totalEvents: number;
  totalRecords: number;
  presentCount: number;
  attendanceRate: number;
  recentEvents: AttendanceEventListItem[];
}
