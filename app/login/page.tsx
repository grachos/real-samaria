"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const supabase = getSupabase();
    if (!supabase) {
      setError("Falta configurar Supabase (variables de entorno).");
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (authError) {
      setError("No fue posible iniciar sesión. Revisa tu correo y contraseña.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#c9a24e]/40 bg-zinc-950 p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/logo-real-samaria.jpeg"
            alt="Real Samaria CP 2026"
            width={120}
            height={120}
            priority
            className="rounded-full"
          />
          <h1 className="text-xl font-semibold tracking-wide text-[#c9a24e]">
            Real Samaria
          </h1>
          <p className="text-sm text-zinc-400">Acceso al panel del club</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Correo
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-[#c9a24e]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-[#c9a24e]"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-[#c9a24e] py-2 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
