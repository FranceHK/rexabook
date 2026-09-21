"use client";

import { useEffect, useState } from "react";
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
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/components/theme/theme-provider";
import { BrandLogo } from "@/components/brand-logo";

interface AppUser {
  jina: string;
  jinaDuka: string;
  isAdmin?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  adminOnly?: boolean;
}

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashibodi", icon: LayoutDashboard, accent: "text-primary" },
  { href: "/customers", label: "Wadaiwa", icon: Users, accent: "text-info" },
  { href: "/cargo", label: "Mizigo", icon: Package, accent: "text-success" },
  { href: "/settings", label: "Mipangilio", icon: Settings, accent: "text-warning" },
  { href: "/admin/sms", label: "Admin SMS", icon: ShieldCheck, accent: "text-danger", adminOnly: true },
];

// Bottom nav on phones/tablets: keep it to the 3 main screens.
const mobileNav = nav.filter((n) => n.href !== "/settings" && !n.adminOnly);

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
  collapsed = false,
  isAdmin = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  isAdmin?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {nav.filter((item) => !item.adminOnly || isAdmin).map(({ href, label, icon: Icon, accent }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            prefetch
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              collapsed && "justify-center px-2",
              active
                ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            )}
          >
            {active && <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-primary" aria-hidden />}
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg transition-all duration-200",
                active ? `bg-white shadow-sm ${accent}` : "bg-surface-2 text-ink-3 group-hover:text-primary"
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            {!collapsed && label}
            {active && (
              <span className={cn("absolute right-2 size-1.5 rounded-full bg-primary opacity-70", collapsed && "hidden")} aria-hidden />
            )}
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
  collapsed = false,
}: {
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  collapsed?: boolean;
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={onToggleTheme}
          className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-3 shadow-sm transition hover:border-primary/30 hover:text-primary"
          aria-label={theme === "dark" ? "Badilisha kuwa mwangaza" : "Badilisha kuwa giza"}
          title={theme === "dark" ? "Mwangaza" : "Giza"}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? "Toka" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 transition hover:bg-danger/10 hover:text-danger",
          collapsed && "justify-center px-2"
        )}
      >
        <span className="grid size-9 place-items-center rounded-lg bg-danger/10 text-danger ring-1 ring-danger/10">
          <LogOut className="size-[18px]" />
        </span>
        {!collapsed && "Toka"}
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
  collapsed = false,
}: {
  user: AppUser;
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  collapsed?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("border-b border-line/70 px-5 pb-5 pt-6", collapsed && "px-3") }>
        <div className={cn("mb-4 flex items-center gap-3", collapsed && "justify-center") }>
          <BrandLogo className={cn("size-12", collapsed && "size-11")} markOnly priority />
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate text-lg font-medium leading-tight text-ink">RexaBook</p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-3">
              <Store className="size-3" /> {user.jinaDuka}
            </p>
          </div>
        </div>
        <div className={cn("rounded-lg border border-line bg-surface-2 px-3 py-2", collapsed && "hidden")}>
          <p className="truncate text-xs font-medium text-ink-2">Akaunti ya duka</p>
          <p className="truncate text-sm font-semibold text-ink">{user.jinaDuka}</p>
        </div>
      </div>

      <div className={cn("flex-1 overflow-y-auto px-3 pt-4", collapsed && "px-2")}>
        <div className={cn("mb-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3", collapsed && "sr-only")}>
          Menyu Kuu
        </div>
        <NavLinks pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} isAdmin={user.isAdmin} />
      </div>

      <div className="border-t border-line px-3 py-4">
        <div className={cn("mb-3 flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5", collapsed && "justify-center px-2")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold text-primary shadow-sm ring-1 ring-line">
            {initialsOf(user.jina)}
          </span>
          <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
            <p className="truncate text-sm font-medium text-ink">{user.jina}</p>
            <p className="truncate text-xs text-ink-3">{user.isAdmin ? "Admin" : "Mtumiaji"}</p>
          </div>
        </div>
        <LogoutBtn onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} collapsed={collapsed} />
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem("rexabook-sidebar") === "collapsed");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("rexabook-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  function go(href: string) {
    setMobileOpen(false);
    if (href === "/logout") {
      router.push("/logout");
    } else {
      router.push(href);
    }
  }

  const currentLabel = nav.find((n) => (!n.adminOnly || user.isAdmin) && (pathname === n.href || pathname.startsWith(n.href + "/")))?.label ?? "RexaBook";

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface/92 shadow-[8px_0_30px_rgba(17,24,39,0.04)] backdrop-blur-xl transition-[width] duration-300 lg:block",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-4 top-7 z-10 grid size-8 place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-md transition hover:border-primary/30 hover:text-primary"
          aria-label={sidebarCollapsed ? "Panua menyu" : "Kunja menyu"}
          title={sidebarCollapsed ? "Panua menyu" : "Kunja menyu"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
        <SidebarBody
          user={user}
          pathname={pathname}
          onNavigate={() => {}}
          onLogout={() => go("/logout")}
          theme={theme}
          onToggleTheme={toggle}
          collapsed={sidebarCollapsed}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="anim-fade absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="anim-slide-in absolute inset-y-0 left-0 w-72 bg-surface shadow-2xl">
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

      <div className={cn("transition-[padding] duration-300", sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")}>
        {/* Mobile topbar */}
        <header className="glass-nav sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-2 shadow-sm transition active:scale-95 hover:bg-surface-2"
            aria-label="Fungua menyu"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-medium text-ink">{currentLabel}</span>
          <span className="grid size-9 place-items-center rounded-lg bg-surface text-sm font-bold text-primary shadow-sm ring-1 ring-line">
            {initialsOf(user.jina)}
          </span>
        </header>

        <main
          key={pathname}
          className="anim-page mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(17,24,39,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch px-2">
          {mobileNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative my-1 flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition active:scale-95",
                  active ? "bg-primary/10 text-primary" : "text-ink-3 hover:bg-surface-2 hover:text-ink-2"
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
