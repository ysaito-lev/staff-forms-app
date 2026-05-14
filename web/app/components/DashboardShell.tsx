"use client";

import { MVBE_TITLE, SOREINE_TITLE } from "@/lib/form-copy";
import { SITE_TITLE } from "@/lib/site-brand";
import { STRENGTHS_REPORT_UI } from "@/lib/strengths-report-ui";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Home,
  LineChart,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

/** ダークサイドバー上で識別しやすいよう、暖色でひと揃えしつつ階調を分ける */
const ACCENT = {
  home: {
    box: "from-orange-400 via-orange-500 to-amber-600",
    icon: "text-white",
  },
  soreine: {
    box: "from-rose-400 via-orange-500 to-orange-700",
    icon: "text-white",
  },
  mvbe: {
    box: "from-amber-400 via-orange-500 to-amber-700",
    icon: "text-white",
  },
  myAnswers: {
    box: "from-orange-300 via-amber-500 to-orange-600",
    icon: "text-white",
  },
  strengths: {
    box: "from-orange-500 via-orange-600 to-red-900",
    icon: "text-white",
  },
  status: {
    box: "from-amber-500 via-orange-500 to-orange-700",
    icon: "text-white",
  },
  ranking: {
    box: "from-yellow-400 via-amber-500 to-orange-600",
    icon: "text-orange-950/95",
  },
  admin: {
    box: "from-amber-900/95 via-orange-950 to-stone-950",
    icon: "text-amber-100",
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
  { href: "/", label: "サイトトップ", Icon: Home, accent: "home" },
  { href: "/forms/soreine", label: SOREINE_TITLE, Icon: Target, accent: "soreine" },
  { href: "/forms/mvbe", label: MVBE_TITLE, Icon: Sparkles, accent: "mvbe" },
];

const navSelf: NavDef[] = [
  { href: "/my-answers", label: "マイ回答・履歴", Icon: ClipboardList, accent: "myAnswers" },
  { href: "/strengths-report", label: "強みレポート", Icon: LineChart, accent: "strengths" },
  { href: "/status", label: "回答状況", Icon: Activity, accent: "status" },
];

const navShared: NavDef[] = [
  { href: "/ranking", label: "月間ランキング", Icon: Trophy, accent: "ranking" },
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
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br md:h-[2.125rem] md:w-[2.125rem]",
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
          "h-4 w-4 md:h-[1.0625rem] md:w-[1.0625rem]",
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
      "flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2 py-2 text-[14px] leading-snug transition md:gap-2.5 md:px-2 md:py-2 md:text-[15px]",
      active
        ? "bg-slate-700 font-medium text-white"
        : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
    ].join(" ");
  };

  const homeActive = navActive(pathname, "/");
  const brandRowClass = [
    "group relative flex min-h-0 shrink-0 items-center justify-center border-b border-slate-800/90 px-2.5 py-3.5 text-center transition-colors md:py-[1.15rem]",
    homeActive
      ? "bg-slate-700"
      : "bg-slate-900 hover:bg-slate-800/80",
  ].join(" ");

  return (
    <div
      className="fixed inset-0 z-0 flex min-h-0 flex-col overflow-hidden md:flex-row"
      style={{ backgroundColor: STRENGTHS_REPORT_UI.pageBg }}
    >
      <aside className="shrink-0 overflow-y-auto overflow-x-hidden border-b border-slate-800 bg-slate-900 text-slate-100 md:flex md:h-full md:w-[17rem] md:min-h-0 md:flex-col md:overflow-hidden md:border-b-0 md:border-r">
        <Link href="/" className={brandRowClass}>
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-orange-500/25 via-slate-600/40 to-slate-800/80"
            aria-hidden
          />
          <span
            className={[
              "relative z-[1] block w-full min-w-0 whitespace-nowrap text-[1.125rem] font-extrabold leading-tight tracking-tight antialiased md:text-[1.3rem]",
              homeActive
                ? "text-white"
                : "text-slate-100 group-hover:text-white",
            ].join(" ")}
            title={SITE_TITLE}
          >
            {SITE_TITLE}
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-4 px-2.5 py-4 md:min-h-0 md:gap-4 md:py-3">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              メイン
            </p>
            <ul className="flex flex-col gap-0.5">
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
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              自分の記録
            </p>
            <ul className="flex flex-col gap-0.5">
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
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              共有
            </p>
            <ul className="flex flex-col gap-0.5">
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
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-500/90">
                管理
              </p>
              <ul className="flex flex-col gap-0.5">
                <li>
                  <Link href="/admin" className={linkClass("/admin")}>
                    <NavIconBox
                      Icon={BarChart3}
                      accent="admin"
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
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-orange-100/60 bg-white/95 px-4 text-slate-800 backdrop-blur-sm md:h-16">
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

        <main
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain"
          style={{ backgroundColor: STRENGTHS_REPORT_UI.pageBg }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
