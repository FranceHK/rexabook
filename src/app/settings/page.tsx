import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsView, type CompanyCardClient, type AccountClient } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Mipangilio" };

export default async function SettingsPage() {
  const user = await requireUser();

  const cards = await prisma.companyCard.findMany({
    where: { mtumiajiId: user.id },
    orderBy: { jinaKampuni: "asc" },
  });

  const companyCards: CompanyCardClient[] = cards.map((c) => ({
    id: c.id,
    jinaKampuni: c.jinaKampuni,
    bank: c.bank,
    nambaMalipo: c.nambaMalipo,
  }));

  const users = await prisma.user.findMany({
    orderBy: { tareheKuundwa: "asc" },
    select: { id: true, jina: true, jina_duka: true, simu: true, tareheKuundwa: true },
  });

  const accounts: AccountClient[] = users.map((u) => ({
    id: u.id,
    jina: u.jina,
    jinaDuka: u.jina_duka,
    simu: u.simu,
    tareheKuundwa: u.tareheKuundwa.toISOString(),
    niWewe: u.id === user.id,
  }));

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka }}>
      <SettingsView
        user={{
          jina: user.jina,
          jinaDuka: user.jina_duka,
          simu: user.simu,
        }}
        companyCards={companyCards}
        accounts={accounts}
        smsConfigured={Boolean(process.env.MESEJI_API_KEY)}
      />
    </AppShell>
  );
}