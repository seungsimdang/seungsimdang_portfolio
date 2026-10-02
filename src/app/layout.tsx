import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { profileData } from "@/constants/portfolio-data";
import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://seungsimdang.vercel.app";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${profileData.name} - ${profileData.title}`,
    template: `%s | ${profileData.name}`,
  },
  description: profileData.description,
  openGraph: {
    title: `${profileData.name} - ${profileData.title}`,
    description: profileData.description,
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-black text-white">
        <Navbar />
        <main className="pt-header">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
