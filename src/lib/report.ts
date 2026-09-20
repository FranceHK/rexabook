import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFPage, type PDFFont, type RGB } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = 24;

const C = {
  primary: rgb(0.145, 0.388, 0.922),
  primaryDark: rgb(0.09, 0.25, 0.65),
  cyan: rgb(0.055, 0.647, 0.914),
  ink: rgb(0.09, 0.125, 0.2),
  ink2: rgb(0.32, 0.38, 0.46),
  ink3: rgb(0.54, 0.59, 0.66),
  line: rgb(0.88, 0.91, 0.94),
  surface: rgb(0.97, 0.98, 0.99),
  white: rgb(1, 1, 1),
  success: rgb(0.02, 0.59, 0.41),
  successSoft: rgb(0.91, 0.97, 0.95),
  warning: rgb(0.85, 0.45, 0.04),
  warningSoft: rgb(0.99, 0.95, 0.9),
  blueSoft: rgb(0.92, 0.95, 1),
};

export interface PdfMalipo {
  kiasi: number;
  tarehe: string;
  maelezo?: string | null;
}

export interface PdfDebtRow {
  jinaBidhaa: string;
  kiasiAsili: number;
  kiasiKilicholipwa: number;
  tareheKukopa: string;
  imekamilika: boolean;
  malipo?: PdfMalipo[];
}

export interface PdfReportInput {
  customer: {
    jina: string;
    simu?: string | null;
    location?: string | null;
    publicId: string;
  };
  storeName: string;
  debts: PdfDebtRow[];
  totalKikopa: number;
  totalLipwa: number;
  totalBakaa: number;
  reportTitle: string;
  periodLabel: string;
  generatedAt: Date;
}

