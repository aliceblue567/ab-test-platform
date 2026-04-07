import { FeaturePlaceholder } from "@/components/platform/feature-placeholder";
import Link from "next/link";

export default function AdminSettingsSecurityPage() {
  return (
    <FeaturePlaceholder title="보안 설정">
      1차 게이트·환경 변수 기반 보안은{" "}
      <Link href="/admin/settings" className="text-primary underline">
        조직 설정
      </Link>
      과 배포 문서를 참고해 주세요.
    </FeaturePlaceholder>
  );
}
