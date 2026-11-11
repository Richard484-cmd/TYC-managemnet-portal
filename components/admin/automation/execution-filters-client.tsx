'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXECUTION_STATUSES } from '@/lib/automation/constants';
import type { Automation } from '@/lib/automation/types';

export function ExecutionFiltersClient({
  automations,
  initialAutomationId = 'all',
  initialStatus = 'all',
  initialDateFrom = '',
  initialDateTo = '',
  initialFailedOnly = false,
}: {
  automations: Automation[];
  initialAutomationId?: string;
  initialStatus?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialFailedOnly?: boolean;
}) {
  const router = useRouter();
  const [automationId, setAutomationId] = useState(initialAutomationId);
  const [status, setStatus] = useState(initialStatus);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [failedOnly, setFailedOnly] = useState(initialFailedOnly);

  const apply = () => {
    const params = new URLSearchParams();
    if (automationId !== 'all') params.set('automation_id', automationId);
    if (status !== 'all') params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (failedOnly) params.set('failedOnly', 'true');
    router.push(`/admin/automations/executions?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={automationId} onValueChange={setAutomationId}>
          <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workflows</SelectItem>
            {automations.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {EXECUTION_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={failedOnly}
            onChange={(e) => setFailedOnly(e.target.checked)}
            className="rounded"
          />
          Failed only
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
        </div>
        <Button size="sm" onClick={apply}>Apply Filters</Button>
      </div>
    </div>
  );
}
