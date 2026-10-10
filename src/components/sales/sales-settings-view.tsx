"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save } from "lucide-react";
import { changeSalesPasswordAction, updateSalesProfileAction } from "@/actions/sales-agents";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/theme/toast-provider";
import { TANZANIA_REGIONS } from "@/lib/regions";

export function SalesSettingsView({
  profile,
  incomplete,
}: {
  profile: { username: string; fullName: string; email: string; region: string; phone: string; code: string };
  /** First login: real names, email and region are still missing. */
  incomplete: boolean;
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
      if (incomplete) router.push("/sales");
      else router.refresh();
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
      router.refresh();
    } else {
      setPasswordError(result.message);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {incomplete && (
        <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-ink-2 xl:col-span-2" role="alert">
          Karibu! Kabla ya kuanza kazi, jaza majina yako matatu, email na mkoa uliopo, kisha hifadhi.
        </p>
      )}

      <Card>
        <CardHeader title="Taarifa Zangu" action={<span className="badge badge-info">{profile.code}</span>} />
        <CardBody>
          <form className="space-y-3" onSubmit={saveProfile}>
            <Input label="Majina matatu kamili" name="jina_kamili" defaultValue={profile.fullName} placeholder="mf. Kelvin John Mushi" maxLength={150} autoComplete="name" required />
            <Input label="Email" name="email" type="email" defaultValue={profile.email} placeholder="jina@mfano.com" maxLength={150} autoComplete="email" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Mkoa uliopo" name="mkoa" defaultValue={profile.region} required>
                <option value="">Chagua mkoa</option>
                {TANZANIA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
              </Select>
              <Input label="Namba ya simu" name="simu" type="tel" defaultValue={profile.phone} placeholder="0712345678" maxLength={20} autoComplete="tel" />
            </div>
            <Input label="Jina la kuingia" name="jina" defaultValue={profile.username} maxLength={100} autoComplete="username" required />
            <p className="text-xs text-ink-3">Jina la kuingia unaweza kuliacha lilivyo au kulibadilisha; ukilibadilisha utalitumia hilo jipya kuingia. Referral code haibadiliki.</p>
            {profileError ? <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{profileError}</p> : null}
            <Button type="submit" loading={busy === "profile"} icon={<Save />}>{incomplete ? "Hifadhi na Endelea" : "Hifadhi Taarifa"}</Button>
          </form>
        </CardBody>
      </Card>

      <Card className="self-start">
        <CardHeader title="Badilisha Nenosiri (si lazima)" />
        <CardBody>
          <form ref={passwordFormRef} className="space-y-3" onSubmit={savePassword}>
            <Input label="Nenosiri la sasa" name="la_zamani" type="password" autoComplete="current-password" required />
            <Input label="Nenosiri jipya (herufi 6 au zaidi)" name="jipya" type="password" minLength={6} autoComplete="new-password" required />
            <Input label="Rudia nenosiri jipya" name="thibitisha" type="password" minLength={6} autoComplete="new-password" required />
            {passwordError ? <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{passwordError}</p> : null}
            <Button type="submit" variant="outline" loading={busy === "password"} icon={<KeyRound />}>Hifadhi Nenosiri</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
