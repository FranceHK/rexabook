"use server";

import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { Prisma, type BusinessRole, type SalePaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { businessIdFor, getBusinessOwner, planAllows, requireBusinessRole, subscriptionIsActive, subscriptionIsExempt } from "@/lib/auth";
import { isSubscriptionPlan, SUBSCRIPTION_PLANS } from "@/lib/plans";
import { fail, type ActionResult } from "@/lib/action-result";
import { normalizePhone } from "@/lib/sms";
import { createSnippeSubscriptionPayment, getSnippePayment } from "@/lib/snippe";
import { completeSubscriptionPayment, updateSubscriptionPaymentStatus } from "@/lib/subscriptions";
import { writeAudit } from "@/lib/audit";

export interface BusinessActionResult extends ActionResult {
  id?: number;
}

export interface SaleInput {
  customerId?: number | null;
  /** Required when no registered customer is picked. */
  customerName?: string;
  /** Save the typed name as a new customer of the shop. */
  registerCustomer?: boolean;
  customerPhone?: string;
  /** Mobile money transaction id; required for MOBILE_MONEY and unique per shop. */
  paymentReference?: string;
  paymentMethod: SalePaymentMethod;
  paidAmount?: number;
  note?: string;
  items: Array<{ productId: number; quantity: number }>;
}

function refreshBusiness() {
  revalidatePath("/business");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
}

async function activeBusinessContext(roles: BusinessRole[]) {
  const user = await requireBusinessRole(roles);
  const businessId = businessIdFor(user);
  const owner = await getBusinessOwner(user);
  if (!owner || !subscriptionIsActive(owner)) return { user, businessId, owner, active: false as const };
  return { user, businessId, owner, active: true as const };
}

/** SKU prefix from the product name: "Sukari 1kg" becomes "SUK". */
function skuPrefix(name: string): string {
  const letters = name.normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "BID").padEnd(3, "X");
}

/** Next free code for that prefix within one business, e.g. SUK-001, SUK-002. */
async function nextSku(businessId: number, name: string, skip: number): Promise<string> {
  const prefix = skuPrefix(name);
  const existing = await prisma.product.findMany({
    where: { mtumiajiId: businessId, sku: { startsWith: `${prefix}-` } },
    select: { sku: true },
  });
  const highest = existing.reduce((max, product) => {
    const number = Number(product.sku.slice(prefix.length + 1));
    return Number.isSafeInteger(number) && number > max ? number : max;
  }, 0);
  return `${prefix}-${String(highest + 1 + skip).padStart(3, "0")}`;
}

export async function createProductAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<BusinessActionResult> {
  const context = await activeBusinessContext(["OWNER", "MANAGER"]);
  if (!context.active) return fail("Subscription imeisha. Lipia ili kuongeza bidhaa.");

  const name = String(formData.get("jina") ?? "").trim();
  const unit = String(formData.get("kitengo") ?? "pc").trim();
  const buyingPrice = Number(formData.get("bei_kununua"));
  const sellingPrice = Number(formData.get("bei_kuuza"));
  const openingStock = Number(formData.get("stock"));
  const lowStockAt = Number(formData.get("stock_tahadhari"));

  if (!name || name.length > 150) return fail("Weka jina sahihi la bidhaa.");
  if (!unit || unit.length > 30) return fail("Weka kitengo sahihi.");
  if (![buyingPrice, sellingPrice].every((value) => Number.isFinite(value) && value >= 0)) return fail("Bei za bidhaa si sahihi.");
  if (![openingStock, lowStockAt].every((value) => Number.isSafeInteger(value) && value >= 0)) return fail("Idadi ya stock si sahihi.");

  // Two people adding the same kind of product at once can draw the same code; retry with the next one.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sku = await nextSku(context.businessId, name, attempt);
    try {
      const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            mtumiajiId: context.businessId,
            jina: name,
            sku,
            kitengo: unit,
            beiKununua: buyingPrice,
            beiKuuza: sellingPrice,
            stock: openingStock,
            stockTahadhari: lowStockAt,
          },
        });
        if (openingStock > 0) {
          await tx.stockMovement.create({
            data: {
              mtumiajiId: context.businessId,
              productId: created.id,
              aina: "OPENING",
              idadi: openingStock,
              stockBaada: openingStock,
              maelezo: "Stock ya kuanzia",
            },
          });
        }
        return created;
      });
      await writeAudit({ businessId: context.businessId, actorUserId: context.user.id, action: "PRODUCT_CREATED", entity: "Product", entityId: product.id, details: { name, sku, openingStock } });
      refreshBusiness();
      return { success: true, message: `Bidhaa “${name}” imeongezwa (SKU ${sku}).`, id: product.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      break;
    }
  }
  return fail("Imeshindikana kuongeza bidhaa.");
}

