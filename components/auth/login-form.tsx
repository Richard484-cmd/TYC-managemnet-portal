'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { STAFF_ROLES } from '@/lib/auth/constants';

const STAFF_ROLE_KEYS = STAFF_ROLES.map((role) => role as string);

async function getDashboardPath(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from('role_assignments')
    .select('role_key')
    .eq('user_id', userId)
    .is('revoked_at', null);

  const roles = (data ?? []).map((role) => role.role_key);
  return roles.some((role) => STAFF_ROLE_KEYS.includes(role)) ? '/admin/dashboard' : '/member/dashboard';
}

function describeSignInError(error: AuthError): string {
  const code = error.code ?? '';
  if (code === 'invalid_credentials' || error.message.toLowerCase().includes('invalid login credentials')) {
    return "Invalid email or password. Please check your details and try again, or create an account if you're new.";
  }
  if (code === 'email_not_confirmed') {
    return "Your email hasn't been confirmed yet. Please check your inbox for a verification link.";
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || error.status === 429) {
    return 'Too many sign-in attempts. Please wait a minute and try again.';
  }
  if ((error.status ?? 0) >= 500) {
    return 'Sign-in is temporarily unavailable. Please try again in a few minutes.';
  }
  return 'Sign-in failed. Please try again.';
}

export function LoginForm() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const resetSuccess = searchParams.get('reset') === 'success';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch {
      setError('Sign-in is temporarily unavailable. Please refresh and try again.');
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(describeSignInError(signInError));
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Sign-in failed. Please try again.');
        setLoading(false);
        return;
      }

      const nextPath = redirect?.startsWith('/')
        ? redirect
        : await getDashboardPath(supabase, data.user.id);
      window.location.assign(nextPath);
    } catch (error) {
      console.error('Unable to sign in:', error);
      setError('We could not complete sign-in. Please check your connection and try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {resetSuccess && !error && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Your password has been reset. Please sign in with your new password.
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-navy-800)]">Forgot password?</Link>
        </div>
        <div className="relative">
          <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="rounded-lg pr-10" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full bg-[var(--brand-navy-800)] text-white shadow-sm transition-colors hover:bg-[var(--brand-navy-900)]" disabled={loading || !supabase}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
        Sign In
      </Button>
    </form>
  );
}
