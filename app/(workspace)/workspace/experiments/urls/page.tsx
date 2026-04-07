import { ExperimentUrlsHub } from "@/components/admin/experiment-urls-hub";
import { WorkspaceAdminHint } from "@/components/workspace/workspace-admin-hint";

export default function WorkspaceExperimentUrlsPage() {
  return (
    <>
      <WorkspaceAdminHint />
      <ExperimentUrlsHub />
    </>
  );
}
