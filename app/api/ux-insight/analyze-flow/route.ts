import { auth } from "@/lib/auth";
import { runGeminiFlowAnalysis } from "@/lib/ux-insight/gemini-flow-analysis";
import { sanitizePersonaTextForApi } from "@/lib/ux-insight/sanitize-prompt";
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

  const files = formData.getAll("image").filter((x): x is File => x instanceof File);
  if (files.length < 2) {
    return NextResponse.json(
      { error: "플로우 분석에는 이미지 2장 이상이 필요합니다." },
      { status: 400 }
    );
  }
  if (files.length > 8) {
    return NextResponse.json(
      { error: "한 번에 최대 8장까지 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  const personaAge = sanitizePersonaTextForApi(
    String(formData.get("persona_age") ?? "").trim()
  );
  const personaProficiency = sanitizePersonaTextForApi(
    String(formData.get("persona_proficiency") ?? "").trim()
  );
  const personaGoal = sanitizePersonaTextForApi(
    String(formData.get("persona_goal") ?? "").trim()
  );
  if (!personaAge || !personaProficiency || !personaGoal) {
    return NextResponse.json(
      { error: "페르소나(연령·숙련도·목적)를 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  const flowTitle =
    sanitizePersonaTextForApi(
      String(formData.get("flow_title") ?? "").trim()
    ) || "유저 플로우";
  const projectId = String(formData.get("project_id") ?? "").trim();

  const images: { base64: string; mediaType: string }[] = [];
  for (const file of files) {
    if (file.size === 0) {
      return NextResponse.json(
        { error: "빈 이미지 파일이 있습니다." },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    images.push({
      base64: buf.toString("base64"),
      mediaType: file.type || "image/png",
    });
  }

  try {
    const result = await runGeminiFlowAnalysis({
      images,
      personaAge,
      personaProficiency,
      personaGoal,
      flowTitle,
      uxProjectId: projectId || null,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missing = msg.includes("GEMINI_API_KEY is not configured");
    console.error("[ux-insight/analyze-flow]", e);
    return NextResponse.json({ error: msg }, { status: missing ? 503 : 502 });
  }
}
