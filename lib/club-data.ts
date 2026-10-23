"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Payment, Player } from "@/lib/club";

export function useClubData() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fee, setFee] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const [p, pay, s] = await Promise.all([
      supabase
        .from("players")
        .select("*")
        .order("shirt_number", { ascending: true, nullsFirst: false }),
      supabase
        .from("payments")
        .select("id, player_id, period_month, amount, payment_method, bank, paid_on")
        .order("paid_on", { ascending: false }),
      supabase.from("club_settings").select("monthly_fee").eq("id", 1).maybeSingle(),
    ]);
    setError(p.error || pay.error || s.error ? "No se pudieron cargar los datos." : null);
    setPlayers((p.data as Player[]) ?? []);
    setPayments((pay.data as Payment[]) ?? []);
    setFee(s.data?.monthly_fee ? Number(s.data.monthly_fee) : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase
    reload();
  }, [reload]);

  return { players, payments, fee, loaded, error, reload };
}
