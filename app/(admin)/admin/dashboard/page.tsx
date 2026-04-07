import Link from "next/link";
import {
  FlaskConical,
  LayoutList,
  BookOpen,
  KeyRound,
  Sparkles,
  PenLine,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardExperimentSummaries } from "@/components/dashboard/dashboard-experiment-summaries";

const quick = [
  {
    href: "/admin/planner",
    title: "새 실험 만들기",
    desc: "A/B 시안·목표 설정 후 실행",
    icon: FlaskConical,
  },
  {
    href: "/admin/experiments",
    title: "실험 목록",
    desc: "진행 상태·리포트·편집",
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
    desc: "UX 인사이트 랩",
    icon: Sparkles,
  },
  {
    href: "/admin/guidelines",
    title: "UX 가이드",
    desc: "원칙·톤 관리",
    icon: BookOpen,
  },
  {
    href: "/admin/api-keys",
    title: "API 키",
    desc: "외부 검수 연동",
    icon: KeyRound,
  },
  {
    href: "/workspace/experiments",
    title: "팀 워크스페이스",
    desc: "팀원 실험·저장함",
    icon: Users,
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          실험·분석·라이팅을 한 플랫폼에서 이어서 진행할 수 있습니다.
        </p>
      </div>

      <DashboardExperimentSummaries basePath="/admin" />

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
