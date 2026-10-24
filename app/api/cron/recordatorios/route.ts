import { NextResponse } from "next/server";
import { sendOverdueReminders } from "@/lib/whatsapp";

export const maxDuration = 60;

// Tarea diaria de Vercel: avisa a quien sigue atrasada, máximo una vez cada 7 días.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Falta CRON_SECRET." }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const result = await sendOverdueReminders({ source: "auto", minDaysBetween: 7 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al enviar." }, { status: 500 });
  }
}
