"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { owedMonths, todayISO } from "@/lib/club";
import { useClubData } from "@/lib/club-data";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  inputCls,
  Notice,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import type { Player } from "@/lib/club";

const EMPTY = { full_name: "", shirt_number: "", joined_on: "", phone: "" };

export default function PlayersPage() {
  const { players, payments, fee, error: loadError, reload } = useClubData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const today = todayISO();
  const all = players.map((p) => {
    const owed = owedMonths(p, payments, fee, today);
    return { p, owed, total: owed.reduce((s, o) => s + o.remaining, 0) };
  });
  const activeCount = all.filter((r) => r.p.active).length;
  const inactiveCount = all.length - activeCount;
  // Si ya no quedan jugadoras de baja, se vuelve a la lista de activas.
  const viewInactive = showInactive && inactiveCount > 0;
  const rows = all.filter((r) => r.p.active !== viewInactive);

  function startEdit(p: Player) {
    setEditingId(p.id);
    setForm({
      full_name: p.full_name,
      shirt_number: p.shirt_number === null ? "" : String(p.shirt_number),
      joined_on: p.joined_on,
      phone: p.phone ?? "",
    });
    setError(null);
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    const values = {
      full_name: form.full_name.trim(),
      shirt_number: form.shirt_number === "" ? null : Number(form.shirt_number),
      joined_on: form.joined_on,
    };
    // El celular solo se envía si hay algo que guardar o borrar (evita fallar si falta la columna).
    const hadPhone = Boolean(players.find((x) => x.id === editingId)?.phone);
    if (form.phone.trim() || hadPhone)
      Object.assign(values, { phone: form.phone.trim() || null });
    // El día de pago se define después en Configuración (por defecto día 5).
    const { error: err } = editingId
      ? await supabase.from("players").update(values).eq("id", editingId)
      : await supabase.from("players").insert(values);
    setSaving(false);
    if (err) {
      setError("No se pudo guardar. Revisa los datos.");
      return;
    }
    closeForm();
    reload();
  }

  // La baja no elimina: conserva pagos, deuda y goles, y deja de generar cuotas nuevas.
  async function deactivate(id: string, name: string) {
    if (
      !window.confirm(
        `¿Dar de baja a ${name}? Su historial, deuda y goles se conservan.`,
      )
    )
      return;
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from("players")
      .update({ active: false, deactivated_on: todayISO() })
      .eq("id", id);
    reload();
  }

  async function reactivate(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from("players")
      .update({ active: true, deactivated_on: null })
      .eq("id", id);
    reload();
  }

  const actions = (p: Player) => (
    <div className="flex shrink-0 gap-1">
      <button
        onClick={() => startEdit(p)}
        aria-label={`Editar a ${p.full_name}`}
        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-[#c9a24e]"
      >
        <Icon name="edit" className="h-4 w-4" />
      </button>
      {p.active ? (
        <button
          onClick={() => deactivate(p.id, p.full_name)}
          aria-label={`Dar de baja a ${p.full_name}`}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => reactivate(p.id)}
          aria-label={`Reactivar a ${p.full_name}`}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
        >
          <Icon name="undo" className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const status = (r: (typeof all)[number]) =>
    !r.p.active && r.owed.length === 0 ? (
      <Badge tone="neutral">De baja</Badge>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        {!r.p.active && <Badge tone="neutral">De baja</Badge>}
        <StatusBadge fee={fee} owed={r.owed} total={r.total} />
      </div>
    );

  return (
    <>
      <PageHeader
        title="Jugadoras"
        subtitle={`${activeCount} activas${inactiveCount ? ` · ${inactiveCount} de baja` : ""}`}
        action={
          <Button onClick={() => (open ? closeForm() : setOpen(true))}>
            <Icon name={open ? "close" : "plus"} className="h-4 w-4" />
            {open ? "Cancelar" : "Nueva jugadora"}
          </Button>
        }
      />

      {!fee && (
        <div className="mb-6">
          <Notice>
            Define la cuota mensual en Configuración para ver quién está al día.
          </Notice>
        </div>
      )}
      {loadError && (
        <div className="mb-6">
          <Notice tone="error">{loadError}</Notice>
        </div>
      )}

      {open && (
        <Card className="mb-6">
          <h2 className="mb-5 text-base font-semibold">
            {editingId ? "Editar jugadora" : "Datos de la jugadora"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Nombre completo">
                <input
                  required
                  className={inputCls}
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
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
                onChange={(e) =>
                  setForm({ ...form, shirt_number: e.target.value })
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Fecha de ingreso al club">
                <input
                  type="date"
                  required
                  className={inputCls}
                  value={form.joined_on}
                  onChange={(e) =>
                    setForm({ ...form, joined_on: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="Celular (WhatsApp)">
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="3001234567"
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Guardar jugadora"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {inactiveCount > 0 && (
        <div className="mb-4 flex gap-2">
          {[
            { v: false, label: `Activas (${activeCount})` },
            { v: true, label: `De baja (${inactiveCount})` },
          ].map((t) => (
            <button
              key={String(t.v)}
              onClick={() => setShowInactive(t.v)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                viewInactive === t.v
                  ? "bg-[#c9a24e]/10 text-[#c9a24e]"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <Empty>
            {viewInactive
              ? "No hay jugadoras de baja."
              : "Aún no hay jugadoras. Agrega la primera con “Nueva jugadora”."}
          </Empty>
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
                  <th className="px-5 py-3 font-medium">Celular</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((r) => {
                  const p = r.p;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-900/60">
                      <td className="px-5 py-3 font-semibold text-[#c9a24e]">
                        {p.shirt_number ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-medium">{p.full_name}</td>
                      <td className="px-5 py-3 text-zinc-400">{p.joined_on}</td>
                      <td className="px-5 py-3 text-zinc-400">
                        Día {p.payment_day}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {p.phone || "—"}
                      </td>
                      <td className="px-5 py-3">{status(r)}</td>
                      <td className="px-5 py-3 text-right">{actions(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Móvil: tarjetas */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => {
              const p = r.p;
              return (
                <Card key={p.id} pad="sm" className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c9a24e]/15 font-semibold text-[#c9a24e]">
                    {p.shirt_number ?? "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.full_name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Paga el día {p.payment_day}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </p>
                    <div className="mt-3">{status(r)}</div>
                  </div>
                  {actions(p)}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
