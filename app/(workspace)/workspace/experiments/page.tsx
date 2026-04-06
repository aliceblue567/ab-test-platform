import { ExperimentsListPage } from "@/components/admin/experiments-list-page";
import { WorkspaceAdminHint } from "@/components/workspace/workspace-admin-hint";

export default function WorkspaceExperimentsPage() {
  return (
    <>
      <WorkspaceAdminHint />
      <ExperimentsListPage />
    </>
  );
}
