"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Eye, EyeOff, ShieldCheck, ShoppingCart, UserCheck, UserRoundPlus, Users, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createStaffAction, toggleStaffAction } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";

type StaffRole = "MANAGER" | "CASHIER";

export interface TeamPanelMember {
  id: number;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLES: Array<{ id: StaffRole; label: string; icon: LucideIcon; can: string[] }> = [
  { id: "MANAGER", label: "Meneja", icon: ShieldCheck, can: ["Mauzo na wadaiwa", "Bidhaa, stock na matumizi", "Mizigo na ripoti"] },
  { id: "CASHIER", label: "Cashier", icon: ShoppingCart, can: ["Mauzo na risiti", "Wadaiwa na kusajili wateja", "Kulipia subscription"] },
];
const roleLabel = (role: string) => (role === "MANAGER" ? "Meneja" : "Cashier");

const date = (value: string) => new Date(value).toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export function TeamPanel({ staff }: { staff: TeamPanelMember[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState<StaffRole>("CASHIER");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function finish(key: string, action: () => Promise<{ success: boolean; message: string }>): Promise<boolean> {
    setBusy(key);
    const result = await action();
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
    return result.success;
  }

  const blocked = staff.filter((member) => !member.active).length;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Wafanyakazi wote", staff.length, Users, "bg-primary/10 text-primary"],
          ["Mameneja", staff.filter((member) => member.role === "MANAGER").length, ShieldCheck, "bg-primary-2/10 text-primary-2"],
          ["Ma-cashier", staff.filter((member) => member.role === "CASHIER").length, ShoppingCart, "bg-info/10 text-info"],
          ["Waliozuiwa", blocked, UserX, blocked ? "bg-danger/10 text-danger" : "bg-success/10 text-success"],
        ] as const).map(([label, value, Icon, tone]) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 shadow-card">
            <div><p className="text-xs font-medium uppercase text-ink-3">{label}</p><p className="mt-2 text-xl font-semibold text-ink">{value.toLocaleString("en-TZ")}</p></div>
            <span className={`grid size-10 place-items-center rounded-lg ${tone}`}><Icon className="size-5" /></span>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <Card className="self-start overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary-2 px-5 py-4 text-white">
            <p className="flex items-center gap-2 text-base font-semibold"><UserRoundPlus className="size-5" /> Ongeza Mfanyakazi</p>
            <p className="mt-1 text-xs text-white/85">Ataingia kwa ukurasa ule ule wa login kwa jina na nenosiri utakalompa.</p>
          </div>
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                void finish("create", () => createStaffAction(null, new FormData(form))).then((created) => { if (created) form.reset(); });
              }}
            >
              <input type="hidden" name="business_role" value={role} />
              <div>
                <p className="mb-2 text-sm font-medium text-ink-2">Nafasi</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(({ id, label, icon: Icon, can }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRole(id)}
                      aria-pressed={role === id}
                      className={`rounded-lg border-2 p-3 text-left transition ${role === id ? "border-primary bg-primary/5" : "border-line hover:border-primary/40"}`}
                    >
                      <p className={`flex items-center gap-2 text-sm font-semibold ${role === id ? "text-primary" : "text-ink"}`}><Icon className="size-4" /> {label}</p>
                      <ul className="mt-2 space-y-1 text-[11px] leading-snug text-ink-3">
                        {can.map((item) => <li key={item} className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-success" /> {item}</li>)}
                      </ul>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-3">Kufuta madeni na mizigo ni kwa mmiliki pekee.</p>
              </div>
              <Input label="Jina la kuingia" name="jina" placeholder="mf. asha" maxLength={100} autoComplete="off" required />
              <div className="relative">
                <Input label="Nenosiri la kuanzia (herufi 6 au zaidi)" name="nenosiri" type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" required />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Ficha nenosiri" : "Onyesha nenosiri"}
                  className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-md text-ink-3 hover:text-primary"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button type="submit" loading={busy === "create"} icon={<UserRoundPlus />} className="w-full">Ongeza Mfanyakazi</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Timu ya Duka" action={<span className="badge badge-info">{staff.length}</span>} />
          <CardBody>
            {staff.length === 0 ? (
              <div className="grid place-items-center gap-2 py-12 text-center text-sm text-ink-3"><Users className="size-8" /> Hakuna mfanyakazi aliyeongezwa.</div>
            ) : (
              <ul className="grid gap-3 lg:grid-cols-2">
                {staff.map((member) => (
                  <li key={member.id} className={`rounded-lg border border-line bg-surface p-4 transition hover:border-primary/30 ${member.active ? "" : "opacity-75"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ${member.active ? "bg-gradient-to-br from-primary to-primary-2" : "bg-ink-3"}`}>{initials(member.name)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{member.name}</p>
                        <p className="text-xs text-ink-3">Ameongezwa {date(member.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-info">{roleLabel(member.role)}</span>
                        <span className={`badge ${member.active ? "badge-done" : "badge-danger"}`}>{member.active ? "Anaruhusiwa" : "Amezuiwa"}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={member.active ? "outline" : "success"}
                        loading={busy === `toggle-${member.id}`}
                        icon={member.active ? <Ban /> : <UserCheck />}
                        onClick={() => void finish(`toggle-${member.id}`, () => toggleStaffAction(member.id))}
                      >
                        {member.active ? "Zuia" : "Ruhusu"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
