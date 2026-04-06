import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";
import {
  isAdminSession,
  isWorkspaceMemberRole,
  sessionRole,
} from "@/lib/auth-role";

export function experimentsListWhere(
  session: Session | null
): Prisma.ExperimentWhereInput | undefined {
  if (!session?.user?.id) return undefined;
  const role = sessionRole(session);
  if (isAdminSession(session)) return undefined;
  if (isWorkspaceMemberRole(role)) {
    return { ownerId: session.user.id };
  }
  return undefined;
}

export function canAccessExperimentRow(
  session: Session | null,
  experiment: { ownerId: string | null } | null
): boolean {
  if (!experiment) return false;
  if (isAdminSession(session)) return true;
  const uid = session?.user?.id;
  if (!uid) return false;
  return experiment.ownerId === uid;
}
