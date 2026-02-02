"use client";

import Link from "next/link";

interface BlogPreviewProps {
  title: string;
  date: string;
  href: string;
  className?: string;
}

export function BlogPreview({
  title,
  date,
  href,
  className = "",
}: BlogPreviewProps) {
  return (
    <Link href={href} className={`group block ${className}`}>
      <article className="border-b border-white/10 pb-6 hover:border-white/30 transition-colors">
        <h3 className="text-2xl md:text-3xl font-medium mb-2 group-hover:opacity-70 transition-opacity">
          {title}
        </h3>
        <time className="text-small opacity-50">{date}</time>
      </article>
    </Link>
  );
}
