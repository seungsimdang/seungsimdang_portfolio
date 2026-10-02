import type { ReactNode } from "react";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ExternalLink({
  href,
  children,
  className = "",
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline underline-offset-4 hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-white ${className}`}
    >
      {children}
      <span aria-hidden="true" className="ml-4 inline-block no-underline">
        ↗
      </span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
