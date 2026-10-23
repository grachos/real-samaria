alter table public.players drop column payment_reminder_date;
alter table public.players drop column payment_due_date;
alter table public.players add column payment_day smallint not null default 5 check (payment_day between 4 and 28);

alter table public.payments add constraint payments_bank_required
  check (payment_method = 'efectivo' or bank is not null);

create table public.club_settings (
  id smallint primary key default 1 check (id = 1),
  monthly_fee numeric(12,2) check (monthly_fee > 0)
);
insert into public.club_settings (id) values (1);

alter table public.club_settings enable row level security;
create policy "staff full access" on public.club_settings for all to authenticated using (true) with check (true);
