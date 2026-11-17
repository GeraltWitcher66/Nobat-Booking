export const EmptyState = ({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-elevated/40 px-6 py-10 text-center">
    <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-muted">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
    <p className="text-sm text-muted">{title}</p>
    {action}
  </div>
);
