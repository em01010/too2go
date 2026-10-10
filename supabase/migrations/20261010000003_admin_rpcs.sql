-- =====================================================================
-- RPC de administración: envoltorios con verificación de rol admin sobre las
-- funciones internas (que están revocadas para authenticated).
-- =====================================================================
create or replace function public.admin_generate_payouts(p_start date, p_end date)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return public.generate_payouts(p_start, p_end);
end $$;

create or replace function public.admin_generate_offers_from_templates(p_date date default (now() at time zone 'America/Tegucigalpa')::date)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return public.generate_offers_from_templates(p_date);
end $$;

revoke execute on function public.admin_generate_payouts(date, date) from public, anon;
revoke execute on function public.admin_generate_offers_from_templates(date) from public, anon;
grant execute on function public.admin_generate_payouts(date, date) to authenticated;
grant execute on function public.admin_generate_offers_from_templates(date) to authenticated;
