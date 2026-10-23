-- Niveles de acceso, perfiles de usuario, permisos por módulo e indicadores

create table public.access_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  modules text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  access_level_id uuid references public.access_levels(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.access_levels (name, modules) values
  ('Administrador', array['indicadores','jugadoras','pagos','finanzas','torneos','configuracion','usuarios']),
  ('Tesorería', array['indicadores','pagos','finanzas']),
  ('Entrenador', array['indicadores','jugadoras','torneos']),
  ('Consulta', array['indicadores']);

-- El primer usuario existente en Auth queda como administrador
insert into public.profiles (id, full_name, email, access_level_id)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', u.email),
       u.email,
       (select id from public.access_levels where name = 'Administrador')
from auth.users u
where not exists (select 1 from public.profiles)
order by u.created_at
limit 1;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.has_module(m text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.access_levels l on l.id = p.access_level_id
    where p.id = auth.uid() and p.active and m = any (l.modules)
  );
$$;

create or replace function public.has_any_module(variadic ms text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.access_levels l on l.id = p.access_level_id
    where p.id = auth.uid() and p.active and l.modules && ms
  );
$$;

-- Reemplaza la política general por permisos por módulo
drop policy if exists "staff full access" on public.players;
drop policy if exists "staff full access" on public.payments;
drop policy if exists "staff full access" on public.finance_entries;
drop policy if exists "staff full access" on public.tournaments;
drop policy if exists "staff full access" on public.tournament_goals;
drop policy if exists "staff full access" on public.club_settings;

create policy players_read on public.players for select to authenticated
  using (public.has_any_module('jugadoras','pagos','torneos','configuracion','indicadores'));
create policy players_write on public.players for all to authenticated
  using (public.has_module('jugadoras')) with check (public.has_module('jugadoras'));
create policy players_config on public.players for update to authenticated
  using (public.has_module('configuracion')) with check (public.has_module('configuracion'));

create policy payments_read on public.payments for select to authenticated
  using (public.has_any_module('jugadoras','pagos','finanzas','indicadores'));
create policy payments_write on public.payments for all to authenticated
  using (public.has_module('pagos')) with check (public.has_module('pagos'));

create policy finance_read on public.finance_entries for select to authenticated
  using (public.has_any_module('finanzas','indicadores'));
create policy finance_write on public.finance_entries for all to authenticated
  using (public.has_module('finanzas')) with check (public.has_module('finanzas'));

create policy tournaments_read on public.tournaments for select to authenticated
  using (public.has_any_module('torneos','indicadores'));
create policy tournaments_write on public.tournaments for all to authenticated
  using (public.has_module('torneos')) with check (public.has_module('torneos'));

create policy goals_read on public.tournament_goals for select to authenticated
  using (public.has_any_module('torneos','indicadores'));
create policy goals_write on public.tournament_goals for all to authenticated
  using (public.has_module('torneos')) with check (public.has_module('torneos'));

create policy settings_read on public.club_settings for select to authenticated
  using (public.is_active_user());
create policy settings_write on public.club_settings for all to authenticated
  using (public.has_module('configuracion')) with check (public.has_module('configuracion'));

alter table public.access_levels enable row level security;
alter table public.profiles enable row level security;

create policy levels_read on public.access_levels for select to authenticated
  using (public.is_active_user());
create policy levels_write on public.access_levels for all to authenticated
  using (public.has_module('usuarios')) with check (public.has_module('usuarios'));

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_module('usuarios'));
create policy profiles_update on public.profiles for update to authenticated
  using (public.has_module('usuarios')) with check (public.has_module('usuarios'));

-- Indicadores de todo el club (solo con acceso al módulo Indicadores)
create or replace function public.indicadores()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fee numeric;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_day int := extract(day from current_date)::int;
  v_start date := (date_trunc('month', current_date)::date - interval '11 months')::date;
  v_end date := date_trunc('month', current_date)::date;
