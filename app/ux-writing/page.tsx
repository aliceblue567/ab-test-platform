import type { Metadata } from "next";
import { WritingChecker } from "@/components/writing-checker";

export const metadata: Metadata = {
  title: "UX Writing 검수기",
  description: "하나투어 UX Writing 가이드라인 기반 문구 검수 도구",
};

export default function UxWritingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
              Hanatour UX Writing
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              문구 검수기
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-400 sm:text-right">
            버튼, 오류 메시지, 안내 문구를 붙여 넣으면 활성화된 작성 기준으로
            검수합니다.
          </p>
        </div>

        <WritingChecker compactHeader />

        <p className="mt-5 text-center text-xs leading-relaxed text-zinc-500">
          고객 개인정보, 예약정보, 결제정보는 입력하지 마세요.
        </p>
      </div>
    </main>
  );
}
