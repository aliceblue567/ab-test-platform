import { ReportDashboard } from "@/components/admin/report/report-dashboard";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const { experimentId } = await params;
  return <ReportDashboard experimentId={experimentId} />;
}
