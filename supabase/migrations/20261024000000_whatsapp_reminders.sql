-- Avisos por WhatsApp (Kapso): celular de la jugadora y registro de envíos
alter table public.players add column if not exists phone text;

create table public.whatsapp_log (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  phone text not null,
  kind text not null default 'atraso',
  source text not null check (source in ('manual', 'auto')),
  status text not null check (status in ('sent', 'failed')),
  error text,
  sent_at timestamptz not null default now()
);

create index whatsapp_log_player_idx on public.whatsapp_log (player_id, sent_at desc);

alter table public.whatsapp_log enable row level security;

-- Solo lectura para quien tiene Pagos; los envíos se registran desde el servidor
create policy whatsapp_log_read on public.whatsapp_log for select to authenticated
  using (public.has_module('pagos'));
