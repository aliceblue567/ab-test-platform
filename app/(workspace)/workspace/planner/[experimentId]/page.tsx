import { ExperimentEditForm } from "@/components/admin/experiment-form/experiment-edit-form";

export default async function WorkspacePlannerEditPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const { experimentId } = await params;
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ExperimentEditForm experimentId={experimentId} />
    </div>
  );
}
