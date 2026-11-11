import { cn } from '@/lib/utils';
import {
  getWorkflowStatusBadge,
  getWorkflowStatusLabel,
  getExecutionStatusBadge,
  getExecutionStatusLabel,
  getLogStatusBadge,
  getLogStatusLabel,
} from '@/lib/automation/constants';

export function WorkflowStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', getWorkflowStatusBadge(status))}>
      {getWorkflowStatusLabel(status)}
    </span>
  );
}

export function ExecutionStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', getExecutionStatusBadge(status))}>
      {getExecutionStatusLabel(status)}
    </span>
  );
}

export function LogStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', getLogStatusBadge(status))}>
      {getLogStatusLabel(status)}
    </span>
  );
}
