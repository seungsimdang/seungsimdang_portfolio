"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  THUMBNAIL_FADE_MS,
  THUMBNAIL_INTERVAL_MS,
} from "@/constants/thumbnail-rotation";
import { cn } from "@/utils/styleUtils";

interface ProjectCardThumbnailsProps {
  images: string[];
  title: string;
  sizes: string;
  // 첫 프레임만 eager, 나머지는 항상 lazy
  eagerFirst: boolean;
  objectTop: boolean;
}

function nextIndex(from: number, length: number, failed: Set<number>) {
  for (let step = 1; step < length; step += 1) {
    const candidate = (from + step) % length;
    if (!failed.has(candidate)) return candidate;
  }
  return from;
}

// 2장 이상의 썸네일을 크로스페이드로 순환하는 세트, 서버 렌더는 첫 장만 그림
export function ProjectCardThumbnails({
  images,
  title,
  sizes,
  eagerFirst,
  objectTop,
}: ProjectCardThumbnailsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [mounted, setMounted] = useState<Set<number>>(new Set([0]));
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const wasHiddenRef = useRef(false);
  // 렌더에 쓰지 않고 타이머·로드 이벤트에서만 읽는 값이라 ref로 둠
  const loadedRef = useRef<Set<number>>(new Set());
  const intervalElapsedRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setPageVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      const hidden = entry.boundingClientRect.width === 0;
      setInView(entry.isIntersecting && !hidden);
      if (hidden) {
        wasHiddenRef.current = true;
      } else if (wasHiddenRef.current) {
        // 숨김 뷰가 다시 보이면 첫 장부터 시작
        wasHiddenRef.current = false;
        setIndex(0);
        setPrev(null);
      }
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // 호버와 포커스는 카드 링크 기준이라 링크에 클래스를 더하지 않고 이벤트로 구독
  useEffect(() => {
    const link = rootRef.current?.closest("a");
    if (!link) return;
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== "touch") setHovering(true);
    };
    const leave = () => setHovering(false);
    const focusIn = () => setFocused(true);
    const focusOut = () => setFocused(false);
    link.addEventListener("pointerenter", enter);
    link.addEventListener("pointerleave", leave);
    link.addEventListener("focusin", focusIn);
    link.addEventListener("focusout", focusOut);
    return () => {
      link.removeEventListener("pointerenter", enter);
      link.removeEventListener("pointerleave", leave);
      link.removeEventListener("focusin", focusIn);
      link.removeEventListener("focusout", focusOut);
    };
  }, []);

  // 현재와 다음 프레임까지만 마운트하고 한 번 마운트한 프레임은 유지
  useEffect(() => {
    if (reduced) return;
    const upcoming = nextIndex(index, images.length, failed);
    setMounted((current) => {
      if (current.has(index) && current.has(upcoming)) return current;
      return new Set([...current, index, upcoming]);
    });
  }, [index, images.length, reduced, failed]);

  const active = !reduced && inView && pageVisible && !hovering && !focused;

  const upcoming = nextIndex(index, images.length, failed);
  const canAdvance = upcoming !== index;

  // 간격이 지나도 다음 프레임이 로드되기 전에는 현재 프레임을 유지하고 로드 시점에 전환함
  useEffect(() => {
    if (!active || !canAdvance) return;
    const timer = setTimeout(() => {
      intervalElapsedRef.current = true;
      if (!loadedRef.current.has(upcoming)) return;
      intervalElapsedRef.current = false;
      setPrev(index);
      setIndex(upcoming);
    }, THUMBNAIL_INTERVAL_MS);
    return () => {
      clearTimeout(timer);
      intervalElapsedRef.current = false;
    };
  }, [active, canAdvance, index, upcoming]);

  const handleLoad = (frame: number) => {
    loadedRef.current.add(frame);
    if (!active || !intervalElapsedRef.current || frame !== upcoming) return;
    intervalElapsedRef.current = false;
    setPrev(index);
    setIndex(upcoming);
  };

  useEffect(() => {
    if (prev === null) return;
    const timer = setTimeout(() => setPrev(null), THUMBNAIL_FADE_MS);
    return () => clearTimeout(timer);
  }, [prev]);

  const visibleIndex = reduced ? 0 : index;

  return (
    <div ref={rootRef} className="absolute inset-0">
      {images.map((src, frame) => {
        if (failed.has(frame) || (!mounted.has(frame) && frame !== 0))
          return null;
        if (reduced && frame !== 0) return null;
        const isCurrent = frame === visibleIndex;
        const isPrev = !reduced && frame === prev;
        return (
          <Image
            key={src}
            src={src}
            alt={isCurrent ? `${title} 프로젝트 썸네일` : ""}
            aria-hidden={isCurrent ? undefined : true}
            fill
            sizes={sizes}
            loading={eagerFirst && frame === 0 ? "eager" : "lazy"}
            onLoad={() => handleLoad(frame)}
            onError={() => setFailed((current) => new Set([...current, frame]))}
            className={cn("object-cover", objectTop && "object-top")}
            style={{
              opacity: isCurrent || isPrev ? 1 : 0,
              zIndex: isCurrent ? 1 : 0,
              transition: isCurrent
                ? `opacity ${THUMBNAIL_FADE_MS}ms ease-in-out`
                : "none",
            }}
          />
        );
      })}
    </div>
  );
}
