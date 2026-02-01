alter table public.advertisements
add column if not exists price_usd numeric null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'advertisements_price_usd_nonnegative'
  ) then
    alter table public.advertisements
    add constraint advertisements_price_usd_nonnegative
    check (price_usd is null or price_usd >= 0);
  end if;
end $$;
