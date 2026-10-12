"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/profile", label: "프로필" },
  { href: "/admin/projects", label: "프로젝트" },
  { href: "/admin/talks", label: "발표" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자" className="admin-nav-links flex flex-wrap gap-y-4">
      {LINKS.map((link) => {
        const current =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-44 items-center text-sm underline-offset-8 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white ${current ? "underline opacity-100" : "opacity-50"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
