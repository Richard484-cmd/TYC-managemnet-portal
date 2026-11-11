'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  TransactionDetail,
  ReceiptViewer,
} from '@/components/admin/giving/giving-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, ArrowDownRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GivingTransaction } from '@/lib/giving/types';
import { isSuccessfulStatus } from '@/lib/giving/constants';

export function TransactionDetailClient({
  transaction,
  churchName,
  canVerify,
  canRefund,
}: {
  transaction: GivingTransaction;
  churchName: string;
  canVerify: boolean;
  canRefund: boolean;
}) {
  const supabase = createClient();
  const [current, setCurrent] = useState<GivingTransaction>(transaction);
  const [actionLoading, setActionLoading] = useState(false);

  const handleVerify = async () => {
    setActionLoading(true);
    const { error } = await supabase.rpc('verify_giving_transaction', {
      p_transaction_id: current.id,
    });

    setActionLoading(false);
    if (error) {
      toast.error('Failed to verify transaction');
      return;
    }
    setCurrent({ ...current, status: 'verified', verified_at: new Date().toISOString(), completed_at: new Date().toISOString() });
    toast.success('Transaction verified successfully');
  };

  const handleRefund = async () => {
    setActionLoading(true);
    const { error } = await supabase.rpc('refund_giving_transaction', {
      p_transaction_id: current.id,
    });

    setActionLoading(false);
    if (error) {
      toast.error('Failed to mark transaction as refunded');
      return;
    }
    setCurrent({ ...current, status: 'refunded', refunded_at: new Date().toISOString() });
    toast.success('Transaction marked as refunded');
  };

  return (
    <Tabs defaultValue="detail">
      <TabsList>
        <TabsTrigger value="detail">Details</TabsTrigger>
        <TabsTrigger value="receipt">Receipt</TabsTrigger>
      </TabsList>
      <TabsContent value="detail">
        <Card>
          <CardContent className="p-6">
            {actionLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <TransactionDetail
                transaction={current}
                canVerify={canVerify}
                canRefund={canRefund}
                onVerify={handleVerify}
                onRefund={handleRefund}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="receipt">
        {isSuccessfulStatus(current.status) ? (
          <ReceiptViewer transaction={current} churchName={churchName} />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Receipts are only available for successful transactions.
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
