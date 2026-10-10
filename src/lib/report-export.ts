import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { NamedValue, ReportData } from "@/lib/reports-data";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const C = {
  primary: rgb(0.145, 0.388, 0.922),
  ink: rgb(0.09, 0.125, 0.2),
  ink2: rgb(0.32, 0.38, 0.46),
  line: rgb(0.88, 0.91, 0.94),
  surface: rgb(0.97, 0.98, 0.99),
  white: rgb(1, 1, 1),
};

// The standard PDF fonts only cover Latin-1.
function safe(value: string): string {
  return value
    .replace(/[‐-―]/g, "-")
    .replace(/→/g, "->")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-US")}`;
const count = (value: number) => Math.round(value).toLocaleString("en-US");

interface Section {
  title: string;
  summary: Array<[string, string]>;
  tables: Array<{ title: string; rows: Array<[string, string]> }>;
}

const moneyRows = (items: NamedValue[]): Array<[string, string]> => items.map((item) => [item.label, money(item.value)]);

/** One shared outline so the PDF and the CSV always carry the same figures as the page. */
function sectionsOf(data: ReportData): Section[] {
  const sections: Section[] = [
    {
      title: "Biashara",
      summary: [
        ["Mauzo", money(data.business.revenue)],
        ["Faida ghafi", money(data.business.grossProfit)],
        ["Matumizi", money(data.business.expenses)],
        ["Faida halisi", money(data.business.netProfit)],
        ["Idadi ya mauzo", count(data.business.salesCount)],
        ["Wastani wa mauzo", money(data.business.averageSale)],
        ["Thamani ya stock (bei ya kununua)", money(data.business.stockCostValue)],
        ["Bidhaa zenye stock ndogo", count(data.business.lowStockCount)],
      ],
      tables: [
        { title: "Bidhaa zinazouzika zaidi", rows: moneyRows(data.business.topProducts) },
        { title: "Mauzo kwa njia ya malipo", rows: moneyRows(data.business.paymentMethods) },
        { title: "Matumizi kwa aina", rows: moneyRows(data.business.expenseCategories) },
        { title: "Mauzo kwa kipindi", rows: data.business.trend.map((point) => [point.label, money(point.values[0])]) },
      ],
    },
    {
      title: "Wadaiwa",
      summary: [
        ["Deni linalodaiwa sasa", money(data.debts.outstanding)],
        ["Mikopo iliyotolewa kipindi hiki", money(data.debts.lent)],
        ["Malipo yaliyopokelewa kipindi hiki", money(data.debts.collected)],
        ["Wateja wenye deni", count(data.debts.debtorsCount)],
        ["Madeni yaliyo wazi", count(data.debts.openCount)],
        ["Kiwango cha ulipaji", `${data.debts.collectionRate}%`],
      ],
      tables: [
        { title: "Wadaiwa wakubwa", rows: moneyRows(data.debts.topDebtors) },
        { title: "Umri wa madeni", rows: moneyRows(data.debts.aging) },
      ],
    },
  ];
  if (data.cargo) {
    sections.push({
      title: "Mizigo",
      summary: [
        ["Mizigo iliyoagizwa", count(data.cargo.count)],
        ["Imefika", count(data.cargo.arrived)],
        ["Bado njiani", count(data.cargo.pending)],
        ["Imechelewa", count(data.cargo.late)],
        ["Gharama ya mizigo", money(data.cargo.totalCost)],
        ["Wastani wa siku za kufika", data.cargo.averageDays === null ? "-" : count(data.cargo.averageDays)],
      ],
      tables: [{ title: "Gharama kwa kampuni", rows: moneyRows(data.cargo.suppliers) }],
    });
  }
  return sections;
}

export async function generateBusinessReportPdf(data: ReportData, storeName: string, generatedAt: Date): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setProducer("RexaBook");
  doc.setTitle(safe(`Ripoti - ${storeName}`));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let top = 0;

  const text = (value: string, x: number, size: number, textFont: PDFFont = font, color: RGB = C.ink) => {
    page.drawText(safe(value), { x, y: PAGE_HEIGHT - top - size, size, font: textFont, color });
  };
  const rightText = (value: string, size: number, textFont: PDFFont = font, color: RGB = C.ink) => {
    const clean = safe(value);
    page.drawText(clean, { x: PAGE_WIDTH - MARGIN - textFont.widthOfTextAtSize(clean, size) - 8, y: PAGE_HEIGHT - top - size, size, font: textFont, color });
  };
  const ensure = (height: number) => {
    if (top + height <= PAGE_HEIGHT - MARGIN) return;
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    top = MARGIN;
  };
  const row = (label: string, value: string, shaded: boolean) => {
    ensure(20);
    if (shaded) page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - top - 18, width: CONTENT_WIDTH, height: 18, color: C.surface });
    top += 4;
    text(label.length > 70 ? `${label.slice(0, 67)}...` : label, MARGIN + 8, 10, font, C.ink2);
    rightText(value, 10, bold);
    top += 14;
  };

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 96, width: PAGE_WIDTH, height: 96, color: C.primary });
  top = 26;
  text("Ripoti ya Biashara", MARGIN, 20, bold, C.white);
  top = 54;
  text(storeName, MARGIN, 11, font, C.white);
  top = 70;
  text(`Kipindi: ${data.periodLabel} (${data.rangeLabel})`, MARGIN, 10, font, C.white);
  top = 116;

  for (const section of sectionsOf(data)) {
    ensure(60);
    text(section.title, MARGIN, 14, bold, C.primary);
    top += 20;
    page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - top }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - top }, thickness: 0.8, color: C.line });
    top += 6;
    section.summary.forEach(([label, value], index) => row(label, value, index % 2 === 0));
    for (const table of section.tables) {
      if (table.rows.length === 0) continue;
      ensure(48);
      top += 10;
      text(table.title, MARGIN, 11, bold);
      top += 16;
      table.rows.forEach(([label, value], index) => row(label, value, index % 2 === 0));
    }
    top += 18;
  }

  const stamp = `Imetolewa ${generatedAt.toLocaleDateString("en-GB")} · RexaBook`;
  doc.getPages().forEach((current, index, pages) => {
    current.drawText(safe(`${stamp} · Ukurasa ${index + 1}/${pages.length}`), { x: MARGIN, y: 20, size: 8, font, color: C.ink2 });
  });
  return doc.save();
}

function csvCell(value: string): string {
  // A leading =, +, - or @ would be run as a formula when the file is opened in a spreadsheet.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function generateBusinessReportCsv(data: ReportData, storeName: string): string {
  const lines: string[][] = [
    ["Ripoti ya Biashara", storeName],
    ["Kipindi", `${data.periodLabel} (${data.rangeLabel})`],
    [],
  ];
  for (const section of sectionsOf(data)) {
    lines.push([section.title.toUpperCase()]);
    lines.push(...section.summary);
    for (const table of section.tables) {
      if (table.rows.length === 0) continue;
      lines.push([], [table.title]);
      lines.push(...table.rows);
    }
    lines.push([]);
  }
  // BOM so Excel reads the file as UTF-8.
  return `﻿${lines.map((line) => line.map(csvCell).join(",")).join("\r\n")}`;
}
