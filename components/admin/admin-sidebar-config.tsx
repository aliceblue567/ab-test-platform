import type { SidebarSectionKey, SidebarNavItem } from "@/lib/platform-sidebar";
import {
  LayoutDashboard,
  LayoutList,
  PlusCircle,
  FlaskConical,
  Link2,
  BarChart3,
  Archive,
  Sparkles,
  ImageIcon,
  Workflow,
  GitCompareArrows,
  Building2,
  FolderOpen,
  PenLine,
  BookOpen,
  FileStack,
  KeyRound,
  History,
  Users,
  Clock,
  Mail,
  Settings,
  ClipboardList,
  Shield,
  Bell,
} from "lucide-react";

export function getAdminSidebarItems(
  section: SidebarSectionKey
): { items: SidebarNavItem[] } {
  const a = "/admin";
  const w = "/workspace";

  switch (section) {
    case "dashboard":
      return {
        items: [
          { href: `${a}/dashboard`, label: "대시보드", icon: LayoutDashboard },
        ],
      };
    case "experiments":
      return {
        items: [
          {
            href: `${a}/experiments`,
            label: "실험 목록",
            icon: LayoutList,
            clearQueryForActive: true,
          },
          { href: `${a}/planner`, label: "새 실험 만들기", icon: PlusCircle },
          { href: `${a}/experiments?phase=draft`, label: "플래너", icon: FlaskConical },
          { href: `${a}/experiments/urls`, label: "참여 URL 관리", icon: Link2 },
          { href: `${a}/experiments?view=results`, label: "결과 보기", icon: BarChart3 },
          { href: `${a}/experiments?status=completed`, label: "보관된 실험", icon: Archive },
        ],
      };
    case "analysis":
      return {
        items: [
          {
            href: "/insight",
            label: "UX 인사이트 랩",
            icon: Sparkles,
            exactPath: true,
          },
          { href: "/insight/screens", label: "화면 분석", icon: ImageIcon },
          { href: "/insight/flows", label: "유저 플로우 분석", icon: Workflow },
          {
            href: "/insight/benchmark",
            label: "벤치마킹",
            icon: GitCompareArrows,
            inactiveWhenSearchHasKey: "lens",
          },
          {
            href: "/insight/benchmark?lens=competitor",
            label: "경쟁사 비교",
            icon: Building2,
          },
          { href: `${w}/insight-saved`, label: "저장된 리포트", icon: FolderOpen },
        ],
      };
    case "writing":
      return {
        items: [
          { href: "/", label: "문구 검수", icon: PenLine },
          { href: `${a}/guidelines`, label: "UX 가이드", icon: BookOpen },
          { href: `${a}/writing/templates`, label: "템플릿", icon: FileStack },
          { href: `${a}/api-keys`, label: "API 키", icon: KeyRound },
          { href: `${a}/writing/history`, label: "검수 히스토리", icon: History },
        ],
      };
    case "team":
      return {
        items: [
          { href: `${a}/team/members`, label: "팀원 목록", icon: Users },
          { href: `${w}/insight-saved`, label: "저장함", icon: FolderOpen },
          { href: `${a}/team/recent`, label: "최근 작업", icon: Clock },
          { href: `${a}/team/invites`, label: "초대 관리", icon: Mail },
          { href: `${w}/settings`, label: "워크스페이스 설정", icon: Settings },
        ],
      };
    case "settings":
      return {
        items: [
          {
            href: `${a}/settings`,
            label: "조직 설정",
            icon: Settings,
            exactPath: true,
          },
          { href: `${a}/settings/permissions`, label: "권한 관리", icon: Users },
          { href: `${a}/settings/notifications`, label: "알림 설정", icon: Bell },
          { href: `${a}/settings/security`, label: "보안 설정", icon: Shield },
          { href: `${a}/audit`, label: "감사 로그", icon: ClipboardList },
        ],
      };
    default:
      return { items: [] };
  }
}

/** 인사이트 레이아웃 전용 — 관리자「인사이트」2뎁스와 동일 */
export function getInsightLabSidebarItems(): SidebarNavItem[] {
  return getAdminSidebarItems("analysis").items;
}

export function getWorkspaceSidebarItems(
  section: SidebarSectionKey
): { items: SidebarNavItem[] } {
  const w = "/workspace";
  const a = "/admin";

  switch (section) {
    case "dashboard":
      return {
        items: [
          { href: `${w}/dashboard`, label: "워크스페이스 홈", icon: LayoutDashboard },
        ],
      };
    case "experiments":
      return {
        items: [
          {
            href: `${w}/experiments`,
            label: "실험 목록",
            icon: LayoutList,
            clearQueryForActive: true,
          },
          { href: `${w}/planner`, label: "새 실험 만들기", icon: PlusCircle },
          { href: `${w}/experiments?phase=draft`, label: "플래너", icon: FlaskConical },
          { href: `${w}/experiments/urls`, label: "참여 URL 관리", icon: Link2 },
          { href: `${w}/experiments?view=results`, label: "결과 보기", icon: BarChart3 },
          { href: `${w}/experiments?status=completed`, label: "보관된 실험", icon: Archive },
        ],
      };
    case "analysis":
      return {
        items: [
          {
            href: "/insight",
            label: "UX 인사이트 랩",
            icon: Sparkles,
            exactPath: true,
          },
          { href: "/insight/screens", label: "화면 분석", icon: ImageIcon },
          { href: "/insight/flows", label: "유저 플로우 분석", icon: Workflow },
          {
            href: "/insight/benchmark",
            label: "벤치마킹",
            icon: GitCompareArrows,
            inactiveWhenSearchHasKey: "lens",
          },
          {
            href: "/insight/benchmark?lens=competitor",
            label: "경쟁사 비교",
            icon: Building2,
          },
          { href: `${w}/insight-saved`, label: "저장된 리포트", icon: FolderOpen },
        ],
      };
    case "writing":
      return {
        items: [
          { href: "/", label: "문구 검수", icon: PenLine },
          { href: `${w}/guidelines`, label: "UX 가이드", icon: BookOpen },
          { href: `${w}/writing/templates`, label: "템플릿", icon: FileStack },
          { href: `${w}/writing/history`, label: "검수 히스토리", icon: History },
        ],
      };
    case "team":
      return { items: [] };
    case "settings":
      return {
        items: [
          { href: `${w}/settings`, label: "워크스페이스 설정", icon: Settings },
        ],
      };
    default:
      return { items: [] };
  }
}
