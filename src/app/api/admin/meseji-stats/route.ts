import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMesejiAccountStats } from "@/lib/meseji";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Huna ruhusa." }, { status: 403 });
  }

  const stats = await getMesejiAccountStats();
  if (!stats) {
    return NextResponse.json({ error: "Takwimu za Meseji hazijapatikana." }, { status: 503 });
  }

  return NextResponse.json(stats, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