/** Edits a product's details. Stock is deliberately untouched: it only moves through adjustProductStockAction and sales. */
export async function updateProductAction(productId: number, formData: FormData): Promise<ActionResult> {
  const context = await activeBusinessContext(["OWNER", "MANAGER"]);
  if (!context.active) return fail("Subscription imeisha. Lipia ili kuhariri bidhaa.");

  const name = String(formData.get("jina") ?? "").trim();
  const unit = String(formData.get("kitengo") ?? "").trim();
  const buyingPrice = Number(formData.get("bei_kununua"));
  const sellingPrice = Number(formData.get("bei_kuuza"));
  const lowStockAt = Number(formData.get("stock_tahadhari"));
  if (!Number.isSafeInteger(productId)) return fail("Bidhaa haipatikani.");
  if (!name || name.length > 150) return fail("Weka jina sahihi la bidhaa.");
  if (!unit || unit.length > 30) return fail("Weka kitengo sahihi.");
  if (![buyingPrice, sellingPrice].every((value) => Number.isFinite(value) && value >= 0)) return fail("Bei za bidhaa si sahihi.");
  if (!Number.isSafeInteger(lowStockAt) || lowStockAt < 0) return fail("Kiwango cha tahadhari si sahihi.");

  const updated = await prisma.product.updateMany({
    where: { id: productId, mtumiajiId: context.businessId },
    data: { jina: name, kitengo: unit, beiKununua: buyingPrice, beiKuuza: sellingPrice, stockTahadhari: lowStockAt },
  });
  if (updated.count === 0) return fail("Bidhaa haipatikani.");
  await writeAudit({ businessId: context.businessId, actorUserId: context.user.id, action: "PRODUCT_UPDATED", entity: "Product", entityId: productId, details: { name, unit, buyingPrice, sellingPrice, lowStockAt } });
  refreshBusiness();
  return { success: true, message: `Bidhaa “${name}” imehifadhiwa.` };
}

export async function adjustProductStockAction(productId: number, delta: number, note?: string): Promise<ActionResult> {
  const context = await activeBusinessContext(["OWNER", "MANAGER"]);
  if (!context.active) return fail("Subscription imeisha.");
  if (!Number.isSafeInteger(productId) || !Number.isSafeInteger(delta) || delta === 0) return fail("Marekebisho ya stock si sahihi.");

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, mtumiajiId: context.businessId } });
      if (!product || product.stock + delta < 0) throw new Error("INVALID_STOCK");
      const updated = await tx.product.update({ where: { id: product.id }, data: { stock: { increment: delta } } });
      await tx.stockMovement.create({
        data: {
          mtumiajiId: context.businessId,
          productId: product.id,
          aina: "ADJUSTMENT",
          idadi: delta,
          stockBaada: updated.stock,
          maelezo: (note?.trim() || "Marekebisho ya stock").slice(0, 255),
        },
      });
    });
  } catch {
    return fail("Stock haitoshi au bidhaa haipatikani.");
  }
  await writeAudit({ businessId: context.businessId, actorUserId: context.user.id, action: "STOCK_ADJUSTED", entity: "Product", entityId: productId, details: { delta, note } });
  refreshBusiness();
  return { success: true, message: "Stock imerekebishwa." };
}

export async function createExpenseAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<BusinessActionResult> {
  const context = await activeBusinessContext(["OWNER", "MANAGER"]);
  if (!context.active) return fail("Subscription imeisha. Lipia ili kurekodi matumizi.");
  const category = String(formData.get("aina") ?? "").trim();
  const amount = Number(formData.get("kiasi"));
  const note = String(formData.get("maelezo") ?? "").trim();
  if (!category || category.length > 60) return fail("Chagua aina ya matumizi.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Weka kiasi sahihi cha matumizi.");

  const expense = await prisma.expense.create({
    data: { mtumiajiId: context.businessId, aina: category, kiasi: amount, maelezo: note || null },
  });
  await writeAudit({ businessId: context.businessId, actorUserId: context.user.id, action: "EXPENSE_CREATED", entity: "Expense", entityId: expense.id, details: { category, amount } });
  refreshBusiness();
  return { success: true, message: "Matumizi yamehifadhiwa.", id: expense.id };
}

