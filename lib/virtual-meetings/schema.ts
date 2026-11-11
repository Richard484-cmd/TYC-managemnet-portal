import { z } from 'zod';

export const meetingFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['fellowship', 'bible_study', 'prayer', 'ministry', 'department', 'church_wide', 'other']).default('fellowship'),
  scope_type: z.enum(['church', 'group', 'department', 'ministry']).default('church'),
  scope_id: z.string().optional().nullable(),
  starts_at: z.string().min(1, 'Start time is required'),
  ends_at: z.string().min(1, 'End time is required'),
  timezone: z.string().default('UTC'),
  participant_policy: z.enum(['scope_members', 'invited', 'church_wide']).default('scope_members'),
  capacity: z.number().int().positive().optional().nullable(),
});

export type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export interface MeetingListItem {
  id: string;
  title: string;
  category: string;
  scope_type: string;
  scope_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  organizer_name: string | null;
  participant_count: number;
}

export interface MeetingListResult {
  meetings: MeetingListItem[];
  total: number;
}
