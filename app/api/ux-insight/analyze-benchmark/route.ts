import { auth } from "@/lib/auth";
import { runOpenAiBenchmarkAnalysis } from "@/lib/ux-insight/openai-benchmark-analysis";
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

  const ours = formData.get("image_ours");
  const competitor = formData.get("image_competitor");
  if (!(ours instanceof File) || ours.size === 0) {
    return NextResponse.json(
      { error: "자사 화면 이미지(image_ours)가 필요합니다." },
      { status: 400 }
    );
  }
  if (!(competitor instanceof File) || competitor.size === 0) {
    return NextResponse.json(
      { error: "타사 화면 이미지(image_competitor)가 필요합니다." },
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

  const context =
    String(formData.get("comparison_context") ?? "").trim() ||
    "동일 과업(예: 항공 검색 결과) 화면 비교";

  const bufO = Buffer.from(await ours.arrayBuffer());
  const bufC = Buffer.from(await competitor.arrayBuffer());

  try {
    const result = await runOpenAiBenchmarkAnalysis({
      oursBase64: bufO.toString("base64"),
      oursMediaType: ours.type || "image/png",
      competitorBase64: bufC.toString("base64"),
      competitorMediaType: competitor.type || "image/png",
      personaAge,
      personaProficiency,
      personaGoal,
      context,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missing = msg.includes("OPENAI_API_KEY is not configured");
    console.error("[ux-insight/analyze-benchmark]", e);
    return NextResponse.json({ error: msg }, { status: missing ? 503 : 502 });
  }
}
