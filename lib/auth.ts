/**
 * Auth.js (NextAuth v5) — API/서버 라우트용 (PrismaAdapter 포함)
 * 미들웨어는 lib/auth.config만 사용 (Edge 호환)
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});
