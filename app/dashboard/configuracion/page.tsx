"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { money } from "@/lib/club";
import { useClubData } from "@/lib/club-data";
import { Button, Card, Empty, Field, inputBase, inputCls, Notice, PageHeader } from "@/components/ui";

const DAYS = Array.from({ length: 25 }, (_, i) => i + 4); // 4 a 28

type Msg = { tone: "ok" | "error"; text: string } | null;

export default function SettingsPage() {
  const { players, fee, reload } = useClubData();
  const active = players.filter((p) => p.active);
  const [feeInput, setFeeInput] = useState("");
  const [bulkDay, setBulkDay] = useState(5);
  const [msg, setMsg] = useState<Msg>(null);

  async function saveFee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(feeInput);
    if (!value || value <= 0) {
      setMsg({ tone: "error", text: "Ingresa un monto mayor a cero." });
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("club_settings").upsert({ id: 1, monthly_fee: value });
    if (error) {
      setMsg({ tone: "error", text: "No se pudo guardar la cuota." });
      return;
    }
    setFeeInput("");
    setMsg({ tone: "ok", text: "Cuota mensual guardada." });
    reload();
  }

  async function setDay(id: string, day: number) {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("players").update({ payment_day: day }).eq("id", id);
    if (error) {
      setMsg({ tone: "error", text: "No se pudo guardar el día de pago." });
      return;
    }
    setMsg({ tone: "ok", text: "Día de pago actualizado." });
    reload();
  }

  async function applyAll() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("players").update({ payment_day: bulkDay }).eq("active", true);
    if (error) {
      setMsg({ tone: "error", text: "No se pudo aplicar el día a todas." });
      return;
    }
    setMsg({ tone: "ok", text: `Día de pago ${bulkDay} aplicado a todas las jugadoras.` });
    reload();
  }

  return (
    <>
      <PageHeader title="Configuración" subtitle="Monto de la cuota y día de pago del club" />

      {msg && (
        <div className="mb-6">
          <Notice tone={msg.tone === "error" ? "error" : "ok"}>{msg.text}</Notice>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="self-start">
          <h2 className="text-base font-semibold">Monto de la cuota</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Valor mensual que paga cada jugadora. Actual:{" "}
            <span className="font-semibold text-[#c9a24e]">{fee ? money(fee) : "sin definir"}</span>
          </p>
          <form onSubmit={saveFee} className="mt-5 flex flex-col gap-4">
            <Field label="Nuevo valor (COP)">
              <input
                type="number"
                min={1}
                className={inputCls}
                value={feeInput}
                placeholder="Ej. 50000"
                onChange={(e) => setFeeInput(e.target.value)}
              />
            </Field>
            <Button type="submit">Guardar monto</Button>
          </form>
        </Card>

        <Card className="self-start">
          <h2 className="text-base font-semibold">Día de pago</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Cada jugadora paga el día que le corresponde cada mes. El recordatorio sale 3 días antes.
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Field label="Aplicar a todas">
                <select
                  className={inputCls}
                  value={bulkDay}
                  onChange={(e) => setBulkDay(Number(e.target.value))}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      Día {d}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Button variant="secondary" onClick={applyAll} disabled={active.length === 0}>
              Aplicar a todas
            </Button>
          </div>
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Día de pago por jugadora</h2>
        {active.length === 0 ? (
          <Card>
            <Empty>Aún no hay jugadoras registradas.</Empty>
          </Card>
        ) : (
          <Card pad="none">
            <ul className="divide-y divide-zinc-800">
              {active.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.full_name}</p>
                    <p className="text-xs text-zinc-500">Recordatorio: día {p.payment_day - 3}</p>
                  </div>
                  <select
                    aria-label={`Día de pago de ${p.full_name}`}
                    value={p.payment_day}
                    onChange={(e) => setDay(p.id, Number(e.target.value))}
                    className={`${inputBase} w-36`}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        Día {d}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
