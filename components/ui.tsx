import type { ButtonHTMLAttributes, ReactNode } from "react";
import { money, type Owed } from "@/lib/club";

export const inputBase =
  "rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-base text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#c9a24e] focus:ring-2 focus:ring-[#c9a24e]/20 disabled:opacity-40";
export const inputCls = `${inputBase} w-full`;

const PAD = { none: "", sm: "p-4", md: "p-5" } as const;

export function Card({
  children,
  className = "",
  pad = "md",
}: {
  children: ReactNode;
  className?: string;
  pad?: keyof typeof PAD;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 ${PAD[pad]} ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-[#c9a24e] text-black hover:bg-[#d9b56a]",
  secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

const BADGE_TONES = {
  ok: "bg-emerald-500/15 text-emerald-300",
  late: "bg-red-500/15 text-red-300",
  warn: "bg-amber-500/15 text-amber-300",
  neutral: "bg-zinc-800 text-zinc-300",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ fee, owed, total }: { fee: number | null; owed: Owed[]; total: number }) {
  if (!fee) return <Badge tone="neutral">Sin cuota</Badge>;
  if (owed.length === 0) return <Badge tone="ok">Al día</Badge>;
  return (
    <Badge tone="late">
      Atrasada {owed.length} {owed.length === 1 ? "mes" : "meses"} · {money(total)}
    </Badge>
  );
}

export function Bar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
      <div className="h-full rounded-full bg-[#c9a24e] transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

const STAT_TONES = {
  gold: "text-[#c9a24e]",
  good: "text-emerald-300",
  bad: "text-red-300",
} as const;

export function Stat({
  label,
  value,
  hint,
  tone = "gold",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${STAT_TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </Card>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="mb-6 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            value === o.value ? "bg-[#c9a24e] text-black" : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-zinc-500">{children}</p>;
}

const NOTICE_TONES = {
  info: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  error: "border-red-500/30 bg-red-500/10 text-red-200",
} as const;

export function Notice({
  tone = "info",
  children,
}: {
  tone?: keyof typeof NOTICE_TONES;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-xl border px-4 py-3 text-sm ${NOTICE_TONES[tone]}`}
    >
      {children}
    </div>
  );
}
