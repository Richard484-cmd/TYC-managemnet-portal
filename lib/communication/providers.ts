import type { CommunicationChannel, CommunicationStatus } from './types';

export interface SendResult {
  success: boolean;
  status: CommunicationStatus;
  providerRef?: string;
  failureReason?: string;
}

export interface ProviderConfig {
  providerName: string;
  isActive: boolean;
}

export interface EmailProvider {
  readonly channel: 'email';
  send(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<SendResult>;
  validateConfig(): boolean;
  getProviderName(): string;
}

export interface SMSProvider {
  readonly channel: 'sms';
  send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<SendResult>;
  validateConfig(): boolean;
  getProviderName(): string;
}

export interface WhatsAppProvider {
  readonly channel: 'whatsapp';
  send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<SendResult>;
  validateConfig(): boolean;
  getProviderName(): string;
}

export interface InAppProvider {
  readonly channel: 'in_app';
  send(params: {
    userId?: string;
    title: string;
    body: string;
    link?: string;
  }): Promise<SendResult>;
  validateConfig(): boolean;
  getProviderName(): string;
}

export type ChannelProvider = EmailProvider | SMSProvider | WhatsAppProvider | InAppProvider;

export function normalizeProviderStatus(rawStatus: string): CommunicationStatus {
  const lower = rawStatus.toLowerCase();
  if (['queued', 'accepted', 'sending'].includes(lower)) return 'sending';
  if (['sent', 'delivered'].includes(lower)) return 'delivered' as CommunicationStatus;
  if (['undelivered', 'failed', 'rejected', 'bounce', 'bounced'].includes(lower)) return 'failed';
  if (['cancelled', 'canceled'].includes(lower)) return 'cancelled';
  return 'sent';
}
