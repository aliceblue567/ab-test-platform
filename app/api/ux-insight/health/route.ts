import { NextResponse } from "next/server";

/**
 * UX 인사이트 전용 API 네임스페이스 헬스 체크.
 * A/B·UX 라이팅 엔드포인트와 경로·권한 모델을 섞지 않는다.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    product: "ux-insight",
    namespace: "/api/ux-insight",
  });
}
