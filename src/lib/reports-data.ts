import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/format";

export const REPORT_PERIODS = {
  "7": "Siku 7",
  "30": "Siku 30",
  "90": "Miezi 3",
  "365": "Mwaka 1",
} as const;

export type ReportPeriod = keyof typeof REPORT_PERIODS;

export function parseReportPeriod(value: string | null | undefined): ReportPeriod {
  return value && value in REPORT_PERIODS ? (value as ReportPeriod) : "30";
}

export interface NamedValue {
  label: string;
  value: number;
  note?: string;
}

export interface TrendPoint {
  label: string;
  values: number[];
}

export interface ReportData {
  period: ReportPeriod;
  periodLabel: string;
  rangeLabel: string;
  business: {
    revenue: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    marginPercent: number;
    salesCount: number;
    averageSale: number;
    stockCostValue: number;
    stockSaleValue: number;
    productCount: number;
    lowStockCount: number;
    trend: TrendPoint[];
    paymentMethods: NamedValue[];
    topProducts: NamedValue[];
    expenseCategories: NamedValue[];
    lowStock: NamedValue[];
  };
  debts: {
    outstanding: number;
    lent: number;
    collected: number;
    debtorsCount: number;
    customersCount: number;
    openCount: number;
    settledCount: number;
    collectionRate: number;
    trend: TrendPoint[];
    aging: NamedValue[];
    topDebtors: NamedValue[];
  };
  cargo: {
    count: number;
    arrived: number;
    pending: number;
    late: number;
    totalCost: number;
    itemsCount: number;
    averageDays: number | null;
    trend: TrendPoint[];
    suppliers: NamedValue[];
    status: NamedValue[];
  } | null;
}

const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"];
const PAYMENT_LABELS: Record<string, string> = { CASH: "Taslimu", MOBILE_MONEY: "Simu", BANK: "Benki", CREDIT: "Mkopo" };
const DAY_MS = 86_400_000;

interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

const pad = (value: number) => String(value).padStart(2, "0");
const dayLabel = (value: Date) => `${pad(value.getDate())}/${pad(value.getMonth() + 1)}`;

/** Daily buckets for short periods, weekly for a quarter, calendar months for a year. */
function buildBuckets(period: ReportPeriod, now: Date): Bucket[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const buckets: Bucket[] = [];

  if (period === "365") {
    for (let offset = 11; offset >= 0; offset -= 1) {
      const start = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - offset + 1, 1);
      buckets.push({ start, end, label: MONTHS[start.getMonth()] });
    }
    return buckets;
  }

  const span = period === "90" ? 7 : 1;
  const count = period === "90" ? 13 : Number(period);
  for (let index = count - 1; index >= 0; index -= 1) {
    const end = new Date(today.getTime() + DAY_MS - index * span * DAY_MS);
    const start = new Date(end.getTime() - span * DAY_MS);
    buckets.push({ start, end, label: dayLabel(start) });
  }
  return buckets;
}

function bucketIndex(buckets: Bucket[], value: Date): number {
  return buckets.findIndex((bucket) => value >= bucket.start && value < bucket.end);
}

