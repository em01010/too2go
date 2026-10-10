-- Prueba de flujo completo. Correr después de supabase_stub.sql + migración.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Usuarios
insert into auth.users (id, phone, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', '+50490000001', '{"full_name":"Admin"}'),
 ('00000000-0000-0000-0000-00000000000b', '+50490000002', '{"full_name":"Dueño Panadería"}'),
 ('00000000-0000-0000-0000-00000000000c', '+50490000003', '{"full_name":"Cliente Uno"}'),
 ('00000000-0000-0000-0000-00000000000d', '+50490000004', '{"full_name":"Cliente Dos"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'merchant' where id = '00000000-0000-0000-0000-00000000000b';

insert into public.merchants (id, name, category, address, zone, lat, lng, status, commission_rate)
values ('11111111-1111-1111-1111-111111111111', 'Panadería Prueba', 'panaderia', 'Col. Palmira', 'Palmira', 14.09, -87.19, 'active', 0.25);
insert into public.merchant_members values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'owner');

-- ---- Como COMERCIO: publicar oferta de 3 bolsas
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
insert into public.offers (id, merchant_id, category, price_hnl, original_value_hnl, quantity_total, pickup_start, pickup_end)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'panaderia', 90, 250, 3,
        now() + interval '3 hours', now() + interval '4 hours');
-- comercio intenta subirse... cambiar comisión (debe ignorarse)
update public.merchants set commission_rate = 0.01 where id = '11111111-1111-1111-1111-111111111111';
select 'comision sigue 0.25' as chk, commission_rate = 0.25 as ok from public.merchants;

-- ---- Como CLIENTE 1: ve feed y reserva 2
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', false);
select 'feed' as chk, merchant_name, quantity_available from public.offer_feed;
select 'reserva c1' as chk, status, total_hnl, commission_hnl, merchant_net_hnl from public.reserve_order('22222222-2222-2222-2222-222222222222', 2);

-- ---- Como CLIENTE 2: reserva 2 -> debe fallar sold_out
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', false);
do $$ begin
  perform public.reserve_order('22222222-2222-2222-2222-222222222222', 2);
  raise exception 'FALLO: debió dar sold_out';
exception when others then
  if sqlerrm <> 'sold_out' then raise; end if;
  raise notice 'OK sold_out';
end $$;
-- cliente 2 no puede ver pedido de cliente 1
select 'c2 ve pedidos ajenos (debe ser 0)' as chk, count(*) from public.orders;
-- cliente 2 no puede llamar confirm_payment
do $$ begin
  perform public.confirm_payment(gen_random_uuid(), 'mock', 'x');
  raise exception 'FALLO: confirm_payment no debe ser ejecutable por clientes';
exception when insufficient_privilege then raise notice 'OK confirm_payment protegido';
end $$;
select 'reserva c2 (1)' as chk, status from public.reserve_order('22222222-2222-2222-2222-222222222222', 1);

-- ---- Webhook (service role): confirmar pago del cliente 1
reset role;
select set_config('request.jwt.claims', '', false);
select 'pago c1' as chk, status from public.confirm_payment(
  (select id from public.orders where customer_id = '00000000-0000-0000-0000-00000000000c'), 'mock', 'PAY-1');
-- idempotente
select 'pago c1 repetido' as chk, status from public.confirm_payment(
  (select id from public.orders where customer_id = '00000000-0000-0000-0000-00000000000c'), 'mock', 'PAY-1');

-- Simular que la reserva de cliente 2 venció
update public.orders set reservation_expires_at = now() - interval '1 minute'
 where customer_id = '00000000-0000-0000-0000-00000000000d';
select 'expiradas' as chk, public.expire_pending_orders();
select 'reservadas tras expirar (2)' as chk, quantity_reserved from public.offers;

-- ---- COMERCIO intenta tocar inventario directo (debe ignorarse) y valida código
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
update public.offers set quantity_reserved = 0 where id = '22222222-2222-2222-2222-222222222222';
select 'inventario protegido (2)' as chk, quantity_reserved from public.offers;
select 'redimir' as chk, status from public.redeem_pickup_code('22222222-2222-2222-2222-222222222222',
  (select pickup_code from public.orders where customer_id = '00000000-0000-0000-0000-00000000000c'));

-- ---- CLIENTE 1 deja reseña
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', false);
insert into public.reviews (order_id, merchant_id, customer_id, rating, comment)
select id, merchant_id, customer_id, 5, 'Riquísimo' from public.orders where customer_id = '00000000-0000-0000-0000-00000000000c';

-- ---- Cierre (cron): forzar fin de franja
reset role;
select set_config('request.jwt.claims', '', false);
update public.offers set pickup_start = now() - interval '3 hours', pickup_end = now() - interval '2 hours';
select 'cerradas' as chk, public.close_expired_offers();
select 'sobrante (1)' as chk, status, quantity_unsold from public.offers;

-- Comercio declara destino del sobrante; 'donated' bloqueado en MVP
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
select public.set_leftover_disposition('22222222-2222-2222-2222-222222222222', 'kept_by_merchant');
do $$ begin
  perform public.set_leftover_disposition('22222222-2222-2222-2222-222222222222', 'donated');
  raise exception 'FALLO: donated debe estar bloqueado';
exception when others then
  if sqlerrm <> 'donation_not_enabled' then raise; end if;
  raise notice 'OK donación bloqueada en MVP';
end $$;

-- ---- Liquidación
reset role;
select set_config('request.jwt.claims', '', false);
select 'payouts' as chk, public.generate_payouts(current_date - 7, current_date + 1);
select 'payout' as chk, gross_hnl, commission_hnl, net_hnl from public.payouts;
select 'eventos' as chk, count(*) from public.order_events;

-- ---- Plantillas
insert into public.offer_templates (merchant_id, category, price_hnl, original_value_hnl, quantity, weekdays, pickup_start_local, pickup_end_local)
values ('11111111-1111-1111-1111-111111111111', 'panaderia', 80, 200, 5, '{0,1,2,3,4,5,6}', '17:00', '18:00');
select 'generadas' as chk, public.generate_offers_from_templates();
select 'generadas otra vez (0)' as chk, public.generate_offers_from_templates();
select 'TODO OK' as resultado;
