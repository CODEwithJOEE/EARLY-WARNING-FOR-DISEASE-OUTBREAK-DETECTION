"use client";

import { usePathname } from "next/navigation";
import NavLink from "./NavLink";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/cases", label: "Monthly cases" },
  { href: "/alerts", label: "Alerts" },
  { href: "/metrics", label: "Model evaluation" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1">
      {LINKS.map((l) => (
        <NavLink key={l.href} href={l.href} label={l.label} active={l.href === "/" ? path === "/" : path.startsWith(l.href)} />
      ))}
    </nav>
  );
}
