"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Icon, type IconName } from "@/components/icons";

const NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/dashboard/jugadoras", label: "Jugadoras", short: "Jugadoras", icon: "users" },
  { href: "/dashboard/pagos", label: "Pagos", short: "Pagos", icon: "card" },
  { href: "/dashboard/finanzas", label: "Finanzas", short: "Finanzas", icon: "chart" },
  { href: "/dashboard/torneos", label: "Torneos", short: "Torneos", icon: "trophy" },
  { href: "/dashboard/configuracion", label: "Configuración", short: "Ajustes", icon: "sliders" },
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
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Cargando...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Escritorio: barra lateral con íconos */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-800 bg-black md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <Image src="/logo-real-samaria.jpeg" alt="" width={40} height={40} className="rounded-full" />
          <div>
            <p className="text-sm font-semibold text-[#c9a24e]">Real Samaria</p>
            <p className="text-xs text-zinc-500">CP 2026</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#c9a24e]/10 text-[#c9a24e]"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <Icon name="logout" />
          Salir
        </button>
      </aside>

      {/* Móvil: encabezado mínimo */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-black/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-real-samaria.jpeg" alt="" width={32} height={32} className="rounded-full" />
          <span className="text-sm font-semibold text-[#c9a24e]">Real Samaria</span>
        </div>
        <button
          onClick={logout}
          aria-label="Salir"
          className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100"
        >
          <Icon name="logout" />
        </button>
      </header>

      <main className="px-4 py-6 pb-28 md:ml-64 md:px-10 md:py-10 md:pb-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Móvil: menú inferior con íconos */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-800 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-[#c9a24e]" : "text-zinc-500"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
