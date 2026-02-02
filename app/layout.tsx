import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nick - Product Design Partner",
  description: "A product design partner with focus on no-code websites, software interfaces, and interactive experiences",
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
        <main className="pt-[92px]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
