"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useClubData } from "@/lib/club-data";
import { Icon } from "@/components/icons";
import { Button, Card, Empty, Field, inputCls, PageHeader } from "@/components/ui";

type Tournament = { id: string; name: string; starts_on: string | null };
type GoalRow = { tournament_id: string; player_id: string; goals: number };

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn =
    "flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 active:scale-95";
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Restar gol" className={btn} onClick={() => onChange(Math.max(0, value - 1))}>
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-lg font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="Sumar gol" className={btn} onClick={() => onChange(value + 1)}>
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TournamentsPage() {
  const { players } = useClubData();
  const active = players.filter((p) => p.active);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const [t, g] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, name, starts_on")
        .order("starts_on", { ascending: false, nullsFirst: false }),
      supabase.from("tournament_goals").select("tournament_id, player_id, goals"),
    ]);
    setTournaments((t.data as Tournament[]) ?? []);
    setGoals((g.data as GoalRow[]) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    load();
  }, [load]);

  // Al elegir torneo, cargar sus goles en el borrador.
  useEffect(() => {
    const d: Record<string, string> = {};
    goals.filter((g) => g.tournament_id === selected).forEach((g) => (d[g.player_id] = String(g.goals)));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el borrador con los goles guardados
    setDraft(d);
  }, [selected, goals]);

  const ranking = useMemo(() => {
    const m = new Map<string, number>();
    goals.forEach((g) => m.set(g.player_id, (m.get(g.player_id) ?? 0) + g.goals));
    return players
      .map((p) => ({ name: p.full_name, goals: m.get(p.id) ?? 0 }))
      .filter((x) => x.goals > 0)
      .sort((a, b) => b.goals - a.goals);
  }, [goals, players]);

  const selectedName = tournaments.find((t) => t.id === selected)?.name ?? "";
  const selectedTotal = active.reduce((s, p) => s + Number(draft[p.id] ?? 0), 0);

  async function createTournament(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("tournaments").insert({ name: newName.trim(), starts_on: newDate || null });
    setNewName("");
    setNewDate("");
    load();
  }

  async function saveGoals() {
    const supabase = getSupabase();
    if (!supabase || !selected) return;
    setSaving(true);
    const rows = active.map((p) => ({
      tournament_id: selected,
      player_id: p.id,
      goals: Number(draft[p.id] ?? 0),
    }));
    const { error } = await supabase
      .from("tournament_goals")
      .upsert(rows, { onConflict: "tournament_id,player_id" });
    setSaving(false);
    setMsg(error ? "No se pudieron guardar los goles." : "Goles guardados.");
    load();
  }

  return (
    <>
      <PageHeader title="Torneos" subtitle="Goles por jugadora en cada torneo" />

      <div className="grid gap-6 md:grid-cols-5">
        <div className="flex flex-col gap-6 md:col-span-2">
          <Card>
            <h2 className="mb-4 text-base font-semibold">Torneos</h2>
            {tournaments.length === 0 ? (
              <Empty>Aún no hay torneos.</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {tournaments.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(t.id);
                        setMsg(null);
                      }}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                        selected === t.id
                          ? "border-[#c9a24e] bg-[#c9a24e]/10 text-[#c9a24e]"
                          : "border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <span className="font-medium">{t.name}</span>
                      {t.starts_on && <span className="block text-xs text-zinc-500">{t.starts_on}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold">Nuevo torneo</h2>
            <form onSubmit={createTournament} className="flex flex-col gap-4">
              <Field label="Nombre">
                <input
                  required
                  className={inputCls}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </Field>
              <Field label="Fecha de inicio (opcional)">
                <input type="date" className={inputCls} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </Field>
              <Button type="submit">Crear torneo</Button>
            </form>
          </Card>
        </div>

        <div className="flex flex-col gap-6 md:col-span-3">
          <Card>
            {!selected ? (
              <Empty>Selecciona un torneo para cargar sus goles.</Empty>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selectedName}</p>
                    <p className="text-xs text-zinc-500">Total del torneo: {selectedTotal} goles</p>
                  </div>
                  <Button onClick={saveGoals} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar goles"}
                  </Button>
                </div>
                <ul className="divide-y divide-zinc-800">
                  {active.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.full_name}</p>
                        <p className="text-xs text-zinc-500">N° {p.shirt_number ?? "—"}</p>
                      </div>
                      <Stepper
                        value={Number(draft[p.id] ?? 0)}
                        onChange={(n) => setDraft({ ...draft, [p.id]: String(n) })}
                      />
                    </li>
                  ))}
                </ul>
                {msg && <p className="mt-4 text-sm text-zinc-300">{msg}</p>}
              </>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold">Goleadoras (todos los torneos)</h2>
            {ranking.length === 0 ? (
              <Empty>Aún no hay goles registrados.</Empty>
            ) : (
              <ol className="flex flex-col">
                {ranking.map((x, i) => (
                  <li
                    key={x.name}
                    className="flex items-center justify-between border-b border-zinc-800 py-2.5 last:border-0"
                  >
                    <span className="text-sm">
                      <span className="mr-3 inline-block w-5 text-zinc-500">{i + 1}</span>
                      {x.name}
                    </span>
                    <span className="font-semibold text-[#c9a24e]">{x.goals}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
