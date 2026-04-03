import { ThemeProvider } from "@/components/providers/theme-provider";
import { InsightLayoutShell } from "@/components/insight/insight-layout-shell";
import { Toaster } from "sonner";

/**
 * UX 인사이트 랩: A/B·UX 라이팅과 URL·내비·API를 분리한 전용 셸.
 */
export default function InsightRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="dark">
      <InsightLayoutShell>{children}</InsightLayoutShell>
      <Toaster richColors position="top-right" closeButton />
    </ThemeProvider>
  );
}
