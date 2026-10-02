import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { profileData } from "@/constants/portfolio-data";
import "./globals.css";

export const metadata: Metadata = {
  title: `${profileData.name} - ${profileData.title}`,
  description: profileData.description,
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
