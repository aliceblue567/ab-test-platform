import type { UserRole } from "@prisma/client";

export function buildCredentialsJwtFields(user: {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
}) {
  return {
    sub: user.id,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    id: user.id,
    role: user.role,
  };
}
