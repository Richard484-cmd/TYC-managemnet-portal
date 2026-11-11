import { z } from 'zod';

export const visitorFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  source: z.enum(['website', 'walk_in', 'referral', 'event', 'social_media', 'member_invitation', 'other']),
  assigned_to: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  address_line1: z.string().optional().or(z.literal('')),
  address_line2: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state_province: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
});

export type VisitorFormValues = z.infer<typeof visitorFormSchema>;

export interface VisitorListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  lifecycle_stage: string;
  status_key: string;
  first_visit_date: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  converted_to_member_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitorListResult {
  visitors: VisitorListItem[];
  total: number;
}

export interface VisitorDetail extends VisitorListItem {
  notes: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  tags: { id: string; name: string; color: string | null; slug: string | null }[];
  follow_ups: {
    id: string;
    type: string;
    status: string;
    priority: string;
    due_date: string | null;
    completed_at: string | null;
    assigned_to_name: string | null;
  }[];
  contact_movements: {
    id: string;
    from_stage: string | null;
    to_stage: string;
    reason: string | null;
    moved_at: string;
  }[];
  contact_id: string | null;
}
