import Link from 'next/link';
import { brand } from '@/config/brand';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';

type SiteFooterProps = {
  locale: Locale;
  dict: Dictionary;
};

export function SiteFooter({ locale, dict }: SiteFooterProps) {
  return (
    <footer id="contact" className="mt-24 border-t border-line/70 bg-surface/60">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 sm:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-ink">
              {brand.logo.mark[locale]}
            </span>
            <span className="text-sm font-semibold">{brand.salonName[locale]}</span>
          </div>
          <p className="max-w-sm text-sm leading-7 text-muted">{dict.footer.about}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
            {dict.footer.quickLinks}
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href={`${localePath(locale)}/#services`} className="transition hover:text-primary">
                {dict.nav.services}
              </Link>
            </li>
            <li>
              <Link href={`${localePath(locale)}/#team`} className="transition hover:text-primary">
                {dict.nav.team}
              </Link>
            </li>
            <li>
              <Link href={localePath(locale, 'book')} className="transition hover:text-primary">
                {dict.nav.book}
              </Link>
            </li>
            <li>
              <Link href={localePath(locale, 'login')} className="transition hover:text-primary">
                {dict.nav.login}
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
            {dict.footer.contact}
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={brand.contact.phoneHref} className="transition hover:text-primary" dir="ltr">
                {brand.contact.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${brand.contact.email}`} className="transition hover:text-primary" dir="ltr">
                {brand.contact.email}
              </a>
            </li>
            <li className="text-muted">{brand.contact.address[locale]}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {brand.salonName[locale]} — {dict.footer.rights}
          </p>
          <p className="pill">{dict.footer.demoNote}</p>
        </div>
      </div>
    </footer>
  );
}
