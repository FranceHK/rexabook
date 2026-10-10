import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Handshake, LayoutDashboard, MessageSquareText, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { AdminOverviewSection } from "@/components/admin/sections/overview-section";
import { AdminSalesSection } from "@/components/admin/sections/sales-section";
import { AdminSmsSection } from "@/components/admin/sections/sms-section";
import { AdminSubscriptionsSection } from "@/components/admin/sections/subscriptions-section";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "muhtasari", label: "Muhtasari", icon: LayoutDashboard },
  { id: "malipo", label: "Malipo", icon: CreditCard },
  { id: "sales", label: "Sales", icon: Handshake },
  { id: "sms", label: "SMS", icon: MessageSquareText },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const admin = await requireAdmin();
  const tab: TabId = TABS.find((item) => item.id === params.tab)?.id ?? "muhtasari";

  return (
    <AppShell user={{ jina: admin.jina, jinaDuka: admin.jina_duka, isAdmin: true, businessRole: admin.businessRole }}>
      <header className="relative mb-5 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-2 p-6 text-white shadow-card">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/15"><ShieldCheck className="size-6" /></span>
          <div>
            <h1 className="text-2xl font-semibold">Admin</h1>
            <p className="mt-1 text-sm text-white/85">Kila kitu unachosimamia: biashara, malipo, sales persons na SMS.</p>
          </div>
        </div>
      </header>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface-2 p-1" aria-label="Sehemu za admin">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/admin?tab=${id}`}
            aria-current={id === tab ? "page" : undefined}
            className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
              id === tab ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"
            }`}
          >
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </nav>

      {tab === "muhtasari" && <AdminOverviewSection />}
      {tab === "malipo" && <AdminSubscriptionsSection />}
      {tab === "sales" && <AdminSalesSection />}
      {tab === "sms" && <AdminSmsSection adminId={admin.id} />}
    </AppShell>
  );
}
