import { auth } from "@/lib/auth";
import { runGeminiBenchmarkAnalysis } from "@/lib/ux-insight/gemini-benchmark-analysis";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const countRaw = formData.get("variant_count");
  const count = Number(countRaw);
  if (!Number.isFinite(count) || count < 2 || count > 8) {
    return NextResponse.json(
      { error: "variant_count는 2~8 사이여야 합니다." },
      { status: 400 }
    );
  }

  const variants: { label: string; base64: string; mediaType: string }[] = [];

  for (let i = 0; i < count; i++) {
    const file = formData.get(`image_${i}`);
    const labelRaw = formData.get(`label_${i}`);
    const label =
      typeof labelRaw === "string" && labelRaw.trim()
        ? labelRaw.trim()
        : `화면 ${i + 1}`;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: `image_${i} 파일이 비어 있거나 없습니다.` },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    variants.push({
      label,
      base64: buf.toString("base64"),
      mediaType: file.type || "image/png",
    });
  }

  const personaAge = String(formData.get("persona_age") ?? "").trim();
  const personaProficiency = String(
    formData.get("persona_proficiency") ?? ""
  ).trim();
  const personaGoal = String(formData.get("persona_goal") ?? "").trim();
  if (!personaAge || !personaProficiency || !personaGoal) {
    return NextResponse.json(
      { error: "페르소나(연령·숙련도·목적)를 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  const context =
    String(formData.get("comparison_context") ?? "").trim() ||
    "동일 과업 기준 멀티 화면 비교";

  try {
    const result = await runGeminiBenchmarkAnalysis({
      variants,
      personaAge,
      personaProficiency,
      personaGoal,
      context,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missing = msg.includes("GEMINI_API_KEY is not configured");
    console.error("[ux-insight/analyze-benchmark]", e);
    return NextResponse.json({ error: msg }, { status: missing ? 503 : 502 });
  }
}
