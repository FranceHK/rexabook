import { NextResponse } from "next/server";
import { businessIdFor, getBusinessOwner, getCurrentUser, planAllows, subscriptionIsActive } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ingia kwanza." }, { status: 401 });
  if (user.businessRole !== "OWNER") return NextResponse.json({ error: "Owner pekee anaweza kupakua backup." }, { status: 403 });
  const businessOwner = await getBusinessOwner(user);
  if (!businessOwner || !planAllows(businessOwner, "backup")) return NextResponse.json({ error: "Backup inapatikana kwenye kifurushi cha Kamili." }, { status: 403 });
  if (!subscriptionIsActive(businessOwner)) return NextResponse.json({ error: "Subscription imeisha. Lipia ili kupakua backup." }, { status: 403 });
  const businessId = businessIdFor(user);
  const [owner, customers, debts, cargos, products, movements, sales, expenses, staff, audits, subscriptions] = await Promise.all([
    prisma.user.findUnique({ where: { id: businessId }, select: { id: true, jina: true, jina_duka: true, simu: true, tareheKuundwa: true } }),
    prisma.customer.findMany({ where: { mtumiajiId: businessId } }),
    prisma.debt.findMany({ where: { mtumiajiId: businessId }, include: { payments: true } }),
    prisma.cargo.findMany({ where: { mtumiajiId: businessId }, include: { items: true } }),
    prisma.product.findMany({ where: { mtumiajiId: businessId } }),
    prisma.stockMovement.findMany({ where: { mtumiajiId: businessId } }),
    prisma.sale.findMany({ where: { mtumiajiId: businessId }, include: { items: true } }),
    prisma.expense.findMany({ where: { mtumiajiId: businessId } }),
    prisma.user.findMany({ where: { ownerId: businessId }, select: { id: true, jina: true, businessRole: true, isActive: true, tareheKuundwa: true } }),
    prisma.auditLog.findMany({ where: { mtumiajiId: businessId } }),
    prisma.subscriptionPayment.findMany({ where: { mtumiajiId: businessId }, select: { id: true, kiasi: true, miezi: true, status: true, tareheKuundwa: true, tareheKulipwa: true } }),
  ]);
  const backup = { version: 1, exportedAt: new Date().toISOString(), owner, customers, debts, cargos, products, movements, sales, expenses, staff, audits, subscriptions };
  const fileDate = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rexabook-backup-${fileDate}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
