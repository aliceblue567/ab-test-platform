import Link from "next/link";
import {
  FlaskConical,
  LayoutList,
  BookOpen,
  Sparkles,
  FolderOpen,
  PenLine,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardExperimentSummaries } from "@/components/dashboard/dashboard-experiment-summaries";

const quick = [
  {
    href: "/workspace/planner",
    title: "새 실험 만들기",
    desc: "팀 권한으로 실험 설계",
    icon: FlaskConical,
  },
  {
    href: "/workspace/experiments",
    title: "실험 목록",
    desc: "내 실험·리포트",
    icon: LayoutList,
  },
  {
    href: "/",
    title: "문구 검수",
    desc: "가이드 기반 카피 점검",
    icon: PenLine,
  },
  {
    href: "/insight/screens",
    title: "화면 분석",
    desc: "인사이트 랩",
    icon: Sparkles,
  },
  {
    href: "/workspace/guidelines",
    title: "UX 가이드",
    desc: "팀 가이드 보기",
    icon: BookOpen,
  },
  {
    href: "/workspace/insight-saved",
    title: "인사이트 저장함",
    desc: "저장한 분석물",
    icon: FolderOpen,
  },
] as const;

export default function WorkspaceDashboardPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">워크스페이스</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          팀 실험·가이드·인사이트 저장함으로 바로 이동합니다.
        </p>
      </div>

      <DashboardExperimentSummaries basePath="/workspace" />

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">빠른 실행</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quick.map(({ href, title, desc, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                  <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {title}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
