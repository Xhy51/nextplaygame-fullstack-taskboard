'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, router, user]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-16">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.4)_0%,transparent_40%,rgba(15,23,42,0.03)_100%)]" />
      <div className="relative grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur">
            Dev Authentication
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Sign in with a fixed team account and continue building the collaborative board.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              This dev branch now uses Supabase email and password accounts instead of guest sessions, so
              we can safely move into organization members, assignees, and per-user task visibility.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              'Account-based login',
              'Per-user task visibility',
              'Ready for team assignments',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/70 bg-white/75 px-4 py-4 text-sm font-medium text-slate-700 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.45)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
