import type { TransactionStatus, PaymentMethod } from './types';

export const TRANSACTION_STATUSES: { key: TransactionStatus; label: string; badgeClass: string }[] = [
  { key: 'pending', label: 'Pending', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { key: 'successful', label: 'Successful', badgeClass: 'bg-green-100 text-green-700' },
  { key: 'verified', label: 'Verified', badgeClass: 'bg-green-100 text-green-700' },
  { key: 'failed', label: 'Failed', badgeClass: 'bg-red-100 text-red-700' },
  { key: 'refunded', label: 'Refunded', badgeClass: 'bg-blue-100 text-blue-700' },
  { key: 'reversed', label: 'Reversed', badgeClass: 'bg-gray-100 text-gray-600' },
];

export const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'online', label: 'Online' },
  { key: 'card', label: 'Card' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'mobile', label: 'Mobile Money' },
  { key: 'cash', label: 'Cash' },
  { key: 'check', label: 'Check' },
  { key: 'other', label: 'Other' },
];

export const CURRENCIES = [
  { code: 'NGN', label: 'Nigerian Naira (NGN)', symbol: '₦' },
  { code: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { code: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { code: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { code: 'GHS', label: 'Ghanaian Cedi (GHS)', symbol: '₵' },
  { code: 'KES', label: 'Kenyan Shilling (KES)', symbol: 'KSh' },
  { code: 'ZAR', label: 'South African Rand (ZAR)', symbol: 'R' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)', symbol: 'C$' },
];

export function getStatusLabel(status: string): string {
  return TRANSACTION_STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function getStatusBadge(status: string): string {
  return TRANSACTION_STATUSES.find((s) => s.key === status)?.badgeClass ?? 'bg-gray-100 text-gray-700';
}

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.key === method)?.label ?? method;
}

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
  return `${symbol}${formatted}`;
}

export function isSuccessfulStatus(status: string): boolean {
  return status === 'successful' || status === 'verified';
}
