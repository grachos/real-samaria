"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button, Field, inputCls, Notice } from "@/components/ui";
import InstallButton from "@/components/install-button";

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
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError("No fue posible iniciar sesión. Revisa tu correo y contraseña.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo-real-samaria.jpeg"
            alt="Real Samaria CP 2026"
            width={96}
            height={96}
            priority
            className="splash-logo rounded-full"
          />
          <div className="splash-in">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Real Samaria CP</h1>
            <p className="text-sm text-zinc-400">Panel del club</p>
          </div>
        </div>

        <div className="splash-in rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Correo">
              <input
                type="email"
                required
                autoComplete="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                required
                autoComplete="current-password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>
        <div className="splash-in mt-5 flex justify-center">
          <InstallButton popover="up" className="rounded-xl px-3 py-2 text-zinc-400 hover:text-[#c9a24e]" />
        </div>
      </div>
    </main>
  );
}
