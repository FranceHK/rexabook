import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsView, type CompanyCardClient } from "@/components/settings/settings-view";

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

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka }}>
      <SettingsView
        user={{
          jina: user.jina,
          jinaDuka: user.jina_duka,
          simu: user.simu,
        }}
        companyCards={companyCards}
        smsConfigured={Boolean(process.env.MESEJI_API_KEY)}
      />
    </AppShell>
  );
}