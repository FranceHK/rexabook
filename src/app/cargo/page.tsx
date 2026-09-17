import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toMoney } from "@/lib/format";
import { AppShell } from "@/components/layout/app-shell";
import { CargoView, type CargoClient } from "@/components/cargo/cargo-view";

export const metadata: Metadata = { title: "Mizigo" };

export default async function CargoPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const cargos = await prisma.cargo.findMany({
    where: { mtumiajiId: user.id },
    include: { items: true },
    orderBy: { tareheKuagiza: "desc" },
  });

  const data: CargoClient[] = cargos.map((c) => ({
    id: c.id,
    jinaKampuni: c.jinaKampuni,
    jumlaGharama: toMoney(c.jumlaGharama),
    ainaUsafiri: c.ainaUsafiri,
    nambariTracking: c.nambariTracking,
    tareheKuagiza: c.tareheKuagiza.toISOString(),
    tareheKutarajiwa: c.tareheKutarajiwa?.toISOString() ?? null,
    tareheKufikaHalisi: c.tareheKufikaHalisi?.toISOString() ?? null,
    hali: c.hali,
    maelezo: c.maelezo,
    risitiPicha: c.risitiPicha,
    bidhaa: c.items.map((b) => ({
      id: b.id,
      jinaBidhaa: b.jinaBidhaa,
      idadi: b.idadi,
      kitengo: b.kitengo,
      beiKwaKipande: toMoney(b.beiKwaKipande),
      jumla: toMoney(b.jumla),
      imefika: b.imefika,
    })),
  }));

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka }}>
      <CargoView cargos={data} clientNewOpen={params.new === "1"} />
    </AppShell>
  );
}