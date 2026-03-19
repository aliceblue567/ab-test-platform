import { TestLanding } from "@/components/test/test-landing";

export default async function TestPage({
  params,
}: {
  params: Promise<{ experimentSlug: string }>;
}) {
  const { experimentSlug } = await params;
  return <TestLanding experimentSlug={experimentSlug} />;
}
