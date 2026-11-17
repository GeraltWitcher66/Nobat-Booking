import { cn } from '@/lib/cn';

export const Stars = ({ rating, className }: { rating: number; className?: string }) => (
  <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${rating}/5`}>
    {Array.from({ length: 5 }, (_, index) => (
      <svg
        key={index}
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={index + 1 <= Math.round(rating) ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8L12 3.6z" />
      </svg>
    ))}
  </span>
);
