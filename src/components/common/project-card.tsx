import Image from "next/image";
import Link from "next/link";

interface ProjectCardProps {
  title: string;
  role: string;
  period: string;
  bgColor: string;
  textColor: string;
  href: string;
  thumbnail?: string;
  className?: string;
}

export function ProjectCard({
  title,
  role,
  period,
  bgColor,
  textColor,
  href,
  thumbnail,
  className = "",
}: ProjectCardProps) {
  return (
    <Link
      href={href}
      className={`sticky top-160 block w-full h-[60vh] md:h-[90vh] rounded-lg overflow-hidden transition-transform hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className}`}
      style={{
        backgroundColor: bgColor,
        color: thumbnail ? "rgb(255, 255, 255)" : textColor,
      }}
    >
      {thumbnail && (
        <>
          <Image
            src={thumbnail}
            alt={`${title} 프로젝트 썸네일`}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 from-50% to-transparent" />
        </>
      )}
      <div className="relative z-10 w-full h-full flex flex-col justify-end p-32 md:p-48 lg:p-64">
        <h3 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-16 break-keep text-balance">
          {title}
        </h3>
        <div
          className={`flex flex-wrap items-center gap-x-16 gap-y-4 text-sm md:text-base ${thumbnail ? "" : "opacity-80"}`}
        >
          <span>{role}</span>
          <span aria-hidden="true">·</span>
          <span>{period}</span>
        </div>
      </div>
    </Link>
  );
}
