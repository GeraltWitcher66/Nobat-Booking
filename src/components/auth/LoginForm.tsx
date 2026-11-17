'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { brand } from '@/config/brand';
import { loginCustomer, loginWithPassword, requestSmsCode } from '@/lib/api';
import { writeSession } from '@/lib/auth/session';
import { cn } from '@/lib/cn';
import { toLatinDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { withBase } from '@/lib/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/providers/ToastProvider';
import type { Session } from '@/types';

type Props = {
  locale: Locale;
  dict: Dictionary;
  initialTab?: 'customer' | 'staff';
  compact?: boolean;
  onSuccess?: (session: Session) => void;
};

export const LoginForm = ({ locale, dict, initialTab = 'customer', compact, onSuccess }: Props) => {
  const router = useRouter();
  const { show } = useToast();
  const [tab, setTab] = useState<'customer' | 'staff'>(initialTab);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectFor = (session: Session) => {
    const path =
      session.role === 'admin' ? 'admin' : session.role === 'staff' ? 'staff' : 'account';
    router.replace(withBase(localePath(locale, path)));
  };

  const finish = (session: Session) => {
    writeSession(session);
    show(`${dict.auth.welcome} ${session.name}`, 'success');
    onSuccess?.(session);
    redirectFor(session);
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestSmsCode(toLatinDigits(phone));
      setCodeSent(true);
      show(brand.demo.smsCode, 'info');
    } catch {
      setError(dict.auth.invalidPhone);
    } finally {
      setBusy(false);
    }
  };

  const submitCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await loginCustomer(toLatinDigits(phone), toLatinDigits(code));
      finish(session);
    } catch {
      setError(dict.auth.invalidCode);
    } finally {
      setBusy(false);
    }
  };

  const submitStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await loginWithPassword(email, password);
      finish(session);
    } catch {
      setError(dict.auth.invalidCredentials);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div className="flex rounded-full border border-line bg-elevated/60 p-1 text-xs">
        {(
          [
            { value: 'customer', label: dict.auth.customerTab },
            { value: 'staff', label: dict.auth.staffTab },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setTab(option.value);
              setError(null);
            }}
            className={cn(
              'flex-1 rounded-full px-3 py-2 transition',
              tab === option.value ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === 'customer' ? (
        <form onSubmit={submitCustomer} className="space-y-3">
          <Field label={dict.auth.phoneLabel} hint={dict.auth.phoneHint}>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              dir="ltr"
              placeholder="0500000000"
              autoComplete="tel"
            />
          </Field>

          {codeSent ? (
            <Field label={dict.auth.codeLabel} hint={dict.booking.demoCodeHint}>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                dir="ltr"
                placeholder="----"
                className="text-center text-lg tracking-[0.5em]"
              />
            </Field>
          ) : null}

          {error && <p className="text-xs text-danger">{error}</p>}

          {codeSent ? (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={sendCode} loading={busy} className="flex-1">
                {dict.auth.sendCode}
              </Button>
              <Button type="submit" loading={busy} disabled={code.length !== 4} className="flex-1">
                {dict.auth.verify}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={sendCode} loading={busy} className="w-full" disabled={phone.length < 10}>
              {dict.auth.sendCode}
            </Button>
          )}
        </form>
      ) : (
        <form onSubmit={submitStaff} className="space-y-3">
          <Field label={dict.common.email}>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              dir="ltr"
              placeholder="admin@demo.test"
              autoComplete="email"
            />
          </Field>
          <Field label={dict.auth.password}>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              dir="ltr"
              placeholder="password"
              autoComplete="current-password"
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">
            {dict.auth.login}
          </Button>
        </form>
      )}

      <div className="rounded-xl border border-dashed border-line bg-elevated/40 p-3 text-[11px] leading-6 text-muted">
        <p className="font-medium text-ink">{dict.auth.demoAccounts}</p>
        <p dir="ltr" className="text-start">{dict.auth.adminCreds}</p>
        <p dir="ltr" className="text-start">{dict.auth.staffCreds}</p>
        <p>{dict.auth.customerCreds}</p>
      </div>
    </div>
  );
};
