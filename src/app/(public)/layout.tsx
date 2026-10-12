import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { getProfile } from "@/services/portfolio/portfolio-service";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://seungsimdang.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const metadataBase = URL.canParse(siteUrl)
    ? new URL(siteUrl)
    : new URL("https://seungsimdang.vercel.app");
  return {
    metadataBase,
    title: {
      default: `${profile.name} - ${profile.title}`,
      template: `%s | ${profile.name}`,
    },
    description: profile.description,
    openGraph: {
      title: `${profile.name} - ${profile.title}`,
      description: profile.description,
      type: "website",
      locale: "ko_KR",
    },
  };
}

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PublicShell>{children}</PublicShell>;
}
