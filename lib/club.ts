export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo", needsBank: false },
  { value: "transferencia", label: "Transferencia", needsBank: true },
  { value: "nequi", label: "Nequi", needsBank: true },
  { value: "daviplata", label: "Daviplata", needsBank: true },
  { value: "tarjeta", label: "Tarjeta", needsBank: true },
  { value: "otro", label: "Otro", needsBank: true },
];

export type Player = {
  id: string;
  full_name: string;
  shirt_number: number | null;
  joined_on: string;
  payment_day: number;
  active: boolean;
  deactivated_on?: string | null;
  phone?: string | null;
};

export type Payment = {
  id: string;
  player_id: string;
  period_month: string;
  amount: number;
  payment_method: string;
  bank: string | null;
  paid_on: string;
};

export type Owed = { month: string; remaining: number };

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function paidByMonth(payments: Payment[], playerId: string) {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (p.player_id !== playerId) continue;
    const k = p.period_month.slice(0, 7);
    map.set(k, (map.get(k) ?? 0) + Number(p.amount));
  }
  return map;
}

// Meses vencidos sin cuota completa. Cada mes vence el día payment_day.
export function owedMonths(
  player: Player,
  payments: Payment[],
  fee: number | null,
  today: string = todayISO(),
): Owed[] {
  if (!fee) return [];
  const joinedMonth = player.joined_on.slice(0, 7);
  const joinedDay = Number(player.joined_on.slice(8, 10));
  // Si ingresa después del día de pago, su primer mes es el siguiente.
  const start = joinedDay > player.payment_day ? addMonths(joinedMonth, 1) : joinedMonth;
  const paid = paidByMonth(payments, player.id);
  const owed: Owed[] = [];
  // Una jugadora dada de baja deja de generar deuda desde su fecha de baja.
  const end = player.deactivated_on && player.deactivated_on < today ? player.deactivated_on : today;
  for (let m = start; m <= end.slice(0, 7); m = addMonths(m, 1)) {
    const due = `${m}-${pad(player.payment_day)}`;
    const remaining = fee - (paid.get(m) ?? 0);
    if (due < end && remaining > 0) owed.push({ month: m, remaining });
  }
  return owed;
}

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
export const money = (n: number) => cop.format(n);
