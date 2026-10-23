"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { ADMIN_LEVEL, MODULES, type ModuleKey } from "@/lib/access";
import { Icon } from "@/components/icons";
import { Badge, Button, Card, Empty, Field, inputBase, inputCls, Notice, PageHeader, Tabs } from "@/components/ui";

type Profile = { id: string; full_name: string; email: string; active: boolean; access_level_id: string | null };
type Level = { id: string; name: string; modules: string[] };
type Msg = { tone: "ok" | "error"; text: string } | null;

const EMPTY_USER = { full_name: "", email: "", password: "", access_level_id: "" };

export default function UsersPage() {
  const [tab, setTab] = useState<"usuarios" | "niveles">("usuarios");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [meId, setMeId] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_USER);

  const [levelName, setLevelName] = useState("");
  const [levelModules, setLevelModules] = useState<ModuleKey[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const [p, l, s] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, active, access_level_id").order("full_name"),
      supabase.from("access_levels").select("id, name, modules").order("name"),
      supabase.auth.getSession(),
    ]);
    setProfiles((p.data as Profile[]) ?? []);
    setLevels((l.data as Level[]) ?? []);
    setMeId(s.data.session?.user.id ?? "");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    load();
  }, [load]);

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) return;

    setSaving(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMsg({ tone: "error", text: json.error ?? "No se pudo crear el usuario." });
      return;
    }
    setMsg({
      tone: "ok",
      text: `Usuario ${form.email} creado. Compártele la contraseña temporal por un canal seguro.`,
    });
    setForm(EMPTY_USER);
    setOpen(false);
    load();
  }

  async function setLevel(p: Profile, levelId: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update({ access_level_id: levelId || null })
      .eq("id", p.id);
    setMsg(error ? { tone: "error", text: "No se pudo cambiar el nivel." } : { tone: "ok", text: `Nivel de ${p.full_name} actualizado.` });
    load();
  }

  async function toggleActive(p: Profile) {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("profiles").update({ active: !p.active }).eq("id", p.id);
    setMsg(error ? { tone: "error", text: "No se pudo actualizar la cuenta." } : { tone: "ok", text: `${p.full_name} ${p.active ? "desactivado" : "activado"}.` });
    load();
  }

  async function toggleModule(l: Level, key: ModuleKey) {
    if (l.name === ADMIN_LEVEL && key === "usuarios") return;
    const supabase = getSupabase();
    if (!supabase) return;
    const next = l.modules.includes(key) ? l.modules.filter((m) => m !== key) : [...l.modules, key];
    const { error } = await supabase.from("access_levels").update({ modules: next }).eq("id", l.id);
    if (error) setMsg({ tone: "error", text: "No se pudo guardar el acceso." });
    load();
  }

  async function addLevel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
      .from("access_levels")
      .insert({ name: levelName.trim(), modules: levelModules });
    if (error) {
      setMsg({ tone: "error", text: "No se pudo crear el nivel. Quizá el nombre ya existe." });
      return;
    }
    setMsg({ tone: "ok", text: `Nivel “${levelName.trim()}” creado.` });
    setLevelName("");
    setLevelModules([]);
    load();
  }

  async function removeLevel(l: Level) {
    if (!window.confirm(`¿Eliminar el nivel “${l.name}”?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("access_levels").delete().eq("id", l.id);
    setMsg(
      error
        ? { tone: "error", text: "No se puede eliminar: hay usuarios con este nivel." }
        : { tone: "ok", text: `Nivel “${l.name}” eliminado.` },
    );
    load();
  }

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Cuentas del sistema y niveles de acceso por módulo" />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "usuarios", label: "Usuarios" },
          { value: "niveles", label: "Niveles de acceso" },
        ]}
      />

      {msg && (
        <div className="mb-6">
          <Notice tone={msg.tone === "error" ? "error" : "ok"}>{msg.text}</Notice>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <Button onClick={() => setOpen((o) => !o)} disabled={levels.length === 0}>
              <Icon name={open ? "close" : "plus"} className="h-4 w-4" />
              {open ? "Cancelar" : "Nuevo usuario"}
            </Button>
          </div>

          {levels.length === 0 && (
            <Notice>Primero crea al menos un nivel de acceso en la pestaña “Niveles de acceso”.</Notice>
          )}

          {open && (
            <Card>
              <h2 className="mb-5 text-base font-semibold">Datos del nuevo usuario</h2>
              <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre completo">
                  <input
                    required
                    className={inputCls}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </Field>
                <Field label="Correo">
                  <input
                    type="email"
                    required
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Contraseña temporal (mín. 8)">
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputCls}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </Field>
                <Field label="Nivel de acceso">
                  <select
                    required
                    className={inputCls}
                    value={form.access_level_id}
                    onChange={(e) => setForm({ ...form, access_level_id: e.target.value })}
                  >
                    <option value="">Selecciona un nivel</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creando..." : "Crear usuario"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {profiles.length === 0 ? (
            <Card>
              <Empty>Aún no hay usuarios registrados.</Empty>
            </Card>
          ) : (
            <Card pad="none">
              <ul className="divide-y divide-zinc-800">
                {profiles.map((p) => {
                  const isMe = p.id === meId;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          {p.full_name}
                          {isMe && <Badge tone="warn">Tú</Badge>}
                        </p>
                        <p className="text-xs text-zinc-500">{p.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          aria-label={`Nivel de ${p.full_name}`}
                          value={p.access_level_id ?? ""}
                          disabled={isMe}
                          onChange={(e) => setLevel(p, e.target.value)}
                          className={`${inputBase} w-44 py-2`}
                        >
                          <option value="">Sin nivel</option>
                          {levels.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                        <Badge tone={p.active ? "ok" : "neutral"}>{p.active ? "Activo" : "Inactivo"}</Badge>
                        <Button variant="secondary" disabled={isMe} onClick={() => toggleActive(p)} className="py-2">
                          {p.active ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "niveles" && (
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-5 text-base font-semibold">Nuevo nivel de acceso</h2>
            <form onSubmit={addLevel} className="flex flex-col gap-4">
              <Field label="Nombre del nivel">
                <input
                  required
                  className={inputCls}
                  value={levelName}
                  onChange={(e) => setLevelName(e.target.value)}
                  placeholder="Ej. Asistente"
                />
              </Field>
              <ModuleChecks
                selected={levelModules}
                onToggle={(k) =>
                  setLevelModules((cur) => (cur.includes(k) ? cur.filter((m) => m !== k) : [...cur, k]))
                }
              />
              <div className="flex justify-end">
                <Button type="submit">Crear nivel</Button>
              </div>
            </form>
          </Card>

          {levels.map((l) => (
            <Card key={l.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{l.name}</h3>
                <Badge tone="neutral">
                  {l.modules.length} {l.modules.length === 1 ? "módulo" : "módulos"}
                </Badge>
              </div>
              <div className="mt-4">
                <ModuleChecks
                  selected={l.modules as ModuleKey[]}
                  lockedKey={l.name === ADMIN_LEVEL ? "usuarios" : undefined}
                  onToggle={(k) => toggleModule(l, k)}
                />
              </div>
              {l.name !== ADMIN_LEVEL && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" onClick={() => removeLevel(l)}>
                    Eliminar nivel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ModuleChecks({
  selected,
  onToggle,
  lockedKey,
}: {
  selected: ModuleKey[];
  onToggle: (k: ModuleKey) => void;
  lockedKey?: ModuleKey;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Acceso a módulos</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MODULES.map((m) => {
          const checked = selected.includes(m.key);
          const locked = lockedKey === m.key;
          return (
            <label
              key={m.key}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                checked
                  ? "border-[#c9a24e]/50 bg-[#c9a24e]/10 text-zinc-100"
                  : "border-zinc-800 text-zinc-400"
              } ${locked ? "opacity-60" : "cursor-pointer hover:border-zinc-600"}`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#c9a24e]"
                checked={checked}
                disabled={locked}
                onChange={() => onToggle(m.key)}
              />
              {m.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
