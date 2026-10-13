import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { getProfile } from "@/services/portfolio/portfolio-service";

export async function PublicShell({ children }: { children: ReactNode }) {
  const profile = await getProfile();
  return (
    <>
      <Navbar name={profile.name} />
      <main className="pt-header">{children}</main>
      <Footer profile={profile} />
    </>
  );
}
