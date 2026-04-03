"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import type { UxScreenAnalysisV1 } from "@/lib/ux-insight/screen-analysis-v1";
import { extractTheoryRefs } from "@/lib/ux-insight/extract-theory-refs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function severityStyles(s: "high" | "medium" | "low" | undefined) {
  switch (s) {
    case "high":
      return {
        border: "border-l-4 border-l-destructive bg-destructive/5",
        badge: "destructive" as const,
        dot: "bg-destructive",
      };
    case "medium":
      return {
        border: "border-l-4 border-l-amber-500 bg-amber-500/5",
        badge: "warning" as const,
        dot: "bg-amber-500",
      };
    case "low":
      return {
        border: "border-l-4 border-l-sky-500 bg-sky-500/5",
        badge: "secondary" as const,
        dot: "bg-sky-500",
      };
    default:
      return {
        border: "border-l-4 border-l-muted-foreground/40 bg-muted/30",
        badge: "outline" as const,
        dot: "bg-muted-foreground",
      };
  }
}

function priorityVariant(
  p: "high" | "medium" | "low" | undefined
): "destructive" | "warning" | "secondary" | "outline" {
  if (p === "high") return "destructive";
  if (p === "medium") return "warning";
  if (p === "low") return "secondary";
  return "outline";
}

