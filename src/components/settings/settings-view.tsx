"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, KeyRound, MessageSquareText } from "lucide-react";
import { updateProfileAction, changePasswordAction } from "@/actions/settings";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";
import type { ActionResult } from "@/lib/action-result";

interface SettingsUser {
  jina: string;
  jinaDuka: string;
  simu?: string | null;
}

export function SettingsView({ user, smsConfigured }: { user: SettingsUser; smsConfigured: boolean }) {
  const { toast } = useToast();
  const router = useRouter();

  const [profError, setProfError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [profBusy, setProfBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const pwFormRef = useRef<HTMLFormElement>(null);
  const profFormRef = useRef<HTMLFormElement>(null);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfBusy(true);
    setProfError(null);
    const fd = new FormData(e.currentTarget);
    const res: ActionResult = await updateProfileAction(null, fd);
    setProfBusy(false);
    if (res.success) {
      toast(res.message);
      router.refresh();
    } else {
      setProfError(res.message);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwBusy(true);
    setPwError(null);
    const fd = new FormData(e.currentTarget);
    const res: ActionResult = await changePasswordAction(null, fd);
    setPwBusy(false);
    if (res.success) {
      toast(res.message);
      pwFormRef.current?.reset();
    } else {
      setPwError(res.message);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Mipangilio</h1>
        <p className="mt-1 text-sm text-ink-3">Sasisha taarifa za akaunti yako na nenosiri.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><UserRound className="size-4 text-primary" /> Taarifa za Akaunti</span>} />
          <CardBody>
            <form ref={profFormRef} onSubmit={saveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Jina la mtumiaji" name="jina" defaultValue={user.jina} required />
                <Input label="Jina la duka" name="jina_duka" defaultValue={user.jinaDuka} required />
              </div>
              <Input
                label="Namba ya simu (hiari)"
                name="simu"
                type="tel"
                defaultValue={user.simu ?? ""}
                placeholder="mf. 07XXXXXXXX"
              />

              {profError ? (
                <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {profError}
                </p>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" loading={profBusy}>Hifadhi Mabadiliko</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Badilisha Nenosiri</span>} />
          <CardBody>
            <form ref={pwFormRef} onSubmit={changePassword} className="space-y-4">
              <Input label="Nenosiri la zamani" name="la_zamani" type="password" required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Nenosiri jipya (herufi 6 au zaidi)" name="jipya" type="password" required />
                <Input label="Rudia nenosiri jipya" name="thibitisha" type="password" required />
              </div>

              {pwError ? (
                <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {pwError}
                </p>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" variant="warning" loading={pwBusy}>Badilisha Nenosiri</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* SMS status */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" /> Taarifa ya SMS</span>} />
          <CardBody>
            {smsConfigured ? (
              <p className="text-sm text-ink-2">
                SMS za malipo zimewashwa. Malipo yatamjumlisha mteja kwenye namba yake ya simu kupitia <strong>Beem Africa</strong>.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-ink-2">
                SMS hazijawekwa. Weka <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">BEEM_API_KEY</code>,
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">BEEM_API_SECRET</code> na
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">BEEM_SENDER</code> kwenye faili ya{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">.env</code> ili SMS tume zipite kwa wateja wako.
                Mfumo utaendelea kufanya kazi bila SMS.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}