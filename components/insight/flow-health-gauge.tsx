"use client";

type Props = {
  /** 0~100, 높을수록 매끄러움 */
  seamlessnessIndex: number;
  className?: string;
};

/**
 * 플로우 건강도 — 반침 게이지 (매끄러움 지수 기반).
 */
export function FlowHealthGauge({ seamlessnessIndex, className }: Props) {
  const v = Math.min(100, Math.max(0, seamlessnessIndex));
  const arcLen = Math.PI * 80;
  const dash = (v / 100) * arcLen;
  const label =
    v >= 70 ? "양호" : v >= 40 ? "개선 여지" : "집중 점검 권장";

  return (
    <div
      className={`flex flex-col items-center gap-1 ${className ?? ""}`}
      role="img"
      aria-label={`플로우 건강도 ${v}점, ${label}`}
    >
      <div className="relative h-[100px] w-[200px]">
        <svg viewBox="0 0 200 100" className="h-full w-full overflow-visible">
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="url(#flowHealthGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${arcLen}`}
          />
          <defs>
            <linearGradient id="flowHealthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(220 38 38)" />
              <stop offset="50%" stopColor="rgb(245 158 11)" />
              <stop offset="100%" stopColor="rgb(22 163 74)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-1">
          <span className="text-2xl font-semibold tabular-nums leading-none">
            {Math.round(v)}
          </span>
          <span className="text-[10px] text-muted-foreground">매끄러움 / 100</span>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
