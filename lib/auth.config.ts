/**
 * NextAuth 공통 설정 (미들웨어 Edge 번들용 — Prisma/adapter 없음).
 * authorize 내부만 동적 import로 Node 전용 모듈 로드.
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  getAdminSessionMaxAgeSeconds,
  getWorkspaceSessionMaxAgeSeconds,
} from "@/lib/auth-session-max-age";

export default {
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development"
      ? "dev-secret-replace-in-production"
      : undefined),
  trustHost: true,
  session: {
    strategy: "jwt",
    /** JWT 상한 — 실제 쿠키/JWT 만료는 로그인 시 역할별 encode 로 맞춤 */
    maxAge: Math.max(
      getAdminSessionMaxAgeSeconds(),
      getWorkspaceSessionMaxAgeSeconds()
    ),
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/auth-error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as { role?: string };
        if (u.role) token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as { id?: string }).id = token.id as string;
        if (token.role)
          (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const { verifyLoginCredentials } = await import(
          "@/lib/credential-check"
        );
        const { getOrCreateCredentialsUser } = await import(
          "@/lib/auth-session-user"
        );
        const creds = (credentials ?? {}) as Record<string, unknown>;
        const result = await verifyLoginCredentials(creds);
        if (!result.match) {
          console.error("[Auth] authorize 실패", {
            credKeys: Object.keys(creds),
            envMatch: result.envMatch,
            knownMatch: result.knownMatch,
            dbPasswordMatch: result.dbPasswordMatch,
          });
          return null;
        }

        const email = result.email;
        try {
          const user = await getOrCreateCredentialsUser(
            email,
            !result.dbPasswordMatch
          );
          if (!user) return null;
          return {
            id: user.id,
            email: user.email!,
            name: user.name,
            role: user.role,
          };
        } catch (err) {
          console.error("[Auth] DB error during login:", err);
          throw new Error("DB_ERROR");
        }
      },
    }),
  ],
} satisfies NextAuthConfig;
