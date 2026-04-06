import { prisma } from "@/lib/db";

/**
 * Credentials 로그인 후 JWT용 User 행.
 * `allowCreate`: 환경 변수 관리자·디버그 계정 첫 로그인 시에만 true.
 * DB `passwordHash` 로그인(`dbPasswordMatch`)일 때는 반드시 false.
 */
const userCredentialSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
} as const;

export async function getOrCreateCredentialsUser(
  emailLower: string,
  allowCreate: boolean
) {
  let user = await prisma.user.findFirst({
    where: { email: { equals: emailLower, mode: "insensitive" } },
    select: userCredentialSelect,
  });
  if (user) return user;
  if (!allowCreate) return null;
  return prisma.user.create({
    data: {
      email: emailLower,
      name: "관리자",
      role: "admin",
    },
    select: userCredentialSelect,
  });
}
