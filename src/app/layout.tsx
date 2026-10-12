import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { getProfile } from "@/services/portfolio/portfolio-service";
import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://seungsimdang.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  return {
    metadataBase: siteUrl,
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getProfile();
  return (
    <html lang="ko">
      <body className="antialiased bg-black text-white">
        <Navbar name={profile.name} />
        <main className="pt-header">{children}</main>
        <Footer profile={profile} />
      </body>
    </html>
  );
}
