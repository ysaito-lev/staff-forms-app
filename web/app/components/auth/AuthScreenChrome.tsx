import { SITE_TITLE } from "@/lib/site-brand";

export function AuthScreenChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {SITE_TITLE}
      </footer>
    </div>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md sm:p-9">
      {children}
    </div>
  );
}

export function AuthBrandTitle() {
  return (
    <p className="text-center text-[1.375rem] font-bold leading-snug tracking-tight text-orange-600 md:text-[1.5625rem]">
      {SITE_TITLE}
    </p>
  );
}
