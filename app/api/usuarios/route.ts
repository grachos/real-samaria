import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type Body = {
  full_name?: string;
  email?: string;
  password?: string;
  access_level_id?: string;
};

const UUID = /^[0-9a-f-]{36}$/i;

// Crea una cuenta nueva. Solo puede hacerlo quien tenga el módulo "usuarios".
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    return NextResponse.json({ error: "Falta configurar Supabase." }, { status: 500 });
  }
  if (!service) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel → Environment Variables)." },
      { status: 500 },
    );
  }

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Verifica quién llama usando su propio token, no el de servicio.
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: who, error: whoErr } = await caller.auth.getUser(token);
  if (whoErr || !who.user) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const { data: canManage } = await caller.rpc("has_module", { m: "usuarios" });
  if (canManage !== true) {
    return NextResponse.json({ error: "Solo el administrador puede crear usuarios." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const fullName = body?.full_name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const levelId = body?.access_level_id ?? "";

  if (!fullName || !email.includes("@")) {
    return NextResponse.json({ error: "Nombre y correo válidos son obligatorios." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  if (!UUID.test(levelId)) {
    return NextResponse.json({ error: "Selecciona un nivel de acceso." }, { status: 400 });
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "No se pudo crear el usuario." },
      { status: 400 },
    );
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    email,
    access_level_id: levelId,
    active: true,
  });
  if (profileErr) {
    // Evita dejar una cuenta sin perfil.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "No se pudo crear el perfil. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
