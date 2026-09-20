import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reportParamsSchema } from "@/lib/validation";
import { generatePdfReport, type PdfDebtRow } from "@/lib/report";
import { toMoney } from "@/lib/format";
import { customerPublicId } from "@/lib/customer-access";

function fmtReportDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function rangeFor(type: string, now: Date, start?: string, end?: string): { start: Date; end: Date } {
  const s = new Date(now);
  s.setHours(0, 0, 0, 0);
  const e = new Date(now);
  e.setHours(23, 59, 59, 999);

  switch (type) {
    case "yote":
      s.setFullYear(2000, 0, 1);
      break;
    case "wiki":
      s.setDate(s.getDate() - 6);
      break;
    case "mwezi":
      s.setDate(1);
      break;
    case "miezi_3":
      s.setMonth(s.getMonth() - 2);
      s.setDate(1);
      break;
    case "miezi_6":
      s.setMonth(s.getMonth() - 5);
      s.setDate(1);
      break;
    case "mwaka":
      s.setMonth(0, 1);
      break;
    case "custom": {
      const a = start ? new Date(start) : null;
      const b = end ? new Date(end) : null;
      if (a) {
        a.setHours(0, 0, 0, 0);
        s.setTime(a.getTime());
      }
      if (b) {
        b.setHours(23, 59, 59, 999);
        e.setTime(b.getTime());
      }
      break;
    }
  }
  return { start: s, end: e };
}

const REPORT_LABELS: Record<string, string> = {
  yote: "Ripoti ya Madeni - Historia Yote",
  wiki: "Ripoti ya Madeni - Wiki ya Mwisho",
  mwezi: "Ripoti ya Madeni - Mwezi Huu",
  miezi_3: "Ripoti ya Madeni - Miezi 3 Iliyopita",
  miezi_6: "Ripoti ya Madeni - Miezi 6 Iliyopita",
  mwaka: "Ripoti ya Madeni - Mwaka Huu",
  custom: "Ripoti ya Madeni - Kipindi Maalum",
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ujumbe: "Ingia kwanza." }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = reportParamsSchema.safeParse({
    ...params,
    start_date: params.start_date || undefined,
    end_date: params.end_date || undefined,
    include_payments: params.include_payments === "false" ? false : true,
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ ujumbe: first ?? "Parameta si sahihi." }, { status: 400 });
  }

  const { mteja_id, report_type, start_date, end_date, include_payments } = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { id: mteja_id, mtumiajiId: userId },
    include: { user: { select: { jina_duka: true } } },
  });
  if (!customer) {
    return NextResponse.json({ ujumbe: "Mteja hapatikani." }, { status: 404 });
  }

  const now = new Date();
  const { start, end } = rangeFor(report_type, now, start_date, end_date);

  const debts = await prisma.debt.findMany({
    where: {
      mtejaId: mteja_id,
      mtumiajiId: userId,
      tareheKukopa: { gte: start, lte: end },
    },
    orderBy: { tareheKukopa: "asc" },
    include: { payments: { orderBy: { tarehe: "asc" } } },
  });

  const rows: PdfDebtRow[] = debts.map((d) => ({
    jinaBidhaa: d.jinaBidhaa ?? "—",
    kiasiAsili: toMoney(d.kiasiAsili),
    kiasiKilicholipwa: toMoney(d.kiasiKilicholipwa),
    tareheKukopa: d.tareheKukopa.toISOString(),
    imekamilika: d.imekamilika,
    malipo: include_payments
      ? d.payments.map((m) => ({
          kiasi: toMoney(m.kiasi),
          tarehe: m.tarehe.toISOString(),
          maelezo: m.maelezo,
        }))
      : undefined,
  }));

  const totalKikopa = rows.reduce((s, r) => s + r.kiasiAsili, 0);
  const totalLipwa = rows.reduce((s, r) => s + r.kiasiKilicholipwa, 0);
  const totalBakaa = Math.max(0, totalKikopa - totalLipwa);

  const bytes = await generatePdfReport({
    customer: {
      jina: customer.jina,
      simu: customer.simu,
      location: customer.location,
      publicId: customerPublicId(customer.id),
    },
    storeName: customer.user?.jina_duka ?? "RexaBook",
    debts: rows,
    totalKikopa,
    totalLipwa,
    totalBakaa,
    reportTitle: REPORT_LABELS[report_type] ?? "Ripoti ya Madeni",
    periodLabel: `${fmtReportDate(start)} - ${fmtReportDate(end)}`,
    generatedAt: now,
  });

  const fname = `ripoti_${customer.jina.replace(/\s+/g, "_")}_${report_type}.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
