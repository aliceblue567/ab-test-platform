import { FeaturePlaceholder } from "@/components/platform/feature-placeholder";
import Link from "next/link";

export default function AdminTeamRecentPage() {
  return (
    <FeaturePlaceholder title="최근 작업">
      팀 단위 최근 편집·실험 활동 요약은 준비 중입니다.{" "}
      <Link href="/admin/dashboard" className="text-primary underline">
        대시보드
      </Link>
      에서 실험 현황을 확인할 수 있습니다.
    </FeaturePlaceholder>
  );
}
