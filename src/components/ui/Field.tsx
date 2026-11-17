import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

export const Field = ({ label, hint, error, className, children }: FieldProps) => (
  <label className={cn('block space-y-1.5', className)}>
    {label && <span className="block text-xs font-medium text-muted">{label}</span>}
    {children}
    {hint && !error && <span className="block text-[11px] text-muted">{hint}</span>}
    {error && <span className="block text-[11px] text-danger">{error}</span>}
  </label>
);

const controlClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClass, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, 'min-h-[92px]', className)} {...props} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(controlClass, 'pe-8', className)} {...props}>
      {children}
    </select>
  );
});
