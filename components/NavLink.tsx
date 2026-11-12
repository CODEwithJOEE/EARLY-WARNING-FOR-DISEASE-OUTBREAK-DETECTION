"use client";

import Link, { useLinkStatus } from "next/link";
import { Spinner } from "./Skeleton";

// Shows a small spinner on the link that was just clicked while the next page loads.
function Pending() {
  const { pending } = useLinkStatus();
  return <Spinner className={`ml-1.5 align-[-2px] transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} />;
}

export default function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-accent text-[var(--accent-fg)]" : "hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {label}
      <Pending />
    </Link>
  );
}
