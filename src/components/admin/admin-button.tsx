"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "icon";

const base =
  "inline-flex min-h-44 items-center justify-center rounded-full border text-small transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";

// 같은 속성의 유틸은 값 순서로 출력되어 base 여백이 variant 여백을 덮으므로 여백은 variant마다 지정
const variants: Record<Variant, string> = {
  primary: "border-white px-20 bg-white text-black hover:bg-white/90",
  secondary: "border-white/25 px-20 text-white hover:bg-white/10",
  danger:
    "border-transparent px-20 text-danger hover:bg-transparent hover:underline",
  icon: "min-w-44 rounded-md border-transparent px-8 text-body hover:bg-white/10",
};

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

type AdminButtonProps =
  | (CommonProps & {
      href: string;
      onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    })
  | (CommonProps & {
      href?: undefined;
      type?: "button" | "submit";
      id?: string;
      disabled?: boolean;
      onClick?: () => void;
      "aria-label"?: string;
      "aria-pressed"?: boolean;
    });

// 제출과 액션용 버튼, href가 있으면 같은 모양의 링크
export function AdminButton(props: AdminButtonProps) {
  const className = `${base} ${variants[props.variant ?? "secondary"]} ${props.className ?? ""}`;
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={className} onClick={props.onClick}>
        {props.children}
      </Link>
    );
  }
  return (
    <button
      id={props.id}
      type={props.type ?? "button"}
      className={className}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={props["aria-label"]}
      aria-pressed={props["aria-pressed"]}
    >
      {props.children}
    </button>
  );
}
