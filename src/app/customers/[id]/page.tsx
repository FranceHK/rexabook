import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toMoney, bakaa as bakaaOf } from "@/lib/format";
import { AppShell } from "@/components/layout/app-shell";
import { CustomerDetailView, type CustomerDetailData } from "@/components/customers/customer-detail-view";

export const metadata: Metadata = { title: "Mdaiwa" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId) || customerId <= 0) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, mtumiajiId: user.id },
    include: {
      debts: {
        orderBy: { tareheKukopa: "desc" },
        include: { payments: { orderBy: { tarehe: "desc" } } },
      },
    },
  });

  if (!customer) notFound();

  const debts = customer.debts.map((d) => {
    const asili = toMoney(d.kiasiAsili);
    const lipwa = toMoney(d.kiasiKilicholipwa);
    const bak = Math.max(0, asili - lipwa);
    return {
      id: d.id,
      jinaBidhaa: d.jinaBidhaa,
      kiasiAsili: asili,
      kiasiKilicholipwa: lipwa,
      bakaa: bak,
      pct: asili > 0 ? Math.min(100, Math.round((lipwa / asili) * 100)) : 0,
      tareheKukopa: d.tareheKukopa.toISOString(),
      maelezo: d.maelezo,
      imekamilika: d.imekamilika,
      malipo: d.payments.map((m) => ({
        id: m.id,
        kiasi: toMoney(m.kiasi),
        tarehe: m.tarehe.toISOString(),
        maelezo: m.maelezo,
      })),
    };
  });

  const totalKikopa = debts.reduce((s, d) => s + d.kiasiAsili, 0);
  const totalLipwa = debts.reduce((s, d) => s + d.kiasiKilicholipwa, 0);
  const totalBakaa = debts.filter((d) => !d.imekamilika).reduce((s, d) => s + bakaaOf(d.kiasiAsili, d.kiasiKilicholipwa), 0);

  const data: CustomerDetailData = {
    customer: {
      id: customer.id,
      jina: customer.jina,
      simu: customer.simu,
      location: customer.location,
      tareheKuandikishwa: customer.tareheKuandikishwa.toISOString(),
    },
    debts,
    totals: { kikopa: totalKikopa, lipwa: totalLipwa, bakaa: totalBakaa },
    counts: { total: debts.length, active: debts.filter((d) => !d.imekamilika).length },
  };

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka }}>
      <CustomerDetailView data={data} />
    </AppShell>
  );
}