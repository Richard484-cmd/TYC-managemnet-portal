import type { WorkflowStatus, ExecutionStatus, LogStatus, Operator, DelayUnit } from './types';

export const WORKFLOW_STATUSES: { key: WorkflowStatus; label: string; badgeClass: string }[] = [
  { key: 'draft', label: 'Draft', badgeClass: 'bg-gray-100 text-gray-700' },
  { key: 'active', label: 'Active', badgeClass: 'bg-green-100 text-green-700' },
  { key: 'paused', label: 'Paused', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { key: 'archived', label: 'Archived', badgeClass: 'bg-gray-100 text-gray-500' },
];

export const EXECUTION_STATUSES: { key: ExecutionStatus; label: string; badgeClass: string }[] = [
  { key: 'pending', label: 'Pending', badgeClass: 'bg-gray-100 text-gray-700' },
  { key: 'running', label: 'Running', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'waiting', label: 'Waiting', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { key: 'successful', label: 'Successful', badgeClass: 'bg-green-100 text-green-700' },
  { key: 'failed', label: 'Failed', badgeClass: 'bg-red-100 text-red-700' },
  { key: 'cancelled', label: 'Cancelled', badgeClass: 'bg-gray-100 text-gray-500' },
];

export const LOG_STATUSES: { key: LogStatus; label: string; badgeClass: string }[] = [
  { key: 'pending', label: 'Pending', badgeClass: 'bg-gray-100 text-gray-700' },
  { key: 'running', label: 'Running', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'successful', label: 'Successful', badgeClass: 'bg-green-100 text-green-700' },
  { key: 'failed', label: 'Failed', badgeClass: 'bg-red-100 text-red-700' },
  { key: 'skipped', label: 'Skipped', badgeClass: 'bg-gray-100 text-gray-500' },
  { key: 'cancelled', label: 'Cancelled', badgeClass: 'bg-gray-100 text-gray-500' },
];

export const OPERATORS: { key: Operator; label: string }[] = [
  { key: 'equals', label: 'Equals' },
  { key: 'not_equals', label: 'Not Equals' },
  { key: 'contains', label: 'Contains' },
  { key: 'not_contains', label: 'Does Not Contain' },
  { key: 'greater_than', label: 'Greater Than' },
  { key: 'less_than', label: 'Less Than' },
  { key: 'greater_than_equal', label: 'Greater Than or Equal' },
  { key: 'less_than_equal', label: 'Less Than or Equal' },
];

export const DELAY_UNITS: { key: DelayUnit; label: string }[] = [
  { key: 'minutes', label: 'Minutes' },
  { key: 'hours', label: 'Hours' },
  { key: 'days', label: 'Days' },
  { key: 'weeks', label: 'Weeks' },
];

export const STEP_TYPE_ICONS: Record<string, string> = {
  trigger: 'Zap',
  condition: 'GitBranch',
  action: 'Play',
  delay: 'Clock',
};

export const STEP_TYPE_COLORS: Record<string, string> = {
  trigger: 'bg-amber-50 text-amber-600 border-amber-200',
  condition: 'bg-blue-50 text-blue-600 border-blue-200',
  action: 'bg-green-50 text-green-600 border-green-200',
  delay: 'bg-purple-50 text-purple-600 border-purple-200',
};

export function getWorkflowStatusLabel(status: string): string {
  return WORKFLOW_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function getWorkflowStatusBadge(status: string): string {
  return WORKFLOW_STATUSES.find((s) => s.key === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';
}

export function getExecutionStatusLabel(status: string): string {
  return EXECUTION_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function getExecutionStatusBadge(status: string): string {
  return EXECUTION_STATUSES.find((s) => s.key === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';
}

export function getLogStatusLabel(status: string): string {
  return LOG_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function getLogStatusBadge(status: string): string {
  return LOG_STATUSES.find((s) => s.key === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';
}

export function getOperatorLabel(op: string): string {
  return OPERATORS.find((o) => o.key === op)?.label ?? op;
}
