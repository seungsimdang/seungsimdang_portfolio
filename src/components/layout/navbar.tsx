"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BLOG_PATH } from "@/constants/blog";
import { cn } from "@/utils/styleUtils";

function isActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === href || pathname.startsWith("/work/");
  }
  if (href === BLOG_PATH) {
    return pathname === href || pathname.startsWith(`${BLOG_PATH}/`);
  }
  return pathname === href;
}

export function Navbar({ name }: { name: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "home" },
    { href: "/projects", label: "projects" },
    { href: "/about", label: "about" },
    { href: BLOG_PATH, label: "blog" },
    { href: "/talks", label: "talks" },
    { href: "/contact", label: "contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md">
      <div className="w-full max-w-content mx-auto container-padding">
        {/* 모바일은 이름과 링크를 두 줄로 나눠 링크가 화면 밖으로 나가지 않게 하고, 높이 97px로 본문 시작 위치(112px) 안에 맞춤 */}
        <div className="flex flex-col items-start gap-16 py-16 md:flex-row md:items-center md:justify-between md:py-24">
          <Link
            href="/"
            className="text-xl font-medium whitespace-nowrap shrink-0 hover:opacity-70 transition-opacity"
          >
            {name}
          </Link>

          {/* 360px 미만 폭에서는 링크 여섯 개가 한 줄에 들어가도록 간격과 글자를 줄임 */}
          <div className="flex items-center gap-16 max-[359px]:gap-8 md:gap-48">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                // 동적 렌더링인 블로그는 prefetch 이득이 없고 이탈 시 중단된 스트림이 서버 오류로 기록되어 끔
                prefetch={link.href === BLOG_PATH ? false : undefined}
                className={cn(
                  "text-sm transition-opacity hover:opacity-100 max-[359px]:text-xs",
                  isActive(pathname, link.href) ? "opacity-100" : "opacity-50",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="h-px w-full bg-white/25">
          <div
            className="h-full bg-white transition-[width] duration-300"
            style={{ width: "0%" }}
          />
        </div>
      </div>
    </nav>
  );
}
