"use client";

import {
  type ChangeEvent,
  type CompositionEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { POST_SEARCH_MAX } from "@/constants/blog";
import { normalizeSearchQuery } from "@/utils/blog-query-params";

export const BLOG_SEARCH_INPUT_ID = "blog-search-input";

const DEBOUNCE_MS = 300;

// common이 admin 모듈을 import하지 않도록 text-fields의 입력 스타일을 복제함
const inputClassName =
  "min-h-44 w-full rounded-md border border-white/25 bg-transparent py-8 pr-72 pl-12 text-body text-white placeholder:text-white/50 focus-visible:outline-2 focus-visible:outline-white [&::-webkit-search-cancel-button]:appearance-none";

interface BlogSearchBoxProps {
  // 현재 URL 기준의 정규화된 q
  query: string;
}

export function BlogSearchBox({ query }: BlogSearchBoxProps) {
  const [value, setValue] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const composingRef = useRef(false);
  // 입력창과 URL이 일치한 마지막 q, 같은 값이 query로 돌아오면 입력창을 덮어쓰지 않기 위해 보관함
  // 조합 중 URL이 바뀌면 동기화를 미루고, 조합이 끝나면 입력값이 URL에 반영되어 다시 일치함
  const committedRef = useRef(query);

  useEffect(() => {
    if (composingRef.current || query === committedRef.current) return;
    clearTimeout(timerRef.current);
    committedRef.current = query;
    setValue(query);
  }, [query]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // replaceState는 Next 라우터와 동기화되어 서버 재렌더 없이 useSearchParams만 갱신함
  const commit = (raw: string) => {
    const next = normalizeSearchQuery(raw) ?? "";
    const url = new URL(window.location.href);
    if (next === (normalizeSearchQuery(url.searchParams.get("q")) ?? "")) {
      // 조합 중 URL이 바뀌어 건너뛴 동기화의 기준값을 입력과 일치한 URL 값으로 되돌림
      committedRef.current = next;
      return;
    }
    if (next) url.searchParams.set("q", next);
    else url.searchParams.delete("q");
    url.searchParams.delete("page");
    committedRef.current = next;
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const schedule = (raw: string) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(raw), DEBOUNCE_MS);
  };

  const clear = () => {
    clearTimeout(timerRef.current);
    setValue("");
    commit("");
    inputRef.current?.focus();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    if (!composingRef.current) schedule(event.target.value);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
    clearTimeout(timerRef.current);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    schedule(event.currentTarget.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing || !value) {
      return;
    }
    // search 입력의 기본 Esc 동작과 이중 실행되지 않게 함
    event.preventDefault();
    clear();
  };

  return (
    <search aria-label="블로그 검색" className="relative w-full md:max-w-480">
      <label htmlFor={BLOG_SEARCH_INPUT_ID} className="sr-only">
        블로그 글 검색
      </label>
      <input
        ref={inputRef}
        id={BLOG_SEARCH_INPUT_ID}
        type="search"
        name="q"
        value={value}
        placeholder="제목, 본문 검색"
        maxLength={POST_SEARCH_MAX}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className={inputClassName}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          aria-label="검색어 지우기"
          className="absolute inset-y-0 right-0 flex min-h-44 min-w-44 items-center justify-center px-12 text-small underline focus-visible:outline-2 focus-visible:outline-white"
          onClick={clear}
        >
          지우기
        </button>
      )}
    </search>
  );
}