function topValues(totals: Map<string, { value: number; note?: string }>, limit: number): NamedValue[] {
  return [...totals.entries()]
    .map(([label, entry]) => ({ label, value: entry.value, note: entry.note }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export async function getReportData(businessId: number, period: ReportPeriod, includeCargo: boolean): Promise<ReportData> {
  const now = new Date();
  const buckets = buildBuckets(period, now);
  const start = buckets[0].start;

  const [sales, expenses, products, debts, payments, customersCount, cargos] = await Promise.all([
    prisma.sale.findMany({
      where: { mtumiajiId: businessId, tarehe: { gte: start } },
      select: { jumla: true, faida: true, njiaMalipo: true, tarehe: true, items: { select: { jinaBidhaa: true, idadi: true, jumla: true } } },
    }),
    prisma.expense.findMany({ where: { mtumiajiId: businessId, tarehe: { gte: start } }, select: { aina: true, kiasi: true, tarehe: true } }),
    prisma.product.findMany({
      where: { mtumiajiId: businessId, active: true },
      select: { jina: true, stock: true, stockTahadhari: true, beiKununua: true, beiKuuza: true, kitengo: true },
    }),
    prisma.debt.findMany({
      where: { mtumiajiId: businessId },
      select: { kiasiAsili: true, kiasiKilicholipwa: true, imekamilika: true, tareheKukopa: true, customer: { select: { id: true, jina: true } } },
    }),
    prisma.payment.findMany({ where: { debt: { mtumiajiId: businessId }, tarehe: { gte: start } }, select: { kiasi: true, tarehe: true } }),
    prisma.customer.count({ where: { mtumiajiId: businessId } }),
    includeCargo
      ? prisma.cargo.findMany({
          where: { mtumiajiId: businessId, tareheKuagiza: { gte: start } },
          select: {
            jinaKampuni: true,
            jumlaGharama: true,
            hali: true,
            tareheKuagiza: true,
            tareheKutarajiwa: true,
            tareheKufikaHalisi: true,
            _count: { select: { items: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  // ── Biashara ────────────────────────────────────────────────────────
  const businessTrend = buckets.map((bucket) => ({ label: bucket.label, values: [0, 0] }));
  const methodTotals = new Map<string, { value: number }>();
  const productTotals = new Map<string, { value: number; quantity: number }>();
  let revenue = 0;
  let grossProfit = 0;
  for (const sale of sales) {
    const total = toMoney(sale.jumla);
    revenue += total;
    grossProfit += toMoney(sale.faida);
    const index = bucketIndex(buckets, sale.tarehe);
    if (index >= 0) businessTrend[index].values[0] += total;
    const method = PAYMENT_LABELS[sale.njiaMalipo] ?? sale.njiaMalipo;
    methodTotals.set(method, { value: (methodTotals.get(method)?.value ?? 0) + total });
    for (const item of sale.items) {
      const entry = productTotals.get(item.jinaBidhaa) ?? { value: 0, quantity: 0 };
      entry.value += toMoney(item.jumla);
      entry.quantity += item.idadi;
      productTotals.set(item.jinaBidhaa, entry);
    }
  }

  const categoryTotals = new Map<string, { value: number }>();
  let expenseTotal = 0;
  for (const expense of expenses) {
    const amount = toMoney(expense.kiasi);
    expenseTotal += amount;
    const index = bucketIndex(buckets, expense.tarehe);
    if (index >= 0) businessTrend[index].values[1] += amount;
    categoryTotals.set(expense.aina, { value: (categoryTotals.get(expense.aina)?.value ?? 0) + amount });
  }

  const lowStockProducts = products.filter((product) => product.stock <= product.stockTahadhari).sort((a, b) => a.stock - b.stock);

  // ── Wadaiwa ─────────────────────────────────────────────────────────
  const debtTrend = buckets.map((bucket) => ({ label: bucket.label, values: [0, 0] }));
  const debtorTotals = new Map<string, { value: number; note?: string }>();
  const aging = [
    { label: "Siku 0–30", value: 0 },
    { label: "Siku 31–60", value: 0 },
    { label: "Siku 61–90", value: 0 },
    { label: "Zaidi ya siku 90", value: 0 },
  ];
  let outstanding = 0;
  let lent = 0;
  let lentAllTime = 0;
  let paidAllTime = 0;
  let openCount = 0;
  let settledCount = 0;
  for (const debt of debts) {
    const original = toMoney(debt.kiasiAsili);
    const paid = toMoney(debt.kiasiKilicholipwa);
    const balance = Math.max(0, original - paid);
    lentAllTime += original;
    paidAllTime += Math.min(paid, original);
    if (debt.imekamilika || balance <= 0) settledCount += 1;
    else openCount += 1;

    const index = bucketIndex(buckets, debt.tareheKukopa);
    if (index >= 0) {
      lent += original;
      debtTrend[index].values[0] += original;
    }
    if (debt.imekamilika || balance <= 0) continue;

    outstanding += balance;
    const age = Math.floor((now.getTime() - debt.tareheKukopa.getTime()) / DAY_MS);
    aging[age <= 30 ? 0 : age <= 60 ? 1 : age <= 90 ? 2 : 3].value += balance;
    if (debt.customer) {
      const key = `${debt.customer.id}`;
      const entry = debtorTotals.get(key) ?? { value: 0, note: debt.customer.jina };
      entry.value += balance;
      debtorTotals.set(key, entry);
    }
  }
  let collected = 0;
  for (const payment of payments) {
    const amount = toMoney(payment.kiasi);
    collected += amount;
    const index = bucketIndex(buckets, payment.tarehe);
    if (index >= 0) debtTrend[index].values[1] += amount;
  }

  // ── Mizigo ──────────────────────────────────────────────────────────
  let cargo: ReportData["cargo"] = null;
  if (cargos) {
    const cargoTrend = buckets.map((bucket) => ({ label: bucket.label, values: [0] }));
    const supplierTotals = new Map<string, { value: number }>();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    let arrived = 0;
    let late = 0;
    let totalCost = 0;
    let itemsCount = 0;
    let deliveryDays = 0;
    let delivered = 0;
    for (const row of cargos) {
      const cost = toMoney(row.jumlaGharama);
      totalCost += cost;
      itemsCount += row._count.items;
      const index = bucketIndex(buckets, row.tareheKuagiza);
      if (index >= 0) cargoTrend[index].values[0] += cost;
      supplierTotals.set(row.jinaKampuni, { value: (supplierTotals.get(row.jinaKampuni)?.value ?? 0) + cost });
      if (row.hali === "Imefika") {
        arrived += 1;
        if (row.tareheKufikaHalisi) {
          deliveryDays += Math.max(0, Math.round((row.tareheKufikaHalisi.getTime() - row.tareheKuagiza.getTime()) / DAY_MS));
          delivered += 1;
        }
      } else if (row.tareheKutarajiwa && row.tareheKutarajiwa < today) {
        late += 1;
      }
    }
    const pending = cargos.length - arrived;
    cargo = {
      count: cargos.length,
      arrived,
      pending,
      late,
      totalCost,
      itemsCount,
      averageDays: delivered > 0 ? Math.round(deliveryDays / delivered) : null,
      trend: cargoTrend,
      suppliers: topValues(supplierTotals, 6),
      status: [
        { label: "Imefika", value: arrived },
        { label: "Njiani (kwa wakati)", value: pending - late },
        { label: "Imechelewa", value: late },
      ],
    };
  }

  const netProfit = grossProfit - expenseTotal;
  const lastDay = new Date(buckets[buckets.length - 1].end.getTime() - DAY_MS);
  return {
    period,
    periodLabel: REPORT_PERIODS[period],
    rangeLabel: `${dayLabel(start)}/${start.getFullYear()} – ${dayLabel(lastDay)}/${lastDay.getFullYear()}`,
    business: {
      revenue,
      grossProfit,
      expenses: expenseTotal,
      netProfit,
      marginPercent: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
      salesCount: sales.length,
      averageSale: sales.length > 0 ? revenue / sales.length : 0,
      stockCostValue: products.reduce((sum, product) => sum + product.stock * toMoney(product.beiKununua), 0),
      stockSaleValue: products.reduce((sum, product) => sum + product.stock * toMoney(product.beiKuuza), 0),
      productCount: products.length,
      lowStockCount: lowStockProducts.length,
      trend: businessTrend,
      paymentMethods: topValues(methodTotals, 4),
      topProducts: [...productTotals.entries()]
        .map(([label, entry]) => ({ label, value: entry.value, note: `${entry.quantity.toLocaleString("en-TZ")} pc` }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      expenseCategories: topValues(categoryTotals, 6),
      lowStock: lowStockProducts.slice(0, 6).map((product) => ({ label: product.jina, value: product.stock, note: `Tahadhari ${product.stockTahadhari} ${product.kitengo}` })),
    },
    debts: {
      outstanding,
      lent,
      collected,
      debtorsCount: debtorTotals.size,
      customersCount,
      openCount,
      settledCount,
      collectionRate: lentAllTime > 0 ? Math.round((paidAllTime / lentAllTime) * 100) : 0,
      trend: debtTrend,
      aging,
      topDebtors: [...debtorTotals.values()]
        .map((entry) => ({ label: entry.note ?? "Mteja", value: entry.value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    },
    cargo,
  };
}
