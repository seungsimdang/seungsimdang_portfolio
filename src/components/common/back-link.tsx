import Link from "next/link";

interface BackLinkProps {
  href: string;
  label: string;
  prefetch?: boolean;
}

/** 상세 페이지 상단의 목록 복귀 링크. */
export function BackLink({ href, label, prefetch }: BackLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="text-small opacity-50 hover:opacity-100 transition-opacity focus-visible:outline-2 focus-visible:outline-white"
    >
      <span aria-hidden="true">← </span>
      {label}
    </Link>
  );
}
