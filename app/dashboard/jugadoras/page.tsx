"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  shirt_number: number | null;
  joined_on: string;
  payment_due_date: string;
  payment_reminder_date: string;
};

const input =
  "rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-[#c9a24e]";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    shirt_number: "",
    joined_on: "",
    payment_due_date: "",
  });

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("players")
      .select("id, full_name, shirt_number, joined_on, payment_due_date, payment_reminder_date")
      .eq("active", true)
      .order("shirt_number", { ascending: true, nullsFirst: false });
    if (err) setError("No se pudo cargar la lista de jugadoras.");
    else setPlayers(data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    const { error: err } = await supabase.from("players").insert({
      full_name: form.full_name.trim(),
      shirt_number: form.shirt_number === "" ? null : Number(form.shirt_number),
      joined_on: form.joined_on,
      payment_due_date: form.payment_due_date,
    });
    setSaving(false);

    if (err) {
      setError("No se pudo guardar la jugadora. Revisa los datos.");
      return;
    }
    setForm({ full_name: "", shirt_number: "", joined_on: "", payment_due_date: "" });
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold text-[#c9a24e]">Nueva jugadora</h1>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
            Nombre completo
            <input
              required
              className={input}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Número
            <input
              type="number"
              min={0}
              max={99}
              className={input}
              value={form.shirt_number}
              onChange={(e) => setForm({ ...form, shirt_number: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Fecha de ingreso al club
            <input
              type="date"
              required
              className={input}
              value={form.joined_on}
              onChange={(e) => setForm({ ...form, joined_on: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
            Fecha de pago (el recordatorio se calcula 3 días antes)
            <input
              type="date"
              required
              className={input}
              value={form.payment_due_date}
              onChange={(e) => setForm({ ...form, payment_due_date: e.target.value })}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-400 sm:col-span-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#c9a24e] py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50 sm:col-span-2"
          >
            {saving ? "Guardando..." : "Agregar jugadora"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Plantilla ({players.length})</h2>
        {players.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay jugadoras registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="py-2 pr-3">N°</th>
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Ingreso</th>
                  <th className="py-2 pr-3">Pago</th>
                  <th className="py-2">Recordatorio</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800">
                    <td className="py-2 pr-3 text-[#c9a24e]">{p.shirt_number ?? "—"}</td>
                    <td className="py-2 pr-3">{p.full_name}</td>
                    <td className="py-2 pr-3">{p.joined_on}</td>
                    <td className="py-2 pr-3">{p.payment_due_date}</td>
                    <td className="py-2">{p.payment_reminder_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
