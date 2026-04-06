/**
 * Auth.js (NextAuth v5) 설정
 * 관리자 로그인용 - CredentialsProvider (이메일/비밀번호)
 * lib/credential-check와 동일한 검증 로직 사용
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { getOrCreateCredentialsUser } from "@/lib/auth-session-user";
import { verifyLoginCredentials } from "@/lib/credential-check";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development" ? "dev-secret-replace-in-production" : undefined),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/admin/login",
    error: "/admin/auth-error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) (session.user as { id?: string }).id = token.id as string;
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
          return { id: user.id, email: user.email!, name: user.name };
        } catch (err) {
          console.error("[Auth] DB error during login:", err);
          throw new Error("DB_ERROR");
        }
      },
    }),
  ],
});