function safe(value: string): string {
  return value
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function fmtMoney(value: number): string {
  return `TZS ${Math.round(value).toLocaleString("en-US")}`;
}

function fmtNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function fmtDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function fmtDateTime(value: Date): string {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${fmtDate(value)} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function truncate(value: string, max: number): string {
  const clean = safe(value);
  return clean.length > max ? clean.slice(0, Math.max(0, max - 3)) + "..." : clean;
}

/** Builds a polished RexaBook debt statement as an A4 PDF. */
export async function generatePdfReport(input: PdfReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setProducer("RexaBook");
  doc.setCreator("RexaBook");
  doc.setTitle(`Ripoti ya madeni - ${safe(input.customer.jina)}`);
  doc.setSubject(safe(input.reportTitle));

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "rexabooklogo-clean.png"));
    logo = await doc.embedPng(logoBytes);
  } catch {
    // The report remains usable if the optional brand asset cannot be loaded.
  }

  let page: PDFPage;
  let cursorY = 0;

  function drawText(value: string, x: number, top: number, size: number, textFont: PDFFont = font, color: RGB = C.ink, maxWidth?: number) {
    page.drawText(safe(value), { x, y: PAGE_HEIGHT - top - size, size, font: textFont, color, maxWidth });
  }

  function drawRect(x: number, top: number, width: number, height: number, color: RGB, borderColor?: RGB) {
    page.drawRectangle({ x, y: PAGE_HEIGHT - top - height, width, height, color, borderColor, borderWidth: borderColor ? 0.8 : 0 });
  }

  function drawLine(top: number, color: RGB = C.line) {
    page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - top }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - top }, thickness: 0.8, color });
  }

  function drawBrandHeader(continued = false) {
    drawRect(0, 0, PAGE_WIDTH, continued ? 64 : 116, C.primary);
    drawRect(PAGE_WIDTH - 155, 0, 155, continued ? 64 : 116, C.primaryDark);
    const logoSize = continued ? 36 : 48;
    const logoTop = continued ? 14 : 14;
    drawRect(MARGIN, logoTop, logoSize, logoSize, C.white);
    if (logo) {
      page.drawImage(logo, {
        x: MARGIN + 2,
        y: PAGE_HEIGHT - logoTop - logoSize + 2,
        width: logoSize - 4,
        height: logoSize - 4,
      });
    } else {
      drawText("R", MARGIN + 10, logoTop + 8, continued ? 17 : 22, bold, C.primary);
    }
    drawText("RexaBook", MARGIN + logoSize + 10, continued ? 17 : 24, continued ? 16 : 21, bold, C.white);
    drawText(input.storeName, MARGIN + logoSize + 10, continued ? 36 : 52, 8.5, font, C.white);

    if (continued) {
      drawText("Ripoti ya madeni - inaendelea", PAGE_WIDTH - MARGIN - 155, 24, 9, bold, C.white);
      cursorY = 82;
      return;
    }

    drawText("TAARIFA YA MADENI", MARGIN, 76, 9, bold, C.white);
    drawText(input.reportTitle, MARGIN + 105, 74, 11, bold, C.white, 280);
    drawText("Imetolewa", PAGE_WIDTH - MARGIN - 118, 29, 8, font, C.white);
    drawText(fmtDateTime(input.generatedAt), PAGE_WIDTH - MARGIN - 118, 43, 10, bold, C.white);
    drawText("Kipindi", PAGE_WIDTH - MARGIN - 118, 70, 8, font, C.white);
    drawText(truncate(input.periodLabel, 25), PAGE_WIDTH - MARGIN - 118, 84, 9, bold, C.white);
    cursorY = 136;
  }

  function addPage(continued = false) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawBrandHeader(continued);
  }

  function ensureSpace(height: number) {
    if (cursorY + height > PAGE_HEIGHT - 48) addPage(true);
  }

  function sectionHeading(title: string, subtitle?: string) {
    ensureSpace(subtitle ? 43 : 31);
    drawText(title.toUpperCase(), MARGIN, cursorY, 10, bold, C.ink);
    if (subtitle) drawText(subtitle, MARGIN, cursorY + 15, 8.5, font, C.ink3);
    cursorY += subtitle ? 34 : 23;
    drawLine(cursorY);
    cursorY += 10;
  }

  addPage(false);

  drawRect(MARGIN, cursorY, CONTENT_WIDTH, 74, C.surface, C.line);
  drawRect(MARGIN, cursorY, 5, 74, C.cyan);
  drawText("MDAIWA", MARGIN + 18, cursorY + 13, 8, bold, C.ink3);
  drawText(truncate(input.customer.jina, 48), MARGIN + 18, cursorY + 28, 16, bold, C.ink);
  const contact = [input.customer.simu, input.customer.location].filter(Boolean).join("  |  ") || "Hakuna mawasiliano yaliyowekwa";
  drawText(truncate(contact, 68), MARGIN + 18, cursorY + 51, 8.5, font, C.ink2);
  drawText("NAMBA YA MDAIWA", PAGE_WIDTH - MARGIN - 150, cursorY + 17, 8, bold, C.ink3);
  drawText(input.customer.publicId, PAGE_WIDTH - MARGIN - 150, cursorY + 35, 10, bold, C.primary);
  cursorY += 94;

  sectionHeading("Muhtasari", "Hali ya fedha ndani ya kipindi kilichochaguliwa");
  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
  const summaries: Array<{ label: string; value: number; fill: RGB; valueColor: RGB }> = [
    { label: "Jumla ya deni", value: input.totalKikopa, fill: C.blueSoft, valueColor: C.primary },
    { label: "Imelipwa", value: input.totalLipwa, fill: C.successSoft, valueColor: C.success },
    { label: "Imebaki", value: input.totalBakaa, fill: input.totalBakaa > 0 ? C.warningSoft : C.successSoft, valueColor: input.totalBakaa > 0 ? C.warning : C.success },
  ];
  summaries.forEach((summary, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    drawRect(x, cursorY, cardWidth, 62, summary.fill);
    drawText(summary.label, x + 12, cursorY + 11, 8.5, bold, C.ink2);
    drawText(fmtMoney(summary.value), x + 12, cursorY + 31, 13, bold, summary.valueColor, cardWidth - 24);
  });
  cursorY += 82;

  sectionHeading("Madeni", `${input.debts.length} rekodi katika kipindi hiki`);
  const widths = [143, 60, 79, 79, 79, 83];
  const headers = ["Bidhaa / Huduma", "Tarehe", "Asili", "Imelipwa", "Imebaki", "Hali"];

  function drawTableHeader() {
    ensureSpace(30);
    drawRect(MARGIN, cursorY, CONTENT_WIDTH, 27, C.ink);
    let x = MARGIN;
    headers.forEach((header, index) => {
      drawText(header, x + 5, cursorY + 9, 7.5, bold, C.white, widths[index] - 10);
      x += widths[index];
    });
    cursorY += 27;
  }

  drawTableHeader();

  if (input.debts.length === 0) {
    drawRect(MARGIN, cursorY, CONTENT_WIDTH, 48, C.surface, C.line);
    drawText("Hakuna madeni katika kipindi hiki.", MARGIN + 12, cursorY + 17, 10, font, C.ink3);
    cursorY += 58;
  }

  input.debts.forEach((debt, debtIndex) => {
    const balance = Math.max(0, debt.kiasiAsili - debt.kiasiKilicholipwa);
    const payments = debt.malipo ?? [];
    ensureSpace(37 + payments.length * 22);
    if (cursorY < 95) drawTableHeader();
    drawRect(MARGIN, cursorY, CONTENT_WIDTH, 32, debtIndex % 2 === 0 ? C.white : C.surface, C.line);
    const cells = [
      truncate(debt.jinaBidhaa || "Deni", 27),
      fmtDate(debt.tareheKukopa),
      fmtNumber(debt.kiasiAsili),
      fmtNumber(debt.kiasiKilicholipwa),
      fmtNumber(balance),
      debt.imekamilika ? "Imelipwa" : "Inaendelea",
    ];
    let x = MARGIN;
    cells.forEach((cell, index) => {
      const color = index === 4 && balance > 0 ? C.warning : index === 5 ? (debt.imekamilika ? C.success : C.warning) : C.ink;
      drawText(cell, x + 5, cursorY + 11, index >= 2 ? 7.5 : 8, index === 0 || index === 5 ? bold : font, color, widths[index] - 10);
      x += widths[index];
    });
    cursorY += 32;

    payments.forEach((payment, paymentIndex) => {
      ensureSpace(24);
      drawRect(MARGIN + 12, cursorY, CONTENT_WIDTH - 12, 20, C.blueSoft);
      drawText(`Malipo ${paymentIndex + 1}: ${fmtDate(payment.tarehe)}`, MARGIN + 20, cursorY + 6, 7.5, bold, C.ink2);
      drawText(fmtMoney(payment.kiasi), MARGIN + 155, cursorY + 6, 7.5, bold, C.success);
      if (payment.maelezo) drawText(truncate(payment.maelezo, 45), MARGIN + 270, cursorY + 6, 7.5, font, C.ink3, 210);
      cursorY += 22;
    });
    cursorY += 5;
  });

  ensureSpace(58);
  cursorY += 10;
  drawRect(MARGIN, cursorY, CONTENT_WIDTH, 46, input.totalBakaa > 0 ? C.warningSoft : C.successSoft);
  drawText(input.totalBakaa > 0 ? "SALIO LINALODAIWA" : "MADENI YAMELIPWA", MARGIN + 14, cursorY + 10, 8.5, bold, C.ink2);
  drawText(fmtMoney(input.totalBakaa), MARGIN + 14, cursorY + 24, 13, bold, input.totalBakaa > 0 ? C.warning : C.success);
  drawText("Asante kwa kutumia RexaBook", PAGE_WIDTH - MARGIN - 180, cursorY + 17, 8.5, font, C.ink3);

  const pages = doc.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawLine({ start: { x: MARGIN, y: FOOTER_Y + 14 }, end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_Y + 14 }, thickness: 0.7, color: C.line });
    pdfPage.drawText("RexaBook - Taarifa ya deni", { x: MARGIN, y: FOOTER_Y, size: 7.5, font, color: C.ink3 });
    const pageLabel = `Ukurasa ${index + 1} / ${pages.length}`;
    pdfPage.drawText(pageLabel, { x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(pageLabel, 7.5), y: FOOTER_Y, size: 7.5, font, color: C.ink3 });
  });

  return doc.save();
}
