export interface CrmPipeline {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmPipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  description: string | null;
  position: number;
  color: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  member_id: string | null;
  visitor_id: string | null;
  pipeline_stage: string;
  pipeline_id: string | null;
  crm_stage_id: string | null;
  source: string;
  engagement_level: number;
  notes: string | null;
  outcome: string | null;
  priority: string;
  follow_up_type: string | null;
  next_follow_up_date: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CrmContactWithRelations extends CrmContact {
  stage?: CrmPipelineStage | null;
  assigned_to_name?: string | null;
  latest_activity?: CrmActivity | null;
  open_task_count?: number;
}

export interface CrmFollowUp {
  id: string;
  visitor_id: string | null;
  member_id: string | null;
  contact_id: string | null;
  type: string;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  notes: string | null;
  outcome: string | null;
  next_follow_up_date: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CrmActivity {
  id: string;
  follow_up_id: string | null;
  contact_id: string | null;
  activity_type: string;
  notes: string | null;
  outcome: string | null;
  performed_by: string | null;
  performed_at: string;
  created_at: string;
  performed_by_name?: string | null;
}

export interface CrmTask {
  id: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  assigned_to_name?: string | null;
  created_by_name?: string | null;
  completed_by_name?: string | null;
  contact_name?: string | null;
  is_overdue?: boolean;
}

export interface CrmStageMovement {
  id: string;
  contact_id: string;
  from_stage: string | null;
  to_stage: string;
  reason: string | null;
  moved_by: string | null;
  moved_at: string;
  from_stage_name?: string | null;
  to_stage_name?: string | null;
  moved_by_name?: string | null;
}

export interface CrmDashboardStats {
  totalContacts: number;
  newVisitors: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  highPriorityFollowUps: number;
  activeMembers: number;
  tasksPending: number;
  tasksOverdue: number;
}
