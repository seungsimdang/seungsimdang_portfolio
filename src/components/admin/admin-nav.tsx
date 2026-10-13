"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/profile", label: "프로필", exact: false },
  { href: "/admin/projects", label: "프로젝트", exact: false },
  { href: "/admin/talks", label: "발표", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="admin" className="flex flex-wrap gap-x-24 gap-y-4">
      {LINKS.map((link) => {
        const current = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-44 items-center text-small underline-offset-8 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white ${current ? "underline opacity-100" : "opacity-70"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
