import { createClient } from "@supabase/supabase-js";
import { money, owedMonths, type Payment, type Player } from "@/lib/club";

// Solo servidor: usa la clave de servicio y la API de Kapso.
export type ReminderResult = {
  sent: number;
  failed: number;
  skipped: { name: string; reason: string }[];
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Fecha de hoy en Colombia (el servidor corre en UTC).
export const bogotaToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

// Devuelve el número en formato internacional (+57...) o null si no es válido.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15)
    return `+${digits}`;
  return null;
}

const monthLabel = (ym: string) =>
  `${MESES[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;

export async function sendOverdueReminders(opts: {
  source: "manual" | "auto";
  playerIds?: string[];
  minDaysBetween?: number;
}): Promise<ReminderResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kapsoKey = process.env.KAPSO_API_KEY;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  const templateName =
    process.env.KAPSO_TEMPLATE_NAME ?? "recordatorio_cuota_real_samaria";
  if (!url || !service)
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  if (!kapsoKey || !phoneNumberId)
    throw new Error(
      "Falta configurar KAPSO_API_KEY y KAPSO_PHONE_NUMBER_ID en el servidor.",
    );

  const db = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [p, pay, s] = await Promise.all([
    db.from("players").select("*").eq("active", true),
    db
      .from("payments")
      .select(
        "id, player_id, period_month, amount, payment_method, bank, paid_on",
      ),
    db.from("club_settings").select("monthly_fee").eq("id", 1).maybeSingle(),
  ]);
  if (p.error || pay.error || s.error)
    throw new Error("No se pudieron leer los datos del club.");
  const fee = s.data?.monthly_fee ? Number(s.data.monthly_fee) : null;
  if (!fee)
    throw new Error(
      "Define la cuota mensual en Configuración antes de enviar avisos.",
    );

  const players = (p.data ?? []) as Player[] & { phone?: string | null }[];
  const payments = (pay.data ?? []) as Payment[];
  const today = bogotaToday();
  const result: ReminderResult = { sent: 0, failed: 0, skipped: [] };

  let recent = new Set<string>();
  if (opts.minDaysBetween) {
    const since = new Date(
      Date.now() - opts.minDaysBetween * 86_400_000,
    ).toISOString();
    const { data } = await db
      .from("whatsapp_log")
      .select("player_id")
      .eq("status", "sent")
      .gte("sent_at", since);
    recent = new Set((data ?? []).map((r) => r.player_id as string));
  }

  for (const player of players as (Player & { phone?: string | null })[]) {
    if (opts.playerIds && !opts.playerIds.includes(player.id)) continue;
    const owed = owedMonths(player, payments, fee, today);
    if (owed.length === 0) continue;
    const phone = normalizePhone(player.phone);
    if (!phone) {
      result.skipped.push({
        name: player.full_name,
        reason: "Sin celular válido",
      });
      continue;
    }
    if (recent.has(player.id)) {
      result.skipped.push({
        name: player.full_name,
        reason: "Ya se le avisó recientemente",
      });
      continue;
    }

    const total = owed.reduce((sum, o) => sum + o.remaining, 0);
    // La plantilla usa parámetros con nombre (NAMED)
    const params = [
      { name: "nombre", text: player.full_name.split(" ")[0] },
      { name: "concepto", text: `un saldo de ${money(total)}` },
      { name: "periodo", text: owed.map((o) => monthLabel(o.month)).join(", ") },
    ];

    let status: "sent" | "failed" = "sent";
    let error: string | null = null;
    try {
      const res = await fetch(
        `https://api.kapso.ai/meta/whatsapp/v24.0/${encodeURIComponent(phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: {
            "X-API-Key": kapsoKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone.replace(/^\+/, ""),
            type: "template",
            template: {
              name: templateName,
              language: { code: "es" },
              components: [
                {
                  type: "body",
                  parameters: params.map((p) => ({
                    type: "text",
                    parameter_name: p.name,
                    text: p.text,
                  })),
                },
              ],
            },
          }),
        },
      );
      if (!res.ok) {
        status = "failed";
        error = `Kapso ${res.status}: ${(await res.text()).slice(0, 300)}`;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message.slice(0, 300) : "Error de red";
    }

    await db.from("whatsapp_log").insert({
      player_id: player.id,
      phone,
      source: opts.source,
      status,
      error,
    });
    if (status === "sent") result.sent++;
    else result.failed++;
  }
  return result;
}
