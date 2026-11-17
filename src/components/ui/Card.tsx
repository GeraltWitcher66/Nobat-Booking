import { cn } from '@/lib/cn';

export const Card = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('card', className)} {...props}>
    {children}
  </div>
);

export const SectionHeader = ({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {subtitle && <p className="max-w-2xl text-sm text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);
