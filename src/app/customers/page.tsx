import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toMoney, bakaa as bakaaOf } from "@/lib/format";
import { AppShell } from "@/components/layout/app-shell";
import { CustomersView, type CustomerCardData } from "@/components/customers/customers-view";

export const metadata: Metadata = { title: "Wadaiwa" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const customers = await prisma.customer.findMany({
    where: { mtumiajiId: user.id },
    include: { debts: true },
    orderBy: { jina: "asc" },
  });

  const data: CustomerCardData[] = customers.map((c) => {
    const jumlaDeni = c.debts.reduce((s, d) => s + toMoney(d.kiasiAsili), 0);
    const jumlaLipwa = c.debts.reduce((s, d) => s + toMoney(d.kiasiKilicholipwa), 0);
    const bakaa = c.debts
      .filter((d) => !d.imekamilika)
      .reduce((s, d) => s + bakaaOf(d.kiasiAsili, d.kiasiKilicholipwa), 0);
    const deniInayoendelea = c.debts.filter((d) => !d.imekamilika).length;
    return {
      id: c.id,
      jina: c.jina,
      simu: c.simu,
      location: c.location,
      imezuiwa: c.imezuiwa,
      tareheKuandikishwa: c.tareheKuandikishwa,
      jumlaDeni,
      jumlaLipwa,
      bakaa,
      deniCount: c.debts.length,
      deniInayoendelea,
      imekamilishaKikamilifu: c.debts.length > 0 && bakaa === 0,
    };
  });

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka }}>
      <CustomersView customers={data} clientNewOpen={params.new === "1"} />
    </AppShell>
  );
}
