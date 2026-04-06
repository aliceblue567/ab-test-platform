import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth-role";

/** 관리자가 /workspace 에 들어왔을 때만 — 팀 레이아웃과 역할 안내 */
export async function WorkspaceAdminHint() {
  const session = await auth();
  if (!isAdminSession(session)) return null;

  return (
    <div className="border-b border-amber-500/35 bg-amber-500/10 px-6 py-3 text-sm text-amber-100">
      <strong className="font-medium text-amber-50">관리자 계정</strong>으로 보고
      있습니다. API 키·UX 가이드 편집·감사·<strong>모든 팀원의 실험</strong>은{" "}
      <Link href="/admin/experiments" className="underline font-medium text-amber-50">
        관리자 콘솔 (/admin)
      </Link>
      에서 다룹니다. 이 사이드바·저장함은 <strong>팀 워크스페이스</strong> 레이아웃
      미리보기용입니다.
    </div>
  );
}
