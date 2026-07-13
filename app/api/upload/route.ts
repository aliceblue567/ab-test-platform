/**
 * POST /api/upload - 이미지 업로드 (PNG, JPG)
 * Vercel Blob에 업로드 후 URL 반환
 */
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다", code: "NO_FILE" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "PNG, JPG 파일만 업로드 가능합니다", code: "INVALID_TYPE" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다", code: "TOO_LARGE" },
        { status: 400 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "이미지 저장소가 설정되지 않았습니다. Vercel 대시보드에서 Blob Storage를 설정하거나, 이미지 URL을 직접 입력해주세요.",
          code: "BLOB_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const blob = await put(
      `variants/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
      file,
      { access: "public" }
    );

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("BLOB_READ_WRITE_TOKEN") || msg.toLowerCase().includes("blob")) {
      return NextResponse.json(
        {
          error:
            "이미지 저장소가 설정되지 않았습니다. Vercel 대시보드에서 Blob Storage를 설정하거나, 이미지 URL을 직접 입력해주세요.",
          code: "BLOB_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "업로드에 실패했습니다", code: "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}
