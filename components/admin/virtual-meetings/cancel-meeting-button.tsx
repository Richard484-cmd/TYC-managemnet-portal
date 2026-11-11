'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Ban } from 'lucide-react';

interface CancelMeetingButtonProps {
  meetingId: string;
  meetingTitle: string;
}

export function CancelMeetingButton({ meetingId, meetingTitle }: CancelMeetingButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setCancelling(false);
      toast({ title: 'Error', description: 'Your session has expired. Please sign in again.', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/virtual-meeting-manage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId, action: 'cancel' }),
      });
      const body = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !body.success) {
        setCancelling(false);
        toast({ title: 'Error', description: body.error ?? 'Could not cancel the meeting.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Meeting cancelled', description: `${meetingTitle} has been cancelled.` });
      router.refresh();
    } catch {
      setCancelling(false);
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={cancelling}>
          <Ban className="mr-2 h-4 w-4" />
          {cancelling ? 'Cancelling...' : 'Cancel Meeting'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{meetingTitle}&rdquo; will be marked as cancelled. Members will no longer be able to join. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep meeting</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Yes, cancel meeting
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
