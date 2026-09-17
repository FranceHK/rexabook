"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  KeyRound,
  MessageSquareText,
  Landmark,
  Trash2,
  Plus,
  Settings2,
  CreditCard,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
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

function initialsOf(jina: string): string {
  return jina
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-info text-white shadow-glass">
            <Settings2 className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mipangilio</h1>
            <p className="mt-0.5 text-sm text-ink-3">Dhibiti akaunti yako, nenosiri, malipo ya makampuni na SMS.</p>
          </div>
        </div>
        <span className="badge badge-info">{user.jinaDuka}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Profile */}
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-2 to-info" aria-hidden />
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <UserRound className="size-4" />
                </span>
                Taarifa za Akaunti
              </span>
            }
          />
          <CardBody>
            <div className="mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary/10 to-info/10 p-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-info text-lg font-bold text-white shadow-glass">
                {initialsOf(user.jina) || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">{user.jina}</p>
                <p className="truncate text-sm text-ink-3">
                  {user.jinaDuka}
                  {user.simu ? ` · ${user.simu}` : " · Hakuna namba ya simu"}
                </p>
              </div>
            </div>

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
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-warning via-amber-400 to-orange-300" aria-hidden />
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/12 text-warning">
                  <KeyRound className="size-4" />
                </span>
                Nenosiri
              </span>
            }
          />
          <CardBody>
            <p className="mb-4 text-sm leading-relaxed text-ink-3">
              Usaimamishe nenosiri lako pindi unaposhuku linajulikana na mtu mwingine.
            </p>
            <form ref={pwFormRef} onSubmit={changePassword} className="space-y-4">
              <Input label="Nenosiri la zamani" name="la_zamani" type="password" required />
              <Input label="Nenosiri jipya (herufi 6 au zaidi)" name="jipya" type="password" required />
              <Input label="Rudia nenosiri jipya" name="thibitisha" type="password" required />

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

        {/* Company payment cards */}
        <Card className="relative overflow-hidden lg:col-span-3">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-success to-teal-300" aria-hidden />
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success/12 text-success">
                  <Landmark className="size-4" />
                </span>
                Kadi za Malipo za Makampuni
              </span>
            }
            action={<span className="badge shrink-0 badge-info">{companyCards.length} kadi</span>}
          />
          <CardBody>
            {/* Form */}
            <form ref={cardFormRef} onSubmit={saveCard} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Input label="Jina la Kampuni" name="jina_kampuni" placeholder="mfano: Alibaba Co. Ltd" required />
                <Input label="Benki" name="bank" placeholder="mfano: CRDB, NMB, NBC" required />
                <Input label="Namba ya Malipo" name="namba_malipo" placeholder="mfano: 0150XXXXXXX" required />
              </div>

              {cardError ? (
                <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {cardError}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <p className="hidden text-xs text-ink-3 sm:block">
                  Hifadhi benki na namba za malipo unazotumia kulipa makampuni yako.
                </p>
                <Button type="submit" loading={cardBusy} icon={<Plus />}>Hifadhi Kadi</Button>
              </div>
            </form>

            {/* List */}
            <div className="mt-6 border-t border-line pt-5">
              {companyCards.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2 px-6 py-10 text-center">
                  <span className="grid size-14 place-items-center rounded-full neu-inset text-ink-3">
                    <CreditCard className="size-6" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">Hakuna kadi zilizohifadhiwa</p>
                    <p className="mt-1 text-xs text-ink-3">
                      Ongeza kadi yako ya kwanza hapo juu ili uweze kukumbuka bank unazolipia makampuni.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {companyCards.map((c) => (
                    <div
                      key={c.id}
                      className="group relative overflow-hidden rounded-2xl border border-line bg-surface-2 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-info/15 text-primary">
                            <Landmark className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{c.jinaKampuni}</p>
                            <p className="text-xs text-ink-3">{c.bank}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => futaCard(c)}
                          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-danger/10 hover:text-danger"
                          aria-label={`Futa kadi ya ${c.jinaKampuni}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
                        <span className="text-[11px] uppercase tracking-wide text-ink-3">Namba ya Malipo</span>
                        <span className="truncate font-mono text-sm font-semibold text-success">{c.nambaMalipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* SMS status */}
        <Card className="relative overflow-hidden lg:col-span-3">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-info via-info to-primary-2" aria-hidden />
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info/12 text-info">
                  <MessageSquareText className="size-4" />
                </span>
                Taarifa ya SMS
              </span>
            }
            action={
              smsConfigured ? (
                <span className="badge badge-done shrink-0">Imeanzishwa</span>
              ) : (
                <span className="badge badge-wait shrink-0">Haijawekwa</span>
              )
            }
          />
          <CardBody>
            {smsConfigured ? (
              <div className="flex items-start gap-3 rounded-2xl bg-success/8 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                  <CircleCheck className="size-5" />
                </span>
                <p className="text-sm leading-relaxed text-ink-2">
                  SMS za malipo <strong className="text-ink">zimewashwa</strong>. Malipo yatamjumlisha mteja kwenye namba
                  yake ya simu kupitia <strong className="text-ink">Meseji</strong>.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl bg-warning/8 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                  <CircleAlert className="size-5" />
                </span>
                <p className="text-sm leading-relaxed text-ink-2">
                  SMS <strong className="text-ink">hazijawekwa</strong>. Weka{" "}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">MESEJI_API_KEY</code> na{" "}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">MESEJI_SENDER</code> kwenye faili ya{" "}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">.env</code> ili SMS tume zipite kwa
                  wateja wako. Mfumo utaendelea kufanya kazi bila SMS.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}