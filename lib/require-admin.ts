import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { isAdminSession } from "@/lib/auth-role";

/** null = 통과, NextResponse = 즉시 반환 */
export function guardAdmin(session: Session | null): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  if (!isAdminSession(session)) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }
  return null;
}
