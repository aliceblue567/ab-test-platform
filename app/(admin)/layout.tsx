import { ThemeProvider } from "@/components/providers/theme-provider";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-background text-foreground">
        <AdminSidebar />
        <main className="pl-56">{children}</main>
      </div>
    </ThemeProvider>
  );
}