export async function createSaleAction(input: SaleInput): Promise<BusinessActionResult> {
  const context = await activeBusinessContext(["OWNER", "MANAGER", "CASHIER"]);
  if (!context.active) return fail("Subscription imeisha. Lipia ili kuendelea na mauzo.");
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) return fail("Ongeza angalau bidhaa moja.");
  if (!(["CASH", "MOBILE_MONEY", "BANK", "CREDIT"] as string[]).includes(input.paymentMethod)) return fail("Njia ya malipo si sahihi.");
  const requestedPaidAmount = Number(input.paidAmount ?? 0);
  if (input.paymentMethod === "CREDIT" && (!Number.isFinite(requestedPaidAmount) || requestedPaidAmount < 0)) {
    return fail("Kiasi kilicholipwa si sahihi.");
  }

  const customerName = String(input.customerName ?? "").trim();
  const customerPhone = String(input.customerPhone ?? "").trim();
  if (!input.customerId && !customerName) return fail("Andika jina la mteja au mchague aliyesajiliwa.");
  if (customerName.length > 100) return fail("Jina la mteja ni refu mno.");
  if (customerPhone.length > 20) return fail("Namba ya simu ya mteja ni ndefu mno.");
  const paymentReference = String(input.paymentReference ?? "").replace(/\s+/g, "").toUpperCase();
  if (input.paymentMethod === "MOBILE_MONEY" && (paymentReference.length < 4 || paymentReference.length > 120)) {
    return fail("Weka namba ya muamala wa simu.");
  }

  const quantities = new Map<number, number>();
  for (const item of input.items) {
    if (!Number.isSafeInteger(item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) return fail("Idadi ya bidhaa si sahihi.");
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const productIds = [...quantities.keys()];
  try {
    const sale = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: productIds }, mtumiajiId: context.businessId, active: true } });
      if (products.length !== productIds.length) throw new Error("PRODUCT_NOT_FOUND");
      let customer = input.customerId
        ? await tx.customer.findFirst({ where: { id: input.customerId, mtumiajiId: context.businessId } })
        : null;
      if (input.customerId && !customer) throw new Error("CUSTOMER_NOT_FOUND");
      if (!customer && input.registerCustomer) {
        customer = await tx.customer.create({ data: { mtumiajiId: context.businessId, jina: customerName, simu: customerPhone || null } });
      }
      if (input.paymentMethod === "CREDIT" && !customer) throw new Error("CUSTOMER_REQUIRED");
      if (input.paymentMethod === "MOBILE_MONEY") {
        const used = await tx.sale.findFirst({ where: { mtumiajiId: context.businessId, kumbukumbuMalipo: paymentReference }, select: { receiptNumber: true } });
        if (used) throw new Error(`REFERENCE_USED:${used.receiptNumber}`);
      }

      let total = 0;
      let cost = 0;
      for (const product of products) {
        const quantity = quantities.get(product.id) ?? 0;
        if (product.stock < quantity) throw new Error(`LOW_STOCK:${product.jina}`);
        total += Number(product.beiKuuza) * quantity;
        cost += Number(product.beiKununua) * quantity;
      }
      const paidAmount = input.paymentMethod === "CREDIT"
        ? Math.min(total, requestedPaidAmount)
        : total;
      const receiptNumber = `RX-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
      const created = await tx.sale.create({
        data: {
          mtumiajiId: context.businessId,
          customerId: customer?.id ?? null,
          servedById: context.user.id,
          receiptNumber,
          njiaMalipo: input.paymentMethod,
          jumla: total,
          gharama: cost,
          faida: total - cost,
          kiasiKilicholipwa: paidAmount,
          jinaMteja: customer?.jina ?? customerName,
          kumbukumbuMalipo: input.paymentMethod === "MOBILE_MONEY" ? paymentReference : null,
          maelezo: input.note?.trim() || null,
          items: {
            create: products.map((product) => {
              const quantity = quantities.get(product.id) ?? 0;
              return {
                productId: product.id,
                jinaBidhaa: product.jina,
                idadi: quantity,
                beiKununua: product.beiKununua,
                beiKuuza: product.beiKuuza,
                jumla: Number(product.beiKuuza) * quantity,
              };
            }),
          },
        },
      });

      for (const product of products) {
        const quantity = quantities.get(product.id) ?? 0;
        const changed = await tx.product.updateMany({
          where: { id: product.id, mtumiajiId: context.businessId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (changed.count !== 1) throw new Error(`LOW_STOCK:${product.jina}`);
        const updated = await tx.product.findUnique({ where: { id: product.id }, select: { stock: true } });
        await tx.stockMovement.create({
          data: {
            mtumiajiId: context.businessId,
            productId: product.id,
            aina: "SALE",
            idadi: -quantity,
            stockBaada: updated?.stock ?? 0,
            kumbukumbu: receiptNumber,
            maelezo: `Mauzo ${receiptNumber}`,
          },
        });
      }

      const balance = total - paidAmount;
      if (balance > 0 && customer) {
        await tx.debt.create({
          data: {
            mtejaId: customer.id,
            mtumiajiId: context.businessId,
            jinaBidhaa: products.map((product) => product.jina).join(", ").slice(0, 150),
            kiasiAsili: balance,
            kiasiKilicholipwa: 0,
            tareheKukopa: new Date(),
            maelezo: `Mauzo ya mkopo ${receiptNumber}`,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          mtumiajiId: context.businessId,
          actorUserId: context.user.id,
          action: "SALE_CREATED",
          entity: "Sale",
          entityId: String(created.id),
          details: JSON.stringify({ receiptNumber, total, cost, paymentMethod: input.paymentMethod }),
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    refreshBusiness();
    return { success: true, message: `Mauzo ${sale.receiptNumber} yamehifadhiwa.`, id: sale.id };
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_REQUIRED") return fail("Kwa mauzo ya mkopo, chagua mteja aliyesajiliwa au msajili sasa.");
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") return fail("Mteja uliyemchagua hapatikani.");
    if (error instanceof Error && error.message.startsWith("REFERENCE_USED:")) return fail(`Namba hiyo ya muamala tayari imetumika kwenye risiti ${error.message.split(":")[1]}.`);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && String(error.meta?.target ?? "").includes("kumbukumbuMalipo")) return fail("Namba hiyo ya muamala tayari imetumika.");
    if (error instanceof Error && error.message.startsWith("LOW_STOCK:")) return fail(`Stock haitoshi kwa ${error.message.split(":")[1]}.`);
    return fail("Imeshindikana kuhifadhi mauzo. Kagua bidhaa na stock.");
  }
}

export async function createStaffAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const owner = await requireBusinessRole(["OWNER"]);
  if (!planAllows(owner, "staff")) return fail("Wafanyakazi wanapatikana kwenye kifurushi cha Kamili.");
  const businessId = businessIdFor(owner);
  const username = String(formData.get("jina") ?? "").trim();
  const password = String(formData.get("nenosiri") ?? "");
  const role = String(formData.get("business_role") ?? "") as BusinessRole;
  if (!username || username.length > 100) return fail("Weka jina la kuingia.");
  if (password.length < 6) return fail("Nenosiri liwe na herufi 6 au zaidi.");
  if (role !== "MANAGER" && role !== "CASHIER") return fail("Chagua nafasi sahihi.");
  if (await prisma.user.findFirst({ where: { jina: { equals: username, mode: "insensitive" } } })) return fail("Jina hilo tayari linatumika.");

  const member = await prisma.user.create({
    data: {
      jina: username,
      nenosiri: await hash(password, 10),
      jina_duka: owner.jina_duka,
      ownerId: businessId,
      businessRole: role,
      role: "USER",
      subscriptionStatus: "TRIAL",
    },
  });
  await writeAudit({ businessId, actorUserId: owner.id, action: "STAFF_CREATED", entity: "User", entityId: member.id, details: { username, role } });
  revalidatePath("/business");
  return { success: true, message: `${username} ameongezwa kama ${role === "MANAGER" ? "meneja" : "cashier"}.` };
}

export async function toggleStaffAction(staffId: number): Promise<ActionResult> {
  const owner = await requireBusinessRole(["OWNER"]);
  const businessId = businessIdFor(owner);
  const member = await prisma.user.findFirst({ where: { id: staffId, ownerId: businessId } });
  if (!member) return fail("Mfanyakazi hapatikani.");
  const updated = await prisma.user.update({ where: { id: member.id }, data: { isActive: !member.isActive } });
  await writeAudit({ businessId, actorUserId: owner.id, action: updated.isActive ? "STAFF_ENABLED" : "STAFF_DISABLED", entity: "User", entityId: member.id });
  revalidatePath("/business");
  return { success: true, message: updated.isActive ? "Mfanyakazi ameruhusiwa kuingia." : "Mfanyakazi amezuiwa kuingia." };
}

export async function startSubscriptionPaymentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  // Any member of the shop may pay, so a cashier is never stuck waiting for the owner.
  const user = await requireBusinessRole(["OWNER", "MANAGER", "CASHIER"]);
  const owner = await getBusinessOwner(user);
  if (!owner) return fail("Duka halipatikani.");
  if (subscriptionIsExempt(owner)) return fail("Akaunti ya admin hailipii subscription.");
  if (!process.env.SNIPPE_API_KEY) return fail("Snippe haijaunganishwa.");
  const businessId = businessIdFor(user);
  const phone = normalizePhone(String(formData.get("namba_malipo") ?? "").trim());
  const plan = formData.get("plan");
  if (!/^255\d{9}$/.test(phone)) return fail("Weka namba sahihi ya Tanzania.");
  if (!isSubscriptionPlan(plan)) return fail("Chagua kifurushi cha Msingi au Kamili.");
  const months = 1;
  const amount = SUBSCRIPTION_PLANS[plan].price;

  const pending = await prisma.subscriptionPayment.create({
    data: { mtumiajiId: businessId, kiasi: amount, miezi: months, plan, paymentPhone: phone, paymentStatus: "creating" },
  });
  const nameParts = user.jina.split(/\s+/).filter(Boolean);
  try {
    const payment = await createSnippeSubscriptionPayment({
      subscriptionPaymentId: pending.id,
      userId: businessId,
      months,
      amount,
      phone,
      firstName: nameParts[0]?.includes("@") ? "Mteja" : nameParts[0] || "Mteja",
      lastName: nameParts.slice(1).join(" ") || user.jina_duka || "RexaBook",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.jina) ? user.jina : `malipo+${businessId}@rexabook.app`,
    });
    await prisma.subscriptionPayment.update({
      where: { id: pending.id },
      data: {
        paymentReference: payment.reference,
        paymentStatus: payment.status,
        paymentExpiresAt: payment.expires_at ? new Date(payment.expires_at) : null,
        paymentResponse: JSON.stringify(payment).slice(0, 4000),
      },
    });
    if (payment.status === "completed") {
      await completeSubscriptionPayment({ reference: payment.reference, amount: payment.amount.value, currency: payment.amount.currency, response: JSON.stringify(payment) });
    }
    revalidatePath("/business");
    return { success: true, message: `Ombi la TZS ${amount.toLocaleString("en-TZ")} limetumwa ${phone}. Thibitisha kwa PIN.` };
  } catch {
    await prisma.subscriptionPayment.update({ where: { id: pending.id }, data: { status: "FAILED", paymentStatus: "failed_to_create" } });
    return fail("Snippe haikuweza kuanzisha malipo. Jaribu tena.");
  }
}

export async function checkSubscriptionPaymentAction(paymentId: number): Promise<ActionResult> {
  const user = await requireBusinessRole(["OWNER", "MANAGER", "CASHIER"]);
  const businessId = businessIdFor(user);
  const paymentRow = await prisma.subscriptionPayment.findFirst({ where: { id: paymentId, mtumiajiId: businessId } });
  if (!paymentRow?.paymentReference) return fail("Malipo hayana kumbukumbu ya Snippe.");
  try {
    const payment = await getSnippePayment(paymentRow.paymentReference);
    const response = JSON.stringify(payment);
    if (payment.status === "completed") {
      const result = await completeSubscriptionPayment({ reference: payment.reference, amount: payment.amount.value, currency: payment.amount.currency, response });
      revalidatePath("/business");
      return { success: true, message: result.activated ? `Subscription imewashwa hadi ${result.endsAt.toLocaleDateString("sw-TZ")}.` : "Malipo tayari yalithibitishwa." };
    }
    if (payment.status === "failed" || payment.status === "voided" || payment.status === "expired") {
      await updateSubscriptionPaymentStatus({ reference: payment.reference, status: payment.status, response });
      revalidatePath("/business");
      return fail("Malipo hayakukamilika.");
    }
    return fail("Malipo bado yanasubiri uthibitisho kwenye simu.");
  } catch {
    return fail("Hali ya malipo haijapatikana kwa sasa.");
  }
}
