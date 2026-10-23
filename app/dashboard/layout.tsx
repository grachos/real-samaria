"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="flex items-center justify-between border-b border-[#c9a24e]/40 px-4 py-3">
        <nav className="flex gap-4 text-sm">
          <span className="font-semibold text-[#c9a24e]">Real Samaria</span>
          <Link href="/dashboard/jugadoras" className="hover:text-[#c9a24e]">
            Jugadoras
          </Link>
        </nav>
        <button onClick={logout} className="text-sm text-zinc-400 hover:text-white">
          Salir
        </button>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
