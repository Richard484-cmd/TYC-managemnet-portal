import { z } from 'zod';

export const departmentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  leader_id: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  display_order: z.number().int().min(0).default(0),
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

export const ministryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  department_id: z.string().min(1, 'Department is required'),
  leader_id: z.string().optional().nullable(),
  meeting_day: z.string().optional().nullable(),
  meeting_time: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  display_order: z.number().int().min(0).default(0),
});

export type MinistryFormValues = z.infer<typeof ministryFormSchema>;

export const groupFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  ministry_id: z.string().optional().nullable(),
  group_type: z.enum(['small_group', 'cell_group', 'fellowship', 'bible_study', 'prayer_group', 'youth_group', 'other']).default('small_group'),
  leader_id: z.string().optional().nullable(),
  meeting_day: z.string().optional().nullable(),
  meeting_time: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  max_capacity: z.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'inactive', 'full']).default('active'),
  display_order: z.number().int().min(0).default(0),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;

export interface UnitMember {
  membership_id: string;
  member_id: string;
  role: string;
  joined_at: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status_key: string;
}

export interface DepartmentListItem {
  id: string;
  name: string;
  description: string | null;
  leader_name: string | null;
  status: string;
  member_count: number;
  ministry_count: number;
  created_at: string;
}

export interface MinistryListItem {
  id: string;
  name: string;
  description: string | null;
  department_name: string;
  leader_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  status: string;
  member_count: number;
  group_count: number;
  created_at: string;
}

export interface GroupListItem {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  ministry_name: string | null;
  leader_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  max_capacity: number | null;
  status: string;
  member_count: number;
  created_at: string;
}

export interface LeaderOption {
  id: string;
  display_name: string;
}

export interface DepartmentDetail {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  leader_name: string | null;
  status: string;
  display_order: number;
  created_at: string;
  members: UnitMember[];
  ministries: { id: string; name: string; member_count: number; status: string }[];
}

export interface MinistryDetail {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  department_name: string;
  leader_id: string | null;
  leader_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  status: string;
  created_at: string;
  members: UnitMember[];
  groups: { id: string; name: string; member_count: number; status: string }[];
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  ministry_id: string | null;
  ministry_name: string | null;
  group_type: string;
  leader_id: string | null;
  leader_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  max_capacity: number | null;
  status: string;
  created_at: string;
  members: UnitMember[];
}
