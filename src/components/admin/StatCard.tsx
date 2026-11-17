import { cn } from '@/lib/cn';

export const StatCard = ({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'primary' | 'accent' | 'danger';
}) => (
  <div className={cn('card p-4', tone === 'primary' && 'bg-primary-soft/50', tone === 'accent' && 'bg-accent-soft/40')}>
    <p className="text-[11px] text-muted">{label}</p>
    <p
      className={cn(
        'mt-1 text-xl font-semibold tracking-tight tabular-nums',
        tone === 'danger' ? 'text-danger' : tone === 'primary' ? 'text-primary' : 'text-ink',
      )}
    >
      {value}
    </p>
    {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
  </div>
);
