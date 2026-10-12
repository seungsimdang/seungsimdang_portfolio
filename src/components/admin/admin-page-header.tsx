import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  children?: ReactNode;
}

export function AdminPageHeader({ title, children }: AdminPageHeaderProps) {
  return (
    <div className="mb-32 flex flex-wrap items-center justify-between gap-16">
      <h1 className="text-h3">{title}</h1>
      {children}
    </div>
  );
}
