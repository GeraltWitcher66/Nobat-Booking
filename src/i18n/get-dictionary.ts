import type { Locale } from './config';
import type { Dictionary } from './dictionaries/fa';
import fa from './dictionaries/fa';
import en from './dictionaries/en';

const dictionaries: Record<Locale, Dictionary> = { fa, en };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export type { Dictionary };
