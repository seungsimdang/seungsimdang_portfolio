"use client";

import Link from "next/link";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { AdminNav } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

export function AdminConsoleShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(77);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(header);
    setHeaderHeight(header.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-black focus:p-12"
      >
        본문으로 건너뛰기
      </a>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md"
      >
        <div className="w-full max-w-content mx-auto container-padding">
          {/* 탭·로그아웃의 44px 터치 영역에 위아래 16px을 더해 공개 Navbar 높이(77px)와 맞춤 */}
          <div className="admin-header-content py-16">
            <Link
              href="/admin/projects"
              className="shrink-0 whitespace-nowrap text-xl font-medium hover:opacity-70 transition-opacity"
            >
              {name}
            </Link>
            <div className="admin-header-navigation">
              <AdminNav />
              <SignOutButton />
            </div>
          </div>
          <div className="h-px w-full bg-white/25" />
        </div>
      </header>
      <main
        id="admin-main"
        tabIndex={-1}
        style={{ paddingTop: headerHeight + 48 }}
        className="container-padding mx-auto w-full max-w-content pb-48"
      >
        {children}
      </main>
    </div>
  );
}
