'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createService, deleteService, getServices, getStaff, saveService } from '@/lib/api';
import { asset } from '@/lib/asset';
import { cn } from '@/lib/cn';
import { formatDuration, formatMoney } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Service, ServiceCategory, Staff } from '@/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { SectionHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

const CATEGORIES: ServiceCategory[] = [
  'hair',
  'color',
  'treatment',
  'makeup',
  'nails',
  'brows',
  'skin',
  'lashes',
];

const emptyService = (): Service => ({
  id: '',
  slug: '',
  name: { fa: '', en: '' },
  description: { fa: '', en: '' },
  category: 'hair',
  durationMin: 45,
  bufferMin: 10,
  prices: { AED: 100, IRR: 0 },
  staffIds: [],
  image: '/images/services/haircut.jpg',
  active: true,
});

export function ServiceManager({ locale, dict }: Props) {
  const { show } = useToast();
  const [services, setServices] = useState<Service[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [draft, setDraft] = useState<Service | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [serviceList, staffList] = await Promise.all([getServices(), getStaff()]);
    setServices(serviceList);
    setStaff(staffList);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const staffMap = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      if (isNew) {
        const { id: _id, slug: _slug, ...rest } = draft;
        await createService(rest);
      } else {
        await saveService(draft);
      }
      show(dict.common.saved, 'success');
      setDraft(null);
      await load();
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (service: Service) => {
    if (!window.confirm(dict.admin.services.deleteConfirm)) return;
    await deleteService(service.id);
    show(dict.common.saved, 'success');
    await load();
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title={dict.admin.services.title}
        subtitle={dict.admin.services.subtitle}
        action={
          <Button
            size="sm"
            onClick={() => {
              setDraft(emptyService());
              setIsNew(true);
            }}
          >
            {dict.admin.services.add}
          </Button>
        }
      />

      {services === null && <Skeleton className="h-40 w-full" />}

      <div className="grid gap-3 sm:grid-cols-2">
        {services?.map((service) => (
          <article key={service.id} className="card flex gap-3 p-3">
            <img
              src={asset(service.image)}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-sm font-medium">{service.name[locale]}</h3>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px]',
                    service.active ? 'bg-success/10 text-success' : 'bg-elevated text-muted',
                  )}
                >
                  {service.active ? dict.admin.services.active : dict.admin.team.closed}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">
                {formatDuration(service.durationMin, locale)} · +{formatDuration(service.bufferMin, locale)}
              </p>
              <p className="text-[11px] font-medium">
                {formatMoney(service.prices.AED, 'AED', locale)} · {formatMoney(service.prices.IRR, 'IRR', locale)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {service.staffIds.map((staffId) => (
                  <span key={staffId} className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted">
                    {staffMap.get(staffId)?.name[locale]}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(service);
                    setIsNew(false);
                  }}
                  className="rounded-full border border-line px-2 py-0.5 text-[10px]"
                >
                  {dict.common.edit}
                </button>
                <button
                  type="button"
                  onClick={() => remove(service)}
                  className="rounded-full border border-danger/30 px-2 py-0.5 text-[10px] text-danger"
                >
                  {dict.common.delete}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={isNew ? dict.admin.services.add : dict.admin.services.edit}
        size="lg"
        footer={
          draft && (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                {dict.common.cancel}
              </Button>
              <Button onClick={save} loading={busy} disabled={!draft.name.fa || !draft.name.en}>
                {dict.common.save}
              </Button>
            </div>
          )
        }
      >
        {draft && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={dict.admin.services.nameFa}>
              <Input
                value={draft.name.fa}
                onChange={(event) => setDraft({ ...draft, name: { ...draft.name, fa: event.target.value } })}
              />
            </Field>
            <Field label={dict.admin.services.nameEn}>
              <Input
                value={draft.name.en}
                onChange={(event) => setDraft({ ...draft, name: { ...draft.name, en: event.target.value } })}
                dir="ltr"
              />
            </Field>
            <Field label={dict.admin.services.descFa} className="sm:col-span-2">
              <Textarea
                value={draft.description.fa}
                onChange={(event) =>
                  setDraft({ ...draft, description: { ...draft.description, fa: event.target.value } })
                }
              />
            </Field>
            <Field label={dict.admin.services.descEn} className="sm:col-span-2">
              <Textarea
                value={draft.description.en}
                onChange={(event) =>
                  setDraft({ ...draft, description: { ...draft.description, en: event.target.value } })
                }
                dir="ltr"
              />
            </Field>
            <Field label={dict.admin.services.category}>
              <Select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as ServiceCategory })}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={dict.admin.services.duration}>
              <Input
                type="number"
                value={draft.durationMin}
                onChange={(event) => setDraft({ ...draft, durationMin: Number(event.target.value) })}
                dir="ltr"
              />
            </Field>
            <Field label={dict.admin.services.buffer}>
              <Input
                type="number"
                value={draft.bufferMin}
                onChange={(event) => setDraft({ ...draft, bufferMin: Number(event.target.value) })}
                dir="ltr"
              />
            </Field>
            <Field label={dict.admin.services.priceAED}>
              <Input
                type="number"
                value={draft.prices.AED}
                onChange={(event) =>
                  setDraft({ ...draft, prices: { ...draft.prices, AED: Number(event.target.value) } })
                }
                dir="ltr"
              />
            </Field>
            <Field label={dict.admin.services.priceIRR}>
              <Input
                type="number"
                value={draft.prices.IRR}
                onChange={(event) =>
                  setDraft({ ...draft, prices: { ...draft.prices, IRR: Number(event.target.value) } })
                }
                dir="ltr"
              />
            </Field>
            <Field label={dict.admin.services.image} className="sm:col-span-2">
              <Input
                value={draft.image}
                onChange={(event) => setDraft({ ...draft, image: event.target.value })}
                dir="ltr"
              />
            </Field>

            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-medium text-muted">{dict.admin.services.staff}</p>
              <div className="flex flex-wrap gap-2">
                {staff.map((member) => {
                  const active = draft.staffIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          staffIds: active
                            ? draft.staffIds.filter((id) => id !== member.id)
                            : [...draft.staffIds, member.id],
                        })
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] transition',
                        active ? 'border-primary bg-primary-soft text-primary' : 'border-line text-muted',
                      )}
                    >
                      {member.name[locale]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                className="h-4 w-4 accent-[rgb(var(--c-primary))]"
              />
              {dict.admin.services.active}
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
