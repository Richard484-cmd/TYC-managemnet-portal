'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  CHANNELS,
  AUDIENCE_TYPES,
  COMMUNICATION_STATUSES,
  JOB_STATUSES,
  TEMPLATE_VARIABLES,
  getStatusLabel,
  getStatusBadge,
  getJobStatusLabel,
  getJobStatusBadge,
  getChannelLabel,
  renderTemplate,
  isChannelEligible,
} from '@/lib/communication/constants';
import type {
  CommunicationChannel,
  CommunicationTemplate,
  CommunicationLog,
  AudienceType,
  AudienceCriteria,
} from '@/lib/communication/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Mail, MessageSquare, MessageCircle, Bell, Send, Users, AlertCircle,
  CheckCircle2, Loader2, Eye, Copy, Plus, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail, sms: MessageSquare, whatsapp: MessageCircle, in_app: Bell,
};

// ============================================================================
// ChannelSelector
// ============================================================================

export function ChannelSelector({
  value,
  onChange,
}: {
  value: CommunicationChannel;
  onChange: (c: CommunicationChannel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHANNELS.map((ch) => {
        const Icon = CHANNEL_ICONS[ch.key] ?? Bell;
        return (
          <button
            key={ch.key}
            onClick={() => onChange(ch.key)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              value === ch.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            {ch.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// AudienceSelector
// ============================================================================

export interface AudienceOption {
  id: string;
  name: string;
}

export function AudienceSelector({
  audienceType,
  onAudienceTypeChange,
  tags = [],
  departments = [],
  groups = [],
  stages = [],
  membershipStatuses = [],
  selectedTagIds = [],
  selectedDepartmentIds = [],
  selectedGroupIds = [],
  selectedStageIds = [],
  selectedStatusKeys = [],
  onSelectionChange,
}: {
  audienceType: AudienceType;
  onAudienceTypeChange: (t: AudienceType) => void;
  tags?: AudienceOption[];
  departments?: AudienceOption[];
  groups?: AudienceOption[];
  stages?: AudienceOption[];
  membershipStatuses?: { status_key: string; name: string }[];
  selectedTagIds?: string[];
  selectedDepartmentIds?: string[];
  selectedGroupIds?: string[];
  selectedStageIds?: string[];
  selectedStatusKeys?: string[];
  onSelectionChange: (field: string, ids: string[]) => void;
}) {
  const needsTagIds = audienceType === 'by_tag';
  const needsDeptIds = audienceType === 'by_department';
  const needsGroupIds = audienceType === 'by_group';
  const needsStageIds = audienceType === 'by_pipeline_stage';
  const needsStatusKeys = audienceType === 'by_membership_status';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Audience Type</Label>
        <Select value={audienceType} onValueChange={(v) => onAudienceTypeChange(v as AudienceType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_TYPES.map((t) => (
              <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsTagIds && tags.length > 0 && (
        <MultiSelectList
          label="Tags"
          options={tags}
          selected={selectedTagIds}
          onChange={(ids) => onSelectionChange('tag_ids', ids)}
        />
      )}
      {needsDeptIds && departments.length > 0 && (
        <MultiSelectList
          label="Departments"
          options={departments}
          selected={selectedDepartmentIds}
          onChange={(ids) => onSelectionChange('department_ids', ids)}
        />
      )}
      {needsGroupIds && groups.length > 0 && (
        <MultiSelectList
          label="Groups"
          options={groups}
          selected={selectedGroupIds}
          onChange={(ids) => onSelectionChange('group_ids', ids)}
        />
      )}
      {needsStageIds && stages.length > 0 && (
        <MultiSelectList
          label="Pipeline Stages"
          options={stages}
          selected={selectedStageIds}
          onChange={(ids) => onSelectionChange('stage_ids', ids)}
        />
      )}
      {needsStatusKeys && membershipStatuses.length > 0 && (
        <MultiSelectList
          label="Membership Statuses"
          options={membershipStatuses.map((s) => ({ id: s.status_key, name: s.name }))}
          selected={selectedStatusKeys}
          onChange={(ids) => onSelectionChange('status_keys', ids)}
        />
      )}
    </div>
  );
}

function MultiSelectList({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: AudienceOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <Checkbox
              checked={selected.includes(opt.id)}
              onCheckedChange={() => toggle(opt.id)}
            />
            <span className="text-sm">{opt.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// AudienceSummary
// ============================================================================

export function AudienceSummary({
  total,
  eligible,
  excluded,
  excludedReasons,
  channel,
}: {
  total: number;
  eligible: number;
  excluded: number;
  excludedReasons: { missing_email: number; missing_phone: number; inactive: number };
  channel: CommunicationChannel;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{eligible}</p>
            <p className="text-sm text-muted-foreground">eligible recipients</p>
          </div>
          {excluded > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-amber-600">{excluded} excluded</p>
              {excludedReasons.missing_email > 0 && (
                <p className="text-xs text-muted-foreground">{excludedReasons.missing_email} missing email</p>
              )}
              {excludedReasons.missing_phone > 0 && (
                <p className="text-xs text-muted-foreground">{excludedReasons.missing_phone} missing phone</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TemplateSelector
// ============================================================================

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
}: {
  templates: CommunicationTemplate[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Template</Label>
      <Select value={selectedId ?? ''} onValueChange={(v) => onSelect(v || null)}>
        <SelectTrigger>
          <SelectValue placeholder="Select a template..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">No template</SelectItem>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} ({getChannelLabel(t.channel)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// MessageComposer
// ============================================================================

export function MessageComposer({
  channel,
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  template,
  onInsertVariable,
}: {
  channel: CommunicationChannel;
  subject: string;
  onSubjectChange: (v: string) => void;
  body: string;
  onBodyChange: (v: string) => void;
  template?: CommunicationTemplate | null;
  onInsertVariable?: (variable: string) => void;
}) {
  return (
    <div className="space-y-4">
      {channel === 'email' && (
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Email subject..."
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Type your message..."
          rows={8}
        />
      </div>
      {onInsertVariable && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Insert Variable</Label>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => onInsertVariable(v.key)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
                title={v.description}
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MessagePreview
// ============================================================================

export function MessagePreview({
  channel,
  subject,
  body,
  sampleData,
}: {
  channel: CommunicationChannel;
  subject: string;
  body: string;
  sampleData: Record<string, string>;
}) {
  const renderedBody = renderTemplate(body, sampleData);
  const renderedSubject = subject ? renderTemplate(subject, sampleData) : '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {channel === 'email' && renderedSubject && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Subject</p>
            <p className="text-sm font-medium">{renderedSubject}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground">Message</p>
          <p className="whitespace-pre-wrap text-sm">{renderedBody}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CommunicationStatusBadge
// ============================================================================

export function CommunicationStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', getStatusBadge(status))}>
      {getStatusLabel(status)}
    </span>
  );
}

// ============================================================================
// CommunicationLogRow
// ============================================================================

export function CommunicationLogRow({ log }: { log: CommunicationLog }) {
  const Icon = CHANNEL_ICONS[log.channel] ?? Bell;
  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {log.recipient_name || log.recipient_email || log.recipient_phone || 'Unknown'}
          </p>
          <CommunicationStatusBadge status={log.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{getChannelLabel(log.channel)}</span>
          {log.template_name && <span>· {log.template_name}</span>}
          {log.subject && <span>· {log.subject}</span>}
          {log.failure_reason && <span className="text-red-600">· {log.failure_reason}</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(log.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CommunicationHistory
// ============================================================================

export function CommunicationHistory({ logs }: { logs: CommunicationLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No communication history yet.
      </p>
    );
  }
  return (
    <div>
      {logs.map((log) => (
        <CommunicationLogRow key={log.id} log={log} />
      ))}
    </div>
  );
}

// ============================================================================
// QuickSendFromContact (for CRM integration)
// ============================================================================

export function QuickSendFromContact({
  contactId,
  contactName,
  contactEmail,
  contactPhone,
  templates,
  onSent,
}: {
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  templates: CommunicationTemplate[];
  onSent?: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<CommunicationChannel>('sms');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const availableTemplates = templates.filter((t) => t.channel === channel && t.is_active);

  const handleTemplateSelect = (id: string | null) => {
    setTemplateId(id);
    if (id) {
      const t = templates.find((t) => t.id === id);
      if (t) {
        setBody(t.body);
        if (t.subject) setSubject(t.subject);
      }
    }
  };

  const canSend = channel === 'email' ? !!contactEmail : channel === 'in_app' ? true : !!contactPhone;

  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Message body is required');
      return;
    }
    if (!canSend) {
      toast.error(`No ${channel === 'email' ? 'email' : 'phone'} for this contact`);
      return;
    }
    setSending(true);

    const sampleData: Record<string, string> = {
      first_name: contactName.split(' ')[0] || '',
      last_name: contactName.split(' ').slice(1).join(' ') || '',
      full_name: contactName,
      church_name: 'The Youth Church of the Epiphany',
    };
    const renderedBody = renderTemplate(body, sampleData);
    const renderedSubject = subject ? renderTemplate(subject, sampleData) : null;

    const { data: jobData, error: jobError } = await supabase
      .from('communication_jobs')
      .insert({
        channel,
        template_id: templateId,
        subject: renderedSubject,
        body: renderedBody,
        audience_criteria: { audience_type: 'by_contact_ids', contact_ids: [contactId] },
        status: 'sending',
        recipient_count: 1,
        eligible_count: 1,
      })
      .select('id')
      .single();

    if (jobError || !jobData) {
      setSending(false);
      toast.error('Failed to create communication job');
      return;
    }

    const { error: logError } = await supabase.from('communication_logs').insert({
      job_id: jobData.id,
      contact_id: contactId,
      template_id: templateId,
      channel,
      message_type: 'direct',
      recipient_name: contactName,
      recipient_email: channel === 'email' ? contactEmail : null,
      recipient_phone: channel === 'sms' || channel === 'whatsapp' ? contactPhone : null,
      subject: renderedSubject,
      status: 'sent',
      provider_name: 'console',
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      setSending(false);
      toast.error('Failed to log communication');
      return;
    }

    await supabase
      .from('communication_jobs')
      .update({ status: 'sent', sent_count: 1, sent_at: new Date().toISOString() })
      .eq('id', jobData.id);

    setSending(false);
    setOpen(false);
    setBody('');
    setSubject('');
    setTemplateId(null);
    toast.success(`${getChannelLabel(channel)} sent to ${contactName}`);
    onSent?.();
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Send className="mr-1 h-4 w-4" />
        Send Message
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Send to {contactName}</p>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
      </div>
      <ChannelSelector value={channel} onChange={(c) => { setChannel(c); setTemplateId(null); }} />
      {!canSend && channel !== 'in_app' && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
          <AlertCircle className="h-4 w-4" />
          {channel === 'email' ? 'No email address on file' : 'No phone number on file'}
        </div>
      )}
      {availableTemplates.length > 0 && (
        <TemplateSelector
          templates={availableTemplates}
          selectedId={templateId}
          onSelect={handleTemplateSelect}
        />
      )}
      <MessageComposer
        channel={channel}
        subject={subject}
        onSubjectChange={setSubject}
        body={body}
        onBodyChange={setBody}
        onInsertVariable={(v) => setBody((prev) => prev + `{{${v}}}`)}
      />
      <div className="flex gap-2">
        <Button onClick={handleSend} disabled={sending || !canSend} size="sm">
          {sending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-1 h-4 w-4" />Send</>}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

// ============================================================================
// TemplateEditorForm
// ============================================================================

export function TemplateEditorForm({
  template,
  onSave,
  onCancel,
}: {
  template?: CommunicationTemplate | null;
  onSave: (data: Partial<CommunicationTemplate>) => void;
  onCancel: () => void;
}) {
  const [identifier, setIdentifier] = useState(template?.identifier ?? '');
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [channel, setChannel] = useState<CommunicationChannel>(template?.channel ?? 'email');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);

  const handleSave = () => {
    if (!name.trim() || !body.trim()) {
      toast.error('Name and body are required');
      return;
    }
    onSave({
      identifier: identifier || name.toLowerCase().replace(/\s+/g, '_'),
      name,
      description: description || null,
      channel,
      subject: channel === 'email' ? subject : null,
      body,
      is_active: isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Template Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Email" />
        </div>
        <div className="space-y-2">
          <Label>Identifier (slug)</Label>
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="auto-generated if empty" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template for?" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as CommunicationChannel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Active</Label>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
            <span className="text-sm">Template is active</span>
          </div>
        </div>
      </div>
      {channel === 'email' && (
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." />
        </div>
      )}
      <div className="space-y-2">
        <Label>Message Body</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Message content..." />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Available Variables</Label>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              onClick={() => setBody((prev) => prev + `{{${v.key}}}`)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80"
              title={v.description}
            >
              {`{{${v.key}}}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} size="sm">Save Template</Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