export function ScreenAnalysisWorkbench() {
  const [urlOrPath, setUrlOrPath] = useState("");
  const [screenName, setScreenName] = useState("");
  const [personaAge, setPersonaAge] = useState("30대");
  const [personaProficiency, setPersonaProficiency] = useState("중급");
  const [personaGoal, setPersonaGoal] = useState(
    "국내 여행 상품을 비교·예약한다"
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<UxScreenAnalysisV1 | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) setFile(f);
    else toast.error("이미지 파일만 업로드할 수 있습니다.");
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const analyze = async () => {
    if (!file) {
      toast.error("스크린샷 이미지를 업로드해 주세요.");
      return;
    }
    setLoading(true);
    setReport(null);
    setAnalysisError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("persona_age", personaAge);
      fd.append("persona_proficiency", personaProficiency);
      fd.append("persona_goal", personaGoal);
      fd.append("screen_name", screenName || "업로드 화면");
      fd.append("url_or_path", urlOrPath || "upload://analysis");

      const res = await fetch("/api/ux-insight/analyze", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errText =
          typeof data.error === "string" ? data.error : "분석에 실패했습니다.";
        setAnalysisError(errText);
        toast.error("분석에 실패했습니다. 오른쪽 패널의 안내를 확인하세요.");
        return;
      }
      setReport(data as UxScreenAnalysisV1);
      setAnalysisError(null);
      toast.success("분석이 완료되었습니다.");
    } catch {
      const msg = "네트워크 오류가 발생했습니다.";
      setAnalysisError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 p-6 lg:flex-row lg:gap-8">
      {/* 좌측: 입력 */}
      <div className="flex w-full flex-col gap-4 lg:max-w-md lg:shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">화면 분석</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            스크린샷과 페르소나를 넣으면 UX 근거 라이브러리 기반으로 분석합니다.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">화면 맥락</CardTitle>
            <CardDescription>
              URL은 참고용 메타데이터로 모델에 전달됩니다. 자동 캡처는 추후
              연동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL 또는 경로 (선택)</Label>
              <Input
                id="url"
                placeholder="https://example.com/booking"
                value={urlOrPath}
                onChange={(e) => setUrlOrPath(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="screenName">화면 이름 (선택)</Label>
              <Input
                id="screenName"
                placeholder="예: 검색 결과 — 호텔"
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">페르소나</CardTitle>
            <CardDescription>연령 · 숙련도 · 목적</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="age">연령</Label>
              <Input
                id="age"
                value={personaAge}
                onChange={(e) => setPersonaAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof">디지털 숙련도</Label>
              <Input
                id="prof"
                placeholder="초급 / 중급 / 고급"
                value={personaProficiency}
                onChange={(e) => setPersonaProficiency(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">목적 · 맥락</Label>
              <Textarea
                id="goal"
                rows={3}
                value={personaGoal}
                onChange={(e) => setPersonaGoal(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">이미지</CardTitle>
            <CardDescription>드래그 앤 드롭 또는 클릭하여 선택</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  inputRef.current?.click();
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-muted/40",
                previewUrl && "min-h-[120px]"
              )}
            >
              {previewUrl ? (
                <div className="relative mx-auto max-h-48 w-full max-w-sm overflow-hidden rounded-md border border-border">
                  <Image
                    src={previewUrl}
                    alt="미리보기"
                    width={800}
                    height={480}
                    unoptimized
                    className="h-auto max-h-48 w-full object-contain"
                  />
                </div>
              ) : (
                <>
                  <ImagePlus className="mb-2 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">이미지를 놓거나 클릭</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG, WebP
                  </p>
                </>
              )}
            </div>
            {file && (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  제거
                </Button>
              </div>
            )}
            <Button
              type="button"
              className="w-full gap-2"
              disabled={loading || !file}
              onClick={analyze}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              분석 실행
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 우측: 리포트 */}
      <div className="min-w-0 flex-1">
        {analysisError && !loading && (
          <Card className="mb-4 border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive">
                분석을 완료할 수 없습니다
              </CardTitle>
              <CardDescription className="text-destructive/90">
                서버가 Gemini에 연결하지 못했거나 응답 형식이 맞지 않을 때
                표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="leading-relaxed text-foreground">{analysisError}</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>
                  Vercel(또는 호스팅) → Project → Settings → Environment
                  Variables 에서{" "}
                  <code className="rounded bg-muted px-1">GEMINI_API_KEY</code>{" "}
                  확인 (UX 라이팅과 동일 키 사용 가능)
                </li>
                <li>
                  키는{" "}
                  <a
                    className="text-primary underline"
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google AI Studio
                  </a>
                  에서 발급 · 값에 따옴표·앞뒤 공백 없이 붙여넣기
                </li>
                <li>저장 후 반드시 Redeploy</li>
                <li>로컬은 프로젝트 루트 `.env` 에 동일 변수 설정</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {!report && !loading && !analysisError && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              분석 결과가 여기에 리포트 형태로 표시됩니다.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              GPT-4o Vision이 화면을 읽는 중입니다…
            </p>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    분석 리포트
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {report.screen_name}
                  </h2>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {report.url_or_path}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                  run {report.ux_analysis_run_id?.slice(0, 8)}…
                </Badge>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">시각 분석</CardTitle>
                <CardDescription>
                  레이아웃 · 컬러 · 타이포 관점
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["layout", "레이아웃", report.visual_analysis.layout],
                    ["color", "컬러", report.visual_analysis.color],
                    ["font", "폰트", report.visual_analysis.font],
                  ] as const
                ).map(([key, label, text]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="h-4 w-4" />
                사용성 이슈
              </h3>
              <ul className="space-y-3">
                {report.usability_issues.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    식별된 이슈가 없습니다.
                  </p>
                )}
                {report.usability_issues.map((issue, idx) => {
                  const st = severityStyles(issue.ux_severity);
                  const refs = extractTheoryRefs(
                    issue.ux_issue_detail,
                    issue.ux_evidence,
                    issue.ux_category
                  );
                  return (
                    <li
                      key={issue.ux_issue_id ?? idx}
                      className={cn(
                        "rounded-lg border border-border p-4",
                        st.border
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn("h-2 w-2 rounded-full", st.dot)}
                          aria-hidden
                        />
                        {issue.ux_severity && (
                          <Badge variant={st.badge}>
                            {issue.ux_severity === "high"
                              ? "높음"
                              : issue.ux_severity === "medium"
                                ? "중간"
                                : "낮음"}
                          </Badge>
                        )}
                        {refs.map((id) => (
                          <Badge key={id} variant="outline" className="font-mono">
                            {id}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-2 font-medium">{issue.ux_issue_summary}</p>
                      {issue.ux_category && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          분류: {issue.ux_category}
                        </p>
                      )}
                      {issue.ux_issue_detail && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {issue.ux_issue_detail}
                        </p>
                      )}
                      {issue.ux_evidence && (
                        <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                          증거: {issue.ux_evidence}
                        </p>
                      )}
                      {refs.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600/90 dark:text-amber-400/90">
                          근거 ID가 없습니다. 모델이 NH-/LUX-/BE-/TP-/UXT- ID를
                          detail·evidence에 포함했는지 확인하세요.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {report.user_pain_points.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">페르소나 관점</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {report.user_pain_points.map((g, i) => (
                    <div key={g.ux_persona_id ?? i}>
                      <p className="text-sm font-medium">{g.ux_persona_label}</p>
                      <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                        {g.ux_pain_points.map((p, j) => (
                          <li key={j}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold">개선 대안</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {report.improvement_suggestions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    제안이 없습니다.
                  </p>
                )}
                {report.improvement_suggestions.map((s, idx) => (
                  <Card
                    key={s.ux_related_issue_id ?? idx}
                    className="overflow-hidden border-border shadow-sm transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="space-y-2 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={priorityVariant(s.ux_priority)}
                          className="text-[10px] uppercase"
                        >
                          {s.ux_priority === "high"
                            ? "우선"
                            : s.ux_priority === "medium"
                              ? "중간"
                              : s.ux_priority === "low"
                                ? "낮음"
                                : "제안"}
                        </Badge>
                        {s.ux_related_issue_id && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            ↔ {s.ux_related_issue_id}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base leading-snug">
                        {s.ux_suggestion}
                      </CardTitle>
                    </CardHeader>
                    {s.ux_rationale && (
                      <CardContent className="pt-0">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {s.ux_rationale}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
