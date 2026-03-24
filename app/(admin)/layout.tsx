import { ThemeProvider } from "@/components/providers/theme-provider";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { Toaster } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="dark">
      <AdminLayoutShell>{children}</AdminLayoutShell>
      <Toaster richColors position="top-right" closeButton />
    </ThemeProvider>
  );
}
