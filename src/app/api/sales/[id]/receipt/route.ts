import { NextResponse } from "next/server";
import { businessIdFor, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSaleReceipt } from "@/lib/sales-receipt";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ingia kwanza." }, { status: 401 });
  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isSafeInteger(saleId)) return NextResponse.json({ error: "Risiti si sahihi." }, { status: 400 });
  const businessId = businessIdFor(user);
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, mtumiajiId: businessId },
    include: { items: true, customer: true, user: { select: { jina_duka: true, simu: true } }, servedBy: { select: { jina: true } } },
  });
  if (!sale) return NextResponse.json({ error: "Risiti haipatikani." }, { status: 404 });

  const bytes = await generateSaleReceipt({
    shopName: sale.user.jina_duka,
    shopPhone: sale.user.simu,
    receiptNumber: sale.receiptNumber,
    customerName: sale.customer?.jina,
    customerPhone: sale.customer?.simu,
    date: sale.tarehe,
    servedBy: sale.servedBy?.jina,
    paymentMethod: sale.njiaMalipo,
    total: Number(sale.jumla),
    paid: Number(sale.kiasiKilicholipwa),
    items: sale.items.map((item) => ({
      name: item.jinaBidhaa,
      quantity: item.idadi,
      unitPrice: Number(item.beiKuuza),
      total: Number(item.jumla),
    })),
  });
  const filename = sale.receiptNumber.replace(/[^A-Za-z0-9_-]/g, "-");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
