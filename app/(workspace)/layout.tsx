import { ThemeProvider } from "@/components/providers/theme-provider";
import { WorkspaceLayoutShell } from "@/components/workspace/workspace-layout-shell";
import { Toaster } from "sonner";

export default function WorkspaceGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="dark">
      <WorkspaceLayoutShell>{children}</WorkspaceLayoutShell>
      <Toaster richColors position="top-right" closeButton />
    </ThemeProvider>
  );
}
