-- =====================================================================
-- Tareas programadas con pg_cron (las indicadas al final de la migración inicial).
-- En Supabase hosted habilitar pg_cron en Database > Extensions si no está.
-- Horarios en UTC: Honduras es UTC-6 todo el año (sin horario de verano).
-- =====================================================================
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Idempotente: si el job ya existe se reemplaza.
create or replace function public._schedule_job(p_name text, p_schedule text, p_command text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if exists (select 1 from cron.job where jobname = p_name) then
    perform cron.unschedule(p_name);
  end if;
  perform cron.schedule(p_name, p_schedule, p_command);
end $fn$;

-- Expirar reservas no pagadas (cada minuto)
select public._schedule_job('expire-pending', '* * * * *', 'select public.expire_pending_orders()');
-- Cerrar ofertas vencidas: no-shows + registro de sobrante (cada 5 min)
select public._schedule_job('close-offers', '*/5 * * * *', 'select public.close_expired_offers()');
-- Crear las ofertas del día desde plantillas: 6:00 am Honduras = 12:00 UTC
select public._schedule_job('daily-offers', '0 12 * * *', 'select public.generate_offers_from_templates()');
-- Liquidaciones de la semana anterior: lunes 7:00 am Honduras = 13:00 UTC
select public._schedule_job('weekly-payouts', '0 13 * * 1',
  'select public.generate_payouts(current_date - 7, current_date - 1)');

drop function public._schedule_job(text, text, text);
