"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Copy,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import type { UxScreenAnalysisV1 } from "@/lib/ux-insight/screen-analysis-v1";
import {
  prepareImageFileForUxInsightApi,
  SINGLE_IMAGE_API_BUDGET_BYTES,
} from "@/lib/ux-insight/client-image-prep";
import { applyPrivacyMaskToImageFile } from "@/lib/ux-insight/image-privacy-mask";
import { extractTheoryRefs } from "@/lib/ux-insight/extract-theory-refs";
import { buildDevQaChecklistLines } from "@/lib/ux-insight/dev-qa-checklist";
import { buildFigmaCalloutComment } from "@/lib/ux-insight/figma-guide-copy";
import {
  humanizeTheoryIdsInText,
  theoryRefsToReadableList,
} from "@/lib/ux-insight/ux-theories-lookup";
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
import { LayeredAuditDashboard } from "@/components/insight/layered-audit-dashboard";
import type { UxExpertPinV1 } from "@/components/insight/ux-image-pin-overlay";
import {
  UxInsightVisualBoard,
  goodVisualKey,
  issueVisualKey,
  type PinOverrideMap,
} from "@/components/insight/ux-insight-visual-board";
import { Switch } from "@/components/ui/switch";

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
  const [expertMode, setExpertMode] = useState(false);
  const [privacyMaskBeforeApi, setPrivacyMaskBeforeApi] = useState(false);
  const [uxExpertPins, setUxExpertPins] = useState<UxExpertPinV1[]>([]);
  const [pinOverrides, setPinOverrides] = useState<PinOverrideMap>({});
  const [adjustAiPins, setAdjustAiPins] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [highlightedVisualKey, setHighlightedVisualKey] = useState<
    string | null
  >(null);
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

  useEffect(() => {
    setUxExpertPins([]);
  }, [file]);

  useEffect(() => {
    setPinOverrides({});
    setHighlightedVisualKey(null);
  }, [report?.ux_analysis_run_id]);

  useEffect(() => {
    if (!highlightedVisualKey || !report) return;
    const ii = report.usability_issues.findIndex(
      (it, i) => issueVisualKey(it, i) === highlightedVisualKey
    );
    if (ii >= 0) {
      document
        .getElementById(`sidebar-issue-${ii}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    const goods = report.ux_good_practices ?? [];
    const gi = goods.findIndex(
      (_, i) => goodVisualKey(i) === highlightedVisualKey
    );
    if (gi >= 0) {
      document
        .getElementById(`sidebar-good-${gi}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedVisualKey, report]);

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
      let upload = await prepareImageFileForUxInsightApi(file, {
        maxBytes: SINGLE_IMAGE_API_BUDGET_BYTES,
      });
      if (privacyMaskBeforeApi) {
        try {
          upload = await applyPrivacyMaskToImageFile(upload);
          upload = await prepareImageFileForUxInsightApi(upload, {
            maxBytes: SINGLE_IMAGE_API_BUDGET_BYTES,
          });
        } catch {
          toast.message(
            "로컬 블러에 실패해 압축만 적용한 이미지로 전송합니다."
          );
        }
      }
      const fd = new FormData();
      fd.append("image", upload);
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
        let errText =
          typeof data.error === "string" ? data.error : "분석에 실패했습니다.";
        if (res.status === 413) {
          errText =
            "요청 본문이 너무 큽니다(HTTP 413). 호스팅 한도(약 4.5MB)를 초과했을 수 있습니다. 이미지 장수·해상도를 줄이거나, 페이지를 새로고침한 뒤 다시 시도해 주세요.";
        }
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
    <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
        싱글 모드 · 중앙 프리뷰 / 우측 상세 리포트
      </p>
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(340px,480px)] xl:grid-cols-[300px_minmax(320px,1fr)_minmax(400px,540px)]">
        {/* 좌측: 입력 */}
        <div className="flex flex-col gap-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">화면 분석</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            스크린샷과 페르소나를 넣으면 UX 근거 라이브러리 기반으로 분석합니다.
            <span className="mt-1 hidden text-xs lg:block">
              {" "}
              한 장 업로드 시 중앙에 대형 프리뷰, 오른쪽에 컴포넌트·라이팅·계층
              분석이 표시됩니다.
            </span>
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
              className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:bg-muted/40"
            >
              <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">이미지를 놓거나 클릭</p>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG, WebP · 미리보기는 가운데 패널
              </p>
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
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/15 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label htmlFor="screen-expert" className="text-sm">
                    Expert · 핀 주석
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    이미지 클릭으로 핀 추가, 드래그로 이동
                  </p>
                </div>
                <Switch
                  id="screen-expert"
                  checked={expertMode}
                  onCheckedChange={setExpertMode}
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <div>
                  <Label htmlFor="screen-privacy" className="text-sm">
                    API 전송 전 로컬 블러
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    추정 고변동 영역 블러
                  </p>
                </div>
                <Switch
                  id="screen-privacy"
                  checked={privacyMaskBeforeApi}
                  onCheckedChange={setPrivacyMaskBeforeApi}
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <div>
                  <Label htmlFor="screen-adjust-ai" className="text-sm">
                    AI 핀 위치 조정
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    분석 후 녹색·이슈 핀을 드래그
                  </p>
                </div>
                <Switch
                  id="screen-adjust-ai"
                  checked={adjustAiPins}
                  onCheckedChange={setAdjustAiPins}
                />
              </div>
            </div>

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

        {/* 가운데: 대형 프리뷰 + 전문가 핀 (싱글 모드) */}
        <div
          className={cn(
            "order-first flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-primary/15 bg-card/40 p-4 lg:order-none lg:min-h-[calc(100vh-5rem)]"
          )}
        >
          {previewUrl ? (
            <div className="flex w-full flex-col items-center">
              <p className="mb-2 text-center text-[11px] text-muted-foreground">
                녹색 <span className="text-emerald-500">G</span> 잘된 점 ·
                주황/빨강 이슈 · 보라 전문가 핀
              </p>
              <UxInsightVisualBoard
                imageUrl={previewUrl}
                issues={report?.usability_issues ?? []}
                goodPractices={report?.ux_good_practices ?? []}
                severityFilter={severityFilter}
                expertMode={expertMode}
                expertPins={uxExpertPins}
                onExpertPinsChange={setUxExpertPins}
                adjustAiPins={adjustAiPins}
                pinOverrides={pinOverrides}
                onPinPositionChange={(key, x, y) => {
                  setPinOverrides((prev) => ({
                    ...prev,
                    [key]: { ux_pin_x_pct: x, ux_pin_y_pct: y },
                  }));
                }}
                highlightedKey={highlightedVisualKey}
                onHighlightKey={setHighlightedVisualKey}
              />
              {expertMode && uxExpertPins.length > 0 && (
                <div className="mt-4 w-full max-w-xl space-y-2 rounded-lg border border-border/80 bg-muted/10 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    핀 메모 (ux_note)
                  </p>
                  {uxExpertPins.map((pin) => (
                    <div key={pin.ux_pin_id} className="space-y-1">
                      <Label className="font-mono text-[10px] text-muted-foreground">
                        {pin.ux_pin_id.slice(-10)}
                      </Label>
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={pin.ux_note}
                        onChange={(e) => {
                          const v = e.target.value;
                          setUxExpertPins((prev) =>
                            prev.map((x) =>
                              x.ux_pin_id === pin.ux_pin_id
                                ? { ...x, ux_note: v }
                                : x
                            )
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-12 text-center text-muted-foreground">
              <Sparkles className="mb-3 h-12 w-12 opacity-40" />
              <p className="text-sm font-medium">스크린샷을 왼쪽에서 선택하세요</p>
              <p className="mt-1 max-w-xs text-xs">
                중앙에 큰 프리뷰가 표시되고, Expert 모드에서 문제 지점에 핀을
                찍을 수 있습니다.
              </p>
            </div>
          )}
        </div>

      {/* 우측: 리포트 */}
      <div className="min-w-0 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pl-1">
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

            <LayeredAuditDashboard
              className="mt-2"
              resetKey={
                report.ux_analysis_run_id ??
                `${report.screen_name}|${report.url_or_path}`
              }
              title={report.screen_name}
              subtitle={report.url_or_path}
              layers={report.ux_audit_layers}
              layerTabLabels={{
                screen: "화면별 (Layer 1)",
                flow: "플로우간 (Layer 2)",
                system: "전체 전략 (Layer 3)",
              }}
              onLayersChange={(next) => {
                setReport((prev) =>
                  prev ? { ...prev, ux_audit_layers: next } : null
                );
              }}
            />

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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  사용성 이슈
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["all", "전체"],
                      ["high", "높음"],
                      ["medium", "중간"],
                      ["low", "낮음"],
                    ] as const
                  ).map(([v, label]) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={severityFilter === v ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setSeverityFilter(v)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <ul className="space-y-3">
                {report.usability_issues.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    식별된 이슈가 없습니다.
                  </p>
                )}
                {report.usability_issues.map((issue, idx) => {
                  if (
                    severityFilter !== "all" &&
                    issue.ux_severity !== severityFilter
                  ) {
                    return null;
                  }
                  const st = severityStyles(issue.ux_severity);
                  const refs = extractTheoryRefs(
                    issue.ux_issue_detail,
                    issue.ux_evidence,
                    issue.ux_category
                  );
                  const theoryBadges = theoryRefsToReadableList(refs);
                  const k = issueVisualKey(issue, idx);
                  const ov = pinOverrides[k];
                  const px =
                    ov?.ux_pin_x_pct ?? issue.ux_pin_x_pct ?? undefined;
                  const py =
                    ov?.ux_pin_y_pct ?? issue.ux_pin_y_pct ?? undefined;
                  const posLabel =
                    px !== undefined && py !== undefined
                      ? `x ${px.toFixed(1)}%, y ${py.toFixed(1)}%`
                      : "좌표 없음";
                  const detailHum = issue.ux_issue_detail
                    ? humanizeTheoryIdsInText(issue.ux_issue_detail)
                    : "";
                  const evidenceHum = issue.ux_evidence
                    ? humanizeTheoryIdsInText(issue.ux_evidence)
                    : "";
                  return (
                    <li
                      id={`sidebar-issue-${idx}`}
                      key={issue.ux_issue_id ?? idx}
                      className={cn(
                        "rounded-lg border border-border p-4 transition-shadow",
                        st.border,
                        highlightedVisualKey === k &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background"
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
                        <Badge variant="secondary" className="text-[10px]">
                          📍 {posLabel}
                        </Badge>
                        {theoryBadges.map(({ ux_theory_id, ux_theory_label_ko }) => (
                          <Badge
                            key={ux_theory_id}
                            variant="outline"
                            className="max-w-[220px] truncate text-[10px] font-normal"
                            title={ux_theory_id}
                          >
                            {ux_theory_label_ko}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-2 font-medium">{issue.ux_issue_summary}</p>
                      {issue.ux_category && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          분류: {issue.ux_category}
                        </p>
                      )}
                      <div className="mt-3 space-y-2 rounded-md bg-muted/25 p-3 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground">
                          현재 (As-Is)
                        </p>
                        <p className="leading-relaxed">
                          {issue.ux_issue_as_is?.trim() ||
                            issue.ux_issue_summary}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground">
                          적용 이론
                        </p>
                        <p className="leading-relaxed text-muted-foreground">
                          {issue.ux_theory_explained?.trim() ||
                            (theoryBadges.length
                              ? theoryBadges
                                .map((t) => t.ux_theory_label_ko)
                                .join(", ") + " 관점에서 점검됨."
                              : "모델이 이론 설명을 채우면 여기에 표시됩니다.")}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground">
                          목표 (To-Be)
                        </p>
                        <p className="leading-relaxed text-muted-foreground">
                          {issue.ux_to_be_hint?.trim() ||
                            "개선 대안 카드에서 구체 실행을 확인하세요."}
                        </p>
                      </div>
                      {detailHum && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          상세: {detailHum}
                        </p>
                      )}
                      {evidenceHum && (
                        <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                          증거: {evidenceHum}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() =>
                            setHighlightedVisualKey(
                              highlightedVisualKey === k ? null : k
                            )
                          }
                        >
                          캔버스에서 핀 찾기
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 gap-1 text-xs"
                          onClick={async () => {
                            const text = buildFigmaCalloutComment({
                              ux_position_pct: posLabel,
                              ux_issue_summary: issue.ux_issue_summary,
                              ux_improvement_guide:
                                issue.ux_to_be_hint ||
                                "개선 대안 카드를 참고해 주세요.",
                            });
                            try {
                              await navigator.clipboard.writeText(text);
                              toast.success("피그마 콜아웃 복사됨");
                            } catch {
                              toast.error("복사 실패");
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Figma 콜아웃
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {(report.ux_good_practices?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  잘된 점 (Good practice)
                </h3>
                <ul className="space-y-2">
                  {(report.ux_good_practices ?? []).map((g, idx) => {
                    const gk = goodVisualKey(idx);
                    const ov = pinOverrides[gk];
                    const px = ov?.ux_pin_x_pct ?? g.ux_pin_x_pct;
                    const py = ov?.ux_pin_y_pct ?? g.ux_pin_y_pct;
                    const pos =
                      px !== undefined && py !== undefined
                        ? `x ${px.toFixed(1)}%, y ${py.toFixed(1)}%`
                        : "—";
                    return (
                      <li
                        id={`sidebar-good-${idx}`}
                        key={g.ux_good_id ?? idx}
                        className={cn(
                          "rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm",
                          highlightedVisualKey === gk &&
                            "ring-2 ring-emerald-500/60"
                        )}
                      >
                        <p className="font-medium text-emerald-800 dark:text-emerald-200">
                          {g.ux_good_summary}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          📍 {pos}
                        </p>
                        {g.ux_good_detail && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {g.ux_good_detail}
                          </p>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-7 text-xs"
                          onClick={() =>
                            setHighlightedVisualKey(
                              highlightedVisualKey === gk ? null : gk
                            )
                          }
                        >
                          캔버스에서 보기
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

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
                {report.improvement_suggestions.map((s, idx) => {
                  const relIdx = report.usability_issues.findIndex(
                    (it) =>
                      s.ux_related_issue_id &&
                      it.ux_issue_id === s.ux_related_issue_id
                  );
                  const relIssue =
                    relIdx >= 0 ? report.usability_issues[relIdx] : undefined;
                  const relKey =
                    relIdx >= 0
                      ? issueVisualKey(relIssue!, relIdx)
                      : null;
                  const ov =
                    relKey && pinOverrides[relKey]
                      ? pinOverrides[relKey]
                      : null;
                  const posStr =
                    relIssue &&
                    (ov?.ux_pin_x_pct ?? relIssue.ux_pin_x_pct) !=
                      undefined &&
                    (ov?.ux_pin_y_pct ?? relIssue.ux_pin_y_pct) != undefined
                      ? `x ${(ov?.ux_pin_x_pct ?? relIssue.ux_pin_x_pct)!.toFixed(1)}%, y ${(ov?.ux_pin_y_pct ?? relIssue.ux_pin_y_pct)!.toFixed(1)}%`
                      : "좌표는 연결된 이슈 핀을 참고";
                  const relSummary = relIssue?.ux_issue_summary ?? "";
                  const qaLines = buildDevQaChecklistLines({
                    ux_suggestion: s.ux_suggestion,
                    ux_issue_summary: relSummary,
                    ux_priority: s.ux_priority,
                  });
                  const qaText = qaLines.join("\n");
                  return (
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
                        </div>
                        <CardTitle className="text-base leading-snug">
                          {s.ux_suggestion}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {s.ux_rationale && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {humanizeTheoryIdsInText(s.ux_rationale)}
                          </p>
                        )}
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Dev QA 체크리스트 (초안)
                          </p>
                          <ul className="list-inside list-disc text-xs text-muted-foreground">
                            {qaLines.map((line) => (
                              <li key={line.slice(0, 40)}>{line}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            onClick={async () => {
                              const fig = buildFigmaCalloutComment({
                                ux_position_pct: posStr,
                                ux_issue_summary:
                                  relSummary || "연결 이슈 없음",
                                ux_improvement_guide: s.ux_suggestion,
                                ux_qa_note: qaText,
                              });
                              try {
                                await navigator.clipboard.writeText(fig);
                                toast.success("Figma 콜아웃(위치·QA 포함) 복사");
                              } catch {
                                toast.error("복사 실패");
                              }
                            }}
                          >
                            <Copy className="h-3 w-3" />
                            Figma 콜아웃
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-1 text-xs"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(qaText);
                                toast.success("QA 체크리스트 복사");
                              } catch {
                                toast.error("복사 실패");
                              }
                            }}
                          >
                            <Copy className="h-3 w-3" />
                            QA 복사
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
