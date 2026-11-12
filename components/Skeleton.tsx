export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`spinner ${className}`} />;
}
