"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "home" },
    { href: "/projects", label: "projects" },
    { href: "/about", label: "about" },
    { href: "/blog", label: "blog" },
    { href: "/contact", label: "contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md">
      <div className="w-full max-w-[1920px] mx-auto container-padding">
        <div className="flex items-center justify-between py-6">
          <Link href="/" className="text-xl font-medium hover:opacity-70 transition-opacity">
            Nick
          </Link>

          <div className="flex items-center gap-8 md:gap-12">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-opacity hover:opacity-100 ${
                  pathname === link.href ? "opacity-100" : "opacity-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="h-px w-full bg-white/25">
          <div className="h-full bg-white transition-all duration-300" style={{ width: "0%" }} />
        </div>
      </div>
    </nav>
  );
}
