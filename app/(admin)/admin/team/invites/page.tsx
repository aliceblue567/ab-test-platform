import { FeaturePlaceholder } from "@/components/platform/feature-placeholder";
import Link from "next/link";

export default function AdminTeamInvitesPage() {
  return (
    <FeaturePlaceholder title="초대 관리">
      팀원 초대 코드·가입 허용은 환경 설정과 연동됩니다. 신규 팀원은{" "}
      <Link href="/admin/signup" className="text-primary underline">
        팀원 가입
      </Link>{" "}
      페이지에서 초대 코드로 등록할 수 있습니다.
    </FeaturePlaceholder>
  );
}
