"use client";

import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
  external?: boolean;
  className?: string;
}

export function Button({
  children,
  href,
  variant = "primary",
  external = false,
  className = "",
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center px-32 py-16 text-base font-light transition-all duration-300";

  const variantStyles = {
    primary:
      "bg-white text-black hover:bg-white/90 rounded-full border border-white/25",
    secondary:
      "border border-white/25 text-white hover:bg-white/10 rounded-full",
  };

  return (
    <Link
      href={href}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {external ? (
        <>
          {children}
          <span aria-hidden="true" className="ml-8">
            ↗
          </span>
          <span className="sr-only">(opens in a new tab)</span>
        </>
      ) : (
        children
      )}
    </Link>
  );
}
