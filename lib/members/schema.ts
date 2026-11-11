import { z } from 'zod';

export const memberFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().or(z.literal('')),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed', 'separated', 'prefer_not_to_say']).optional().or(z.literal('')),
  occupation: z.string().max(200).optional().or(z.literal('')),
  status_key: z.string().min(1, 'Status is required'),
  join_date: z.string().optional().or(z.literal('')),
  is_baptized: z.boolean().default(false),
  is_active: z.boolean().default(true),
  pastoral_notes: z.string().optional().or(z.literal('')),
  profile_image: z.string().optional().or(z.literal('')),
  address_line1: z.string().optional().or(z.literal('')),
  address_line2: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state_province: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  emergency_contact_name: z.string().optional().or(z.literal('')),
  emergency_contact_phone: z.string().optional().or(z.literal('')),
  emergency_contact_relation: z.string().optional().or(z.literal('')),
  baptism_date: z.string().optional().or(z.literal('')),
  spiritual_background: z.string().optional().or(z.literal('')),
  conversion_story: z.string().optional().or(z.literal('')),
  previous_church: z.string().optional().or(z.literal('')),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;

export interface MemberListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status_key: string;
  is_baptized: boolean;
  is_active: boolean;
  join_date: string | null;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberDetail extends MemberListItem {
  user_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  occupation: string | null;
  pastoral_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  profile: {
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state_province: string | null;
    postal_code: string | null;
    country: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relation: string | null;
    occupation: string | null;
    employer: string | null;
    education: string | null;
    skills: string[] | null;
    spiritual_background: string | null;
    conversion_story: string | null;
    baptism_date: string | null;
    previous_church: string | null;
    family_notes: string | null;
    medical_notes: string | null;
    pastoral_counseling_notes: string | null;
  } | null;
  tags: { id: string; name: string; color: string | null }[];
  departments: {
    id: string;
    name: string;
    role: string;
  }[];
  groups: {
    id: string;
    name: string;
    role: string;
    group_type: string | null;
  }[];
  membership_history: {
    id: string;
    previous_status: string | null;
    new_status: string;
    reason: string | null;
    changed_at: string;
    changed_by_name: string | null;
  }[];
  attendance: {
    event_title: string;
    event_date: string;
    status: string;
  }[];
  event_registrations: {
    event_title: string;
    event_date: string;
    status: string;
    num_guests: number;
  }[];
  giving_summary: {
    total_given: number;
    transaction_count: number;
    last_gift_date: string | null;
  } | null;
  follow_ups: {
    id: string;
    type: string;
    status: string;
    priority: string;
    due_date: string | null;
    assigned_to_name: string | null;
  }[];
  communications: {
    subject: string;
    channel: string;
    sent_at: string | null;
    delivery_status: string;
  }[];
}

export interface MemberListResult {
  members: MemberListItem[];
  total: number;
}
