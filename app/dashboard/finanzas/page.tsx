"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { money, todayISO } from "@/lib/club";
import { useClubData } from "@/lib/club-data";

type Entry = {
  id: string;
  kind: "ingreso" | "gasto";
  amount: number;
  concept: string;
  occurred_on: string;
};

const input =
  "rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-[#c9a24e]";

export default function FinancePage() {
  const { payments, loaded } = useClubData();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "gasto",
    amount: "",
    concept: "",
    occurred_on: today,
  });

  const loadEntries = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from("finance_entries")
      .select("id, kind, amount, concept, occurred_on")
      .order("occurred_on", { ascending: false });
    setEntries((data as Entry[]) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    loadEntries();
  }, [loadEntries]);

  const inMonth = (d: string) => d.slice(0, 7) === month;
  const monthEntries = entries.filter((e) => inMonth(e.occurred_on));
  const incomeFromPayments = payments
    .filter((p) => inMonth(p.paid_on))
    .reduce((s, p) => s + Number(p.amount), 0);
  const incomeOther = monthEntries
    .filter((e) => e.kind === "ingreso")
    .reduce((s, e) => s + Number(e.amount), 0);
  const income = incomeFromPayments + incomeOther;
  const expenses = monthEntries
    .filter((e) => e.kind === "gasto")
    .reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expenses;
  const expenseRate = income > 0 ? (expenses / income) * 100 : null;

  async function addEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabase();
    if (!supabase) return;
    const { error: err } = await supabase.from("finance_entries").insert({
      kind: form.kind,
      amount: Number(form.amount),
      concept: form.concept.trim(),
      occurred_on: form.occurred_on,
    });
    if (err) {
      setError("No se pudo guardar el movimiento.");
      return;
    }
    setForm({ ...form, amount: "", concept: "" });
    loadEntries();
  }

  async function removeEntry(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("finance_entries").delete().eq("id", id);
    loadEntries();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-[#c9a24e]">Finanzas</h1>
          <input
            type="month"
            className={input}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        {loaded && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Tasa de ingresos" value={money(income)} hint={`Pagos ${money(incomeFromPayments)} + otros ${money(incomeOther)}`} />
            <Stat label="Tasa de gastos" value={money(expenses)} hint={expenseRate === null ? "Sin ingresos en el mes" : `${expenseRate.toFixed(1)}% de los ingresos`} />
            <Stat
              label="Balance"
              value={money(balance)}
              tone={balance >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Nuevo movimiento</h2>
        <form onSubmit={addEntry} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Tipo
            <select
              className={input}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso (otro, no cuotas)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Monto
            <input
              type="number"
              min={1}
              required
              className={input}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
            Concepto
            <input
              required
              className={input}
              value={form.concept}
              onChange={(e) => setForm({ ...form, concept: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
            Fecha
            <input
              type="date"
              required
              className={input}
              value={form.occurred_on}
              onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-400 sm:col-span-2">{error}</p>}
          <button className="rounded-lg bg-[#c9a24e] py-2 font-semibold text-black hover:opacity-90 sm:col-span-2">
            Guardar movimiento
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Movimientos del mes</h2>
        {monthEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin movimientos registrados en este mes.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {monthEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
                <span>
                  <span className={e.kind === "ingreso" ? "text-emerald-400" : "text-red-400"}>
                    {e.kind === "ingreso" ? "Ingreso" : "Gasto"}
                  </span>{" "}
                  · {e.concept} · {e.occurred_on}
                </span>
                <span className="flex items-center gap-3">
                  {money(Number(e.amount))}
                  <button onClick={() => removeEntry(e.id)} className="text-xs text-zinc-500 hover:text-red-400">
                    Borrar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold ${tone ?? "text-[#c9a24e]"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
