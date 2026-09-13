"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  BookOpenText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/components/theme/theme-provider";

interface AppUser {
  jina: string;
  jinaDuka: string;
}

const nav = [
  { href: "/dashboard", label: "Dashibodi", icon: LayoutDashboard },
  { href: "/customers", label: "Wadaiwa", icon: Users },
  { href: "/cargo", label: "Mizigo", icon: Package },
  { href: "/settings", label: "Mipangilio", icon: Settings },
];

function initialsOf(jina: string): string {
  return jina
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
              active ? "nav-active text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            )}
          >
            <span
              className={cn(
                "grid size-9 place-items-center rounded-lg transition",
                active ? "bg-primary/15 text-primary" : "bg-surface-2 text-ink-3 group-hover:text-primary"
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutBtn({
  onLogout,
  theme,
  onToggleTheme,
}: {
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-center">
        <button
          type="button"
          onClick={onToggleTheme}
          className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-primary"
          aria-label={theme === "dark" ? "Badilisha kuwa mwangaza" : "Badilisha kuwa giza"}
          title={theme === "dark" ? "Mwangaza" : "Giza"}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-2 transition hover:bg-danger/10 hover:text-danger"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-danger/10 text-danger">
          <LogOut className="size-[18px]" />
        </span>
        Toka
      </button>
    </>
  );
}

function SidebarBody({
  user,
  pathname,
  onNavigate,
  onLogout,
  theme,
  onToggleTheme,
}: {
  user: AppUser;
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-7">
        <div className="grid size-11 place-items-center rounded-xl glass-nav text-primary">
          <BookOpenText className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-medium leading-tight text-ink">RexaBook</p>
          <p className="truncate text-xs text-ink-3">{user.jinaDuka}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <div className="mb-2 px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Menyu Kuu
        </div>
        <NavLinks pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-line px-3 py-4">
        <div className="mb-3 flex items-center gap-3 px-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full neu-inset text-sm font-bold text-primary">
            {initialsOf(user.jina)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.jina}</p>
          </div>
        </div>
        <LogoutBtn onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  function go(href: string) {
    setMobileOpen(false);
    if (href === "/logout") {
      router.push("/logout");
    } else {
      router.push(href);
    }
  }

  const currentLabel = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ?? "RexaBook";

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface/70 backdrop-blur-xl lg:block">
        <SidebarBody
          user={user}
          pathname={pathname}
          onNavigate={() => {}}
          onLogout={() => go("/logout")}
          theme={theme}
          onToggleTheme={toggle}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-2xl anim-slide-in">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2"
              aria-label="Funga menyu"
            >
              <X className="size-4" />
            </button>
            <SidebarBody
              user={user}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onLogout={() => go("/logout")}
              theme={theme}
              onToggleTheme={toggle}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Mobile topbar */}
        <header className="glass-nav sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-lg text-ink-2 transition hover:bg-surface-2"
            aria-label="Fungua menyu"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-medium text-ink">{currentLabel}</span>
          <span className="grid size-9 place-items-center rounded-full neu-inset text-sm font-bold text-primary">
            {initialsOf(user.jina)}
          </span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}