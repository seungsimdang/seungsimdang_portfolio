"use client";

import { useState, useEffect, useRef, useId } from "react";

interface WordCyclerProps {
  words: string[];
  interval?: number;
  animationDuration?: number;
  className?: string;
}

const mountedIds = new Set<string>();

export function WordCycler({
  words,
  interval = 2,
  animationDuration = 0.3,
  className = "",
}: WordCyclerProps) {
  const instanceId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const [dimensions, setDimensions] = useState({
    width: "auto",
    height: "1em",
  });
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const filteredWords = words.filter((w) => w && w.trim() !== "");

  // Measure dimensions
  useEffect(() => {
    mountedIds.clear();
    mountedIds.add(instanceId);

    const measureWithClasses = () => {
      const container = containerRef.current;
      if (!container || filteredWords.length === 0) return;

      const measurer = document.createElement("span");
      measurer.className = className;
      measurer.style.position = "absolute";
      measurer.style.visibility = "hidden";
      measurer.style.width = `${container.offsetWidth}px`;

      container.parentElement?.appendChild(measurer);

      let maxHeight = 0;
      filteredWords.forEach((word) => {
        measurer.textContent = word;
        maxHeight = Math.max(maxHeight, measurer.offsetHeight);
      });

      measurer.remove();
      setDimensions({ width: "100%", height: `${maxHeight}px` });
    };

    measureWithClasses();

    const resizeObserver = new ResizeObserver(measureWithClasses);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    window.addEventListener("resize", measureWithClasses);

    return () => {
      mountedIds.delete(instanceId);
      window.removeEventListener("resize", measureWithClasses);
      resizeObserver.disconnect();
    };
  }, [instanceId, filteredWords.join(","), className]);

  // Word cycling timer
  useEffect(() => {
    if (filteredWords.length <= 1) return;
    if (!mountedIds.has(instanceId)) return;

    const timer = setInterval(() => {
      if (!mountedIds.has(instanceId)) return;
      if (isAnimating) return;

      setIsAnimating(true);

      setTimeout(() => {
        setDisplayedIndex((prev) => (prev + 1) % filteredWords.length);
        setIsAnimating(false);
      }, animationDuration * 1000);
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [filteredWords.length, interval, animationDuration, instanceId, isAnimating]);

  if (filteredWords.length === 0) return null;

  const easing = "cubic-bezier(0.44, 0, 0.56, 1)";
  const transition = isAnimating
    ? `transform ${animationDuration}s ${easing}, opacity ${animationDuration}s ${easing}`
    : "none";

  const currentWord = filteredWords[displayedIndex];
  const nextWord = filteredWords[(displayedIndex + 1) % filteredWords.length];

  if (filteredWords.length === 1) {
    return (
      <span ref={containerRef} className={className}>
        {currentWord}
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      style={{
        position: "relative",
        width: dimensions.width,
        height: dimensions.height,
        overflow: "hidden",
        display: "inline-block",
        verticalAlign: "bottom",
      }}
    >
      <span
        className={className}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: isAnimating ? "translateY(-100%)" : "translateY(0)",
          opacity: isAnimating ? 0 : 1,
          transition,
        }}
      >
        {currentWord}
      </span>

      <span
        className={className}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: isAnimating ? "translateY(0)" : "translateY(100%)",
          opacity: isAnimating ? 1 : 0,
          transition,
        }}
      >
        {nextWord}
      </span>
    </span>
  );
}
