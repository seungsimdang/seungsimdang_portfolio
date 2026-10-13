"use client";

export default function RootError({ reset }: { reset: () => void }) {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div role="alert" className="space-y-24">
          <h1 className="text-h2">잠시 문제가 생겼습니다</h1>
          <p className="text-h3 opacity-70 break-keep">
            페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center px-32 py-16 text-base font-light rounded-full border border-white/25 hover:bg-white/10 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </section>
    </div>
  );
}
