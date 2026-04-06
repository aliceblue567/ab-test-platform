/**
 * DB에 팀원별 Credentials 비밀번호 해시 등록·갱신
 *
 * 환경: 프로젝트 루트 `.env`에 DATABASE_URL
 * 실행: `npm run set-member-password -- team@corp.com 'Secret!23' '홍길동'`
 * (`--` 뒤 인자가 스크립트에 전달됨)
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , emailRaw, password, ...nameParts] = process.argv;
  if (!emailRaw || !password) {
    console.error(
      "사용법: npm run set-member-password -- <email> <password> [표시 이름]"
    );
    process.exit(1);
  }
  const emailLower = emailRaw.trim().toLowerCase();
  const name = nameParts.join(" ").trim() || undefined;
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: emailLower, mode: "insensitive" } },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          email: emailLower,
          ...(name !== undefined ? { name } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          email: emailLower,
          name,
          passwordHash,
          role: "member",
        },
      });

  console.log("등록됨:", user.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