begin
  if not public.has_module('indicadores') then
    raise exception 'Sin acceso a Indicadores';
  end if;

  select monthly_fee into v_fee from public.club_settings where id = 1;

  return (
    with pagado as (
      select p.id, p.full_name, p.payment_day,
        coalesce((select sum(py.amount) from public.payments py
                  where py.player_id = p.id and to_char(py.period_month, 'YYYY-MM') = v_month), 0) as paid_m
      from public.players p
      where p.active
    ),
    estado as (
      select id, full_name, paid_m,
        case
          when v_fee is null then 'sin_cuota'
          when paid_m >= v_fee then 'al_dia'
          when payment_day < v_day then 'atrasada'
          else 'por_vencer'
        end as situacion
      from pagado
    )
    select jsonb_build_object(
      'fee', v_fee,
      'month', v_month,
      'players_active', (select count(*) from public.players where active),
      'players_inactive', (select count(*) from public.players where not active),
      'users_active', (select count(*) from public.profiles where active),
      'payments_count', (select count(*) from public.payments),
      'collected_total', (select coalesce(sum(amount), 0) from public.payments),
      'collected_month', (select coalesce(sum(amount), 0) from public.payments where to_char(paid_on, 'YYYY-MM') = v_month),
      'income_other_total', (select coalesce(sum(amount), 0) from public.finance_entries where kind = 'ingreso'),
      'income_other_month', (select coalesce(sum(amount), 0) from public.finance_entries where kind = 'ingreso' and to_char(occurred_on, 'YYYY-MM') = v_month),
      'expenses_total', (select coalesce(sum(amount), 0) from public.finance_entries where kind = 'gasto'),
      'expenses_month', (select coalesce(sum(amount), 0) from public.finance_entries where kind = 'gasto' and to_char(occurred_on, 'YYYY-MM') = v_month),
      'goals_total', (select coalesce(sum(goals), 0) from public.tournament_goals),
      'tournaments', (select count(*) from public.tournaments),
      'paid_this_month', (select count(*) from estado where situacion = 'al_dia'),
      'due_this_month', (select count(*) from estado where situacion = 'por_vencer'),
      'overdue_this_month', (select count(*) from estado where situacion = 'atrasada'),
      'overdue_list', (select coalesce(jsonb_agg(jsonb_build_object('name', full_name, 'owed', v_fee - paid_m) order by v_fee - paid_m desc), '[]'::jsonb)
                       from estado where situacion = 'atrasada'),
      'top_scorers', (select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'goals', x.goals)), '[]'::jsonb)
                      from (select p.full_name as name, sum(g.goals) as goals
                            from public.tournament_goals g join public.players p on p.id = g.player_id
                            group by p.id, p.full_name having sum(g.goals) > 0
                            order by goals desc limit 5) x),
      'goals_by_tournament', (select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'goals', x.goals) order by x.starts_on nulls last, x.name), '[]'::jsonb)
                              from (select t.id, t.name, t.starts_on, coalesce(sum(g.goals), 0) as goals
                                    from public.tournaments t
                                    left join public.tournament_goals g on g.tournament_id = t.id
                                    group by t.id, t.name, t.starts_on) x),
      'payments_by_method', (select coalesce(jsonb_agg(jsonb_build_object('method', x.payment_method, 'total', x.total, 'count', x.cnt) order by x.total desc), '[]'::jsonb)
                             from (select payment_method, sum(amount) as total, count(*) as cnt
                                   from public.payments group by payment_method) x),
      'monthly', (select coalesce(jsonb_agg(jsonb_build_object(
                    'month', m.k,
                    'cuotas', coalesce(pay.t, 0),
                    'otros_ingresos', coalesce(inc.t, 0),
                    'gastos', coalesce(exp.t, 0)) order by m.k), '[]'::jsonb)
                  from (select to_char(g, 'YYYY-MM') as k
                        from generate_series(v_start::timestamp, v_end::timestamp, interval '1 month') g) m
                  left join (select to_char(paid_on, 'YYYY-MM') as k, sum(amount) as t
                             from public.payments group by 1) pay on pay.k = m.k
                  left join (select to_char(occurred_on, 'YYYY-MM') as k, sum(amount) as t
                             from public.finance_entries where kind = 'ingreso' group by 1) inc on inc.k = m.k
                  left join (select to_char(occurred_on, 'YYYY-MM') as k, sum(amount) as t
                             from public.finance_entries where kind = 'gasto' group by 1) exp on exp.k = m.k)
    )
  );
end;
$$;

grant execute on function public.indicadores() to authenticated;
