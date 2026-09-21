"use server";

import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { Prisma, type BusinessRole, type SalePaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { businessIdFor, getBusinessOwner, requireBusinessRole, subscriptionIsActive } from "@/lib/auth";
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

export async function createProductAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<BusinessActionResult> {
  const context = await activeBusinessContext(["OWNER", "MANAGER"]);
  if (!context.active) return fail("Subscription imeisha. Lipia ili kuongeza bidhaa.");

  const name = String(formData.get("jina") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const unit = String(formData.get("kitengo") ?? "pc").trim();
  const buyingPrice = Number(formData.get("bei_kununua"));
  const sellingPrice = Number(formData.get("bei_kuuza"));
  const openingStock = Number(formData.get("stock"));
  const lowStockAt = Number(formData.get("stock_tahadhari"));

  if (!name || name.length > 150) return fail("Weka jina sahihi la bidhaa.");
  if (!sku || sku.length > 60) return fail("Weka SKU fupi na sahihi.");
  if (!unit || unit.length > 30) return fail("Weka kitengo sahihi.");
  if (![buyingPrice, sellingPrice].every((value) => Number.isFinite(value) && value >= 0)) return fail("Bei za bidhaa si sahihi.");
  if (![openingStock, lowStockAt].every((value) => Number.isSafeInteger(value) && value >= 0)) return fail("Idadi ya stock si sahihi.");

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
    return { success: true, message: `Bidhaa “${name}” imeongezwa.`, id: product.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("SKU hiyo tayari inatumika.");
    return fail("Imeshindikana kuongeza bidhaa.");
  }
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
      const customer = input.customerId
        ? await tx.customer.findFirst({ where: { id: input.customerId, mtumiajiId: context.businessId } })
        : null;
      if (input.paymentMethod === "CREDIT" && !customer) throw new Error("CUSTOMER_REQUIRED");

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
    if (error instanceof Error && error.message === "CUSTOMER_REQUIRED") return fail("Chagua mteja kwa mauzo ya mkopo.");
    if (error instanceof Error && error.message.startsWith("LOW_STOCK:")) return fail(`Stock haitoshi kwa ${error.message.split(":")[1]}.`);
    return fail("Imeshindikana kuhifadhi mauzo. Kagua bidhaa na stock.");
  }
}

export async function moveCargoToStockAction(cargoId: number, extraCost = 0): Promise<ActionResult> {
  const context = await activeBusinessContext(["OWNER", "MANAGER"]);
  if (!context.active) return fail("Subscription imeisha.");
  if (!Number.isSafeInteger(cargoId) || !Number.isFinite(extraCost) || extraCost < 0) return fail("Taarifa za mzigo si sahihi.");

  try {
    const count = await prisma.$transaction(async (tx) => {
      const cargo = await tx.cargo.findFirst({
        where: { id: cargoId, mtumiajiId: context.businessId, hali: "Imefika" },
        include: { items: true },
      });
      if (!cargo) throw new Error("CARGO_NOT_READY");
      const pending = cargo.items.filter((item) => !item.stockedAt);
      if (pending.length === 0) throw new Error("ALREADY_STOCKED");
      const baseTotal = pending.reduce((sum, item) => sum + Number(item.jumla), 0);

      for (const item of pending) {
        const allocatedExtra = baseTotal > 0 ? extraCost * (Number(item.jumla) / baseTotal) : extraCost / pending.length;
        const landedUnitCost = (Number(item.jumla) + allocatedExtra) / item.idadi;
        const skuBase = item.jinaBidhaa.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || `ITEM-${item.id}`;
        let product = await tx.product.findFirst({ where: { mtumiajiId: context.businessId, jina: { equals: item.jinaBidhaa, mode: "insensitive" } } });
        if (!product) {
          let sku = skuBase;
          let suffix = 1;
          while (await tx.product.findUnique({ where: { mtumiajiId_sku: { mtumiajiId: context.businessId, sku } } })) {
            sku = `${skuBase.slice(0, 36)}-${suffix++}`;
          }
          product = await tx.product.create({
            data: {
              mtumiajiId: context.businessId,
              jina: item.jinaBidhaa,
              sku,
              kitengo: item.kitengo,
              beiKununua: landedUnitCost,
              beiKuuza: landedUnitCost,
              stock: 0,
            },
          });
        }
        const updated = await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: item.idadi }, beiKununua: landedUnitCost },
        });
        await tx.stockMovement.create({
          data: {
            mtumiajiId: context.businessId,
            productId: product.id,
            aina: "CARGO",
            idadi: item.idadi,
            stockBaada: updated.stock,
            kumbukumbu: cargo.nambariTracking || `MZIGO-${cargo.id}`,
            maelezo: `Mzigo kutoka ${cargo.jinaKampuni}`,
          },
        });
        await tx.cargoItem.update({
          where: { id: item.id },
          data: { productId: product.id, landedCost: landedUnitCost, stockedAt: new Date() },
        });
      }
      return pending.length;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await writeAudit({ businessId: context.businessId, actorUserId: context.user.id, action: "CARGO_TO_STOCK", entity: "Cargo", entityId: cargoId, details: { extraCost, items: count } });
    refreshBusiness();
    revalidatePath("/cargo");
    return { success: true, message: `Bidhaa ${count} za mzigo zimeingizwa stock.` };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_STOCKED") return fail("Bidhaa za mzigo huu tayari ziliingizwa stock.");
    if (error instanceof Error && error.message === "CARGO_NOT_READY") return fail("Mzigo lazima uwe umefika kabla ya kuingia stock.");
    return fail("Imeshindikana kuhamisha mzigo kwenda stock.");
  }
}

export async function createStaffAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const owner = await requireBusinessRole(["OWNER"]);
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
  const user = await requireBusinessRole(["OWNER"]);
  if (!process.env.SNIPPE_API_KEY) return fail("Snippe haijaunganishwa.");
  const businessId = businessIdFor(user);
  const phone = normalizePhone(String(formData.get("namba_malipo") ?? "").trim());
  const months = Number(formData.get("miezi"));
  if (!/^255\d{9}$/.test(phone)) return fail("Weka namba sahihi ya Tanzania.");
  if (months !== 1 && months !== 12) return fail("Chagua mwezi mmoja au mwaka mmoja.");
  const amount = months === 12 ? 150_000 : 15_000;

  const pending = await prisma.subscriptionPayment.create({
    data: { mtumiajiId: businessId, kiasi: amount, miezi: months, paymentPhone: phone, paymentStatus: "creating" },
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
  const user = await requireBusinessRole(["OWNER"]);
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
