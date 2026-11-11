import type { TransactionStatus } from './types';

export interface PaymentProviderConfig {
  providerName: string;
  isActive: boolean;
}

export interface PaymentInitResult {
  success: boolean;
  reference?: string;
  checkoutUrl?: string;
  providerTransactionId?: string;
  failureReason?: string;
}

export interface PaymentProvider {
  readonly channel: 'online';
  initiatePayment(params: {
    amount: number;
    currency: string;
    reference: string;
    email?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentInitResult>;
  verifyPayment(params: {
    reference: string;
    providerTransactionId?: string;
  }): Promise<{
    success: boolean;
    status: TransactionStatus;
    providerTransactionId?: string;
    failureReason?: string;
  }>;
  handleWebhook(payload: unknown, signature?: string): Promise<{
    reference: string;
    status: TransactionStatus;
    providerTransactionId?: string;
    amount?: number;
    currency?: string;
  }>;
  validateConfig(): boolean;
  getProviderName(): string;
}

export function normalizeProviderStatus(rawStatus: string): TransactionStatus {
  const lower = rawStatus.toLowerCase();
  if (['success', 'successful', 'paid', 'captured', 'settled'].includes(lower)) return 'successful';
  if (['pending', 'initiated', 'processing', 'awaiting_payment', 'queued'].includes(lower)) return 'pending';
  if (['failed', 'declined', 'cancelled', 'canceled', 'expired', 'abandoned'].includes(lower)) return 'failed';
  if (['refunded', 'reversed'].includes(lower)) return 'refunded';
  if (['verified'].includes(lower)) return 'verified';
  return 'pending';
}
