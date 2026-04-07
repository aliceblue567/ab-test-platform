import { Suspense } from "react";
import { ExperimentsListPage } from "@/components/admin/experiments-list-page";

export default function AdminExperimentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">로딩…</div>}>
      <ExperimentsListPage />
    </Suspense>
  );
}
