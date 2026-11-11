'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  TRANSACTION_STATUSES,
  CURRENCIES,
  getStatusLabel,
  getStatusBadge,
  getPaymentMethodLabel,
  getCurrencySymbol,
  formatAmount,
  isSuccessfulStatus,
} from '@/lib/giving/constants';
import type {
  GivingCategory,
  GivingTransaction,
} from '@/lib/giving/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Heart, CheckCircle2, Loader2, ArrowDownRight, ArrowUpRight,
  Clock, AlertCircle, FileText, Download,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// TransactionStatusBadge
// ============================================================================

export function TransactionStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', getStatusBadge(status))}>
      {getStatusLabel(status)}
    </span>
  );
}

// ============================================================================
// GivingCategorySelector
// ============================================================================

export function GivingCategorySelector({
  categories,
  value,
  onChange,
}: {
  categories: GivingCategory[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Giving Category</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// AmountInput
// ============================================================================

export function AmountInput({
  currency,
  onCurrencyChange,
  amount,
  onAmountChange,
}: {
  currency: string;
  onCurrencyChange: (c: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
}) {
  const symbol = getCurrencySymbol(currency);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">{symbol}</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="pl-10 text-lg font-medium"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================================================
// GivingForm — member-facing giving form
// ============================================================================

export function GivingForm({
  categories,
  memberId,
  onSubmitted,
}: {
  categories: GivingCategory[];
  memberId: string;
  onSubmitted?: () => void;
}) {
  const supabase = createClient();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!categoryId) { toast.error('Please select a giving category'); return; }
    if (!amt || amt <= 0) { toast.error('Please enter a valid amount'); return; }

    setSubmitting(true);
    const { data: refData } = await supabase.rpc('generate_transaction_reference');
    const reference = refData as string;

    const category = categories.find((c) => c.id === categoryId);

    const { error } = await supabase.from('giving_transactions').insert({
      member_id: memberId,
      category_id: categoryId,
      amount: amt,
      currency,
      payment_method: 'online',
      payment_reference: reference,
      fund_code: category?.fund_code ?? null,
      is_anonymous: isAnonymous,
      notes: notes || null,
      status: 'pending',
      transaction_date: new Date().toISOString(),
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to initiate transaction');
      return;
    }

    setTransactionRef(reference);
    setSuccess(true);
    setAmount('');
    setNotes('');
    setCategoryId('');
    toast.success('Transaction initiated successfully');
    onSubmitted?.();
  };

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <div>
            <p className="font-medium">Transaction Initiated</p>
            <p className="text-sm text-muted-foreground">Your transaction is pending processing.</p>
            <p className="mt-2 text-xs font-mono text-muted-foreground">Reference: {transactionRef}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSuccess(false)}>
            Make Another Contribution
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <GivingCategorySelector categories={categories} value={categoryId} onChange={setCategoryId} />
      <AmountInput currency={currency} onCurrencyChange={setCurrency} amount={amount} onAmountChange={setAmount} />
      <div className="flex items-center gap-2">
        <Checkbox checked={isAnonymous} onCheckedChange={(v) => setIsAnonymous(!!v)} />
        <span className="text-sm">Give anonymously</span>
      </div>
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>
      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Heart className="mr-2 h-4 w-4" />Give {amount && parseFloat(amount) > 0 ? formatAmount(parseFloat(amount), currency) : ''}</>}
      </Button>
    </div>
  );
}

// ============================================================================
// TransactionCard
// ============================================================================

export function TransactionCard({ transaction }: { transaction: GivingTransaction }) {
  const positive = isSuccessfulStatus(transaction.status) && !transaction.is_reversal;
  const Icon = positive ? ArrowUpRight : transaction.status === 'pending' ? Clock : transaction.status === 'failed' ? AlertCircle : ArrowDownRight;

  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        positive ? 'bg-green-50' : transaction.status === 'pending' ? 'bg-yellow-50' : 'bg-red-50'
      )}>
        <Icon className={cn(
          'h-4 w-4',
          positive ? 'text-green-600' : transaction.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
        )} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {transaction.category_name ?? 'Giving'}
          </p>
          <span className={cn('text-sm font-semibold', positive ? 'text-green-600' : 'text-muted-foreground')}>
            {positive ? '+' : ''}{formatAmount(Number(transaction.amount), transaction.currency)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <TransactionStatusBadge status={transaction.status} />
          <span className="text-xs text-muted-foreground">
            {new Date(transaction.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        {transaction.payment_reference && (
          <p className="mt-0.5 text-xs font-mono text-muted-foreground">{transaction.payment_reference}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TransactionTable
// ============================================================================

export function TransactionTable({ transactions }: { transactions: GivingTransaction[] }) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No transactions found.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 font-medium">Member</th>
            <th className="pb-2 pr-4 font-medium">Category</th>
            <th className="pb-2 pr-4 font-medium">Amount</th>
            <th className="pb-2 pr-4 font-medium">Reference</th>
            <th className="pb-2 pr-4 font-medium">Provider</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="py-2 pr-4 text-xs text-muted-foreground">
                {new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </td>
              <td className="py-2 pr-4">
                {t.is_anonymous ? 'Anonymous' : (t.member_name ?? t.giver_name ?? '—')}
              </td>
              <td className="py-2 pr-4">{t.category_name ?? '—'}</td>
              <td className="py-2 pr-4 font-medium">{formatAmount(Number(t.amount), t.currency)}</td>
              <td className="py-2 pr-4 font-mono text-xs">{t.payment_reference ?? '—'}</td>
              <td className="py-2 pr-4">{t.provider_name ?? '—'}</td>
              <td className="py-2"><TransactionStatusBadge status={t.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// TransactionFilters
// ============================================================================

export function TransactionFilters({
  search,
  status,
  category,
  currency,
  dateFrom,
  dateTo,
  categories,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onCurrencyChange,
  onDateFromChange,
  onDateToDateChange,
  onApply,
}: {
  search: string;
  status: string;
  category: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  categories: GivingCategory[];
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onCurrencyChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToDateChange: (v: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search by reference or name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full sm:w-56"
        />
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TRANSACTION_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="h-9 w-28"><SelectValue placeholder="Currency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => onDateToDateChange(e.target.value)} className="h-9" />
        </div>
        <Button size="sm" onClick={onApply}>Apply Filters</Button>
      </div>
    </div>
  );
}

// ============================================================================
// TransactionDetail
// ============================================================================

export function TransactionDetail({
  transaction,
  canVerify,
  canRefund,
  onVerify,
  onRefund,
}: {
  transaction: GivingTransaction;
  canVerify?: boolean;
  canRefund?: boolean;
  onVerify?: () => void;
  onRefund?: () => void;
}) {
  const fields = [
    { label: 'Reference', value: transaction.payment_reference ?? '—' },
    { label: 'Status', value: <TransactionStatusBadge status={transaction.status} /> },
    { label: 'Amount', value: formatAmount(Number(transaction.amount), transaction.currency) },
    { label: 'Category', value: transaction.category_name ?? '—' },
    { label: 'Payment Method', value: getPaymentMethodLabel(transaction.payment_method) },
    { label: 'Provider', value: transaction.provider_name ?? '—' },
    { label: 'Provider Txn ID', value: transaction.provider_transaction_id ?? '—' },
    { label: 'Member', value: transaction.is_anonymous ? 'Anonymous' : (transaction.member_name ?? '—') },
    { label: 'Date', value: new Date(transaction.transaction_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
    { label: 'Completed', value: transaction.completed_at ? new Date(transaction.completed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
    { label: 'Receipt #', value: transaction.receipt_number ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
            <p className="mt-0.5 text-sm">{f.value}</p>
          </div>
        ))}
      </div>
      {transaction.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          <p className="mt-0.5 text-sm">{transaction.notes}</p>
        </div>
      )}
      {(canVerify || canRefund) && (
        <div className="flex gap-2 border-t pt-4">
          {canVerify && transaction.status === 'pending' && (
            <Button size="sm" onClick={onVerify}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Verify Transaction
            </Button>
          )}
          {canRefund && isSuccessfulStatus(transaction.status) && (
            <Button size="sm" variant="outline" onClick={onRefund}>
              <ArrowDownRight className="mr-1 h-4 w-4" />
              Mark as Refunded
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ReceiptViewer
// ============================================================================

export function ReceiptViewer({
  transaction,
  churchName,
}: {
  transaction: GivingTransaction;
  churchName: string;
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardContent className="p-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-bold">{churchName}</h3>
            <p className="text-xs text-muted-foreground">Giving Receipt</p>
          </div>
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-3 py-4">
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Receipt No:</span><span className="text-sm font-mono">{transaction.receipt_number ?? transaction.payment_reference ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date:</span><span className="text-sm">{new Date(transaction.transaction_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span></div>
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Donor:</span><span className="text-sm">{transaction.is_anonymous ? 'Anonymous' : (transaction.member_name ?? transaction.giver_name ?? '—')}</span></div>
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Category:</span><span className="text-sm">{transaction.category_name ?? '—'}</span></div>
          <div className="flex justify-between border-t pt-3"><span className="text-sm font-medium">Amount:</span><span className="text-sm font-bold">{formatAmount(Number(transaction.amount), transaction.currency)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Status:</span><TransactionStatusBadge status={transaction.status} /></div>
        </div>
        <p className="border-t pt-4 text-center text-xs text-muted-foreground">
          Thank you for your generous contribution to {churchName}.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="mr-1 h-4 w-4" />
            Download Receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// GivingSummary (member)
// ============================================================================

export function GivingSummary({
  totalGiving,
  successfulCount,
  pendingCount,
  byCategory,
  currency,
}: {
  totalGiving: number;
  successfulCount: number;
  pendingCount: number;
  byCategory: { category_name: string; total: number; count: number }[];
  currency: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Giving</p>
          <p className="mt-1 text-2xl font-bold">{formatAmount(totalGiving, currency)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Successful Transactions</p>
          <p className="mt-1 text-2xl font-bold">{successfulCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
        </CardContent>
      </Card>
      {byCategory.length > 0 && (
        <Card className="sm:col-span-3">
          <CardContent className="p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Giving by Category</p>
            <div className="space-y-2">
              {byCategory.map((c) => (
                <div key={c.category_name} className="flex items-center justify-between text-sm">
                  <span>{c.category_name}</span>
                  <span className="font-medium">{formatAmount(c.total, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
