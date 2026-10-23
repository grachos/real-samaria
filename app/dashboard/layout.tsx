"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

const LINKS = [
  { href: "/dashboard/jugadoras", label: "Jugadoras" },
  { href: "/dashboard/pagos", label: "Pagos" },
  { href: "/dashboard/finanzas", label: "Finanzas" },
  { href: "/dashboard/torneos", label: "Torneos" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/login");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
  }, [router]);

  async function logout() {
    await getSupabase()?.auth.signOut();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Cargando...
      </main>
    );
  }

  const linkClass = (href: string) =>
    pathname.startsWith(href) ? "text-[#c9a24e] font-semibold" : "text-zinc-300 hover:text-[#c9a24e]";

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#c9a24e]/40 bg-black/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <span className="font-semibold text-[#c9a24e]">Real Samaria CP</span>
        <div className="flex items-center gap-6">
          {/* Menú de escritorio: en móvil la navegación va abajo */}
          <nav className="hidden gap-5 text-sm md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="text-sm text-zinc-400 hover:text-white">
            Salir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 pb-28 md:pb-6">{children}</div>

      {/* Menú móvil fijo abajo, respetando la barra segura de iPhone */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#c9a24e]/40 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex min-h-14 flex-1 items-center justify-center py-3 text-center text-sm ${linkClass(l.href)}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
