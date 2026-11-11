'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { STAFF_ROLES } from '@/lib/auth/constants';

const STAFF_ROLE_KEYS = STAFF_ROLES.map((r) => r as string);

export function RegisterForm() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered') || signUpError.message.toLowerCase().includes('already been registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('users').upsert({
        id: data.user.id,
        email,
        display_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        status: 'active',
      });

      if (profileError) {
        console.error('Profile creation error:', profileError.message);
      }

      if (data.session) {
        const { data: roleData } = await supabase
          .from('role_assignments')
          .select('role_key')
          .eq('user_id', data.user.id)
          .is('revoked_at', null);

        const roles = (roleData ?? []).map((r) => r.role_key);
        const hasStaffRole = roles.some((r) => STAFF_ROLE_KEYS.includes(r));
        router.refresh();
        router.push(hasStaffRole ? '/admin/dashboard' : '/member/dashboard');
        return;
      }

      // No session returned — try signing in with the credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        router.refresh();
        router.push('/verify-email');
        return;
      }

      const { data: roleData2 } = await supabase
        .from('role_assignments')
        .select('role_key')
        .eq('user_id', data.user.id)
        .is('revoked_at', null);

      const roles2 = (roleData2 ?? []).map((r) => r.role_key);
      const hasStaffRole2 = roles2.some((r) => STAFF_ROLE_KEYS.includes(r));
      router.refresh();
      router.push(hasStaffRole2 ? '/admin/dashboard' : '/member/dashboard');
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="e.g. John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="e.g. Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="rounded-lg"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-lg"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="rounded-lg pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="rounded-lg pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full bg-[var(--brand-navy-800)] text-white shadow-sm transition-colors hover:bg-[var(--brand-navy-900)]" disabled={loading || !supabase}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Create Account
      </Button>
    </form>
  );
}
