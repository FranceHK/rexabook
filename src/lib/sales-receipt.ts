import { PDFDocument, type PDFFont, StandardFonts, rgb } from "pdf-lib";

export interface SaleReceiptData {
  shopName: string;
  shopPhone?: string | null;
  receiptNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  date: Date;
  servedBy?: string | null;
  paymentMethod: string;
  total: number;
  paid: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;

function pdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function fitText(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const text = pdfText(value);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const suffix = "...";
  let shortened = text;
  while (shortened.length > 0 && font.widthOfTextAtSize(`${shortened}${suffix}`, size) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}${suffix}`;
}

export async function generateSaleReceipt(data: SaleReceiptData) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const primary = rgb(0.12, 0.35, 0.86);
  const ink = rgb(0.08, 0.11, 0.18);
  const muted = rgb(0.42, 0.47, 0.56);
  const line = rgb(0.88, 0.9, 0.94);
  let page = document.addPage([595, 842]);
  let y = 790;

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: primary });
    page.drawText("REXABOOK", { x: 42, y: 804, size: 11, font: bold, color: rgb(1, 1, 1) });
    page.drawText(fitText(data.shopName, bold, 22, 330), { x: 42, y: 780, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText("RISITI YA MAUZO", { x: 405, y: 792, size: 12, font: bold, color: rgb(1, 1, 1) });
    page.drawText(fitText(data.receiptNumber, regular, 9, 150), { x: 405, y: 775, size: 9, font: regular, color: rgb(0.9, 0.94, 1) });
    y = 730;
  };
  drawHeader();

  const info = [
    ["Mteja", data.customerName || "Mteja wa kawaida"],
    ["Simu", data.customerPhone || "-"],
    ["Tarehe", data.date.toLocaleString("sw-TZ")],
    ["Huduma", data.servedBy || "Mfumo"],
    ["Njia ya malipo", data.paymentMethod.replaceAll("_", " ")],
  ];
  info.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 42 + column * 260;
    const yy = y - row * 38;
    page.drawText(pdfText(label).toUpperCase(), { x, y: yy, size: 8, font: bold, color: muted });
    page.drawText(fitText(value, regular, 10, 220), { x, y: yy - 15, size: 10, font: regular, color: ink });
  });
  y -= 126;

  const tableHeader = () => {
    page.drawRectangle({ x: 42, y: y - 5, width: 511, height: 25, color: rgb(0.95, 0.97, 1) });
    page.drawText("BIDHAA", { x: 52, y: y + 3, size: 8, font: bold, color: primary });
    page.drawText("IDADI", { x: 330, y: y + 3, size: 8, font: bold, color: primary });
    page.drawText("BEI", { x: 390, y: y + 3, size: 8, font: bold, color: primary });
    page.drawText("JUMLA", { x: 475, y: y + 3, size: 8, font: bold, color: primary });
    y -= 24;
  };
  tableHeader();

  for (const item of data.items) {
    if (y < 110) {
      page = document.addPage([595, 842]);
      y = 790;
      page.drawText(fitText(`${data.shopName} - ${data.receiptNumber}`, bold, 10, 500), { x: 42, y: 810, size: 10, font: bold, color: primary });
      tableHeader();
    }
    page.drawText(fitText(item.name, regular, 9, 265), { x: 52, y, size: 9, font: regular, color: ink });
    page.drawText(String(item.quantity), { x: 336, y, size: 9, font: regular, color: ink });
    page.drawText(money(item.unitPrice), { x: 390, y, size: 9, font: regular, color: ink });
    page.drawText(money(item.total), { x: 475, y, size: 9, font: bold, color: ink });
    page.drawLine({ start: { x: 42, y: y - 10 }, end: { x: 553, y: y - 10 }, thickness: 0.6, color: line });
    y -= 29;
  }

  y -= 10;
  const totals = [
    ["Jumla", data.total],
    ["Imelipwa", data.paid],
    ["Salio", Math.max(0, data.total - data.paid)],
  ] as const;
  totals.forEach(([label, value], index) => {
    const yy = y - index * 24;
    page.drawText(label, { x: 380, y: yy, size: index === 0 ? 12 : 9, font: index === 0 ? bold : regular, color: index === 0 ? primary : muted });
    page.drawText(money(value), { x: 460, y: yy, size: index === 0 ? 12 : 9, font: bold, color: ink });
  });
  page.drawText("Asante kwa kufanya biashara nasi.", { x: 42, y: 55, size: 9, font: regular, color: muted });
  if (data.shopPhone) page.drawText(fitText(`Mawasiliano: ${data.shopPhone}`, regular, 9, 160), { x: 390, y: 55, size: 9, font: regular, color: muted });

  return document.save();
}
