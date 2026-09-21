import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function writeAudit(input: {
  businessId: number;
  actorUserId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        mtumiajiId: input.businessId,
        actorUserId: input.actorUserId ?? null,
        action: input.action.slice(0, 80),
        entity: input.entity.slice(0, 80),
        entityId: input.entityId == null ? null : String(input.entityId).slice(0, 80),
        details: input.details == null ? null : JSON.stringify(input.details).slice(0, 4000),
      },
    });
    revalidatePath("/business");
  } catch {
    // Audit logging must not make the primary business action fail.
  }
}
