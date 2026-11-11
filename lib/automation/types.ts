export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type StepType = 'trigger' | 'condition' | 'action' | 'delay';
export type ExecutionStatus = 'pending' | 'running' | 'waiting' | 'successful' | 'failed' | 'cancelled';
export type LogStatus = 'pending' | 'running' | 'successful' | 'failed' | 'skipped' | 'cancelled';
export type Operator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'greater_than_equal' | 'less_than_equal';
export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export type EventQueueStatus = 'pending' | 'processing' | 'processed' | 'failed';

export interface AutomationStep {
  id: string;
  automation_id: string;
  step_type: StepType;
  step_key: string;
  name: string | null;
  config: Record<string, unknown>;
  position: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_condition: Record<string, unknown> | null;
  action_type: string;
  action_config: Record<string, unknown>;
  is_enabled: boolean;
  status: WorkflowStatus;
  max_runs_per_day: number;
  last_executed_at: string | null;
  execution_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  steps?: AutomationStep[];
}

export interface AutomationExecution {
  id: string;
  automation_id: string;
  status: ExecutionStatus;
  current_step_id: string | null;
  current_step_position: number;
  context: Record<string, unknown>;
  trigger_event: string | null;
  trigger_payload: Record<string, unknown> | null;
  event_key: string | null;
  is_test: boolean;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  waiting_until: string | null;
  created_at: string;
  updated_at: string;
  automation_name?: string;
}

export interface AutomationExecutionLog {
  id: string;
  execution_id: string;
  automation_id: string;
  step_id: string | null;
  step_type: StepType;
  step_key: string;
  step_name: string | null;
  config: Record<string, unknown> | null;
  status: LogStatus;
  result: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  member_id: string | null;
  contact_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface AutomationEvent {
  id: string;
  event_type: string;
  event_key: string | null;
  payload: Record<string, unknown>;
  entity_type: string | null;
  entity_id: string | null;
  member_id: string | null;
  contact_id: string | null;
  status: EventQueueStatus;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface TriggerDef {
  key: string;
  label: string;
  description: string;
  configFields: ConfigField[];
  eventType: string;
}

export interface ConditionDef {
  key: string;
  label: string;
  description: string;
  operators: Operator[];
  configFields: ConfigField[];
}

export interface ActionDef {
  key: string;
  label: string;
  description: string;
  configFields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'user' | 'tag' | 'pipeline_stage' | 'template' | 'department' | 'group' | 'membership_status';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface AutomationMonitoringStats {
  totalWorkflows: number;
  activeWorkflows: number;
  pausedWorkflows: number;
  draftWorkflows: number;
  archivedWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  waitingExecutions: number;
  runningExecutions: number;
  recentExecutions: AutomationExecution[];
  failedExecutionsRecent: AutomationExecution[];
  pendingEvents: number;
}
