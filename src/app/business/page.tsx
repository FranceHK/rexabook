import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { businessIdFor, getBusinessOwner, requireUser, subscriptionIsActive } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessView, type BusinessViewData } from "@/components/business/business-view";

export const metadata: Metadata = { title: "Biashara" };

export default async function BusinessPage() {
  const user = await requireUser();
  const businessId = businessIdFor(user);
  const owner = await getBusinessOwner(user);
  if (!owner) return null;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, sales, expenses, customers, cargos, staff, audits, subscriptionPayments] = await Promise.all([
    prisma.product.findMany({ where: { mtumiajiId: businessId, active: true }, orderBy: { jina: "asc" } }),
    prisma.sale.findMany({
      where: { mtumiajiId: businessId },
      include: { customer: { select: { jina: true, simu: true } }, items: true, servedBy: { select: { jina: true } } },
      orderBy: { tarehe: "desc" },
      take: 80,
    }),
    prisma.expense.findMany({ where: { mtumiajiId: businessId }, orderBy: { tarehe: "desc" }, take: 80 }),
    prisma.customer.findMany({ where: { mtumiajiId: businessId, imezuiwa: false }, select: { id: true, jina: true, simu: true }, orderBy: { jina: "asc" } }),
    prisma.cargo.findMany({
      where: { mtumiajiId: businessId, hali: "Imefika", items: { some: { stockedAt: null } } },
      include: { items: true },
      orderBy: { tareheKuagiza: "desc" },
    }),
    prisma.user.findMany({ where: { ownerId: businessId }, select: { id: true, jina: true, businessRole: true, isActive: true, tareheKuundwa: true }, orderBy: { tareheKuundwa: "asc" } }),
    prisma.auditLog.findMany({ where: { mtumiajiId: businessId }, include: { actor: { select: { jina: true } } }, orderBy: { tarehe: "desc" }, take: 60 }),
    prisma.subscriptionPayment.findMany({ where: { mtumiajiId: businessId }, orderBy: { tareheKuundwa: "desc" }, take: 8 }),
  ]);

  const monthlySales = sales.filter((sale) => sale.tarehe >= monthStart);
  const monthlyExpenses = expenses.filter((expense) => expense.tarehe >= monthStart);
  const revenue = monthlySales.reduce((sum, sale) => sum + Number(sale.jumla), 0);
  const grossProfit = monthlySales.reduce((sum, sale) => sum + Number(sale.faida), 0);
  const expenseTotal = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.kiasi), 0);
  const data: BusinessViewData = {
    role: user.businessRole,
    snippeConfigured: Boolean(process.env.SNIPPE_API_KEY && process.env.SNIPPE_WEBHOOK_SECRET),
    subscription: {
      status: owner.subscriptionStatus,
      active: subscriptionIsActive(owner),
      endsAt: owner.subscriptionEndsAt?.toISOString() ?? null,
    },
    stats: {
      revenue,
      grossProfit,
      expenses: expenseTotal,
      netProfit: grossProfit - expenseTotal,
      stockValue: products.reduce((sum, product) => sum + product.stock * Number(product.beiKununua), 0),
      lowStock: products.filter((product) => product.stock <= product.stockTahadhari).length,
    },
    products: products.map((product) => ({
      id: product.id,
      name: product.jina,
      sku: product.sku,
      unit: product.kitengo,
      buyingPrice: Number(product.beiKununua),
      sellingPrice: Number(product.beiKuuza),
      stock: product.stock,
      lowStockAt: product.stockTahadhari,
    })),
    sales: sales.map((sale) => ({
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      customerName: sale.customer?.jina ?? null,
      customerPhone: sale.customer?.simu ?? null,
      servedBy: sale.servedBy?.jina ?? null,
      paymentMethod: sale.njiaMalipo,
      total: Number(sale.jumla),
      paidAmount: Number(sale.kiasiKilicholipwa),
      profit: Number(sale.faida),
      createdAt: sale.tarehe.toISOString(),
      items: sale.items.map((item) => ({ name: item.jinaBidhaa, quantity: item.idadi, unitPrice: Number(item.beiKuuza), total: Number(item.jumla) })),
    })),
    expenses: expenses.map((expense) => ({ id: expense.id, category: expense.aina, amount: Number(expense.kiasi), note: expense.maelezo, createdAt: expense.tarehe.toISOString() })),
    customers,
    cargos: cargos.map((cargo) => ({
      id: cargo.id,
      supplier: cargo.jinaKampuni,
      tracking: cargo.nambariTracking,
      baseCost: Number(cargo.jumlaGharama),
      items: cargo.items.filter((item) => !item.stockedAt).map((item) => ({ name: item.jinaBidhaa, quantity: item.idadi, total: Number(item.jumla) })),
    })),
    staff: staff.map((member) => ({ id: member.id, name: member.jina, role: member.businessRole, active: member.isActive, createdAt: member.tareheKuundwa.toISOString() })),
    audits: audits.map((audit) => ({ id: audit.id, actor: audit.actor?.jina ?? "Mfumo", action: audit.action, entity: audit.entity, details: audit.details, createdAt: audit.tarehe.toISOString() })),
    subscriptionPayments: subscriptionPayments.map((payment) => ({ id: payment.id, amount: payment.kiasi, months: payment.miezi, status: payment.status, paymentStatus: payment.paymentStatus, reference: payment.paymentReference, createdAt: payment.tareheKuundwa.toISOString() })),
  };

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: owner.jina_duka, isAdmin: user.role === "ADMIN", businessRole: user.businessRole }}>
      <BusinessView data={data} />
    </AppShell>
  );
}
