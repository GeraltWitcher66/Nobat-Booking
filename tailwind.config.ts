import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { brand, type Palette } from './src/config/brand';

const toCssVars = (palette: Palette) =>
  Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [
      `--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
      value,
    ]),
  );

const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1200px' },
    },
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        elevated: token('elevated'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        primary: {
          DEFAULT: token('primary'),
          soft: token('primary-soft'),
          ink: token('primary-ink'),
        },
        accent: {
          DEFAULT: token('accent'),
          soft: token('accent-soft'),
        },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(38 28 24 / 0.04), 0 12px 32px -12px rgb(38 28 24 / 0.16)',
        lift: '0 2px 4px rgb(38 28 24 / 0.05), 0 24px 48px -20px rgb(38 28 24 / 0.28)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': toCssVars(brand.colors.light),
        '.dark': toCssVars(brand.colors.dark),
      });
    }),
  ],
};

export default config;
