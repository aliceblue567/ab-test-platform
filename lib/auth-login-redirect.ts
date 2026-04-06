/**
 * 로그인 실패 리다이렉트용 — 워크스페이스 진입 시도는 /workspace/login 으로.
 */
export function loginPagePathForCallback(callbackUrl: string): "/admin/login" | "/workspace/login" {
  try {
    const path = new URL(callbackUrl, "https://placeholder.local").pathname;
    if (path === "/workspace" || path.startsWith("/workspace/")) {
      return "/workspace/login";
    }
  } catch {
    /* ignore */
  }
  if (callbackUrl.startsWith("/workspace")) return "/workspace/login";
  return "/admin/login";
}
