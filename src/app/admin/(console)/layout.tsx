import { getServerSession } from "next-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { ExternalLink } from "@/components/common/external-link";
import { authOptions } from "@/lib/auth/auth-options";
import { requireAdminPage } from "@/lib/auth/require-admin";

export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminPage();
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-black focus:p-12"
      >
        본문으로 건너뛰기
      </a>
      <header className="container-padding border-b border-white/25 py-16">
        <div className="mx-auto flex w-full max-w-960 flex-wrap items-center justify-between gap-x-24 gap-y-8">
          <p className="text-small">
            admin
            {session?.user?.name && (
              <span className="opacity-70"> · {session.user.name}</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-16">
            <ExternalLink href="/" className="text-small">
              사이트 보기
            </ExternalLink>
            <SignOutButton />
          </div>
          <div className="w-full">
            <AdminNav />
          </div>
        </div>
      </header>
      <div
        id="admin-main"
        tabIndex={-1}
        className="container-padding mx-auto w-full max-w-960 py-48"
      >
        {children}
      </div>
    </div>
  );
}
