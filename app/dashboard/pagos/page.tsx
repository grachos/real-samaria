"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { PAYMENT_METHODS, money, owedMonths, paidByMonth, todayISO } from "@/lib/club";
import { useClubData } from "@/lib/club-data";
import { Badge, Bar, Button, Card, Empty, Field, inputCls, Notice, PageHeader, StatusBadge, Tabs } from "@/components/ui";

type Tab = "registrar" | "pendientes" | "historial";

export default function PaymentsPage() {
  const { players, payments, fee, error: loadError, reload } = useClubData();
  const today = todayISO();
  const names = Object.fromEntries(players.map((p) => [p.id, p.full_name]));

  const [tab, setTab] = useState<Tab>("registrar");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    player_id: "",
    period: today.slice(0, 7),
    amount: "",
    payment_method: "efectivo",
    bank: "",
    paid_on: today,
  });

  // Las jugadoras dadas de baja siguen apareciendo mientras tengan deuda pendiente.
  const active = players.filter((p) => p.active || owedMonths(p, payments, fee, today).length > 0);

  const method = PAYMENT_METHODS.find((m) => m.value === form.payment_method);
  const selected = active.find((p) => p.id === form.player_id);
  const owed = selected ? owedMonths(selected, payments, fee, today) : [];
  const owedTotal = owed.reduce((s, o) => s + o.remaining, 0);
  const periodPaid = selected ? (paidByMonth(payments, selected.id).get(form.period) ?? 0) : 0;
  // El monto se precarga con la cuota configurada.
  const amountValue = form.amount === "" && fee ? String(fee) : form.amount;

  const pending = active
    .map((p) => {
      const o = owedMonths(p, payments, fee, today);
      return { p, owed: o, total: o.reduce((s, x) => s + x.remaining, 0) };
    })
    .filter((x) => x.owed.length > 0)
    .sort((a, b) => b.total - a.total);

  async function savePayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const supabase = getSupabase();
    if (!supabase) return;
    if (method?.needsBank && !form.bank.trim()) {
      setError("Indica el banco o plataforma con la que se hizo el pago.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from("payments").insert({
      player_id: form.player_id,
      period_month: `${form.period}-01`,
      amount: Number(amountValue),
      payment_method: form.payment_method,
      bank: method?.needsBank ? form.bank.trim() : null,
      paid_on: form.paid_on,
    });
    setSaving(false);
    if (err) {
      setError("No se pudo registrar el pago. Revisa los datos.");
      return;
    }
    setForm({ ...form, amount: "", bank: "" });
    setSaved(true);
    reload();
  }

  return (
    <>
      <PageHeader title="Pagos" subtitle="Registra cuotas y revisa quién debe" />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "registrar", label: "Registrar" },
          { value: "pendientes", label: `Pendientes (${pending.length})` },
          { value: "historial", label: "Historial" },
        ]}
      />

      {loadError && (
        <div className="mb-6">
          <Notice tone="error">{loadError}</Notice>
        </div>
      )}
      {!fee && (
        <div className="mb-6">
          <Notice>
            Primero define la cuota mensual en{" "}
            <Link href="/dashboard/configuracion" className="font-semibold underline">
              Configuración
            </Link>
            .
          </Notice>
        </div>
      )}

      {tab === "registrar" && (
        <div className="grid gap-6 md:grid-cols-5">
          <Card className="md:col-span-3">
            <form onSubmit={savePayment} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Jugadora">
                  <select
                    required
                    className={inputCls}
                    value={form.player_id}
                    onChange={(e) => setForm({ ...form, player_id: e.target.value })}
                  >
                    <option value="">Selecciona una jugadora</option>
                    {active.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                        {p.active ? "" : " (de baja)"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Mes que cubre">
                <input
                  type="month"
                  required
                  className={inputCls}
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                />
              </Field>
              <Field label="Monto (COP)">
                <input
                  type="number"
                  min={1}
                  required
                  className={inputCls}
                  value={amountValue}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="Método">
                <select
                  className={inputCls}
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Banco / plataforma">
                <input
                  disabled={!method?.needsBank}
                  required={method?.needsBank}
                  placeholder={method?.needsBank ? "Ej. Bancolombia" : "No aplica para efectivo"}
                  className={inputCls}
                  value={form.bank}
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Fecha de pago">
                  <input
                    type="date"
                    required
                    className={inputCls}
                    value={form.paid_on}
                    onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
                  />
                </Field>
              </div>
              {error && (
                <div className="sm:col-span-2">
                  <Notice tone="error">{error}</Notice>
                </div>
              )}
              {saved && (
                <div className="sm:col-span-2">
                  <Notice tone="ok">Pago registrado.</Notice>
                </div>
              )}
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={!fee || !selected || saving}>
                  {saving ? "Registrando..." : "Registrar pago"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="self-start md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Estado de la jugadora</p>
            {!selected ? (
              <Empty>Selecciona una jugadora para ver su estado.</Empty>
            ) : (
              <div className="mt-4 flex flex-col gap-5">
                <p className="text-lg font-semibold">{selected.full_name}</p>
                <StatusBadge fee={fee} owed={owed} total={owedTotal} />
                {fee && (
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-zinc-400">Pagado en {form.period}</span>
                      <span>
                        {money(periodPaid)} de {money(fee)}
                      </span>
                    </div>
                    <Bar value={(periodPaid / fee) * 100} />
                  </div>
                )}
                {owed.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-zinc-400">Meses pendientes</p>
                    <div className="flex flex-wrap gap-2">
                      {owed.map((o) => (
                        <Badge key={o.month} tone="late">
                          {o.month} · {money(o.remaining)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "pendientes" &&
        (pending.length === 0 ? (
          <Card>
            <Empty>Nadie tiene pagos atrasados.</Empty>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((x) => (
              <Card key={x.p.id} pad="sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{x.p.full_name}</p>
                    <p className="text-xs text-zinc-500">Paga el día {x.p.payment_day}</p>
                  </div>
                  <p className="text-lg font-semibold text-red-300">{money(x.total)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {x.owed.map((o) => (
                    <Badge key={o.month} tone="late">
                      {o.month}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "historial" &&
        (payments.length === 0 ? (
          <Card>
            <Empty>Aún no hay pagos registrados.</Empty>
          </Card>
        ) : (
          <Card pad="none">
            <ul className="divide-y divide-zinc-800">
              {payments.slice(0, 50).map((p) => {
                const label = PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label ?? p.payment_method;
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-medium">{names[p.player_id] ?? "—"}</p>
                      <p className="text-xs text-zinc-500">
                        Pagó el {p.paid_on} · cubre {p.period_month.slice(0, 7)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#c9a24e]">{money(Number(p.amount))}</p>
                      <p className="text-xs text-zinc-400">
                        {label}
                        {p.bank ? ` · ${p.bank}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
    </>
  );
}
