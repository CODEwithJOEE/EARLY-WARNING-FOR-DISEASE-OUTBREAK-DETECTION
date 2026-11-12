"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Skeleton";

// Submit button that shows a spinner and disables itself while its form action runs.
export default function SubmitButton({
  children,
  className = "btn-ghost",
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`${className} inline-flex items-center gap-2 disabled:opacity-60`}>
      {pending && <Spinner />}
      {children}
    </button>
  );
}
