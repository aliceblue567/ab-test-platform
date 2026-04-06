import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Playwright로 URL의 뷰포트 스크린샷 + 제목·메타 디스크립션 수집.
 * 서버에 Chromium 설치가 필요합니다 (`npx playwright install chromium`).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : "";

  if (!url || !isSafeHttpUrl(url)) {
    return NextResponse.json(
      { error: "유효한 http(s) URL만 캡처할 수 있습니다." },
      { status: 400 }
    );
  }

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await page
        .waitForLoadState("load", { timeout: 15_000 })
        .catch(() => undefined);

      const title = (await page.title().catch(() => "")) || url;
      let description: string | null = null;
      try {
        const h = await page
          .locator('meta[name="description"]')
          .first()
          .getAttribute("content", { timeout: 2000 });
        description = h?.trim() || null;
      } catch {
        description = null;
      }

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
      });

      return NextResponse.json({
        imageBase64: Buffer.from(screenshot).toString("base64"),
        mimeType: "image/png",
        title,
        description,
        url,
      });
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ux-insight/capture-page]", e);
    const hint =
      msg.includes("Executable doesn't exist") ||
      msg.includes("browserType.launch")
        ? " 서버에 Chromium을 설치하세요: npx playwright install chromium"
        : "";
    return NextResponse.json(
      { error: `${msg}${hint}` },
      { status: 502 }
    );
  }
}
