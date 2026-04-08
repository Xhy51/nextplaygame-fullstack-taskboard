'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const demoAccounts = [
  { email: 'alice@example.com', passwordHint: 'Alice@2026!' },
  { email: 'bob@example.com', passwordHint: 'Bob@2026!' },
  { email: 'carol@example.com', passwordHint: 'Carol@2026!' },
];

export function LoginForm() {
  const router = useRouter();
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('alice@example.com');
  const [password, setPassword] = useState('Alice@2026!');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const helperText = useMemo(() => {
    const matchedAccount = demoAccounts.find((account) => account.email === email.trim());
    return matchedAccount
      ? `Demo password for ${email}: ${matchedAccount.passwordHint}`
      : 'Use the strong demo password configured for this account in Supabase.';
  }, [email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitError(null);
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  };

  return (
    <Card className="w-full max-w-md border-slate-200/80 bg-white/95 shadow-[0_24px_90px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Team Sign In
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-slate-950">Sign in to your board</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">
            Use one of the demo accounts configured in Supabase. These demo users now use stronger preset
            passwords instead of the old short username-only values.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="pl-10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alice@example.com"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="pl-10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Alice@2026!"
                required
              />
            </div>
            <p className="text-xs text-slate-500">{helperText}</p>
          </div>

          {(submitError || error) && (
            <Alert variant="destructive">
              <AlertDescription>{submitError || error?.message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="text-sm font-medium text-slate-800">Demo accounts</div>
          <div className="space-y-2 text-sm text-slate-600">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-transparent bg-white px-3 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.passwordHint);
                }}
              >
                <span className="font-medium text-slate-700">{account.email}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{account.passwordHint}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
