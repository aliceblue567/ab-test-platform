import { NextResponse } from "next/server";

/** @deprecated `/api/v1/ux-writing/check` 로 이전됨 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 410 });
}

/** @deprecated `/api/v1/ux-writing/check` 로 이전됨 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Gone",
      message:
        "이 엔드포인트는 /api/v1/ux-writing/check 로 이전되었습니다. 클라이언트 URL을 갱신해 주세요.",
    },
    { status: 410 }
  );
}
