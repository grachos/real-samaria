-- Baja de jugadoras: se conserva el historial y la deuda deja de crecer desde la fecha de baja
alter table public.players add column if not exists deactivated_on date;
update public.players set deactivated_on = current_date where not active and deactivated_on is null;

-- Indicadores: la deuda incluye a jugadoras dadas de baja y las goleadoras muestran si están de baja
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
    ),
    debt as (
      select p.id, p.full_name, p.active, sum(v_fee - pd.paid) as owed, count(*) as months
      from public.players p
      cross join lateral generate_series(
        case when extract(day from p.joined_on) > p.payment_day
             then date_trunc('month', p.joined_on) + interval '1 month'
             else date_trunc('month', p.joined_on) end,
        date_trunc('month', coalesce(p.deactivated_on, current_date)::timestamp),
        interval '1 month') as gs(m)
      cross join lateral (
        select coalesce(sum(py.amount), 0) as paid
        from public.payments py
        where py.player_id = p.id
          and py.period_month >= gs.m::date
          and py.period_month < (gs.m + interval '1 month')::date
      ) pd
      where v_fee is not null
        and (gs.m::date + (p.payment_day - 1)) < coalesce(p.deactivated_on, current_date)
        and v_fee - pd.paid > 0
      group by p.id, p.full_name, p.active
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
      'overdue_list', (select coalesce(jsonb_agg(jsonb_build_object('name', full_name, 'owed', owed, 'months', months, 'active', active) order by owed desc), '[]'::jsonb)
                       from debt),
      'debt_total', (select coalesce(sum(owed), 0) from debt),
      'top_scorers', (select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'goals', x.goals, 'active', x.active) order by x.goals desc), '[]'::jsonb)
                      from (select p.full_name as name, p.active, sum(g.goals) as goals
                            from public.tournament_goals g join public.players p on p.id = g.player_id
                            group by p.id, p.full_name, p.active having sum(g.goals) > 0
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
