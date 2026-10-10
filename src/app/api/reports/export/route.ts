import { NextRequest, NextResponse } from "next/server";
import { businessIdFor, getBusinessOwner, getCurrentUser, planAllows, subscriptionIsActive } from "@/lib/auth";
import { generateBusinessReportCsv, generateBusinessReportPdf } from "@/lib/report-export";
import { getReportData, parseReportPeriod } from "@/lib/reports-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === "SALES") return NextResponse.json({ ujumbe: "Ingia kwanza." }, { status: 401 });
  if (user.businessRole === "CASHIER") return NextResponse.json({ ujumbe: "Huna ruhusa ya kuona ripoti." }, { status: 403 });
  const owner = await getBusinessOwner(user);
  if (!owner) return NextResponse.json({ ujumbe: "Duka halipatikani." }, { status: 404 });
  // Reports stay readable on screen without a subscription, but nothing leaves the system as a file.
  if (!subscriptionIsActive(owner)) {
    return NextResponse.json({ ujumbe: "Lipia subscription ili kupakua ripoti." }, { status: 403 });
  }

  const period = parseReportPeriod(req.nextUrl.searchParams.get("period"));
  const data = await getReportData(businessIdFor(user), period, planAllows(owner, "cargo"));
  const fileDate = new Date().toISOString().slice(0, 10);

  if (req.nextUrl.searchParams.get("format") === "csv") {
    return new NextResponse(generateBusinessReportCsv(data, owner.jina_duka), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rexabook-ripoti-${fileDate}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdf = await generateBusinessReportPdf(data, owner.jina_duka, new Date());
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rexabook-ripoti-${fileDate}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
