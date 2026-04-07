import { isAdminPasswordConfigured } from "@/lib/admin-gate";
import { WorkspaceSettingsForm } from "./workspace-settings-form";

export default function WorkspaceSettingsPage() {
  return (
    <WorkspaceSettingsForm gateEnabled={isAdminPasswordConfigured()} />
  );
}
