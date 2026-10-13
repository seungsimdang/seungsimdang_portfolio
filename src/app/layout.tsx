import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body className="antialiased bg-black text-white">{children}</body>
    </html>
  );
}
