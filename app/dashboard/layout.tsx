"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { ModuleKey } from "@/lib/access";
import { Icon, type IconName } from "@/components/icons";
import { Button, Card } from "@/components/ui";
import InstallButton from "@/components/install-button";

const NAV: { href: string; label: string; short: string; icon: IconName; module: ModuleKey }[] = [
  { href: "/dashboard/indicadores", label: "Indicadores", short: "Indicadores", icon: "gauge", module: "indicadores" },
  { href: "/dashboard/jugadoras", label: "Jugadoras", short: "Jugadoras", icon: "users", module: "jugadoras" },
  { href: "/dashboard/pagos", label: "Pagos", short: "Pagos", icon: "card", module: "pagos" },
  { href: "/dashboard/finanzas", label: "Finanzas", short: "Finanzas", icon: "chart", module: "finanzas" },
  { href: "/dashboard/torneos", label: "Torneos", short: "Torneos", icon: "trophy", module: "torneos" },
  { href: "/dashboard/usuarios", label: "Usuarios", short: "Usuarios", icon: "shield", module: "usuarios" },
  { href: "/dashboard/configuracion", label: "Configuración", short: "Ajustes", icon: "sliders", module: "configuracion" },
];

type Status = "loading" | "ready" | "no-profile" | "inactive";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>("loading");
  const [modules, setModules] = useState<string[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/login");
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, active, access_level:access_levels(modules)")
        .eq("id", userId)
        .maybeSingle();
      if (!profile) {
        setStatus("no-profile");
        return;
      }
      if (!profile.active) {
        setStatus("inactive");
        return;
      }
      const level = Array.isArray(profile.access_level) ? profile.access_level[0] : profile.access_level;
      setModules(level?.modules ?? []);
      setUserName(profile.full_name);
      setStatus("ready");
    });
  }, [router]);

  async function logout() {
    await getSupabase()?.auth.signOut();
    router.replace("/login");
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Cargando...
      </main>
    );
  }

  if (status !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold text-zinc-100">
            {status === "inactive" ? "Cuenta desactivada" : "Sin acceso"}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {status === "inactive"
              ? "Pide al administrador que reactive tu cuenta."
              : "Tu cuenta aún no tiene un nivel de acceso. Pide al administrador que te asigne uno."}
          </p>
          <Button variant="secondary" className="mt-6" onClick={logout}>
            Salir
          </Button>
        </div>
      </main>
    );
  }

  const allowed = NAV.filter((item) => modules.includes(item.module));
  const current = NAV.find((item) => pathname.startsWith(item.href));
  const blocked = current !== undefined && !modules.includes(current.module);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100 md:block md:h-auto md:min-h-screen md:overflow-visible">
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
          {allowed.map((item) => {
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
        <div className="m-3 border-t border-zinc-800 pt-3">
          <p className="truncate px-3 pb-2 text-xs text-zinc-500">{userName}</p>
          <InstallButton
            popover="up"
            className="mb-1 w-full rounded-xl px-3 py-2.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          />
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <Icon name="logout" />
            Salir
          </button>
        </div>
      </aside>

      {/* Móvil: encabezado mínimo */}
      <header className="z-30 flex shrink-0 items-center justify-between border-b border-zinc-800 bg-black/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-real-samaria.jpeg" alt="" width={32} height={32} className="rounded-full" />
          <span className="text-sm font-semibold text-[#c9a24e]">Real Samaria</span>
        </div>
        <div className="flex items-center gap-1">
          <InstallButton label={false} className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100" />
          <button onClick={logout} aria-label="Salir" className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:ml-64 md:flex-none md:overflow-visible md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">
          {blocked ? (
            <Card className="text-center">
              <p className="font-semibold">No tienes acceso a este módulo</p>
              <p className="mt-1 text-sm text-zinc-400">
                Pide al administrador que habilite “{current?.label}” en tu nivel de acceso.
              </p>
              {allowed.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {allowed.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Móvil: menú inferior con íconos, desplazable si hay muchos módulos */}
      <nav className="z-30 flex shrink-0 overflow-x-auto border-t border-zinc-800 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {allowed.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[60px] flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium ${
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
