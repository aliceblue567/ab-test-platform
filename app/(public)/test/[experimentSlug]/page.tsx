import { TestLanding } from "@/components/test/test-landing";

export default async function TestPage({
  params,
  searchParams,
}: {
  params: Promise<{ experimentSlug: string }>;
  searchParams: Promise<{ p?: string | string[] }>;
}) {
  const { experimentSlug } = await params;
  const q = await searchParams;
  const pRaw = q.p;
  const participantToken =
    typeof pRaw === "string" ? pRaw : Array.isArray(pRaw) ? pRaw[0] : undefined;
  return (
    <TestLanding
      experimentSlug={experimentSlug}
      participantToken={participantToken}
    />
  );
}
