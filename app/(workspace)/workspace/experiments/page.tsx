import { Suspense } from "react";
import { ExperimentsListPage } from "@/components/admin/experiments-list-page";
import { WorkspaceAdminHint } from "@/components/workspace/workspace-admin-hint";

export default function WorkspaceExperimentsPage() {
  return (
    <>
      <WorkspaceAdminHint />
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">로딩…</div>}>
        <ExperimentsListPage />
      </Suspense>
    </>
  );
}
