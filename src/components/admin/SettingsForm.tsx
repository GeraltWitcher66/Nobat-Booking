'use client';

import { useEffect, useState } from 'react';
import { getSettings, resetDemoData, updateSettings } from '@/lib/api';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Settings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { SectionHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

export function SettingsForm({ locale, dict }: Props) {
  const { show } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const patch = (partial: Partial<Settings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...partial });
  };

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    try {
      await updateSettings(settings);
      show(dict.admin.settings.saved, 'success');
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!settings) {
    return (
      <div className="space-y-4">
        <SectionHeader title={dict.admin.settings.title} subtitle={dict.admin.settings.subtitle} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={dict.admin.settings.title}
        subtitle={dict.admin.settings.subtitle}
        action={
          <Button size="sm" onClick={save} loading={busy}>
            {dict.common.save}
          </Button>
        }
      />

      <section className="card space-y-3 p-4">
        <p className="text-xs font-medium text-muted">{dict.admin.settings.salonInfo}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={dict.admin.settings.salonNameFa}>
            <Input
              value={settings.salonName.fa}
              onChange={(event) => patch({ salonName: { ...settings.salonName, fa: event.target.value } })}
            />
          </Field>
          <Field label={dict.admin.settings.salonNameEn}>
            <Input
              value={settings.salonName.en}
              onChange={(event) => patch({ salonName: { ...settings.salonName, en: event.target.value } })}
              dir="ltr"
            />
          </Field>
          <Field label={dict.admin.settings.taglineFa}>
            <Input
              value={settings.tagline.fa}
              onChange={(event) => patch({ tagline: { ...settings.tagline, fa: event.target.value } })}
            />
          </Field>
          <Field label={dict.admin.settings.taglineEn}>
            <Input
              value={settings.tagline.en}
              onChange={(event) => patch({ tagline: { ...settings.tagline, en: event.target.value } })}
              dir="ltr"
            />
          </Field>
          <Field label={dict.admin.settings.phone}>
            <Input value={settings.phone} onChange={(event) => patch({ phone: event.target.value })} dir="ltr" />
          </Field>
          <Field label={dict.admin.settings.email}>
            <Input value={settings.email} onChange={(event) => patch({ email: event.target.value })} dir="ltr" />
          </Field>
          <Field label={dict.admin.settings.addressFa}>
            <Input
              value={settings.address.fa}
              onChange={(event) => patch({ address: { ...settings.address, fa: event.target.value } })}
            />
          </Field>
          <Field label={dict.admin.settings.addressEn}>
            <Input
              value={settings.address.en}
              onChange={(event) => patch({ address: { ...settings.address, en: event.target.value } })}
              dir="ltr"
            />
          </Field>
        </div>
        <p className="rounded-xl bg-elevated/50 px-3 py-2 text-[11px] text-muted">
          {dict.admin.settings.brandNote}
        </p>
      </section>

      <section className="card space-y-3 p-4">
        <p className="text-xs font-medium text-muted">{dict.admin.settings.cancellation}</p>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Field label={dict.admin.settings.hoursBefore}>
            <Input
              type="number"
              value={settings.cancellation.hoursBefore}
              onChange={(event) =>
                patch({
                  cancellation: { ...settings.cancellation, hoursBefore: Number(event.target.value) },
                })
              }
              dir="ltr"
            />
          </Field>
          <Field label={dict.admin.settings.policyFa}>
            <Textarea
              value={settings.cancellation.policy.fa}
              onChange={(event) =>
                patch({
                  cancellation: {
                    ...settings.cancellation,
                    policy: { ...settings.cancellation.policy, fa: event.target.value },
                  },
                })
              }
            />
          </Field>
          <div />
          <Field label={dict.admin.settings.policyEn}>
            <Textarea
              value={settings.cancellation.policy.en}
              onChange={(event) =>
                patch({
                  cancellation: {
                    ...settings.cancellation,
                    policy: { ...settings.cancellation.policy, en: event.target.value },
                  },
                })
              }
              dir="ltr"
            />
          </Field>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <p className="text-xs font-medium text-muted">{dict.admin.settings.payments}</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label={dict.admin.settings.depositPercent}>
            <Input
              type="number"
              value={settings.depositPercent}
              onChange={(event) => patch({ depositPercent: Number(event.target.value) })}
              dir="ltr"
            />
          </Field>
          <Field label={dict.admin.settings.currency}>
            <Select
              value={settings.defaultCurrency}
              onChange={(event) => patch({ defaultCurrency: event.target.value as Settings['defaultCurrency'] })}
            >
              <option value="AED">AED</option>
              <option value="IRR">IRR</option>
            </Select>
          </Field>
          <Field label={dict.admin.settings.slotStep}>
            <Input
              type="number"
              value={settings.slotStepMin}
              onChange={(event) => patch({ slotStepMin: Number(event.target.value) })}
              dir="ltr"
            />
          </Field>
          <Field label={dict.admin.settings.leadTime}>
            <Input
              type="number"
              value={settings.leadTimeMin}
              onChange={(event) => patch({ leadTimeMin: Number(event.target.value) })}
              dir="ltr"
            />
          </Field>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">{dict.admin.settings.sms}</p>
          <p className="text-[10px] text-muted" dir="ltr">
            {dict.admin.settings.variables}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={dict.admin.settings.smsConfirmation}>
            <Textarea
              value={settings.sms.confirmation[locale]}
              onChange={(event) =>
                patch({
                  sms: {
                    ...settings.sms,
                    confirmation: { ...settings.sms.confirmation, [locale]: event.target.value },
                  },
                })
              }
            />
          </Field>
          <Field label={dict.admin.settings.smsReminder}>
            <Textarea
              value={settings.sms.reminder[locale]}
              onChange={(event) =>
                patch({
                  sms: { ...settings.sms, reminder: { ...settings.sms.reminder, [locale]: event.target.value } },
                })
              }
            />
          </Field>
          <Field label={dict.admin.settings.smsCancellation} className="sm:col-span-2">
            <Textarea
              value={settings.sms.cancellation[locale]}
              onChange={(event) =>
                patch({
                  sms: {
                    ...settings.sms,
                    cancellation: { ...settings.sms.cancellation, [locale]: event.target.value },
                  },
                })
              }
            />
          </Field>
        </div>
      </section>

      <section className="card space-y-2 p-4">
        <p className="text-xs font-medium text-muted">{dict.admin.settings.demoData}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} loading={busy}>
            {dict.common.save}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (!window.confirm(dict.admin.settings.resetConfirm)) return;
              resetDemoData();
              show(dict.admin.settings.resetDone, 'success');
              getSettings().then(setSettings);
            }}
          >
            {dict.admin.settings.resetDemo}
          </Button>
        </div>
      </section>
    </div>
  );
}
