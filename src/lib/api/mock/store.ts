import { brand } from '@/config/brand';
import { buildSeed, DB_VERSION, type Database } from './seed';

const STORAGE_KEY = `${brand.slug}.db.v${DB_VERSION}`;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const isBrowser = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export const loadDb = (): Database => {
  if (!isBrowser()) return buildSeed();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Database;
      if (parsed.version === DB_VERSION) return parsed;
    } catch {
      // Corrupted payload: fall through and reseed.
    }
  }

  const seed = buildSeed();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
};

export const saveDb = (db: Database): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

/** Applies a change to the persisted database and returns the new value. */
export const mutateDb = <T,>(mutator: (db: Database) => T): T => {
  const db = clone(loadDb());
  const result = mutator(db);
  saveDb(db);
  return result;
};

export const resetDemoData = (): Database => {
  const seed = buildSeed();
  saveDb(seed);
  return seed;
};

export const storageKey = STORAGE_KEY;
