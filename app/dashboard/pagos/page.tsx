"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { PAYMENT_METHODS, money, owedMonths, paidByMonth, todayISO } from "@/lib/club";
import { useClubData } from "@/lib/club-data";

const input =
  "rounded-lg border border-zinc-700 bg-black px-3 py-2 text-base text-white outline-none focus:border-[#c9a24e]";

export default function PaymentsPage() {
  const { players, payments, fee, error: loadError, reload } = useClubData();
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const active = players.filter((p) => p.active);
  const names = Object.fromEntries(players.map((p) => [p.id, p.full_name]));

  const [feeInput, setFeeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    player_id: "",
    period: thisMonth,
    amount: "",
    payment_method: "efectivo",
    bank: "",
    paid_on: today,
  });

  const method = PAYMENT_METHODS.find((m) => m.value === form.payment_method);
  const selected = active.find((p) => p.id === form.player_id);
  const owed = selected ? owedMonths(selected, payments, fee, today) : [];
  const periodPaid = selected ? (paidByMonth(payments, selected.id).get(form.period) ?? 0) : 0;

  const pending = active
    .map((p) => {
      const o = owedMonths(p, payments, fee, today);
      return { player: p, owed: o, total: o.reduce((s, x) => s + x.remaining, 0) };
    })
    .filter((x) => x.owed.length > 0)
    .sort((a, b) => b.total - a.total);

  async function saveFee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const value = Number(feeInput);
    if (!value) return;
    await supabase.from("club_settings").upsert({ id: 1, monthly_fee: value });
    setFeeInput("");
    reload();
  }

  async function savePayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabase();
    if (!supabase) return;
    if (method?.needsBank && !form.bank.trim()) {
      setError("Indica el banco o plataforma con la que se hizo el pago.");
      return;
    }
    const { error: err } = await supabase.from("payments").insert({
      player_id: form.player_id,
      period_month: `${form.period}-01`,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      bank: method?.needsBank ? form.bank.trim() : null,
      paid_on: form.paid_on,
    });
    if (err) {
      setError("No se pudo registrar el pago. Revisa los datos.");
      return;
    }
    setForm({ ...form, amount: "", bank: "" });
    reload();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-[#c9a24e]">Cuota mensual</h1>
        <p className="text-sm text-zinc-400">
          Actual: {fee ? money(fee) : "sin definir"}
        </p>
        <form onSubmit={saveFee} className="flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="Nuevo valor"
            className={input}
            value={feeInput}
            onChange={(e) => setFeeInput(e.target.value)}
          />
          <button className="rounded-lg bg-zinc-800 px-4 py-2 hover:bg-zinc-700">Guardar</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Registrar pago</h2>
        <form onSubmit={savePayment} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
            Jugadora
            <select
              required
              className={input}
              value={form.player_id}
              onChange={(e) => setForm({ ...form, player_id: e.target.value })}
            >
              <option value="">Selecciona...</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </label>

          {selected && (
            <div className="rounded-lg border border-zinc-800 p-3 text-sm sm:col-span-2">
              {!fee ? (
                <p className="text-amber-400">Define la cuota mensual antes de registrar pagos.</p>
              ) : owed.length === 0 ? (
                <p className="text-emerald-400">Al día.</p>
              ) : (
                <p className="text-red-400">
                  Atrasada en {owed.length} mes(es): {owed.map((o) => o.month).join(", ")} ·{" "}
                  {money(owed.reduce((s, o) => s + o.remaining, 0))}
                </p>
              )}
              {fee && (
                <p className="mt-1 text-zinc-400">
                  Pagado en {form.period}: {money(periodPaid)} de {money(fee)}
                </p>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Mes que cubre
            <input
              type="month"
              required
              className={input}
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            />
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
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Método
            <select
              className={input}
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Banco / plataforma
            <input
              disabled={!method?.needsBank}
              required={method?.needsBank}
              placeholder={method?.needsBank ? "Ej. Bancolombia" : "No aplica"}
              className={input + " disabled:opacity-40"}
              value={form.bank}
              onChange={(e) => setForm({ ...form, bank: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
            Fecha de pago
            <input
              type="date"
              required
              className={input}
              value={form.paid_on}
              onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-400 sm:col-span-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!fee}
            className="rounded-lg bg-[#c9a24e] py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50 sm:col-span-2"
          >
            Registrar pago
          </button>
        </form>
        {loadError && <p className="mt-3 text-sm text-red-400">{loadError}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Pendientes de pago ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-500">Nadie tiene pagos atrasados.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {pending.map((x) => (
              <li key={x.player.id} className="rounded-lg border border-zinc-800 p-3">
                <span className="font-medium">{x.player.full_name}</span>{" "}
                <span className="text-zinc-400">
                  · {x.owed.map((o) => o.month).join(", ")} · {money(x.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Pagos recientes</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay pagos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Jugadora</th>
                  <th className="py-2 pr-3">Mes</th>
                  <th className="py-2 pr-3">Monto</th>
                  <th className="py-2 pr-3">Método</th>
                  <th className="py-2">Banco</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 30).map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800">
                    <td className="py-2 pr-3">{p.paid_on}</td>
                    <td className="py-2 pr-3">{names[p.player_id] ?? "—"}</td>
                    <td className="py-2 pr-3">{p.period_month.slice(0, 7)}</td>
                    <td className="py-2 pr-3">{money(Number(p.amount))}</td>
                    <td className="py-2 pr-3">{p.payment_method}</td>
                    <td className="py-2">{p.bank ?? "—"}</td>
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
