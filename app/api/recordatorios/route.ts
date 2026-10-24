import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendOverdueReminders } from "@/lib/whatsapp";

export const maxDuration = 60;

// Envío manual de avisos de atraso. Requiere el módulo "pagos".
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: "Falta configurar Supabase." }, { status: 500 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const caller = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: who, error: whoErr } = await caller.auth.getUser(token);
  if (whoErr || !who.user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const { data: allowed } = await caller.rpc("has_module", { m: "pagos" });
  if (allowed !== true) return NextResponse.json({ error: "No tienes acceso a Pagos." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { player_ids?: string[] } | null;
  const ids = Array.isArray(body?.player_ids) ? body.player_ids.filter((x) => typeof x === "string") : undefined;

  try {
    const result = await sendOverdueReminders({ source: "manual", playerIds: ids });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al enviar." }, { status: 500 });
  }
}
