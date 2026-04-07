/**
 * POST — 서명된 외부 참가 URL 발급 (매번 새 토큰 · 만료는 PARTICIPANT_LINK_TTL_SECONDS)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessExperimentRow } from "@/lib/experiment-access";
import { z } from "zod";
import {
  buildParticipantTestUrl,
  getParticipantLinkTtlSeconds,
  requestOriginFromRequest,
  signParticipantLinkToken,
} from "@/lib/participant-link-token";

const bodySchema = z.object({
  ttlSeconds: z.number().min(60).max(365 * 24 * 60 * 60).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    let ttlSeconds = getParticipantLinkTtlSeconds();
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = await req.json().catch(() => ({}));
      const parsed = bodySchema.safeParse(raw);
      if (parsed.success && parsed.data.ttlSeconds != null) {
        ttlSeconds = parsed.data.ttlSeconds;
      }
    }

    const experiment = await prisma.experiment.findUnique({
      where: { id },
    });

    if (!experiment || !canAccessExperimentRow(session, experiment)) {
      return NextResponse.json(
        { error: "Experiment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const { token, expiresAt } = signParticipantLinkToken(
      experiment.key,
      ttlSeconds
    );
    const origin = requestOriginFromRequest(req);
    const url = buildParticipantTestUrl(origin, experiment.key, token);

    return NextResponse.json({
      url,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (e) {
    console.error("[participant-link]", e);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
