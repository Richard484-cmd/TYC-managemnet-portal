'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  ChannelSelector,
  AudienceSelector,
  AudienceSummary,
  TemplateSelector,
  MessageComposer,
  MessagePreview,
  CommunicationStatusBadge,
} from '@/components/admin/communication/communication-components';
import type { AudienceOption } from '@/components/admin/communication/communication-components';
import {
  renderTemplate,
  getChannelLabel,
} from '@/lib/communication/constants';
import type {
  CommunicationChannel,
  CommunicationTemplate,
  AudienceType,
  AudienceResolutionResult,
} from '@/lib/communication/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Send, Loader2, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CommunicationComposerClientProps {
  templates: CommunicationTemplate[];
  tags: AudienceOption[];
  departments: AudienceOption[];
  groups: AudienceOption[];
  stages: AudienceOption[];
  membershipStatuses: { status_key: string; name: string }[];
  churchName: string;
  currentUserId: string;
}

export function CommunicationComposerClient({
  templates,
  tags,
  departments,
  groups,
  stages,
  membershipStatuses,
  churchName,
  currentUserId,
}: CommunicationComposerClientProps) {
  const supabase = createClient();
  const router = useRouter();

  const [channel, setChannel] = useState<CommunicationChannel>('sms');
  const [audienceType, setAudienceType] = useState<AudienceType>('all_members');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [selectedStatusKeys, setSelectedStatusKeys] = useState<string[]>([]);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [audience, setAudience] = useState<AudienceResolutionResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sentJobId, setSentJobId] = useState<string | null>(null);

  const availableTemplates = templates.filter((t) => t.channel === channel && t.is_active);

  const handleSelectionChange = (field: string, ids: string[]) => {
    if (field === 'tag_ids') setSelectedTagIds(ids);
    else if (field === 'department_ids') setSelectedDepartmentIds(ids);
    else if (field === 'group_ids') setSelectedGroupIds(ids);
    else if (field === 'stage_ids') setSelectedStageIds(ids);
    else if (field === 'status_keys') setSelectedStatusKeys(ids);
    setAudience(null);
    setConfirmed(false);
  };

  const handleAudienceTypeChange = (t: AudienceType) => {
    setAudienceType(t);
    setAudience(null);
    setConfirmed(false);
  };

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

  const buildCriteria = () => {
    const criteria: Record<string, unknown> = { audience_type: audienceType };
    if (audienceType === 'by_tag' && selectedTagIds.length > 0) criteria.tag_ids = selectedTagIds;
    if (audienceType === 'by_department' && selectedDepartmentIds.length > 0) criteria.department_ids = selectedDepartmentIds;
    if (audienceType === 'by_group' && selectedGroupIds.length > 0) criteria.group_ids = selectedGroupIds;
    if (audienceType === 'by_pipeline_stage' && selectedStageIds.length > 0) criteria.stage_ids = selectedStageIds;
    if (audienceType === 'by_membership_status' && selectedStatusKeys.length > 0) criteria.status_keys = selectedStatusKeys;
    return criteria;
  };

  const resolveAudience = async () => {
    setResolving(true);
    const criteria = buildCriteria();
    const { data, error } = await supabase.rpc('resolve_communication_audience', {
      p_criteria: criteria,
    });
    setResolving(false);

    if (error) {
      toast.error('Failed to resolve audience');
      return;
    }

    const allRecipients = data ?? [];
    const eligible = allRecipients.filter((r: any) => {
      if (channel === 'email') return !!r.email;
      if (channel === 'sms' || channel === 'whatsapp') return !!r.phone;
      return true;
    });
    const excluded = allRecipients.length - eligible.length;
    let missingEmail = 0;
    let missingPhone = 0;
    if (channel === 'email') missingEmail = excluded;
    if (channel === 'sms' || channel === 'whatsapp') missingPhone = excluded;

    setAudience({
      recipients: eligible,
      total: allRecipients.length,
      eligible: eligible.length,
      excluded,
      excludedReasons: { missing_email: missingEmail, missing_phone: missingPhone, inactive: 0 },
    });
    setConfirmed(false);
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  const handleSend = async () => {
    if (!audience || audience.eligible === 0) {
      toast.error('No eligible recipients');
      return;
    }
    if (!body.trim()) {
      toast.error('Message body is required');
      return;
    }
    setSending(true);

    const criteria = buildCriteria();
    const { data: jobData, error: jobError } = await supabase
      .from('communication_jobs')
      .insert({
        channel,
        template_id: templateId,
        subject: channel === 'email' ? subject : null,
        body,
        audience_criteria: criteria,
        status: 'sending',
        recipient_count: audience.total,
        eligible_count: audience.eligible,
        excluded_count: audience.excluded,
        created_by: currentUserId,
      })
      .select('id')
      .single();

    if (jobError || !jobData) {
      setSending(false);
      toast.error('Failed to create communication job');
      return;
    }

    const jobId = jobData.id;
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of audience.recipients) {
      const sampleData: Record<string, string> = {
        first_name: recipient.first_name || '',
        last_name: recipient.last_name || '',
        full_name: `${recipient.first_name} ${recipient.last_name}`.trim(),
        church_name: churchName,
      };
      const renderedBody = renderTemplate(body, sampleData);
      const renderedSubject = subject ? renderTemplate(subject, sampleData) : null;

      const { error: logError } = await supabase.from('communication_logs').insert({
        job_id: jobId,
        contact_id: recipient.contact_id,
        template_id: templateId,
        channel,
        message_type: 'bulk',
        recipient_name: `${recipient.first_name} ${recipient.last_name}`.trim(),
        recipient_email: channel === 'email' ? recipient.email : null,
        recipient_phone: channel === 'sms' || channel === 'whatsapp' ? recipient.phone : null,
        subject: renderedSubject,
        status: 'sent',
        provider_name: 'console',
        sent_by: currentUserId,
        sent_at: new Date().toISOString(),
      });

      if (logError) {
        failedCount++;
      } else {
        sentCount++;
      }
    }

    const finalStatus = failedCount === 0 ? 'sent' : failedCount === audience.eligible ? 'failed' : 'partially_sent';
    await supabase
      .from('communication_jobs')
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    setSending(false);
    setSentJobId(jobId);
    toast.success(`Communication sent to ${sentCount} recipient${sentCount !== 1 ? 's' : ''}`);
  };

  if (sentJobId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold">Communication Sent</h3>
            <p className="text-sm text-muted-foreground">Your message has been queued for delivery.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/communications/history')}>
              View History
            </Button>
            <Button onClick={() => {
              setSentJobId(null);
              setAudience(null);
              setConfirmed(false);
              setBody('');
              setSubject('');
              setTemplateId(null);
            }}>
              Send Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sampleData: Record<string, string> = {
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    church_name: churchName,
    event_name: 'Sunday Service',
    event_date: 'October 5, 2026',
    event_time: '9:00 AM',
    event_location: 'Main Sanctuary',
    membership_status: 'Active Member',
    follow_up_date: 'October 3, 2026',
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Channel */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Choose Channel</CardTitle></CardHeader>
        <CardContent>
          <ChannelSelector value={channel} onChange={(c) => { setChannel(c); setTemplateId(null); setAudience(null); setConfirmed(false); }} />
        </CardContent>
      </Card>

      {/* Step 2: Audience */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Select Audience</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <AudienceSelector
            audienceType={audienceType}
            onAudienceTypeChange={handleAudienceTypeChange}
            tags={tags}
            departments={departments}
            groups={groups}
            stages={stages}
            membershipStatuses={membershipStatuses}
            selectedTagIds={selectedTagIds}
            selectedDepartmentIds={selectedDepartmentIds}
            selectedGroupIds={selectedGroupIds}
            selectedStageIds={selectedStageIds}
            selectedStatusKeys={selectedStatusKeys}
            onSelectionChange={handleSelectionChange}
          />
          <Button variant="outline" onClick={resolveAudience} disabled={resolving} size="sm">
            {resolving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Resolving...</> : <><Users className="mr-1 h-4 w-4" />Estimate Recipients</>}
          </Button>
          {audience && (
            <AudienceSummary
              total={audience.total}
              eligible={audience.eligible}
              excluded={audience.excluded}
              excludedReasons={audience.excludedReasons}
              channel={channel}
            />
          )}
        </CardContent>
      </Card>

      {/* Step 3: Template + Message */}
      <Card>
        <CardHeader><CardTitle className="text-base">3. Compose Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {availableTemplates.length > 0 && (
            <TemplateSelector templates={availableTemplates} selectedId={templateId} onSelect={handleTemplateSelect} />
          )}
          <MessageComposer
            channel={channel}
            subject={subject}
            onSubjectChange={setSubject}
            body={body}
            onBodyChange={setBody}
            onInsertVariable={(v) => setBody((prev) => prev + `{{${v}}}`)}
          />
          {body && (
            <MessagePreview channel={channel} subject={subject} body={body} sampleData={sampleData} />
          )}
        </CardContent>
      </Card>

      {/* Step 4: Confirm + Send */}
      <Card>
        <CardHeader><CardTitle className="text-base">4. Review & Send</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div><span className="text-muted-foreground">Channel:</span> {getChannelLabel(channel)}</div>
              <div><span className="text-muted-foreground">Audience:</span> {audience ? `${audience.eligible} recipients` : 'Not resolved'}</div>
              <div><span className="text-muted-foreground">Template:</span> {templateId ? templates.find((t) => t.id === templateId)?.name ?? 'Custom' : 'Custom'}</div>
              {channel === 'email' && subject && <div><span className="text-muted-foreground">Subject:</span> {subject}</div>}
            </div>
          </div>
          {!audience && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Resolve the audience first to see recipient count.
            </div>
          )}
          {audience && audience.eligible > 0 && !confirmed && (
            <Button onClick={handleConfirm} variant="outline" className="w-full">
              Confirm Audience ({audience.eligible} recipients)
            </Button>
          )}
          {confirmed && audience && audience.eligible > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Audience confirmed: {audience.eligible} recipients will receive this {getChannelLabel(channel)}.
              </div>
              <Button onClick={handleSend} disabled={sending || !body.trim()} className="w-full">
                {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send to {audience.eligible} Recipients</>}
              </Button>
            </div>
          )}
          {audience && audience.eligible === 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              No eligible recipients for this channel. All {audience.total} contacts are missing {channel === 'email' ? 'email addresses' : 'phone numbers'}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
