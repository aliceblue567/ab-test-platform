"use client";

import { useCallback, useMemo, useState } from "react";
import styles from "@/components/writing-checker/writing-checker.module.css";
import {
  UX_WRITING_CHECK_API_PATH,
  UX_WRITING_WEB_CHECK_API_PATH,
} from "@/components/writing-checker/constants";

type CheckResult = {
  original: string;
  suggestion: string;
  reason: string;
  violated_rule: string;
};

const FETCH_TIMEOUT_MS = 120_000;

function messageForHttpStatus(status: number, fallback: string): string {
  if (status === 403) {
    return "이 페이지에서만 검수를 사용할 수 있습니다.";
  }
  if (status === 429) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (status === 503 || status === 502) {
    return "서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  }
  if (status === 504) {
    return "응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  return fallback;
}

export function WritingChecker() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  const canSubmit = useMemo(
    () => text.trim().length > 0 && !loading,
    [text, loading]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setLoading(true);
      setError(null);
      setResult(null);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(UX_WRITING_WEB_CHECK_API_PATH, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: text.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const serverMsg =
            typeof data.message === "string" ? data.message : null;
          const msg =
            serverMsg ??
            messageForHttpStatus(
              res.status,
              `요청에 실패했습니다 (${res.status}). 잠시 후 다시 시도해 주세요.`
            );
          setError(msg);
          return;
        }
        setResult(data as CheckResult);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError(
            "응답 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 잠시 후 다시 시도해 주세요."
          );
          return;
        }
        setError(
          "네트워크 오류가 발생했습니다. 연결을 확인한 뒤 잠시 후 다시 시도해 주세요."
        );
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    },
    [canSubmit, text]
  );

  return (
    <div
      data-writing-checker
      aria-busy={loading}
      className={`${styles.wcRoot} rounded-2xl border border-zinc-700/80 bg-zinc-950 p-6 text-zinc-100 shadow-xl sm:p-8`}
    >
      <header className="space-y-2 border-b border-zinc-700/80 pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          UX Writing System
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          가이드라인 기반 문구 검수
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
          아래에 문구만 넣으면 가이드라인을 반영해 검수합니다. API 키는 필요
          없습니다. 피그마 플러그인·외부 도구 연동은 관리자가 발급한 키로{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
            {UX_WRITING_CHECK_API_PATH}
          </code>
          를 호출하면 됩니다.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="wc-text"
            className="text-sm font-medium text-zinc-200"
          >
            검수할 문구
          </label>
          <textarea
            id="wc-text"
            className="min-h-[160px] w-full resize-y rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-3 text-sm leading-relaxed text-zinc-100 outline-none ring-zinc-500 placeholder:text-zinc-500 focus-visible:ring-2 disabled:opacity-60"
            placeholder="버튼 라벨, 에러 메시지, 온보딩 카피 등을 붙여 넣으세요."
            value={text}
            disabled={loading}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {error ? (
            <p className="mr-auto text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 min-w-[7rem] items-center justify-center rounded-lg bg-zinc-100 px-5 text-sm font-medium text-zinc-900 shadow transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-900"
                  aria-hidden
                />
                검수 중…
              </span>
            ) : (
              "검수 실행"
            )}
          </button>
        </div>
      </form>

      {result ? (
        <section className="mt-10 space-y-4" aria-live="polite">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            결과
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-5 shadow-sm">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
                원문
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
                {result.original}
              </p>
            </article>
            <article className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-5 shadow-sm">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
                제안
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
                {result.suggestion}
              </p>
            </article>
          </div>
          <article className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-5 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
              이유
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-200">
              {result.reason}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
              위반 규칙
            </h3>
            <p className="mt-3 text-sm text-zinc-200">
              {result.violated_rule.trim() === ""
                ? "— (해당 없음)"
                : result.violated_rule}
            </p>
          </article>
        </section>
      ) : null}
    </div>
  );
}
