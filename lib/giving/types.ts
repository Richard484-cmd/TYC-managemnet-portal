export type TransactionStatus = 'pending' | 'verified' | 'failed' | 'reversed' | 'refunded' | 'successful';

export type PaymentMethod = 'cash' | 'check' | 'card' | 'bank_transfer' | 'online' | 'mobile' | 'other';

export interface GivingCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fund_code: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GivingTransaction {
  id: string;
  member_id: string | null;
  campaign_id: string | null;
  category_id: string | null;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  provider_name: string | null;
  provider_transaction_id: string | null;
  receipt_number: string | null;
  transaction_date: string;
  is_anonymous: boolean;
  giver_name: string | null;
  giver_email: string | null;
  fund_code: string | null;
  notes: string | null;
  is_reversal: boolean;
  reversal_of_id: string | null;
  status: TransactionStatus;
  verified_by: string | null;
  verified_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string | null;
  category_name?: string | null;
  campaign_name?: string | null;
}

export interface GivingCampaign {
  id: string;
  name: string;
  description: string | null;
  goal_amount: number | null;
  raised_amount: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  is_public: boolean;
  status: string;
  image_url: string | null;
  fund_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface GivingProviderConfig {
  id: string;
  channel: string;
  provider_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceDashboardStats {
  totalSuccessful: number;
  totalPending: number;
  totalFailed: number;
  totalRefunded: number;
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  byCategory: { category_id: string; category_name: string; total: number; count: number; currency: string }[];
  byCurrency: { currency: string; total: number; count: number }[];
  recentTransactions: GivingTransaction[];
}

export interface MemberGivingSummary {
  totalGiving: number;
  successfulCount: number;
  pendingCount: number;
  byCategory: { category_name: string; total: number; count: number }[];
  recentTransactions: GivingTransaction[];
  currency: string;
}
