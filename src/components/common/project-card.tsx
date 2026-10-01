"use client";

import Link from "next/link";

interface ProjectCardProps {
  title: string;
  category: string;
  year: string;
  bgColor: string;
  textColor: string;
  href: string;
  className?: string;
}

export function ProjectCard({
  title,
  category,
  year,
  bgColor,
  textColor,
  href,
  className = "",
}: ProjectCardProps) {
  return (
    <Link
      href={href}
      className={`sticky top-160 w-full h-[90vh] rounded-lg overflow-hidden transition-transform hover:scale-[1.02] ${className}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <div className="w-full h-full flex flex-col justify-end p-32 md:p-48 lg:p-64">
        <h3 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-16">
          {title}
        </h3>
        <div className="flex items-center gap-16 text-sm md:text-base opacity-80">
          <span>{category}</span>
          <span>·</span>
          <span>{year}</span>
        </div>
      </div>
    </Link>
  );
}
