import { Skeleton, Spinner } from "./Skeleton";

function Wrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading {label}…</span>
      <div aria-hidden className="flex items-center gap-2 text-sm text-muted">
        <Spinner /> Loading {label}…
      </div>
      {children}
    </div>
  );
}

const Card = ({ className = "", children }: { className?: string; children?: React.ReactNode }) => (
  <div aria-hidden className={`card p-4 ${className}`}>
    {children}
  </div>
);

function Title() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Wrap label="dashboard">
      <Title />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </Card>
        ))}
      </div>
      <Card className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Skeleton className="mb-3 h-4 w-44" />
          <Skeleton className="h-52 w-full" />
        </Card>
        <Card>
          <Skeleton className="mb-3 h-4 w-44" />
          <Skeleton className="h-52 w-full" />
        </Card>
      </div>
    </Wrap>
  );
}

export function CasesSkeleton() {
  return (
    <Wrap label="monthly cases">
      <Title />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
          <Skeleton className="h-9 w-28" />
        </Card>
        <Card className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-24" />
        </Card>
      </div>
      <Card className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </Card>
    </Wrap>
  );
}

export function AlertsSkeleton() {
  return (
    <Wrap label="alerts">
      <Title />
      {[0, 1, 2].map((i) => (
        <Card key={i} className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ))}
    </Wrap>
  );
}

export function MetricsSkeleton() {
  return (
    <Wrap label="model evaluation">
      <Title />
      <Skeleton className="h-14 w-full" />
      {[0, 1, 2].map((i) => (
        <Card key={i} className="space-y-3">
          <Skeleton className="h-5 w-24" />
          {[0, 1, 2].map((j) => (
            <Skeleton key={j} className="h-5 w-full" />
          ))}
        </Card>
      ))}
    </Wrap>
  );
}
