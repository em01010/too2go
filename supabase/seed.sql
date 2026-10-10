-- =====================================================================
-- Seed de desarrollo local (se aplica con `supabase db reset`).
-- NO usar en producción. Teléfonos y OTP de prueba coinciden con config.toml
-- ([auth.sms.test_otp]): todos inician sesión con el código 123456.
--
--   +50490000001  Admin
--   +50490000002  Dueña de Panadería La Palmira (Col. Palmira)
--   +50490000003  Dueño de Café Los Próceres (Blvd. Los Próceres)
--   +50490000004  Dueña de Tienda Express Morazán (Blvd. Morazán)
--   +50490000005  Cliente: Carlos Mejía
--   +50490000006  Cliente: Ana Flores
-- =====================================================================
set client_min_messages = warning;

-- ---------------------------------------------------------------------
-- Usuarios de auth (el trigger on_auth_user_created crea los perfiles)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, phone, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.phone, now(),
  '{"provider":"phone","providers":["phone"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name),
  false, false, now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, '50490000001', 'Admin Too2Go'),
  ('b0000000-0000-4000-8000-000000000001'::uuid, '50490000002', 'Marta Rodríguez'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, '50490000003', 'José Carías'),
  ('b0000000-0000-4000-8000-000000000003'::uuid, '50490000004', 'Lucía Hernández'),
  ('c0000000-0000-4000-8000-000000000001'::uuid, '50490000005', 'Carlos Mejía'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, '50490000006', 'Ana Flores')
) as u(id, phone, full_name);

insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, 'phone', phone,
       jsonb_build_object('sub', id::text, 'phone', phone, 'phone_verified', true),
       now(), now(), now()
from auth.users where phone like '5049000000%';

