import Link from "next/link";
import { ArrowRight, ImageIcon, LayoutList, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InsightHomePage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">UX 인사이트 랩</h1>
      <p className="mt-2 text-muted-foreground">
        캡처·업로드 기반으로 화면을 분석하고, 플로우로 묶어 보고, 타사와 1:1로 비교합니다.
        이 영역은 A/B 테스트·UX 라이팅 가이드와 별도 제품으로 두었습니다. 데이터와 API도{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-sm">ux_*</code> /
        <code className="rounded bg-muted px-1 py-0.5 text-sm">/api/ux-insight</code> 경로만 사용하세요.
      </p>

      <ul className="mt-8 space-y-4">
        <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <ImageIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">화면 분석</p>
            <p className="text-sm text-muted-foreground">
              URL 캡처 또는 이미지 업로드 → Vision 분석 → 동일 JSON 스키마로 저장
            </p>
            <Button variant="link" className="mt-1 h-auto p-0" asChild>
              <Link href="/insight/screens">
                이동 <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </Button>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <LayoutList className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">유저 플로우</p>
            <p className="text-sm text-muted-foreground">
              단계별 화면 나열·순서 편집·플로우 단위 요약·마찰 지점
            </p>
            <Button variant="link" className="mt-1 h-auto p-0" asChild>
              <Link href="/insight/flows">
                이동 <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </Button>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <GitCompareArrows className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">벤치마킹</p>
            <p className="text-sm text-muted-foreground">
              자사 vs 타사 동일 스키마 결과를 좌우 매칭·차이 요약
            </p>
            <Button variant="link" className="mt-1 h-auto p-0" asChild>
              <Link href="/insight/benchmark">
                이동 <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </Button>
          </div>
        </li>
      </ul>
    </div>
  );
}
