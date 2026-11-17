import { brand } from '@/config/brand';
import type { Session } from '@/types';
import { ApiError, latency } from './latency';
import { loadDb, mutateDb } from './store';

const normalizePhone = (phone: string): string => phone.trim().replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/\s+/g, '');

/** In a real backend this request triggers an SMS; the demo returns the fixed code. */
export const requestSmsCode = async (phone: string): Promise<{ code: string }> => {
  await latency();
  if (!/^0\d{9}$/.test(normalizePhone(phone))) throw new ApiError('invalid_phone');
  return { code: brand.demo.smsCode };
};

export const verifySmsCode = async (phone: string, code: string): Promise<boolean> => {
  await latency(220);
  if (!/^0\d{9}$/.test(normalizePhone(phone))) throw new ApiError('invalid_phone');
  if (code.trim() !== brand.demo.smsCode) throw new ApiError('invalid_code');
  return true;
};

export const loginCustomer = async (phone: string, code: string): Promise<Session> => {
  const normalized = normalizePhone(phone);
  await verifySmsCode(normalized, code);

  const customer = mutateDb((db) => {
    const existing = db.customers.find((item) => item.phone === normalized);
    if (existing) return existing;
    const created = {
      id: `cus_${Date.now().toString(36)}`,
      name: normalized,
      phone: normalized,
      notes: '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.customers.push(created);
    return created;
  });

  return {
    role: 'customer',
    subjectId: customer.id,
    name: customer.name,
    phone: customer.phone,
    loggedInAt: new Date().toISOString(),
  };
};

export const loginWithPassword = async (email: string, password: string): Promise<Session> => {
  await latency(360);
  const normalized = email.trim().toLowerCase();

  if (password !== brand.demo.password) throw new ApiError('invalid_credentials');

  if (normalized === brand.demo.adminEmail) {
    const settings = loadDb().settings;
    return {
      role: 'admin',
      subjectId: 'admin',
      name: settings.salonName.fa,
      email: normalized,
      loggedInAt: new Date().toISOString(),
    };
  }

  const member = loadDb().staff.find((entry) => entry.email.toLowerCase() === normalized);
  if (!member) throw new ApiError('invalid_credentials');

  return {
    role: 'staff',
    subjectId: member.id,
    name: member.name.fa,
    email: member.email,
    loggedInAt: new Date().toISOString(),
  };
};
