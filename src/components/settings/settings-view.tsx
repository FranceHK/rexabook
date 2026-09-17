"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, KeyRound, MessageSquareText, Landmark, Trash2, Plus } from "lucide-react";
import {
  updateProfileAction,
  changePasswordAction,
  addCompanyCardAction,
  deleteCompanyCardAction,
} from "@/actions/settings";
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

export interface CompanyCardClient {
  id: number;
  jinaKampuni: string;
  bank: string;
  nambaMalipo: string;
}

export function SettingsView({
  user,
  companyCards,
  smsConfigured,
}: {
  user: SettingsUser;
  companyCards: CompanyCardClient[];
  smsConfigured: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [profError, setProfError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [profBusy, setProfBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const pwFormRef = useRef<HTMLFormElement>(null);
  const profFormRef = useRef<HTMLFormElement>(null);
  const cardFormRef = useRef<HTMLFormElement>(null);

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

  async function saveCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCardBusy(true);
    setCardError(null);
    const fd = new FormData(e.currentTarget);
    const res: ActionResult = await addCompanyCardAction(null, fd);
    setCardBusy(false);
    if (res.success) {
      toast(res.message);
      cardFormRef.current?.reset();
      router.refresh();
    } else {
      setCardError(res.message);
    }
  }

  async function futaCard(card: CompanyCardClient) {
    if (!window.confirm(`Una uhakika unataka kufuta kadi ya "${card.jinaKampuni}"?`)) return;
    const res = await deleteCompanyCardAction(card.id);
    if (res.success) {
      toast(res.message);
      router.refresh();
    } else {
      toast(res.message, "error");
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

        {/* Company payment cards */}
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Landmark className="size-4 text-primary" /> Kadi za Malipo za Makampuni</span>}
          />
          <CardBody>
            <form ref={cardFormRef} onSubmit={saveCard} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Jina la Kampuni" name="jina_kampuni" placeholder="mfano: Alibaba Co. Ltd" required />
                <Input label="Benki" name="bank" placeholder="mfano: CRDB, NMB, NBC" required />
                <Input label="Namba ya Malipo" name="namba_malipo" placeholder="mfano: 0150XXXXXXX" required />
              </div>

              {cardError ? (
                <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {cardError}
                </p>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" loading={cardBusy} icon={<Plus />}>Hifadhi Kadi</Button>
              </div>
            </form>

            <div className="mt-6 border-t border-line pt-5">
              {companyCards.length === 0 ? (
                <p className="text-sm text-ink-3">
                  Hakuna kadi za malipo zilizohifadhiwa bado. Ongeza benki na namba ya malipo unayotumia kulipa makampuni.
                </p>
              ) : (
                <ul className="space-y-2">
                  {companyCards.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                        <Landmark className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{c.jinaKampuni}</p>
                        <p className="text-xs text-ink-3">
                          {c.bank} · <span className="font-mono text-ink-2">{c.nambaMalipo}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => futaCard(c)}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-danger/10 hover:text-danger"
                        aria-label="Futa kadi"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
                SMS za malipo zimewashwa. Malipo yatamjumlisha mteja kwenye namba yake ya simu kupitia <strong>Meseji</strong>.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-ink-2">
                SMS hazijawekwa. Weka <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">MESEJI_API_KEY</code> na
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">MESEJI_SENDER</code> kwenye faili ya{" "}
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