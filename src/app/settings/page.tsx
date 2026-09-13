import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Mipangilio" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka }}>
      <SettingsView
        user={{
          jina: user.jina,
          jinaDuka: user.jina_duka,
          simu: user.simu,
        }}
        smsConfigured={Boolean(process.env.MESEJI_API_KEY)}
      />
    </AppShell>
  );
}