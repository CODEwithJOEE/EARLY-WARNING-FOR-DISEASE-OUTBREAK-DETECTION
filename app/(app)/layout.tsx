import { Suspense } from "react";
import Nav from "@/components/Nav";
import SubmitButton from "@/components/SubmitButton";
import { Skeleton } from "@/components/Skeleton";
import { getSessionProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

// The header shell renders immediately; only the user name/role waits for the session lookup.
async function UserMenu() {
  const { name, role } = await getSessionProfile();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted">
        {name} · {role.replace("_", " ")}
      </span>
      <form action={signOut}>
        <SubmitButton>Sign out</SubmitButton>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold leading-tight">
              Early Warning for Disease Outbreak Detection
            </p>
            <p className="text-xs text-muted">
              RHU Katipunan, Zamboanga del Norte
            </p>
          </div>
          <Suspense fallback={<Skeleton className="h-8 w-48" />}>
            <UserMenu />
          </Suspense>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <Nav />
        </div>
      </header>
      <main className="page-enter mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-muted">
        Decision-support tool only. It does not diagnose disease. Forecasts are
        based on aggregated monthly counts.
      </footer>
    </>
  );
}
