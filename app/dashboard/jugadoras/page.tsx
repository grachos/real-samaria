"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { owedMonths, todayISO } from "@/lib/club";
import { useClubData } from "@/lib/club-data";
import { Icon } from "@/components/icons";
import { Button, Card, Empty, Field, inputCls, Notice, PageHeader, StatusBadge } from "@/components/ui";

const EMPTY = { full_name: "", shirt_number: "", joined_on: "" };

export default function PlayersPage() {
  const { players, payments, fee, error: loadError, reload } = useClubData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const rows = players
    .filter((p) => p.active)
    .map((p) => {
      const owed = owedMonths(p, payments, fee, today);
      return { p, owed, total: owed.reduce((s, o) => s + o.remaining, 0) };
    });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    // El día de pago se define después en Configuración (por defecto día 5).
    const { error: err } = await supabase.from("players").insert({
      full_name: form.full_name.trim(),
      shirt_number: form.shirt_number === "" ? null : Number(form.shirt_number),
      joined_on: form.joined_on,
    });
    setSaving(false);
    if (err) {
      setError("No se pudo guardar. Revisa los datos.");
      return;
    }
    setForm(EMPTY);
    setOpen(false);
    reload();
  }

  async function deactivate(id: string, name: string) {
    if (!window.confirm(`¿Dar de baja a ${name}?`)) return;
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("players").update({ active: false }).eq("id", id);
    reload();
  }

  return (
    <>
      <PageHeader
        title="Jugadoras"
        subtitle={`${rows.length} activas`}
        action={
          <Button onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? "close" : "plus"} className="h-4 w-4" />
            {open ? "Cancelar" : "Nueva jugadora"}
          </Button>
        }
      />

      {!fee && (
        <div className="mb-6">
          <Notice>Define la cuota mensual en Configuración para ver quién está al día.</Notice>
        </div>
      )}
      {loadError && (
        <div className="mb-6">
          <Notice tone="error">{loadError}</Notice>
        </div>
      )}

      {open && (
        <Card className="mb-6">
          <h2 className="mb-5 text-base font-semibold">Datos de la jugadora</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Nombre completo">
                <input
                  required
                  className={inputCls}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Número">
              <input
                type="number"
                min={0}
                max={99}
                className={inputCls}
                value={form.shirt_number}
                onChange={(e) => setForm({ ...form, shirt_number: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Fecha de ingreso al club">
                <input
                  type="date"
                  required
                  className={inputCls}
                  value={form.joined_on}
                  onChange={(e) => setForm({ ...form, joined_on: e.target.value })}
                />
              </Field>
            </div>
            {error && (
              <div className="sm:col-span-3">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            <div className="flex justify-end sm:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar jugadora"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card>
          <Empty>Aún no hay jugadoras. Agrega la primera con “Nueva jugadora”.</Empty>
        </Card>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <Card pad="none" className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">N°</th>
                  <th className="px-5 py-3 font-medium">Nombre</th>
                  <th className="px-5 py-3 font-medium">Ingreso</th>
                  <th className="px-5 py-3 font-medium">Paga el</th>
                  <th className="px-5 py-3 font-medium">Recordatorio</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map(({ p, owed, total }) => (
                  <tr key={p.id} className="hover:bg-zinc-900/60">
                    <td className="px-5 py-3 font-semibold text-[#c9a24e]">{p.shirt_number ?? "—"}</td>
                    <td className="px-5 py-3 font-medium">{p.full_name}</td>
                    <td className="px-5 py-3 text-zinc-400">{p.joined_on}</td>
                    <td className="px-5 py-3 text-zinc-400">Día {p.payment_day}</td>
                    <td className="px-5 py-3 text-zinc-400">Día {p.payment_day - 3}</td>
                    <td className="px-5 py-3">
                      <StatusBadge fee={fee} owed={owed} total={total} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => deactivate(p.id, p.full_name)}
                        aria-label={`Dar de baja a ${p.full_name}`}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Móvil: tarjetas */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map(({ p, owed, total }) => (
              <Card key={p.id} pad="sm" className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c9a24e]/15 font-semibold text-[#c9a24e]">
                  {p.shirt_number ?? "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.full_name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Paga el día {p.payment_day} · recordatorio día {p.payment_day - 3}
                  </p>
                  <div className="mt-3">
                    <StatusBadge fee={fee} owed={owed} total={total} />
                  </div>
                </div>
                <button
                  onClick={() => deactivate(p.id, p.full_name)}
                  aria-label={`Dar de baja a ${p.full_name}`}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
