"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useClubData } from "@/lib/club-data";

type Tournament = { id: string; name: string; starts_on: string | null };
type GoalRow = { tournament_id: string; player_id: string; goals: number };

const input =
  "rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-[#c9a24e]";

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

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const [t, g] = await Promise.all([
      supabase.from("tournaments").select("id, name, starts_on").order("starts_on", { ascending: false, nullsFirst: false }),
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza borrador con goles guardados
    setDraft(d);
  }, [selected, goals]);

  const totalsByPlayer = useMemo(() => {
    const m = new Map<string, number>();
    goals.forEach((g) => m.set(g.player_id, (m.get(g.player_id) ?? 0) + g.goals));
    return active
      .map((p) => ({ name: p.full_name, goals: m.get(p.id) ?? 0 }))
      .filter((x) => x.goals > 0)
      .sort((a, b) => b.goals - a.goals);
  }, [goals, active]);

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
    const rows = active.map((p) => ({
      tournament_id: selected,
      player_id: p.id,
      goals: Number(draft[p.id] ?? 0),
    }));
    const { error } = await supabase
      .from("tournament_goals")
      .upsert(rows, { onConflict: "tournament_id,player_id" });
    setMsg(error ? "No se pudieron guardar los goles." : "Goles guardados.");
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold text-[#c9a24e]">Nuevo torneo</h1>
        <form onSubmit={createTournament} className="grid gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Nombre del torneo"
            className={input + " sm:col-span-2"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input type="date" className={input} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button className="rounded-lg bg-[#c9a24e] py-2 font-semibold text-black hover:opacity-90 sm:col-span-3">
            Crear torneo
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Goles por torneo</h2>
        <select className={input} value={selected} onChange={(e) => { setSelected(e.target.value); setMsg(null); }}>
          <option value="">Selecciona un torneo...</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {selected && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="py-2 pr-3">N°</th>
                    <th className="py-2 pr-3">Jugadora</th>
                    <th className="py-2">Goles</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((p) => (
                    <tr key={p.id} className="border-t border-zinc-800">
                      <td className="py-2 pr-3 text-[#c9a24e]">{p.shirt_number ?? "—"}</td>
                      <td className="py-2 pr-3">{p.full_name}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          className={input + " w-24"}
                          value={draft[p.id] ?? ""}
                          placeholder="0"
                          onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Total del torneo: {selectedTotal}</p>
              <button onClick={saveGoals} className="rounded-lg bg-[#c9a24e] px-5 py-2 font-semibold text-black hover:opacity-90">
                Guardar goles
              </button>
            </div>
            {msg && <p className="text-sm text-zinc-300">{msg}</p>}
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Goleadoras (todos los torneos)</h2>
        {totalsByPlayer.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay goles registrados.</p>
        ) : (
          <ol className="flex flex-col gap-1 text-sm">
            {totalsByPlayer.map((x, i) => (
              <li key={x.name} className="flex justify-between border-b border-zinc-800 py-1">
                <span>
                  {i + 1}. {x.name}
                </span>
                <span className="text-[#c9a24e]">{x.goals}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
