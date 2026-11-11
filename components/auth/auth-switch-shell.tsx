'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';

export type AuthMode = 'login' | 'register';

interface AuthSwitchShellProps {
  initialMode: AuthMode;
}

const MODE_PATHS: Record<AuthMode, string> = {
  login: '/login',
  register: '/register',
};

const COLUMN_HEADINGS: Record<AuthMode, { title: string; description: string }> = {
  login: {
    title: 'Welcome back',
    description: 'Sign in to your TYC account to continue.',
  },
  register: {
    title: 'Create your account',
    description: 'Join the community and stay connected with TYC.',
  },
};

const SWITCH_COPY: Record<AuthMode, { prompt: string; hint: string; action: string; target: AuthMode }> = {
  login: {
    prompt: "Don't have an account?",
    hint: 'Join the TYC family to register for events, share prayer requests, and stay connected.',
    action: 'Sign up',
    target: 'register',
  },
  register: {
    prompt: 'Already part of TYC?',
    hint: 'Sign in to view your dashboard, manage your giving, and keep up with your ministries.',
    action: 'Sign in',
    target: 'login',
  },
};

export function AuthSwitchShell({ initialMode }: AuthSwitchShellProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const isLogin = mode === 'login';
  const copy = SWITCH_COPY[mode];

  function switchMode(next: AuthMode) {
    setMode(next);
    window.history.replaceState(window.history.state, '', `${MODE_PATHS[next]}${window.location.search}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--brand-navy-900)] p-4 sm:p-8">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/10 md:grid md:grid-cols-2">
        <AuthColumn active={isLogin} heading={COLUMN_HEADINGS.login}>
          {isLogin ? <LoginForm /> : null}
        </AuthColumn>
        <AuthColumn active={!isLogin} heading={COLUMN_HEADINGS.register}>
          {isLogin ? null : <RegisterForm />}
        </AuthColumn>

        <div
          className={cn(
            'absolute inset-y-0 hidden w-1/2 overflow-hidden bg-gradient-to-br from-[var(--brand-navy-800)] to-[var(--brand-navy-900)] text-white transition-[left] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] md:block',
            isLogin ? 'left-1/2' : 'left-0',
          )}
        >
          <span className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rotate-12 rounded-3xl bg-white/5" />
          <span className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 -rotate-12 rounded-3xl bg-[var(--brand-gold)]/10" />
          <div key={mode} className="auth-panel-enter relative flex h-full flex-col items-center justify-center px-12 text-center">
            <p className="font-serif text-3xl leading-[1.2]">{copy.prompt}</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">{copy.hint}</p>
            <button
              type="button"
              onClick={() => switchMode(copy.target)}
              className="mt-8 rounded-md border border-white/80 px-8 py-2.5 text-sm font-semibold tracking-wide transition-colors hover:bg-white hover:text-[var(--brand-navy-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-900)]"
            >
              {copy.action}
            </button>
          </div>
        </div>

        <div className="overflow-hidden bg-gradient-to-br from-[var(--brand-navy-800)] to-[var(--brand-navy-900)] px-8 py-8 text-center text-white md:hidden">
          <div key={mode} className="auth-panel-enter">
            <p className="font-serif text-2xl leading-[1.2]">{copy.prompt}</p>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/75">{copy.hint}</p>
            <button
              type="button"
              onClick={() => switchMode(copy.target)}
              className="mt-6 rounded-full border border-white/80 px-7 py-2.5 text-sm font-semibold tracking-wide transition-colors hover:bg-white hover:text-[var(--brand-navy-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-900)]"
            >
              {copy.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthColumn({
  active,
  heading,
  children,
}: {
  active: boolean;
  heading: { title: string; description: string };
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex flex-col justify-center px-8 py-12 transition-[opacity,transform,visibility] duration-500 ease-out sm:px-12',
        active
          ? 'flex md:visible md:translate-y-0 md:opacity-100 md:delay-200'
          : 'hidden md:flex md:invisible md:translate-y-3 md:opacity-0',
      )}
    >
      <Link href="/" aria-label="Return to the home page" className="mb-6 inline-flex w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2">
        <img
          src="/images/logo/image.png"
          alt="The Youth Church logo"
          width={56}
          height={56}
          className="h-14 w-14 object-contain transition-transform duration-200 hover:scale-105"
        />
      </Link>
      <h1 className="font-serif text-3xl leading-[1.2] text-[var(--brand-navy-900)]">{heading.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{heading.description}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}
