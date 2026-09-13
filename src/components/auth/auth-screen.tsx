"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Sun, Moon, BookOpenText, ShieldCheck, Truck, FileText, UserRoundPlus, CheckCircle2 } from "lucide-react";
import { loginAction, registerAction } from "@/actions/auth";
import { useTheme } from "@/components/theme/theme-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action-result";

const initState: ActionResult = { success: false, message: "" };

const features = [
  { icon: ShieldCheck, text: "Weka kumbukumbu za madeni na malipo sehemu moja" },
  { icon: Truck, text: "Fuatilia mizigo yako kutoka kuagiza hadi kufika" },
  { icon: FileText, text: "Tengeneza ripoti za PDF za kila mdaiwa" },
];

function formError(state: ActionResult) {
  return !state.success && state.message ? state.message : undefined;
}

export function AuthScreen({ initialTab = "login" }: { initialTab?: "login" | "register" }) {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [viewPassword, setViewPassword] = useState(false);

  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initState);
  const [regState, regFormAction, regPending] = useActionState(registerAction, initState);

  const openTab = (t: "login" | "register") => {
    setTab(t);
    router.replace(t === "login" ? "/login" : "/login?tab=register");
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      {/* Background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[30rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-48 -right-40 size-[34rem] rounded-full bg-info/20 blur-[120px]" />
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggle}
        className="glass absolute right-5 top-5 grid size-10 place-items-center rounded-full text-ink-2 transition hover:text-ink"
        aria-label={theme === "dark" ? "Badilisha kuwa mwangaza" : "Badilisha kuwa giza"}
        title={theme === "dark" ? "Mwangaza" : "Giza"}
      >
        {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      <div className="relative w-full max-w-4xl">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-glass">
          <div className="grid md:grid-cols-[1fr_1.05fr]">
            {/* Brand panel (desktop) */}
            <aside
              className="relative hidden overflow-hidden p-8 text-white md:flex md:flex-col md:justify-between lg:p-10"
              style={{
                backgroundImage:
                  "linear-gradient(150deg, var(--primary) 0%, color-mix(in srgb, var(--primary-2) 65%, var(--primary)) 45%, var(--info) 100%)",
              }}
            >
              <div aria-hidden className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px);background-size:22px_22px]" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-white/15 text-white shadow-lg backdrop-blur">
                    <BookOpenText className="size-6" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">RexaBook</p>
                    <p className="text-sm text-white/75">Duka Madeni</p>
                  </div>
                </div>

                <h1 className="mt-9 text-2xl font-semibold leading-snug md:text-[1.7rem]">
                  Karibu tena, Bwana/Bibi Duka!
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  Mfumo wako wa kudhibiti madeni, malipo na mizigo — rahisi, salama na wa haraka.
                </p>

                <ul className="mt-8 space-y-4">
                  {features.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3 text-sm text-white/90">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
                        <Icon className="size-4" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative mt-8 flex items-center gap-2 text-xs text-white/70">
                <CheckCircle2 className="size-4" />
                Data yako ni salama — imefichwa na kuhifadhiwa kwa usalama
              </div>
            </aside>

            {/* Form panel */}
            <div className="p-6 sm:p-8 lg:p-10">
              {/* Brand row (mobile) */}
              <div className="mb-6 flex items-center gap-3 md:hidden">
                <div
                  className="grid size-11 place-items-center rounded-2xl text-white shadow-lg"
                  style={{
                    backgroundImage:
                      "linear-gradient(150deg, var(--primary), var(--info))",
                  }}
                >
                  <BookOpenText className="size-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-ink">RexaBook</p>
                  <p className="text-sm text-ink-3">Duka Madeni</p>
                </div>
              </div>

              {/* Tab switcher */}
              <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => openTab("login")}
                  className={cn(
                    "rounded-lg py-2.5 text-sm font-medium transition",
                    tab === "login" ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
                  )}
                >
                  Ingia
                </button>
                <button
                  type="button"
                  onClick={() => openTab("register")}
                  className={cn(
                    "rounded-lg py-2.5 text-sm font-medium transition",
                    tab === "register" ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
                  )}
                >
                  Fungua Akaunti
                </button>
              </div>

              {tab === "login" ? (
                <form action={loginFormAction} className="space-y-5">
                  <Input
                    label="Jina la mtumiaji"
                    name="jina"
                    placeholder="mf. Juma Baraka"
                    autoComplete="username"
                    required
                  />
                  <Input
                    label="Nenosiri"
                    name="nenosiri"
                    type={viewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer rounded accent-primary"
                        checked={viewPassword}
                        onChange={(e) => setViewPassword(e.target.checked)}
                      />
                      Onyesha nenosiri
                    </label>
                    <button
                      type="button"
                      onClick={() => openTab("register")}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Fungua akaunti?
                    </button>
                  </div>

                  {formError(loginState) ? (
                    <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                      {loginState.message}
                    </p>
                  ) : null}

                  <Button type="submit" size="lg" loading={loginPending} className="w-full" icon={<ShieldCheck />}>
                    Ingia
                  </Button>
                </form>
              ) : (
                <form action={regFormAction} className="space-y-5">
                  <Input
                    label="Jina la mtumiaji"
                    name="jina"
                    placeholder="mf. Juma Baraka"
                    autoComplete="username"
                    required
                  />
                  <Input
                    label="Jina la duka"
                    name="jinaDuka"
                    placeholder="mf. Duka la Juma"
                    autoComplete="organization"
                    required
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Nenosiri (herufi 6 au zaidi)"
                      name="nenosiri"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                    />
                    <Input
                      label="Rudia nenosiri"
                      name="nenosiri2"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {formError(regState) ? (
                    <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                      {regState.message}
                    </p>
                  ) : null}

                  <Button type="submit" size="lg" loading={regPending} className="w-full" icon={<UserRoundPlus />}>
                    Fungua Akaunti
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-3">
          © {new Date().getFullYear()} RexaBook · Duka Madeni
        </p>
      </div>
    </div>
  );
}