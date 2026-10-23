"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { money, todayISO } from "@/lib/club";
import { useClubData } from "@/lib/club-data";
import { Icon } from "@/components/icons";
import { Badge, Button, Card, Empty, Field, inputBase, inputCls, Notice, PageHeader, Stat } from "@/components/ui";

type Entry = {
  id: string;
  kind: "ingreso" | "gasto";
  amount: number;
  concept: string;
  occurred_on: string;
};

export default function FinancePage() {
  const { payments, loaded } = useClubData();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ kind: "gasto", amount: "", concept: "", occurred_on: today });

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
    setSaving(true);
    const { error: err } = await supabase.from("finance_entries").insert({
      kind: form.kind,
      amount: Number(form.amount),
      concept: form.concept.trim(),
      occurred_on: form.occurred_on,
    });
    setSaving(false);
    if (err) {
      setError("No se pudo guardar el movimiento.");
      return;
    }
    setForm({ ...form, amount: "", concept: "" });
    loadEntries();
  }

  async function removeEntry(id: string) {
    if (!window.confirm("¿Borrar este movimiento?")) return;
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("finance_entries").delete().eq("id", id);
    loadEntries();
  }

  return (
    <>
      <PageHeader
        title="Finanzas"
        subtitle="Ingresos y gastos del mes"
        action={
          <input
            type="month"
            aria-label="Mes"
            className={`${inputBase} w-auto`}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        }
      />

      {loaded && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Tasa de ingresos"
            value={money(income)}
            hint={`Cuotas ${money(incomeFromPayments)} · Otros ${money(incomeOther)}`}
          />
          <Stat
            label="Tasa de gastos"
            value={money(expenses)}
            tone="bad"
            hint={expenseRate === null ? "Sin ingresos este mes" : `${expenseRate.toFixed(1)}% de los ingresos`}
          />
          <Stat label="Balance" value={money(balance)} tone={balance >= 0 ? "good" : "bad"} />
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <Card className="self-start md:col-span-2">
          <h2 className="mb-5 text-base font-semibold">Nuevo movimiento</h2>
          <form onSubmit={addEntry} className="flex flex-col gap-4">
            <Field label="Tipo">
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso (distinto a cuotas)</option>
              </select>
            </Field>
            <Field label="Monto (COP)">
              <input
                type="number"
                min={1}
                required
                className={inputCls}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            <Field label="Concepto">
              <input
                required
                className={inputCls}
                value={form.concept}
                onChange={(e) => setForm({ ...form, concept: e.target.value })}
              />
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                required
                className={inputCls}
                value={form.occurred_on}
                onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
              />
            </Field>
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar movimiento"}
            </Button>
          </form>
        </Card>

        <Card pad="none" className="self-start md:col-span-3">
          <div className="border-b border-zinc-800 px-5 py-4 text-base font-semibold">Movimientos del mes</div>
          {monthEntries.length === 0 ? (
            <Empty>Sin movimientos en este mes.</Empty>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {monthEntries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={e.kind === "ingreso" ? "ok" : "late"}>
                        {e.kind === "ingreso" ? "Ingreso" : "Gasto"}
                      </Badge>
                      <span className="text-xs text-zinc-500">{e.occurred_on}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium">{e.concept}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">{money(Number(e.amount))}</p>
                    <button
                      onClick={() => removeEntry(e.id)}
                      aria-label="Borrar movimiento"
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
