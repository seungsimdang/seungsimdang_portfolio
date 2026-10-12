"use client";

// 루트 레이아웃의 프로필 조회 실패처럼 error.tsx가 잡지 못하는 오류의 마지막 화면
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body className="bg-black text-white">
        <div role="alert" className="p-48 space-y-24">
          <h1 className="text-2xl">잠시 문제가 생겼습니다</h1>
          <p>페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={reset}
            className="px-32 py-16 rounded-full border border-white/25"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
