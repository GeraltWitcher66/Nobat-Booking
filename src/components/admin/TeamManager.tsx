'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addHoliday,
  getHolidays,
  getServices,
  getStaff,
  getTimeOff,
  removeHoliday,
  saveStaff,
  updateTimeOffStatus,
} from '@/lib/api';
import { dayKeyLabels, weekOrder } from '@/lib/availability';
import { asset } from '@/lib/asset';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { DayKey, Holiday, Service, Staff, TimeOff } from '@/types';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { JalaliCalendar } from '@/components/ui/JalaliCalendar';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

export function TeamManager({ locale, dict }: Props) {
  const { show } = useToast();
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [draft, setDraft] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);

  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayDraft, setHolidayDraft] = useState({ date: '', fa: '', en: '' });

  const load = useCallback(async () => {
    const [staffList, serviceList, holidayList, timeOffList] = await Promise.all([
      getStaff(),
      getServices(),
      getHolidays(),
      getTimeOff(),
    ]);
    setStaff(staffList);
    setServices(serviceList);
    setHolidays([...holidayList].sort((a, b) => a.date.localeCompare(b.date)));
    setTimeOff([...timeOffList].sort((a, b) => b.fromDate.localeCompare(a.fromDate)));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const staffMap = new Map((staff ?? []).map((member) => [member.id, member]));

  const toggleDay = (key: DayKey) => {
    if (!draft) return;
    const current = draft.schedule[key];
    setDraft({
      ...draft,
      schedule: {
        ...draft.schedule,
        [key]: current ? null : { start: '10:00', end: '19:00' },
      },
    });
  };

  const setDayTime = (key: DayKey, field: 'start' | 'end', value: string) => {
    if (!draft) return;
    const current = draft.schedule[key] ?? { start: '10:00', end: '19:00' };
    setDraft({ ...draft, schedule: { ...draft.schedule, [key]: { ...current, [field]: value } } });
  };

  const saveDraft = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await saveStaff(draft);
      show(dict.admin.team.saved, 'success');
      setDraft(null);
      await load();
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  const createHoliday = async () => {
    if (!holidayDraft.date) return;
    setBusy(true);
    try {
      await addHoliday(holidayDraft.date, {
        fa: holidayDraft.fa || holidayDraft.date,
        en: holidayDraft.en || holidayDraft.fa || holidayDraft.date,
      });
      setHolidayOpen(false);
      setHolidayDraft({ date: '', fa: '', en: '' });
      await load();
      show(dict.common.saved, 'success');
    } finally {
      setBusy(false);
    }
  };

  const setLeaveStatus = async (entry: TimeOff, status: 'approved' | 'rejected') => {
    setBusy(true);
    try {
      await updateTimeOffStatus(entry.id, status);
      await load();
      show(dict.common.saved, 'success');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title={dict.admin.team.title} subtitle={dict.admin.team.subtitle} />

      {staff === null && <Skeleton className="h-40 w-full" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {staff?.map((member) => (
          <article key={member.id} className="card space-y-3 p-4">
            <div className="flex items-center gap-3">
              <img src={asset(member.avatar)} alt="" loading="lazy" className="h-12 w-12 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.name[locale]}</p>
                <p className="truncate text-[11px] text-muted">{member.role[locale]}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px]',
                  member.active ? 'bg-success/10 text-success' : 'bg-elevated text-muted',
                )}
              >
                {member.active ? dict.admin.team.active : dict.admin.team.closed}
              </span>
            </div>

            <ul className="space-y-1 text-[11px] text-muted">
              {weekOrder.map((key) => {
                const day = member.schedule[key];
                return (
                  <li key={key} className="flex items-center justify-between gap-2">
                    <span>{dayKeyLabels[key][locale]}</span>
                    <span dir="ltr" className={cn(!day && 'text-muted/60')}>
                      {day ? `${day.start} – ${day.end}` : dict.admin.team.closed}
                    </span>
                  </li>
                );
              })}
            </ul>

            <Button size="sm" variant="ghost" onClick={() => setDraft(structuredClone(member))} className="w-full">
              {dict.common.edit}
            </Button>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted">{dict.admin.team.holidays}</p>
            <Button size="sm" variant="ghost" onClick={() => setHolidayOpen(true)}>
              {dict.admin.team.addHoliday}
            </Button>
          </div>
          <ul className="space-y-1.5 text-xs">
            {holidays.map((holiday) => (
              <li
                key={holiday.id}
                className="flex items-center gap-2 rounded-xl border border-line/70 bg-elevated/40 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate">{holiday.title[locale]}</span>
                <span className="text-[11px] text-muted">{formatDate(holiday.date, locale, 'long')}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await removeHoliday(holiday.id);
                    await load();
                  }}
                  className="text-[10px] text-danger"
                >
                  {dict.common.delete}
                </button>
              </li>
            ))}
            {holidays.length === 0 && <li className="text-[11px] text-muted">{dict.common.empty}</li>}
          </ul>
        </div>

        <div className="card p-4">
          <p className="mb-3 text-xs font-medium text-muted">{dict.admin.team.leaveRequests}</p>
          <ul className="space-y-1.5 text-xs">
            {timeOff.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-elevated/40 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate">{staffMap.get(entry.staffId)?.name[locale]}</span>
                <span className="text-[11px] text-muted">
                  {formatDate(entry.fromDate, locale, 'short')} – {formatDate(entry.toDate, locale, 'short')}
                </span>
                {entry.status === 'pending' ? (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setLeaveStatus(entry, 'approved')}
                      className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success"
                    >
                      {dict.admin.team.approve}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setLeaveStatus(entry, 'rejected')}
                      className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger"
                    >
                      {dict.admin.team.reject}
                    </button>
                  </span>
                ) : (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px]',
                      entry.status === 'approved' ? 'bg-success/10 text-success' : 'bg-elevated text-muted',
                    )}
                  >
                    {dict.admin.team[entry.status]}
                  </span>
                )}
              </li>
            ))}
            {timeOff.length === 0 && <li className="text-[11px] text-muted">{dict.admin.team.noLeave}</li>}
          </ul>
        </div>
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={dict.admin.team.editStaff}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {dict.common.cancel}
            </Button>
            <Button onClick={saveDraft} loading={busy}>
              {dict.common.save}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={dict.admin.team.nameFa}>
                <Input
                  value={draft.name.fa}
                  onChange={(event) => setDraft({ ...draft, name: { ...draft.name, fa: event.target.value } })}
                />
              </Field>
              <Field label={dict.admin.team.nameEn}>
                <Input
                  value={draft.name.en}
                  onChange={(event) => setDraft({ ...draft, name: { ...draft.name, en: event.target.value } })}
                  dir="ltr"
                />
              </Field>
              <Field label={dict.admin.team.roleFa}>
                <Input
                  value={draft.role.fa}
                  onChange={(event) => setDraft({ ...draft, role: { ...draft.role, fa: event.target.value } })}
                />
              </Field>
              <Field label={dict.admin.team.roleEn}>
                <Input
                  value={draft.role.en}
                  onChange={(event) => setDraft({ ...draft, role: { ...draft.role, en: event.target.value } })}
                  dir="ltr"
                />
              </Field>
              <Field label={dict.admin.team.email}>
                <Input
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  dir="ltr"
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-xs">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                  className="h-4 w-4 accent-[rgb(var(--c-primary))]"
                />
                {dict.admin.team.active}
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">{dict.admin.team.schedule}</p>
              <div className="space-y-1.5">
                {weekOrder.map((key) => {
                  const day = draft.schedule[key];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleDay(key)}
                        className={cn(
                          'w-24 rounded-lg border px-2 py-1.5 text-[11px] transition',
                          day ? 'border-primary/50 bg-primary-soft/50 text-primary' : 'border-line text-muted',
                        )}
                      >
                        {dayKeyLabels[key][locale]}
                      </button>
                      <Input
                        type="time"
                        value={day?.start ?? ''}
                        disabled={!day}
                        onChange={(event) => setDayTime(key, 'start', event.target.value)}
                        className="h-9 w-28 py-1 text-xs"
                        dir="ltr"
                      />
                      <span className="text-muted">—</span>
                      <Input
                        type="time"
                        value={day?.end ?? ''}
                        disabled={!day}
                        onChange={(event) => setDayTime(key, 'end', event.target.value)}
                        className="h-9 w-28 py-1 text-xs"
                        dir="ltr"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-muted">{dict.admin.team.breaks}</p>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, breaks: [...draft.breaks, { start: '13:00', end: '14:00' }] })}
                  className="text-[11px] text-primary"
                >
                  + {dict.common.add}
                </button>
              </div>
              <div className="space-y-1.5">
                {draft.breaks.map((brk, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={brk.start}
                      onChange={(event) => {
                        const next = [...draft.breaks];
                        next[index] = { ...next[index], start: event.target.value };
                        setDraft({ ...draft, breaks: next });
                      }}
                      className="h-9 w-28 py-1 text-xs"
                      dir="ltr"
                    />
                    <span className="text-muted">—</span>
                    <Input
                      type="time"
                      value={brk.end}
                      onChange={(event) => {
                        const next = [...draft.breaks];
                        next[index] = { ...next[index], end: event.target.value };
                        setDraft({ ...draft, breaks: next });
                      }}
                      className="h-9 w-28 py-1 text-xs"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, breaks: draft.breaks.filter((_, i) => i !== index) })}
                      className="text-[10px] text-danger"
                    >
                      {dict.common.delete}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">{dict.admin.team.services}</p>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => {
                  const active = draft.services.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          services: active
                            ? draft.services.filter((id) => id !== service.id)
                            : [...draft.services, service.id],
                        })
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] transition',
                        active ? 'border-primary bg-primary-soft text-primary' : 'border-line text-muted',
                      )}
                    >
                      {service.name[locale]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={holidayOpen}
        onClose={() => setHolidayOpen(false)}
        title={dict.admin.team.addHoliday}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setHolidayOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button onClick={createHoliday} loading={busy} disabled={!holidayDraft.date}>
              {dict.common.save}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <JalaliCalendar
            value={holidayDraft.date || new Date().toISOString().slice(0, 10)}
            onChange={(date) => setHolidayDraft({ ...holidayDraft, date })}
            locale={locale}
          />
          <Field label={`${dict.admin.team.holidayTitle} (fa)`}>
            <Input
              value={holidayDraft.fa}
              onChange={(event) => setHolidayDraft({ ...holidayDraft, fa: event.target.value })}
            />
          </Field>
          <Field label={`${dict.admin.team.holidayTitle} (en)`}>
            <Input
              value={holidayDraft.en}
              onChange={(event) => setHolidayDraft({ ...holidayDraft, en: event.target.value })}
              dir="ltr"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
