import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nick - Product Design Partner",
  description:
    "A product design partner with focus on no-code websites, software interfaces, and interactive experiences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-white">
        <Navbar />
        <main className="pt-header">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
