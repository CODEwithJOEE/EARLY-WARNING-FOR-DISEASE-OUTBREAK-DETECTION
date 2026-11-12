"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/Skeleton";
import { signIn, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </label>
      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        {pending && <Spinner />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
