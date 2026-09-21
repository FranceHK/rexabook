import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireBusinessRole } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsView, type CompanyCardClient } from "@/components/settings/settings-view";
import type { SmsWalletClient } from "@/components/settings/sms-wallet-card";

export const metadata: Metadata = { title: "Mipangilio" };

export default async function SettingsPage() {
  const user = await requireBusinessRole(["OWNER"]);

  const [cards, purchases] = await Promise.all([
    prisma.companyCard.findMany({
      where: { mtumiajiId: user.id },
      orderBy: { jinaKampuni: "asc" },
    }),
    prisma.smsPurchase.findMany({
      where: { mtumiajiId: user.id },
      orderBy: { tareheKuundwa: "desc" },
      take: 8,
    }),
  ]);

  const companyCards: CompanyCardClient[] = cards.map((c) => ({
    id: c.id,
    jinaKampuni: c.jinaKampuni,
    bank: c.bank,
    nambaMalipo: c.nambaMalipo,
  }));

  const smsAccount: SmsWalletClient = {
    enabled: user.smsEnabled,
    balance: user.smsBalance,
    configured: Boolean(process.env.MESEJI_API_KEY || process.env.MESEJI_TOKEN),
    snippeConfigured: Boolean(process.env.SNIPPE_API_KEY && process.env.SNIPPE_WEBHOOK_SECRET),
    phone: user.simu,
    purchases: purchases.map((purchase) => ({
      id: purchase.id,
      units: purchase.idadiSms,
      total: purchase.jumla,
      status: purchase.status,
      reference: purchase.kumbukumbu,
      provider: purchase.paymentProvider,
      paymentStatus: purchase.paymentStatus,
      createdAt: purchase.tareheKuundwa.toISOString(),
    })),
  };

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka, isAdmin: user.role === "ADMIN", businessRole: user.businessRole }}>
      <SettingsView
        user={{
          jina: user.jina,
          jinaDuka: user.jina_duka,
          simu: user.simu,
        }}
        companyCards={companyCards}
        smsAccount={smsAccount}
      />
    </AppShell>
  );
}
