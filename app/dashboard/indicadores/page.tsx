"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { PAYMENT_METHODS, money } from "@/lib/club";
import { Card, Empty, Notice, PageHeader, Stat } from "@/components/ui";

type Named = { name: string; goals: number };
type Monthly = { month: string; cuotas: number; otros_ingresos: number; gastos: number };
type Data = {
  fee: number | null;
  month: string;
  players_active: number;
  players_inactive: number;
  users_active: number;
  payments_count: number;
  collected_total: number;
  collected_month: number;
  income_other_total: number;
  income_other_month: number;
  expenses_total: number;
  expenses_month: number;
  goals_total: number;
  tournaments: number;
  paid_this_month: number;
  due_this_month: number;
  overdue_this_month: number;
  overdue_list: { name: string; owed: number }[];
  top_scorers: Named[];
  goals_by_tournament: Named[];
  payments_by_method: { method: string; total: number; count: number }[];
  monthly: Monthly[];
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export default function IndicatorsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: res, error: err } = await supabase.rpc("indicadores");
    if (err) {
      setError("No se pudieron cargar los indicadores. Revisa que tengas acceso a este módulo.");
      return;
    }
    setData(res as Data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    load();
  }, [load]);

  if (error) {
    return (
      <>
        <PageHeader title="Indicadores" />
        <Notice tone="error">{error}</Notice>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Indicadores" />
        <p className="text-sm text-zinc-500">Cargando indicadores...</p>
      </>
    );
  }

  const mesActual = MESES[Number(data.month.slice(5)) - 1];
  const income = data.collected_month + data.income_other_month;
  const balance = income - data.expenses_month;
  const cuotasMes = data.paid_this_month + data.due_this_month + data.overdue_this_month;
  const maxGoals = Math.max(1, ...data.goals_by_tournament.map((t) => t.goals));
  const maxMethod = Math.max(1, ...data.payments_by_method.map((m) => m.total));
  const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;

  return (
    <>
      <PageHeader title="Indicadores" subtitle={`Resumen del club · ${mesActual} ${data.month.slice(0, 4)}`} />

      {!data.fee && (
        <div className="mb-6">
          <Notice>Define la cuota mensual en Configuración para ver el estado de las cuotas.</Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Jugadoras activas" value={String(data.players_active)} hint={`${data.players_inactive} dadas de baja`} />
        <Stat
          label="Ingresos del mes"
          value={money(income)}
          tone="good"
          hint={`Cuotas ${money(data.collected_month)} · Otros ${money(data.income_other_month)}`}
        />
        <Stat
          label="Gastos del mes"
          value={money(data.expenses_month)}
          tone="bad"
          hint={income > 0 ? `${pct(data.expenses_month, income)}% de los ingresos` : "Sin ingresos este mes"}
        />
        <Stat label="Balance del mes" value={money(balance)} tone={balance >= 0 ? "good" : "bad"} />
        <Stat
          label="Atrasadas este mes"
          value={String(data.overdue_this_month)}
          tone={data.overdue_this_month > 0 ? "bad" : "good"}
          hint={`${data.due_this_month} por vencer`}
        />
        <Stat label="Goles totales" value={String(data.goals_total)} hint={`${data.tournaments} torneos`} />
        <Stat label="Recaudado histórico" value={money(data.collected_total)} hint={`${data.payments_count} pagos`} />
        <Stat label="Usuarios activos" value={String(data.users_active)} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <h2 className="text-base font-semibold">Estado de las cuotas este mes</h2>
          {cuotasMes === 0 ? (
            <Empty>No hay jugadoras activas con cuota definida.</Empty>
          ) : (
            <>
              <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="bg-emerald-400" style={{ width: `${pct(data.paid_this_month, cuotasMes)}%` }} />
                <div className="bg-amber-400" style={{ width: `${pct(data.due_this_month, cuotasMes)}%` }} />
                <div className="bg-red-400" style={{ width: `${pct(data.overdue_this_month, cuotasMes)}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-semibold text-emerald-300">{data.paid_this_month}</p>
                  <p className="text-xs text-zinc-400">Al día</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-amber-300">{data.due_this_month}</p>
                  <p className="text-xs text-zinc-400">Por vencer</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-red-300">{data.overdue_this_month}</p>
                  <p className="text-xs text-zinc-400">Atrasadas</p>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Ingresos y gastos · últimos 12 meses</h2>
            <div className="flex gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#c9a24e]" /> Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-400" /> Gastos
              </span>
            </div>
          </div>
          <MonthlyChart data={data.monthly} />
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold">Métodos de pago (histórico)</h2>
          {data.payments_by_method.length === 0 ? (
            <Empty>Aún no hay pagos registrados.</Empty>
          ) : (
            <BarList
              items={data.payments_by_method.map((m) => ({
                label: methodLabel(m.method),
                value: m.total,
                sub: `${m.count} pagos`,
              }))}
              max={maxMethod}
              format={money}
            />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold">Goles por torneo</h2>
          {data.goals_by_tournament.length === 0 ? (
            <Empty>Aún no hay torneos.</Empty>
          ) : (
            <BarList
              items={data.goals_by_tournament.map((t) => ({ label: t.name, value: t.goals }))}
              max={maxGoals}
              format={(n) => `${n} goles`}
            />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold">Goleadoras</h2>
          {data.top_scorers.length === 0 ? (
            <Empty>Aún no hay goles registrados.</Empty>
          ) : (
            <ol className="flex flex-col">
              {data.top_scorers.map((s, i) => (
                <li key={s.name} className="flex items-center justify-between border-b border-zinc-800 py-2.5 last:border-0">
                  <span className="text-sm">
                    <span className="mr-3 inline-block w-5 text-zinc-500">{i + 1}</span>
                    {s.name}
                  </span>
                  <span className="font-semibold text-[#c9a24e]">{s.goals}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold">Atrasadas este mes</h2>
          {data.overdue_list.length === 0 ? (
            <Empty>Nadie está atrasada este mes.</Empty>
          ) : (
            <ul className="flex flex-col">
              {data.overdue_list.map((o) => (
                <li key={o.name} className="flex items-center justify-between border-b border-zinc-800 py-2.5 last:border-0">
                  <span className="text-sm">{o.name}</span>
                  <span className="text-sm font-semibold text-red-300">{money(o.owed)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function MonthlyChart({ data }: { data: Monthly[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.cuotas + d.otros_ingresos, d.gastos)));
  return (
    <div className="mt-6 flex h-56 items-stretch gap-2">
      {data.map((d) => {
        const inc = d.cuotas + d.otros_ingresos;
        return (
          <div
            key={d.month}
            className="flex min-w-0 flex-1 flex-col"
            title={`${d.month} · ingresos ${money(inc)} · gastos ${money(d.gastos)}`}
          >
            <div className="flex flex-1 items-end justify-center gap-1">
              <div className="w-2.5 rounded-t bg-[#c9a24e]" style={{ height: `${(inc / max) * 100}%` }} />
              <div className="w-2.5 rounded-t bg-red-400" style={{ height: `${(d.gastos / max) * 100}%` }} />
            </div>
            <span className="mt-2 text-center text-[10px] text-zinc-500">{MESES[Number(d.month.slice(5)) - 1]}</span>
          </div>
        );
      })}
    </div>
  );
}

function BarList({
  items,
  max,
  format,
}: {
  items: { label: string; value: number; sub?: string }[];
  max: number;
  format: (n: number) => string;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1.5 flex justify-between gap-3 text-sm">
            <span className="truncate text-zinc-200">{i.label}</span>
            <span className="shrink-0 text-zinc-400">
              {format(i.value)}
              {i.sub ? ` · ${i.sub}` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-[#c9a24e]" style={{ width: `${Math.round((i.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
