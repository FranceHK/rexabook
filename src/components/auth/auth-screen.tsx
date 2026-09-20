"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LockKeyhole, Moon, ShieldCheck, Sun, UserRoundPlus } from "lucide-react";
import { loginAction, registerAction } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "@/components/theme/theme-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action-result";

const initState: ActionResult = { success: false, message: "" };

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

  const openTab = (nextTab: "login" | "register") => {
    setTab(nextTab);
    router.replace(nextTab === "login" ? "/login" : "/login?tab=register");
  };

  return (
    <main className="auth-stage relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-grid-motion absolute inset-0" />
        <div className="auth-route auth-route-a"><span /></div>
        <div className="auth-route auth-route-b"><span /></div>
        <div className="auth-route auth-route-c"><span /></div>
        <BrandLogo className="auth-watermark absolute -bottom-24 -left-20 w-[28rem] opacity-[0.035]" />
      </div>

      <button
        type="button"
        onClick={toggle}
        className="absolute right-5 top-5 z-20 grid size-10 place-items-center rounded-lg border border-line bg-surface/90 text-ink-2 shadow-sm backdrop-blur transition hover:border-primary/30 hover:text-primary"
        aria-label={theme === "dark" ? "Badilisha kuwa mwangaza" : "Badilisha kuwa giza"}
        title={theme === "dark" ? "Mwangaza" : "Giza"}
      >
        {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-lg border border-line bg-surface shadow-[0_24px_70px_rgba(37,99,235,0.12)] md:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden min-h-[620px] overflow-hidden border-r border-line bg-[#edf6ff] p-10 dark:bg-surface-2 md:flex md:flex-col md:justify-between">
            <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div>
              <BrandLogo className="h-44 w-56" priority />
              <p className="mt-8 text-xs font-semibold uppercase text-primary">Karibu RexaBook</p>
              <h1 className="mt-3 max-w-sm text-3xl font-semibold leading-tight text-ink">
                Kumbukumbu za biashara yako, zikiwa wazi na salama.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-ink-2">
                Endelea pale ulipoishia na usimamie taarifa zako kwa utulivu.
              </p>
            </div>

            <div className="flex items-start gap-3 border-t border-primary/15 pt-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Taarifa zako zinalindwa</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-3">Ufikiaji wa akaunti unahitaji taarifa zako binafsi za kuingia.</p>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[620px] flex-col justify-center p-6 sm:p-9 lg:p-12">
            <div className="mb-7 md:hidden">
              <BrandLogo className="h-24 w-32" priority />
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold uppercase text-primary">{tab === "login" ? "Karibu tena" : "Anza kutumia RexaBook"}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                {tab === "login" ? "Ingia kwenye akaunti" : "Fungua akaunti mpya"}
              </h2>
              <p className="mt-1.5 text-sm text-ink-3">
                {tab === "login" ? "Weka taarifa zako ili kuendelea." : "Jaza taarifa za msingi za duka lako."}
              </p>
            </div>

            <div className="mb-7 grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => openTab("login")}
                className={cn(
                  "rounded-md py-2.5 text-sm font-medium transition",
                  tab === "login" ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"
                )}
              >
                Ingia
              </button>
              <button
                type="button"
                onClick={() => openTab("register")}
                className={cn(
                  "rounded-md py-2.5 text-sm font-medium transition",
                  tab === "register" ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"
                )}
              >
                Fungua Akaunti
              </button>
            </div>

            {tab === "login" ? (
              <form action={loginFormAction} className="space-y-5">
                <Input label="Jina la mtumiaji" name="jina" placeholder="mf. Juma Baraka" autoComplete="username" required />
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
                      onChange={(event) => setViewPassword(event.target.checked)}
                    />
                    Onyesha nenosiri
                  </label>
                  <button type="button" onClick={() => openTab("register")} className="text-sm font-medium text-primary hover:underline">
                    Fungua akaunti
                  </button>
                </div>

                {formError(loginState) ? (
                  <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                    {loginState.message}
                  </p>
                ) : null}

                <Button type="submit" size="lg" loading={loginPending} className="w-full" icon={<LockKeyhole />}>
                  Ingia
                </Button>
              </form>
            ) : (
              <form action={regFormAction} className="space-y-5">
                <Input label="Jina la mtumiaji" name="jina" placeholder="mf. Juma Baraka" autoComplete="username" required />
                <Input label="Jina la duka" name="jinaDuka" placeholder="mf. Duka la Juma" autoComplete="organization" required />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="Nenosiri (herufi 6 au zaidi)" name="nenosiri" type="password" placeholder="••••••••" autoComplete="new-password" required />
                  <Input label="Rudia nenosiri" name="nenosiri2" type="password" placeholder="••••••••" autoComplete="new-password" required />
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

            <p className="mt-7 flex items-center justify-center gap-1.5 text-center text-xs text-ink-3">
              <CheckCircle2 className="size-3.5 text-success" /> RexaBook · Knowledge without limits
            </p>
          </section>
        </div>

        <p className="mt-5 text-center text-xs text-ink-3">© {new Date().getFullYear()} RexaBook</p>
      </div>
    </main>
  );
}
