'use client';

import { useState } from 'react';
import {
  CommunicationHistory,
  CommunicationStatusBadge,
} from '@/components/admin/communication/communication-components';
import type { CommunicationLog } from '@/lib/communication/types';
import { getChannelLabel, getStatusLabel } from '@/lib/communication/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface CommunicationHistoryClientProps {
  logs: CommunicationLog[];
  total: number;
  page: number;
  pageSize: number;
  channel: string;
  status: string;
}

export function CommunicationHistoryClient({
  logs,
  total,
  page,
  pageSize,
  channel: initialChannel,
  status: initialStatus,
}: CommunicationHistoryClientProps) {
  const router = useRouter();
  const [channel, setChannel] = useState(initialChannel);
  const [status, setStatus] = useState(initialStatus);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (channel !== 'all') params.set('channel', channel);
    if (status !== 'all') params.set('status', status);
    if (page > 1) params.set('page', String(page));
    router.push(`/admin/communications/history?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={channel} onValueChange={(v) => { setChannel(v); }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="in_app">In-App</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={applyFilters}>Apply Filters</Button>
      </div>

      <p className="text-sm text-muted-foreground">{total} {total === 1 ? 'log' : 'logs'}</p>

      <CommunicationHistory logs={logs} />

      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('page', String(page - 1));
              router.push(`/admin/communications/history?${params.toString()}`);
            }}>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / pageSize)}</span>
          {page * pageSize < total && (
            <Button variant="outline" size="sm" onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('page', String(page + 1));
              router.push(`/admin/communications/history?${params.toString()}`);
            }}>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
