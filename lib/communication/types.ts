export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app';

export type CommunicationStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type JobStatus =
  | 'draft'
  | 'pending'
  | 'sending'
  | 'sent'
  | 'partially_sent'
  | 'failed'
  | 'cancelled';

export type AudienceType =
  | 'all_members'
  | 'all_visitors'
  | 'all_contacts'
  | 'by_tag'
  | 'by_department'
  | 'by_group'
  | 'by_pipeline_stage'
  | 'by_membership_status'
  | 'by_contact_ids';

export interface CommunicationTemplate {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
  channel: CommunicationChannel;
  subject: string | null;
  body: string;
  is_active: boolean;
  is_system: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationJob {
  id: string;
  channel: CommunicationChannel;
  template_id: string | null;
  subject: string | null;
  body: string | null;
  audience_criteria: Record<string, unknown>;
  status: JobStatus;
  recipient_count: number;
  eligible_count: number;
  excluded_count: number;
  sent_count: number;
  failed_count: number;
  created_by: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
  template_name?: string | null;
}

export interface CommunicationLog {
  id: string;
  job_id: string;
  contact_id: string | null;
  template_id: string | null;
  channel: CommunicationChannel;
  message_type: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  status: CommunicationStatus;
  provider_name: string | null;
  provider_ref: string | null;
  failure_reason: string | null;
  sent_by: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  sent_by_name?: string | null;
  template_name?: string | null;
  contact_name?: string | null;
}

export interface AudienceRecipient {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  member_id: string | null;
  visitor_id: string | null;
}

export interface AudienceResolutionResult {
  recipients: AudienceRecipient[];
  total: number;
  eligible: number;
  excluded: number;
  excludedReasons: {
    missing_email: number;
    missing_phone: number;
    inactive: number;
  };
}

export interface ProviderConfig {
  id: string;
  channel: CommunicationChannel;
  provider_name: string;
  is_active: boolean;
  configured_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationDashboardStats {
  totalSent: number;
  emailCount: number;
  smsCount: number;
  whatsappCount: number;
  inAppCount: number;
  delivered: number;
  failed: number;
  pending: number;
  recentCommunications: CommunicationLog[];
}

export interface AudienceCriteria {
  audience_type: AudienceType;
  tag_ids?: string[];
  department_ids?: string[];
  group_ids?: string[];
  stage_ids?: string[];
  status_keys?: string[];
  contact_ids?: string[];
}
