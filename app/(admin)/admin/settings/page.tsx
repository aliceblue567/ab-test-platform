import { isAdminPasswordConfigured } from "@/lib/admin-gate";
import { AdminSettingsForm } from "./admin-settings-form";

export default function AdminSettingsPage() {
  const gateEnabled = isAdminPasswordConfigured();
  return (
    <AdminSettingsForm
      gateEnabled={gateEnabled}
      hasAuthSecret={Boolean(process.env.AUTH_SECRET)}
      hasNextAuthUrl={Boolean(process.env.NEXTAUTH_URL)}
    />
  );
}
