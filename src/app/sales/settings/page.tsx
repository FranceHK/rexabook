import type { Metadata } from "next";
import { requireSales, salesProfileComplete } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SalesSettingsView } from "@/components/sales/sales-settings-view";

export const metadata: Metadata = { title: "Mipangilio" };
export const dynamic = "force-dynamic";

export default async function SalesSettingsPage() {
  const sales = await requireSales();
  return (
    <AppShell user={{ jina: sales.jina, jinaDuka: sales.jina_duka, isSales: true }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Mipangilio</h1>
        <p className="mt-1 text-sm text-ink-3">Taarifa zako za kuingia na mawasiliano.</p>
      </header>
      <SalesSettingsView
        profile={{
          username: sales.jina,
          fullName: sales.jinaKamili ?? "",
          email: sales.email ?? "",
          region: sales.mkoa ?? "",
          phone: sales.simu ?? "",
          code: sales.referralCode ?? "-",
        }}
        incomplete={!salesProfileComplete(sales)}
      />
    </AppShell>
  );
}
