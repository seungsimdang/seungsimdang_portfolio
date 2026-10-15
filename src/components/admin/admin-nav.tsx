"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/styleUtils";

// 공개 Navbar와 같은 순서와 라벨, home은 모든 /admin 경로의 접두이므로 정확 일치만 활성
const LINKS = [
  { href: "/admin", label: "home" },
  { href: "/admin/projects", label: "projects" },
  { href: "/admin/about", label: "about" },
  { href: "/admin/blog", label: "blog" },
  { href: "/admin/talks", label: "talks" },
  { href: "/admin/contact", label: "contact" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="관리자"
      className="flex w-full flex-wrap gap-x-16 gap-y-4 md:w-auto md:gap-x-24 lg:gap-x-48"
    >
      {LINKS.map((link) => {
        const current =
          link.href === "/admin"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-44 items-center text-sm underline-offset-8 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white",
              current ? "underline opacity-100" : "opacity-50",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