-- Perfiles: el trigger guarda el teléfono tal como viene de auth (sin '+'); lo normalizamos a E.164.
update public.profiles set phone = '+' || phone where phone not like '+%';
update public.profiles set role = 'admin'    where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'merchant' where id in (
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000003');

-- ---------------------------------------------------------------------
-- Comercios activos en Tegucigalpa (coordenadas aproximadas reales)
-- ---------------------------------------------------------------------
insert into public.merchants (id, name, legal_name, rtn, category, description, address, city, zone, lat, lng, whatsapp, has_parking, commission_rate, status)
values
  ('11111111-0000-4000-8000-000000000001', 'Panadería La Palmira', 'Panificadora La Palmira S. de R.L.', '08019995123456',
   'panaderia', 'Pan artesanal, semitas y repostería del día. Lo que no se vende por la tarde va en la bolsa sorpresa.',
   'Av. República de Chile, frente al parque, Col. Palmira', 'Tegucigalpa', 'Palmira', 14.0968, -87.1947, '+50499001001', false, 0.25, 'active'),
  ('11111111-0000-4000-8000-000000000002', 'Café Los Próceres', 'Cafés de Altura S.A.', '08019995654321',
   'cafeteria', 'Café de Marcala, sándwiches y pasteles. Bolsa sorpresa con lo que quedó del mostrador.',
   'Blvd. Los Próceres, contiguo a gasolinera, Col. Lomas del Guijarro', 'Tegucigalpa', 'Los Próceres', 14.0893, -87.1872, '+50499001002', true, 0.25, 'active'),
  ('11111111-0000-4000-8000-000000000003', 'Tienda Express Morazán', 'Inversiones Morazán S. de R.L.', '08019995789012',
   'conveniencia', 'Tienda de conveniencia 24/7. Bolsa con lácteos, frutas y snacks próximos a vencer en buen estado.',
   'Blvd. Morazán, plaza comercial frente a Hospital Honduras Medical Center', 'Tegucigalpa', 'Blvd. Morazán', 14.0953, -87.1816, '+50499001003', true, 0.20, 'active');

insert into public.merchant_members (merchant_id, user_id, role) values
  ('11111111-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'owner'),
  ('11111111-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'owner'),
  ('11111111-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'owner');

-- ---------------------------------------------------------------------
-- Plantillas recurrentes (las usa el cron diario y la pantalla Plantillas)
-- ---------------------------------------------------------------------
insert into public.offer_templates (id, merchant_id, title, description, category, price_hnl, original_value_hnl, quantity, weekdays, pickup_start_local, pickup_end_local)
values
  ('33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'Bolsa de pan del día',
   'Mezcla de pan dulce, semitas y pan de molde. Puede contener gluten, lácteos y huevo.',
   'panaderia', 90, 250, 5, '{1,2,3,4,5,6}', '17:00', '18:00'),
  ('33333333-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002', 'Bolsa de cafetería',
   'Sándwiches, croissants y una porción de pastel. Puede contener gluten, lácteos y frutos secos.',
   'cafeteria', 120, 320, 4, '{1,2,3,4,5}', '16:30', '17:30'),
  ('33333333-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000003', 'Bolsa de conveniencia',
   'Lácteos, frutas y snacks cerca de su fecha de vencimiento, en buen estado.',
   'conveniencia', 75, 200, 6, '{0,1,2,3,4,5,6}', '20:00', '21:30');

-- ---------------------------------------------------------------------
-- Ofertas para HOY. Si la hora local ya pasó, la franja se corre para que
-- empiece dentro de 90 minutos (así el feed siempre muestra algo al probar).
-- ---------------------------------------------------------------------
do $$
declare
  v_today date := (now() at time zone 'America/Tegucigalpa')::date;
  v_min   timestamptz := now() + interval '90 minutes';
  v_start timestamptz;
begin
  -- Panadería La Palmira: 5 bolsas, 5:00–6:00 pm
  v_start := greatest((v_today + time '17:00') at time zone 'America/Tegucigalpa', v_min);
  insert into public.offers (id, merchant_id, template_id, title, description, category, allergens_note, price_hnl, original_value_hnl, quantity_total, pickup_start, pickup_end)
  values ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001',
          'Bolsa de pan del día', 'Mezcla de pan dulce, semitas y pan de molde recién horneado hoy.',
          'panaderia', 'Puede contener gluten, lácteos y huevo.', 90, 250, 5, v_start, v_start + interval '1 hour');

  -- Café Los Próceres: 4 bolsas, 4:30–5:30 pm
  v_start := greatest((v_today + time '16:30') at time zone 'America/Tegucigalpa', v_min);
  insert into public.offers (id, merchant_id, template_id, title, description, category, allergens_note, price_hnl, original_value_hnl, quantity_total, pickup_start, pickup_end)
  values ('22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000002',
          'Bolsa de cafetería', 'Sándwiches, croissants y una porción de pastel del mostrador de hoy.',
          'cafeteria', 'Puede contener gluten, lácteos y frutos secos.', 120, 320, 4, v_start, v_start + interval '1 hour');

  -- Tienda Express Morazán: 6 bolsas, 8:00–9:30 pm
  v_start := greatest((v_today + time '20:00') at time zone 'America/Tegucigalpa', v_min);
  insert into public.offers (id, merchant_id, template_id, title, description, category, allergens_note, price_hnl, original_value_hnl, quantity_total, pickup_start, pickup_end)
  values ('22222222-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000003',
          'Bolsa de conveniencia', 'Lácteos, frutas y snacks cerca de su fecha de vencimiento, en buen estado.',
          'conveniencia', 'Revisá las etiquetas de cada producto.', 75, 200, 6, v_start, v_start + interval '90 minutes');
end $$;

-- ---------------------------------------------------------------------
-- Historial: una oferta de AYER ya cerrada, con un pedido recogido por Carlos
-- (sirve para el historial, el contador de ahorro, reseñas y liquidaciones).
-- ---------------------------------------------------------------------
do $$
declare
  v_yesterday date := (now() at time zone 'America/Tegucigalpa')::date - 1;
  v_start timestamptz := (v_yesterday + time '17:00') at time zone 'America/Tegucigalpa';
  v_order_id uuid := '44444444-0000-4000-8000-000000000001';
begin
  insert into public.offers (id, merchant_id, template_id, title, description, category, allergens_note, price_hnl, original_value_hnl,
                             quantity_total, quantity_reserved, pickup_start, pickup_end, status, closed_at, quantity_unsold, leftover_disposition)
  values ('22222222-0000-4000-8000-000000000099', '11111111-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001',
          'Bolsa de pan del día', 'Mezcla de pan dulce, semitas y pan de molde.', 'panaderia', 'Puede contener gluten, lácteos y huevo.',
          90, 250, 5, 2, v_start, v_start + interval '1 hour', 'closed', v_start + interval '90 minutes', 3, 'kept_by_merchant');

  insert into public.orders (id, offer_id, merchant_id, customer_id, quantity, unit_price_hnl, total_hnl, commission_rate, commission_hnl, merchant_net_hnl,
                             status, pickup_code, payment_provider, payment_ref, paid_at, picked_up_at, created_at)
  values (v_order_id, '22222222-0000-4000-8000-000000000099', '11111111-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
          2, 90, 180, 0.25, 45, 135, 'picked_up', '482913', 'mock', 'MOCK-SEED-0001',
          v_start - interval '3 hours', v_start + interval '20 minutes', v_start - interval '3 hours');

  insert into public.reviews (order_id, merchant_id, customer_id, rating, comment)
  values (v_order_id, '11111111-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 5,
          'Riquísimo el pan y súper buena onda la atención. Volvemos seguro.');
end $$;

insert into public.favorites (customer_id, merchant_id) values
  ('c0000000-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002');
