import { auth } from "@/lib/auth";
import { runGeminiScreenAnalysis } from "@/lib/ux-insight/gemini-screen-analysis";
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

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: "이미지 파일(image)이 필요합니다." },
      { status: 400 }
    );
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

  const screenName =
    String(formData.get("screen_name") ?? "").trim() || "업로드 화면";
  const urlOrPath =
    String(formData.get("url_or_path") ?? "").trim() || "upload://analysis";
  let screenId = String(formData.get("screen_id") ?? "").trim();
  if (!screenId) {
    screenId = `screen_${crypto.randomUUID().slice(0, 12)}`;
  }

  const buf = Buffer.from(await image.arrayBuffer());
  const imageBase64 = buf.toString("base64");
  const imageMediaType = image.type || "image/png";

  try {
    const result = await runGeminiScreenAnalysis({
      imageBase64,
      imageMediaType,
      personaAge,
      personaProficiency,
      personaGoal,
      screenId,
      screenName,
      urlOrPath,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missing = msg.includes("GEMINI_API_KEY is not configured");
    console.error("[ux-insight/analyze]", e);
    return NextResponse.json(
      { error: msg },
      { status: missing ? 503 : 502 }
    );
  }
}
