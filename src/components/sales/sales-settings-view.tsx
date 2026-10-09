"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save } from "lucide-react";
import { changeSalesPasswordAction, updateSalesProfileAction } from "@/actions/sales-agents";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";

export function SalesSettingsView({
  profile,
  mustChangePassword,
}: {
  profile: { username: string; phone: string; code: string };
  mustChangePassword: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState<"profile" | "password" | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    setProfileError(null);
    const result = await updateSalesProfileAction(null, new FormData(event.currentTarget));
    setBusy(null);
    if (result.success) {
      toast(result.message, "success");
      router.refresh();
    } else {
      setProfileError(result.message);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("password");
    setPasswordError(null);
    const result = await changeSalesPasswordAction(null, new FormData(event.currentTarget));
    setBusy(null);
    if (result.success) {
      toast(result.message, "success");
      passwordFormRef.current?.reset();
      if (mustChangePassword) router.push("/sales");
      else router.refresh();
    } else {
      setPasswordError(result.message);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {mustChangePassword && (
        <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-ink-2 xl:col-span-2" role="alert">
          Unatumia nenosiri la kuanzia ulilotumiwa. Weka nenosiri lako jipya kwanza ili uendelee.
        </p>
      )}

      <Card>
        <CardHeader title="Badilisha Nenosiri" />
        <CardBody>
          <form ref={passwordFormRef} className="space-y-3" onSubmit={savePassword}>
            <Input label={mustChangePassword ? "Nenosiri ulilotumiwa" : "Nenosiri la zamani"} name="la_zamani" type="password" autoComplete="current-password" required />
            <Input label="Nenosiri jipya (herufi 6 au zaidi)" name="jipya" type="password" minLength={6} autoComplete="new-password" required />
            <Input label="Rudia nenosiri jipya" name="thibitisha" type="password" minLength={6} autoComplete="new-password" required />
            {passwordError ? <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{passwordError}</p> : null}
            <Button type="submit" loading={busy === "password"} icon={<KeyRound />}>Hifadhi Nenosiri</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Taarifa Zangu" action={<span className="badge badge-info">{profile.code}</span>} />
        <CardBody>
          <form className="space-y-3" onSubmit={saveProfile}>
            <Input label="Jina la kuingia" name="jina" defaultValue={profile.username} maxLength={100} autoComplete="username" required />
            <Input label="Namba ya simu" name="simu" type="tel" defaultValue={profile.phone} placeholder="0712345678" maxLength={20} />
            <p className="text-xs text-ink-3">Ukibadilisha jina la kuingia, utalitumia hilo jipya kuingia. Referral code yako haibadiliki.</p>
            {profileError ? <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{profileError}</p> : null}
            <Button type="submit" loading={busy === "profile"} icon={<Save />}>Hifadhi Taarifa</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
