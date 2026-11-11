'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'verified' | 'unverified'>(
    'loading'
  );

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      if (user.email_confirmed_at) {
        setStatus('verified');
        return;
      }

      setStatus('unverified');
    })();
  }, [supabase, router]);

  async function handleResend() {
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Email Verified</CardTitle>
            <CardDescription>
              Your email has been verified. You can now access your account.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/member/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a verification link to your email. Click the link to verify
            your account, then return here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Already clicked the link?{' '}
            <button
              onClick={() => window.location.reload()}
              className="text-primary hover:underline"
            >
              Refresh this page
            </button>
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button variant="outline" className="w-full" onClick={handleResend}>
            Resend Verification Email
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
