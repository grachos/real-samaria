"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { money, owedMonths, todayISO } from "@/lib/club";
import { useClubData } from "@/lib/club-data";

const input =
  "rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-[#c9a24e]";

export default function PlayersPage() {
  const { players, payments, fee, error: loadError, reload } = useClubData();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    shirt_number: "",
    joined_on: "",
    payment_day: "5",
  });

  const today = todayISO();
  const active = players.filter((p) => p.active);

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
      payment_day: Number(form.payment_day),
    });
    setSaving(false);

    if (err) {
      setError("No se pudo guardar. Revisa los datos (día de pago entre 4 y 28).");
      return;
    }
    setForm({ full_name: "", shirt_number: "", joined_on: "", payment_day: "5" });
    reload();
  }

  async function deactivate(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("players").update({ active: false }).eq("id", id);
    reload();
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
            Día de pago mensual (entre 4 y 28)
            <input
              type="number"
              required
              min={4}
              max={28}
              className={input}
              value={form.payment_day}
              onChange={(e) => setForm({ ...form, payment_day: e.target.value })}
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
        {loadError && <p className="mt-3 text-sm text-red-400">{loadError}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Plantilla ({active.length})</h2>
        {!fee && (
          <p className="mb-3 text-sm text-amber-400">
            Define la cuota mensual en la pestaña Pagos para ver quién está al día.
          </p>
        )}
        {active.length === 0 ? (
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
                  <th className="py-2 pr-3">Recordatorio</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {active.map((p) => {
                  const owed = owedMonths(p, payments, fee, today);
                  const total = owed.reduce((s, o) => s + o.remaining, 0);
                  return (
                    <tr key={p.id} className="border-t border-zinc-800">
                      <td className="py-2 pr-3 text-[#c9a24e]">{p.shirt_number ?? "—"}</td>
                      <td className="py-2 pr-3">{p.full_name}</td>
                      <td className="py-2 pr-3">{p.joined_on}</td>
                      <td className="py-2 pr-3">Día {p.payment_day}</td>
                      <td className="py-2 pr-3">Día {p.payment_day - 3}</td>
                      <td className="py-2 pr-3">
                        {!fee ? (
                          <span className="text-zinc-500">Sin cuota</span>
                        ) : owed.length === 0 ? (
                          <span className="text-emerald-400">Al día</span>
                        ) : (
                          <span className="text-red-400">
                            Atrasada {owed.length} mes(es) · {money(total)}
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => deactivate(p.id)}
                          className="text-xs text-zinc-500 hover:text-red-400"
                        >
                          Dar de baja
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
