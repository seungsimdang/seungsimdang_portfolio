import type { Metadata } from "next";
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
