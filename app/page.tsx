import Link from "next/link";
import { WritingChecker } from "@/components/writing-checker";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span className="text-zinc-200">A/B Test Platform</span>
          <div className="flex gap-4">
            <Link
              href="/admin"
              className="transition-colors hover:text-zinc-100"
            >
              관리자
            </Link>
            <Link
              href="/test/demo"
              className="transition-colors hover:text-zinc-100"
            >
              테스트 (demo)
            </Link>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p
          className="mb-6 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-4 py-3 text-center text-sm leading-relaxed text-zinc-300"
          role="note"
        >
          이 서비스는 하나투어 UX 가이드를 기반으로 작동합니다. 외부 참가자에게는 홈이 아니라
          실험별 주소{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">
            /test/실험키
          </code>
          만 공유하세요. 실험에서「참가 링크 2차 보호」를 켠 경우 팀이 발급한 전체 URL(
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200">?p=…</code>
          포함)을 넘겨야 합니다.
        </p>
        <WritingChecker />
      </div>
    </main>
  );
}
