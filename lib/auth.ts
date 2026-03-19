/**
 * Auth.js (NextAuth v5) 설정
 * 관리자 로그인용 - 추후 CredentialsProvider, GoogleProvider 등 추가
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/admin/login",
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
  providers: [], // CredentialsProvider, GoogleProvider 등 추가 예정
});
