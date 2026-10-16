import Image from "next/image";
import Link from "next/link";
import { cn } from "@/utils/styleUtils";
import { ProjectCardThumbnails } from "./project-card-thumbnails";

const PC_SIZES = "(min-width: 1024px) 60vw, 100vw";
const MOBILE_SIZES = "100vw";

interface ProjectCardProps {
  title: string;
  role: string;
  period: string;
  bgColor: string;
  textColor: string;
  href: string;
  thumbnails?: string[];
  mobileThumbnails?: string[];
  preserveThumbnailText?: boolean;
  eager?: boolean;
  // lg 이상에서 카드 폭에 비례해 제목·패딩을 줄이는 변형, lg:@container가 붙은 카드에서만 켬
  wide?: boolean;
  className?: string;
}

function clean(list: string[] | undefined): string[] {
  return (list ?? []).filter((src) => src.length > 0);
}

function isSameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((src, index) => src === b[index]);
}

interface ThumbnailSetProps {
  images: string[];
  title: string;
  sizes: string;
  eager: boolean;
  objectTop: boolean;
  // 1장일 때 정적 이미지에 적용, preserve 단일 세트의 인라인 object-position 보존용
  inlineTop?: boolean;
}

function ThumbnailSet({
  images,
  title,
  sizes,
  eager,
  objectTop,
  inlineTop = false,
}: ThumbnailSetProps) {
  if (images.length === 1) {
    return (
      <Image
        src={images[0]}
        alt={`${title} 프로젝트 썸네일`}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        className={cn("object-cover", objectTop && !inlineTop && "object-top")}
        style={inlineTop ? { objectPosition: "top" } : undefined}
      />
    );
  }
  return (
    <ProjectCardThumbnails
      images={images}
      title={title}
      sizes={sizes}
      eagerFirst={eager}
      objectTop={objectTop}
    />
  );
}

// 정사각 영역 안에서 이미지를 상단 정렬로 보여 주는 래퍼, 카드 텍스트와 이미지 속 글자가 겹치지 않게 함
function PreserveFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0" style={{ containerType: "size" }}>
      <div
        className="absolute inset-0"
        style={{
          width: "min(100%, 100cqh)",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ProjectCard({
  title,
  role,
  period,
  bgColor,
  textColor,
  href,
  thumbnails,
  mobileThumbnails,
  preserveThumbnailText = false,
  eager = false,
  wide = false,
  className = "",
}: ProjectCardProps) {
  const pc = clean(thumbnails);
  const mobile = clean(mobileThumbnails);
  const hasImages = pc.length > 0;
  const split = hasImages && mobile.length > 0 && !isSameList(pc, mobile);

  return (
    <Link
      href={href}
      className={cn(
        "sticky top-160 block w-full h-card md:h-card-stuck rounded-lg overflow-hidden transition-transform hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        className,
      )}
      style={{
        backgroundColor: bgColor,
        color: hasImages ? "rgb(255, 255, 255)" : textColor,
      }}
    >
      {hasImages && !split && (
        <div
          className="absolute inset-0"
          style={preserveThumbnailText ? { containerType: "size" } : undefined}
        >
          <div
            className="absolute inset-0"
            style={
              preserveThumbnailText
                ? {
                    width: "min(100%, 100cqh)",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }
                : undefined
            }
          >
            <ThumbnailSet
              images={pc}
              title={title}
              sizes={PC_SIZES}
              eager={eager}
              objectTop={preserveThumbnailText}
              inlineTop={preserveThumbnailText}
            />
          </div>
          <div className="absolute inset-0 bg-linear-to-t from-black/70 from-50% to-transparent" />
        </div>
      )}
      {hasImages && split && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 hidden md:block">
            <ThumbnailSet
              images={pc}
              title={title}
              sizes={PC_SIZES}
              eager={false}
              objectTop={false}
            />
          </div>
          <div className="absolute inset-0 md:hidden">
            {preserveThumbnailText ? (
              <PreserveFrame>
                <ThumbnailSet
                  images={mobile}
                  title={title}
                  sizes={MOBILE_SIZES}
                  eager={false}
                  objectTop
                />
              </PreserveFrame>
            ) : (
              <ThumbnailSet
                images={mobile}
                title={title}
                sizes={MOBILE_SIZES}
                eager={false}
                objectTop
              />
            )}
          </div>
          <div className="absolute inset-0 bg-linear-to-t from-black/70 from-50% to-transparent" />
        </div>
      )}
      <div
        className={cn(
          "relative z-10 w-full h-full flex flex-col justify-end p-32 md:p-48",
          wide ? "lg:p-[clamp(1.5rem,1rem+3cqi,3rem)]" : "lg:p-64",
        )}
      >
        <h3
          className={cn(
            "text-4xl md:text-5xl font-medium mb-16 break-keep text-balance",
            wide
              ? "lg:text-[clamp(1.75rem,1.25rem+2.5cqi,3rem)] lg:leading-tight"
              : "lg:text-6xl",
          )}
        >
          {title}
        </h3>
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-16 gap-y-4 text-sm md:text-base",
            !hasImages && "opacity-80",
          )}
        >
          <span>{role}</span>
          <span aria-hidden="true">·</span>
          <span>{period}</span>
        </div>
      </div>
    </Link>
  );
}
