import type { CommunicationChannel, CommunicationStatus, JobStatus, AudienceType } from './types';

export const CHANNELS: { key: CommunicationChannel; label: string; icon: string }[] = [
  { key: 'email', label: 'Email', icon: 'Mail' },
  { key: 'sms', label: 'SMS', icon: 'MessageSquare' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { key: 'in_app', label: 'In-App', icon: 'Bell' },
];

export const AUDIENCE_TYPES: { key: AudienceType; label: string }[] = [
  { key: 'all_members', label: 'All Members' },
  { key: 'all_visitors', label: 'All Visitors' },
  { key: 'all_contacts', label: 'All Contacts' },
  { key: 'by_tag', label: 'By Tag' },
  { key: 'by_department', label: 'By Department' },
  { key: 'by_group', label: 'By Group' },
  { key: 'by_pipeline_stage', label: 'By Pipeline Stage' },
  { key: 'by_membership_status', label: 'By Membership Status' },
  { key: 'by_contact_ids', label: 'Specific Contacts' },
];

export const COMMUNICATION_STATUSES: { key: CommunicationStatus; label: string; badgeClass: string }[] = [
  { key: 'pending', label: 'Pending', badgeClass: 'bg-gray-100 text-gray-700' },
  { key: 'sending', label: 'Sending', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'sent', label: 'Sent', badgeClass: 'bg-indigo-100 text-indigo-700' },
  { key: 'delivered', label: 'Delivered', badgeClass: 'bg-green-100 text-green-700' },
  { key: 'failed', label: 'Failed', badgeClass: 'bg-red-100 text-red-700' },
  { key: 'cancelled', label: 'Cancelled', badgeClass: 'bg-gray-100 text-gray-500' },
];

export const JOB_STATUSES: { key: JobStatus; label: string; badgeClass: string }[] = [
  { key: 'draft', label: 'Draft', badgeClass: 'bg-gray-100 text-gray-700' },
  { key: 'pending', label: 'Pending', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { key: 'sending', label: 'Sending', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'sent', label: 'Sent', badgeClass: 'bg-green-100 text-green-700' },
  { key: 'partially_sent', label: 'Partially Sent', badgeClass: 'bg-amber-100 text-amber-700' },
  { key: 'failed', label: 'Failed', badgeClass: 'bg-red-100 text-red-700' },
  { key: 'cancelled', label: 'Cancelled', badgeClass: 'bg-gray-100 text-gray-500' },
];

export const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'First Name', description: 'Recipient first name' },
  { key: 'last_name', label: 'Last Name', description: 'Recipient last name' },
  { key: 'full_name', label: 'Full Name', description: 'Recipient full name' },
  { key: 'church_name', label: 'Church Name', description: 'Church name' },
  { key: 'event_name', label: 'Event Name', description: 'Event title' },
  { key: 'event_date', label: 'Event Date', description: 'Event date' },
  { key: 'event_time', label: 'Event Time', description: 'Event time' },
  { key: 'event_location', label: 'Event Location', description: 'Event location' },
  { key: 'membership_status', label: 'Membership Status', description: 'Member status' },
  { key: 'follow_up_date', label: 'Follow-Up Date', description: 'Next follow-up date' },
];

export function getStatusLabel(status: string): string {
  return COMMUNICATION_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function getStatusBadge(status: string): string {
  return COMMUNICATION_STATUSES.find((s) => s.key === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';
}

export function getJobStatusLabel(status: string): string {
  return JOB_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function getJobStatusBadge(status: string): string {
  return JOB_STATUSES.find((s) => s.key === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';
}

export function getChannelLabel(channel: string): string {
  return CHANNELS.find((c) => c.key === channel)?.label ?? channel;
}

export function getChannelIcon(channel: string): string {
  return CHANNELS.find((c) => c.key === channel)?.icon ?? 'Bell';
}

export function isChannelEligible(channel: CommunicationChannel, recipient: { email: string | null; phone: string | null }): boolean {
  if (channel === 'email') return !!recipient.email;
  if (channel === 'sms' || channel === 'whatsapp') return !!recipient.phone;
  if (channel === 'in_app') return true;
  return false;
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`);
  }
  return rendered;
}

export function getUnresolvedVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, ''))));
}
