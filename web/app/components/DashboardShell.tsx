"use client";

import { MVBE_TITLE, SOREINE_TITLE } from "@/lib/form-copy";
import { SITE_TITLE } from "@/lib/site-brand";
import { SidebarBrandMark } from "@/app/components/SidebarBrandMark";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Home,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const ACCENT = {
  teal: {
    box: "from-teal-500/40 to-emerald-800/35",
    icon: "text-teal-50",
  },
  rose: {
    box: "from-rose-500/40 to-amber-900/30",
    icon: "text-rose-50",
  },
  violet: {
    box: "from-violet-500/45 to-fuchsia-900/35",
    icon: "text-violet-50",
  },
  sky: {
    box: "from-sky-500/40 to-blue-900/35",
    icon: "text-sky-50",
  },
  emerald: {
    box: "from-emerald-500/40 to-teal-900/35",
    icon: "text-emerald-50",
  },
  gold: {
    box: "from-amber-500/50 to-yellow-700/35",
    icon: "text-amber-50",
  },
  orange: {
    box: "from-orange-500/45 to-amber-900/40",
    icon: "text-orange-50",
  },
} as const;

type AccentKey = keyof typeof ACCENT;

type NavDef = {
  href: string;
  label: string;
  Icon: LucideIcon;
  accent: AccentKey;
};

const navMain: NavDef[] = [
  { href: "/", label: "サイトトップ", Icon: Home, accent: "teal" },
  { href: "/forms/soreine", label: SOREINE_TITLE, Icon: Target, accent: "rose" },
  { href: "/forms/mvbe", label: MVBE_TITLE, Icon: Sparkles, accent: "violet" },
];

const navSelf: NavDef[] = [
  { href: "/my-answers", label: "マイ回答・履歴", Icon: ClipboardList, accent: "sky" },
  { href: "/status", label: "回答状況", Icon: Activity, accent: "emerald" },
];

const navShared: NavDef[] = [
  { href: "/ranking", label: "月間ランキング", Icon: Trophy, accent: "gold" },
];

function navActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavIconBox({
  Icon,
  accent,
  active,
}: {
  Icon: LucideIcon;
  accent: AccentKey;
  active: boolean;
}) {
  const a = ACCENT[accent];
  return (
    <span
      className={[
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
        a.box,
        active
          ? "ring-2 ring-white/35 shadow-md"
          : "ring-1 ring-white/10 opacity-90",
      ].join(" ")}
      aria-hidden
    >
      <Icon
        className={[
          "h-4 w-4",
          a.icon,
          active ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" : "",
        ].join(" ")}
        strokeWidth={2.25}
        absoluteStrokeWidth
      />
    </span>
  );
}

type Props = {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    isAdmin: boolean;
  };
};

export function DashboardShell({ children, user }: Props) {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const active = navActive(pathname, href);
    return [
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
      active
        ? "bg-slate-700 font-medium text-white"
        : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
    ].join(" ");
  };

  const homeActive = navActive(pathname, "/");
  const brandRowClass = [
    "group relative flex min-h-14 shrink-0 items-center gap-2 border-b border-slate-800/90 border-l-[3px] border-l-teal-500 py-1.5 pl-[5px] pr-3 text-left transition-colors md:min-h-16 md:pr-4",
    homeActive
      ? "bg-slate-700"
      : "bg-slate-900 hover:bg-slate-800/80",
  ].join(" ");

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 md:h-screen md:max-h-screen md:flex-row md:overflow-hidden">
      <aside className="shrink-0 border-b border-slate-800 bg-slate-900 text-slate-100 md:max-h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <Link href="/" className={brandRowClass}>
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-teal-500/25 via-slate-600/40 to-slate-800/80"
            aria-hidden
          />
          <SidebarBrandMark />
          <div className="min-w-0 flex-1 py-0.5">
            <span
              className={[
                "block break-words text-pretty text-sm font-extrabold leading-snug tracking-tight antialiased md:text-[1.08rem] md:leading-snug",
                homeActive
                  ? "text-white"
                  : "text-slate-100 group-hover:text-white",
              ].join(" ")}
            >
              {SITE_TITLE}
            </span>
          </div>
        </Link>
        <nav className="space-y-6 p-3">
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              メイン
            </p>
            <ul className="space-y-0.5">
              {navMain.map((item) => {
                const active = navActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass(item.href)}>
                      <NavIconBox Icon={item.Icon} accent={item.accent} active={active} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              自分の記録
            </p>
            <ul className="space-y-0.5">
              {navSelf.map((item) => {
                const active = navActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass(item.href)}>
                      <NavIconBox Icon={item.Icon} accent={item.accent} active={active} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              共有
            </p>
            <ul className="space-y-0.5">
              {navShared.map((item) => {
                const active = navActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass(item.href)}>
                      <NavIconBox Icon={item.Icon} accent={item.accent} active={active} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          {user.isAdmin && (
            <div>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-amber-500/90">
                管理
              </p>
              <ul className="space-y-0.5">
                <li>
                  <Link href="/admin" className={linkClass("/admin")}>
                    <NavIconBox
                      Icon={BarChart3}
                      accent="orange"
                      active={navActive(pathname, "/admin")}
                    />
                    集計
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 text-slate-800 md:h-16">
          <div className="flex items-center gap-3">
            <span
              className="max-w-[min(12rem,40vw)] truncate text-xs text-slate-700 sm:max-w-[220px] sm:text-sm"
              title={user.name ?? user.email ?? undefined}
            >
              {user.name ?? user.email}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              ログアウト
            </button>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
