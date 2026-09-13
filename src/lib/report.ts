import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  
} from "pdf-lib";

const MARGIN = 40;
const A4_HEIGHT = 841.89;
const CONTENT_WIDTH = 595.28 - MARGIN * 2;

const C = {
  black: rgb(0, 0, 0),
  white: rgb(1, 1, 1),
  gray: rgb(0.45, 0.45, 0.45),
  green: rgb(0, 0.42, 0),
  orange: rgb(0.85, 0.43, 0),
  headerFill: rgb(0.2, 0.2, 0.2),
  lightGray: rgb(0.95, 0.95, 0.95),
  border: rgb(0.75, 0.75, 0.75),
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
  };
  debts: PdfDebtRow[];
  totalKikopa: number;
  totalLipwa: number;
  totalBakaa: number;
  reportTitle: string;
  generatedAt: Date;
}

function fmtN(n: number): string {
  return "TZS " + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s || "—";
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Builds a Statement Report PDF byte stream (A4 portrait). */
export async function generatePdfReport(input: PdfReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setProducer("RexaBook");
  doc.setTitle("Statement Report - " + input.customer.jina);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([595.28, A4_HEIGHT]);
  let cursorY = 0; // distance from top

  const pageHeight = () => page.getHeight();

  function ensureSpace(needed: number) {
    if (cursorY + needed > pageHeight() - MARGIN) {
      page = doc.addPage([595.28, A4_HEIGHT]);
      cursorY = 0;
    }
  }

  function text(
    s: string,
    x: number,
    size: number,
    f: PDFFont,
    color = C.black,
    opts?: { align?: "left" | "center"; maxWidth?: number }
  ) {
    const drawAt = opts?.align === "center" ? (595.28 - f.widthOfTextAtSize(s, size)) / 2 : x;
    page.drawText(s, {
      x: drawAt,
      y: pageHeight() - cursorY - size,
      size,
      font: f,
      color,
      maxWidth: opts?.maxWidth,
    });
  }

  function sectionTitle(label: string) {
    ensureSpace(40);
    cursorY += 4;
    text(label, MARGIN, 14, fontBold);
    cursorY += 20;
    // underline
    page.drawRectangle({
      x: MARGIN,
      y: pageHeight() - cursorY + 8,
      width: CONTENT_WIDTH,
      height: 0.8,
      color: C.border,
    });
  }

  // ── Header ─────────────────────────────────────────────────────────
  cursorY += 8;
  text("STATEMENT REPORT", MARGIN, 22, fontBold);
  cursorY += 28;
  text(input.reportTitle, MARGIN, 12, font, C.gray);
  cursorY += 16;
  text("Imetolewa: " + fmtDate(input.generatedAt.toISOString()) + " " +
    String(input.generatedAt.getHours()).padStart(2, "0") + ":" +
    String(input.generatedAt.getMinutes()).padStart(2, "0"), MARGIN, 10, font, C.gray);
  cursorY += 22;

  // ── Customer info ──────────────────────────────────────────────────
  sectionTitle("TAARIFA ZA MDAIWA");
  {
    const rows: Array<[string, string]> = [["Jina:", input.customer.jina]];
    if (input.customer.simu) rows.push(["Simu:", input.customer.simu]);
    if (input.customer.location) rows.push(["Makazi:", input.customer.location]);
    for (const [label, value] of rows) {
      ensureSpace(18);
      text(label, MARGIN, 11, fontBold);
      text(truncate(value, 70), MARGIN + 60, 11, font);
      cursorY += 16;
    }
  }
  cursorY += 8;

  // ── Summary ────────────────────────────────────────────────────────
  sectionTitle("MUHTASARI WA MADENI");
  {
    ensureSpace(80);
    const summary: Array<[string, number, string]> = [
      ["Aliokopa:", input.totalKikopa, "black"],
      ["Ame Lipa:", input.totalLipwa, "green"],
      ["Inabakia:", input.totalBakaa, input.totalBakaa === 0 ? "green" : "orange"],
    ];
    for (const [label, value, color] of summary) {
      text(label, MARGIN, 12, fontBold);
      text(fmtN(value), MARGIN + 140, 13, fontBold, color === "green" ? C.green : color === "orange" ? C.orange : C.black);
      cursorY += 22;
    }
  }
  cursorY += 8;

  // ── Debts table ────────────────────────────────────────────────────
  sectionTitle("MAELEZO YA MADENI");
  {
    const colWidths = [150, 65, 75, 75, 75, 75];
    const headers = ["Bidhaa/Huduma", "Tarehe", "Asili", "Imelipwa", "Inabakia", "Hali"];

    const drawHeader = () => {
      ensureSpace(28);
      let hx = MARGIN;
      page.drawRectangle({
        x: MARGIN,
        y: pageHeight() - cursorY - 18,
        width: CONTENT_WIDTH,
        height: 20,
        color: C.headerFill,
      });
      headers.forEach((h, i) => {
        page.drawText(h, {
          x: hx + 4,
          y: pageHeight() - cursorY - 13,
          size: 10,
          font: fontBold,
          color: C.white,
        });
        hx += colWidths[i];
      });
      cursorY += 22;
    };

    drawHeader();

    if (input.debts.length === 0) {
      ensureSpace(22);
      text("Hakuna madeni katika kipindi hiki.", MARGIN, 11, fontItalic, C.gray);
      cursorY += 18;
    }

    for (const d of input.debts) {
      const bakaa = Math.max(0, d.kiasiAsili - d.kiasiKilicholipwa);
      ensureSpace(22);
      let rx = MARGIN;

      page.drawRectangle({
        x: MARGIN,
        y: pageHeight() - cursorY - 18,
        width: CONTENT_WIDTH,
        height: 20,
        color: C.lightGray,
      });
      page.drawLine({
        start: { x: MARGIN, y: pageHeight() - cursorY - 18 },
        end: { x: MARGIN + CONTENT_WIDTH, y: pageHeight() - cursorY - 18 },
        thickness: 0.6,
        color: C.border,
      });

      const cells: Array<{ value: string; width: number; bold?: boolean; color?: ReturnType<typeof rgb>; size?: number }> = [
        { value: truncate(d.jinaBidhaa, 28), width: colWidths[0], size: 9 },
        { value: fmtDate(d.tareheKukopa), width: colWidths[1], size: 9 },
        { value: fmtN(d.kiasiAsili), width: colWidths[2], size: 9 },
        { value: fmtN(d.kiasiKilicholipwa), width: colWidths[3], size: 9 },
        { value: fmtN(bakaa), width: colWidths[4], size: 9, color: bakaa === 0 ? C.green : C.orange },
        { value: d.imekamilika ? "Imelipwa" : "Inaendelea", width: colWidths[5], size: 9, color: d.imekamilika ? C.green : C.orange },
      ];

      for (const cell of cells) {
        page.drawText(cell.value, {
          x: rx + 4,
          y: pageHeight() - cursorY - 13,
          size: cell.size ?? 9,
          font: cell.bold ? fontBold : font,
          color: cell.color ?? C.black,
        });
        rx += cell.width;
      }
      cursorY += 22;

      // Payment history
      const malipo = d.malipo ?? [];
      if (malipo.length > 0) {
        for (const m of malipo) {
          ensureSpace(16);
          text(`• ${fmtDate(m.tarehe)}  -  ${fmtN(m.kiasi)}${m.maelezo ? "  (" + truncate(m.maelezo, 40) + ")" : ""}`,
            MARGIN + 8, 8, font, C.gray);
          cursorY += 13;
        }
        cursorY += 2;
      }
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────
  cursorY += 18;
  ensureSpace(20);

  // Draw footer + page number on every page.
  const pages = doc.getPages();
  pages.forEach((p, idx) => {
    p.drawText("Hii report imetengenezwa na RexaBook - Management System", {
      x: MARGIN,
      y: MARGIN - 24,
      size: 9,
      font: fontItalic,
      color: C.gray,
    });
    p.drawText(`Page ${idx + 1}`, {
      x: MARGIN + CONTENT_WIDTH - 40,
      y: MARGIN - 24,
      size: 9,
      font: fontItalic,
      color: C.gray,
    });
  });

  return doc.save();
}