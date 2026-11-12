import LoginForm from "./LoginForm";
import { supabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
          Rural Health Unit · Katipunan, Zamboanga del Norte
        </p>
        <h1 className="mt-2 text-xl font-semibold leading-snug">Early Warning for Disease Outbreak Detection</h1>
        <p className="mt-2 text-sm text-muted">Sign in to view risk levels and alerts.</p>
        {!supabaseConfigured && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Supabase keys are missing. Copy <code>.env.example</code> to <code>.env.local</code> and fill them in.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
