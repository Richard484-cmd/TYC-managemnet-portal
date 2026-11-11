import { Suspense } from 'react';
import { AuthSwitchShell } from '@/components/auth/auth-switch-shell';
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--brand-navy-900)]" />}>
      <AuthSwitchShell initialMode="register" />
    </Suspense>
  );
}
