-- =====================================================================
-- MVP: marketplace de "bolsas sorpresa" con excedentes de comida (Honduras)
-- Migración inicial. Moneda: Lempiras (HNL). Zona horaria: America/Tegucigalpa.
-- La DONACIÓN no está en el MVP, pero el esquema la deja preparada:
-- cada oferta cerrada registra cuántas bolsas sobraron y su destino.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('customer', 'merchant', 'admin');
create type public.merchant_status as enum ('pending', 'active', 'suspended');
create type public.merchant_member_role as enum ('owner', 'staff');
create type public.food_category as enum (
  'panaderia', 'reposteria', 'comida_rapida', 'restaurante', 'cafeteria',
  'supermercado', 'frutas_verduras', 'hotel_bufe', 'conveniencia', 'otro'
);
create type public.offer_status as enum ('draft', 'published', 'closed', 'cancelled');
-- Destino de las bolsas no vendidas. 'donated' se usará en la fase de donación.
create type public.leftover_disposition as enum ('unknown', 'kept_by_merchant', 'discarded', 'donated');
create type public.order_status as enum (
  'pending_payment',       -- reservado, esperando pago (expira)
  'paid',                  -- pagado, esperando recogida
  'picked_up',             -- recogido (código validado)
  'no_show',               -- cliente no llegó; sin reembolso
  'cancelled_by_customer', -- antes del corte permitido
  'cancelled_by_merchant', -- reembolso automático
  'expired',               -- reserva no pagada a tiempo
  'refunded'               -- reembolso manual (queja de calidad, etc.)
);
create type public.payout_status as enum ('pending', 'paid', 'failed');

-- ---------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,               -- formato +504XXXXXXXX
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Comercios
-- ---------------------------------------------------------------------
create table public.merchants (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,             -- nombre comercial
  legal_name        text,                      -- razón social (facturación)
  rtn               text,                      -- RTN ante el SAR
  category          public.food_category not null default 'otro',
  description       text,
  address           text not null,
  city              text not null default 'Tegucigalpa',
  zone              text,                      -- colonia / zona del piloto
  lat               double precision not null,
  lng               double precision not null,
  whatsapp          text,
  logo_url          text,
  cover_url         text,
  has_parking       boolean not null default false,
  commission_rate   numeric(5,4) not null default 0.25 check (commission_rate between 0 and 1),
  status            public.merchant_status not null default 'pending',
  -- Preparado para la fase de donación (no se usa en el MVP)
  donation_opt_in   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index merchants_status_idx on public.merchants(status);
create index merchants_geo_idx on public.merchants(lat, lng);

create table public.merchant_members (
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        public.merchant_member_role not null default 'staff',
  created_at  timestamptz not null default now(),
  primary key (merchant_id, user_id)
);
create index merchant_members_user_idx on public.merchant_members(user_id);

-- ---------------------------------------------------------------------
-- Plantillas recurrentes ("lunes a viernes, 5 bolsas, 5-6 pm")
-- ---------------------------------------------------------------------
create table public.offer_templates (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references public.merchants(id) on delete cascade,
  title               text not null default 'Bolsa sorpresa',
  description         text,
  category            public.food_category not null,
  price_hnl           numeric(10,2) not null check (price_hnl > 0),
  original_value_hnl  numeric(10,2) not null check (original_value_hnl > 0),
  quantity            int not null check (quantity > 0),
  weekdays            smallint[] not null,     -- 0=domingo ... 6=sábado
  pickup_start_local  time not null,
  pickup_end_local    time not null,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  check (pickup_end_local > pickup_start_local),
  check (original_value_hnl >= price_hnl)
);

-- ---------------------------------------------------------------------
-- Ofertas del día (lo que ve el cliente)
-- ---------------------------------------------------------------------
create table public.offers (
  id                    uuid primary key default gen_random_uuid(),
  merchant_id           uuid not null references public.merchants(id) on delete cascade,
  template_id           uuid references public.offer_templates(id) on delete set null,
  title                 text not null default 'Bolsa sorpresa',
  description           text,
  category              public.food_category not null,
  allergens_note        text,                  -- "puede contener gluten, lácteos..."
  price_hnl             numeric(10,2) not null check (price_hnl > 0),
  original_value_hnl    numeric(10,2) not null check (original_value_hnl > 0),
  quantity_total        int not null check (quantity_total > 0),
  quantity_reserved     int not null default 0 check (quantity_reserved >= 0),
  pickup_start          timestamptz not null,
  pickup_end            timestamptz not null,
  status                public.offer_status not null default 'published',
  -- Al cerrar: registro del sobrante (base de la fase de donación)
  closed_at             timestamptz,
  quantity_unsold       int check (quantity_unsold >= 0),
  leftover_disposition  public.leftover_disposition not null default 'unknown',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (pickup_end > pickup_start),
  check (original_value_hnl >= price_hnl),
  check (quantity_reserved <= quantity_total)
);
create index offers_feed_idx on public.offers(status, pickup_end);
create index offers_merchant_idx on public.offers(merchant_id, pickup_start desc);

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  offer_id            uuid not null references public.offers(id),
  merchant_id         uuid not null references public.merchants(id),
  customer_id         uuid not null references public.profiles(id),
  quantity            int not null check (quantity between 1 and 5),
  unit_price_hnl      numeric(10,2) not null,
  total_hnl           numeric(10,2) not null,
  commission_rate     numeric(5,4) not null,   -- snapshot al momento de compra
  commission_hnl      numeric(10,2) not null,
  merchant_net_hnl    numeric(10,2) not null,
  status              public.order_status not null default 'pending_payment',
  pickup_code         text not null,           -- 6 dígitos, se muestra con QR
  reservation_expires_at timestamptz,          -- para pending_payment
  payment_provider    text,                    -- 'mock' hasta elegir pasarela
  payment_ref         text,
  paid_at             timestamptz,
  picked_up_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  payout_id           uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (merchant_id, pickup_code, offer_id)
);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_offer_idx on public.orders(offer_id);
create index orders_merchant_status_idx on public.orders(merchant_id, status);
create unique index orders_payment_ref_uidx on public.orders(payment_provider, payment_ref) where payment_ref is not null;

-- Bitácora inmutable de cambios de estado (auditoría y soporte)
create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  actor_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on public.order_events(order_id);

-- ---------------------------------------------------------------------
-- Reseñas, favoritos, push
-- ---------------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references public.orders(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  hidden      boolean not null default false,     -- moderación admin
  created_at  timestamptz not null default now()
);
create index reviews_merchant_idx on public.reviews(merchant_id);

create table public.favorites (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (customer_id, merchant_id)
);

create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  platform    text check (platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Liquidaciones semanales a comercios
-- ---------------------------------------------------------------------
create table public.payouts (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references public.merchants(id),
  period_start  date not null,
  period_end    date not null,
  gross_hnl     numeric(12,2) not null default 0,
  commission_hnl numeric(12,2) not null default 0,
  net_hnl       numeric(12,2) not null default 0,
  status        public.payout_status not null default 'pending',
  paid_at       timestamptz,
  reference     text,                          -- # transferencia
  created_at    timestamptz not null default now(),
  unique (merchant_id, period_start, period_end)
);
alter table public.orders
  add constraint orders_payout_fk foreign key (payout_id) references public.payouts(id);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch  before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger merchants_touch before update on public.merchants for each row execute function public.touch_updated_at();
create trigger offers_touch    before update on public.offers    for each row execute function public.touch_updated_at();
create trigger orders_touch    before update on public.orders    for each row execute function public.touch_updated_at();

-- Registrar cada cambio de estado de un pedido
create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into order_events(order_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into order_events(order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger orders_log_status after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- ---------------------------------------------------------------------
-- Helpers de permisos
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_merchant_member(p_merchant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchant_members where merchant_id = p_merchant and user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Lógica de negocio (RPC). Toda mutación sensible pasa por aquí.
-- ---------------------------------------------------------------------

-- Reservar bolsas de forma atómica (evita sobreventa). Crea pedido pending_payment.
create or replace function public.reserve_order(p_offer uuid, p_quantity int default 1)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_offer offers;
  v_merchant merchants;
  v_order orders;
  v_total numeric(10,2);
  v_comm numeric(10,2);
  v_code text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_quantity < 1 or p_quantity > 5 then raise exception 'invalid_quantity'; end if;

  perform set_config('app.rpc', 'on', true);
  select * into v_offer from offers where id = p_offer for update;
  if not found then raise exception 'offer_not_found'; end if;
  if v_offer.status <> 'published' then raise exception 'offer_not_available'; end if;
  if now() >= v_offer.pickup_end then raise exception 'offer_expired'; end if;
  if v_offer.quantity_total - v_offer.quantity_reserved < p_quantity then
    raise exception 'sold_out';
  end if;

  select * into v_merchant from merchants where id = v_offer.merchant_id;
  if v_merchant.status <> 'active' then raise exception 'merchant_inactive'; end if;

  v_total := v_offer.price_hnl * p_quantity;
  v_comm  := round(v_total * v_merchant.commission_rate, 2);

  -- código de 6 dígitos único dentro de la oferta
  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from orders where offer_id = p_offer and pickup_code = v_code);
  end loop;

  update offers set quantity_reserved = quantity_reserved + p_quantity where id = p_offer;

  insert into orders (offer_id, merchant_id, customer_id, quantity, unit_price_hnl, total_hnl,
                      commission_rate, commission_hnl, merchant_net_hnl, status, pickup_code,
                      reservation_expires_at)
  values (p_offer, v_offer.merchant_id, auth.uid(), p_quantity, v_offer.price_hnl, v_total,
          v_merchant.commission_rate, v_comm, v_total - v_comm, 'pending_payment', v_code,
          now() + interval '10 minutes')
  returning * into v_order;

  return v_order;
end $$;

-- Libera inventario de un pedido (uso interno)
create or replace function public._release_inventory(p_order orders)
returns void language sql security definer set search_path = public as $$
  select set_config('app.rpc', 'on', true);
  update offers set quantity_reserved = greatest(quantity_reserved - p_order.quantity, 0)
  where id = p_order.offer_id;
$$;

-- Confirmar pago. SOLO lo llama el webhook de la pasarela (service_role), nunca el cliente.
create or replace function public.confirm_payment(p_order uuid, p_provider text, p_ref text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  select * into v_order from orders where id = p_order for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status = 'paid' and v_order.payment_ref = p_ref then
    return v_order; -- idempotente
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'invalid_state:%', v_order.status;  -- pago tardío: reembolsar en la pasarela
  end if;
  update orders set status = 'paid', payment_provider = p_provider, payment_ref = p_ref,
                    paid_at = now(), reservation_expires_at = null
  where id = p_order returning * into v_order;
  return v_order;
end $$;

-- Expirar reservas no pagadas (cron cada minuto)
create or replace function public.expire_pending_orders()
returns int language plpgsql security definer set search_path = public as $$
declare r orders; n int := 0;
begin
  for r in select * from orders
           where status = 'pending_payment' and reservation_expires_at < now()
           for update skip locked
  loop
    update orders set status = 'expired' where id = r.id;
    perform _release_inventory(r);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Cliente cancela (solo pagado y hasta 2 horas antes del inicio de recogida)
create or replace function public.cancel_order_by_customer(p_order uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders; v_offer offers;
begin
  select * into v_order from orders where id = p_order for update;
  if not found or v_order.customer_id <> auth.uid() then raise exception 'order_not_found'; end if;
  select * into v_offer from offers where id = v_order.offer_id;
  if v_order.status = 'pending_payment' then
    update orders set status = 'cancelled_by_customer', cancelled_at = now() where id = p_order returning * into v_order;
  elsif v_order.status = 'paid' and now() < v_offer.pickup_start - interval '2 hours' then
    -- el reembolso lo ejecuta la edge function al ver este estado
    update orders set status = 'cancelled_by_customer', cancelled_at = now() where id = p_order returning * into v_order;
  else
    raise exception 'cannot_cancel';
  end if;
  perform _release_inventory(v_order);
  return v_order;
end $$;

-- Comercio cancela la oferta completa (p.ej. no tuvo sobrante). Reembolso automático.
create or replace function public.cancel_offer_by_merchant(p_offer uuid, p_reason text)
returns int
language plpgsql security definer set search_path = public as $$
declare v_offer offers; n int;
begin
  perform set_config('app.rpc', 'on', true);
  select * into v_offer from offers where id = p_offer for update;
  if not found or not (is_merchant_member(v_offer.merchant_id) or is_admin()) then
    raise exception 'forbidden';
  end if;
  if v_offer.status <> 'published' then raise exception 'invalid_state'; end if;
  update orders set status = 'cancelled_by_merchant', cancelled_at = now(), cancel_reason = p_reason
  where offer_id = p_offer and status in ('pending_payment', 'paid');
  get diagnostics n = row_count;
  update offers set status = 'cancelled', quantity_reserved = 0 where id = p_offer;
  return n; -- pedidos afectados (la edge function reembolsa los que estaban pagados)
end $$;

-- Comercio valida el código de recogida
create or replace function public.redeem_pickup_code(p_offer uuid, p_code text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  select * into v_order from orders where offer_id = p_offer and pickup_code = p_code for update;
  if not found then raise exception 'code_not_found'; end if;
  if not (is_merchant_member(v_order.merchant_id) or is_admin()) then raise exception 'forbidden'; end if;
  if v_order.status = 'picked_up' then raise exception 'already_redeemed'; end if;
  if v_order.status <> 'paid' then raise exception 'invalid_state:%', v_order.status; end if;
  update orders set status = 'picked_up', picked_up_at = now() where id = v_order.id returning * into v_order;
  return v_order;
end $$;

-- Cerrar ofertas vencidas (cron cada 5 min): no-shows + registro de sobrante
create or replace function public.close_expired_offers()
returns int language plpgsql security definer set search_path = public as $$
declare r offers; n int := 0; v_sold int;
begin
  perform set_config('app.rpc', 'on', true);
  for r in select * from offers
           where status = 'published' and pickup_end + interval '30 minutes' < now()
           for update skip locked
  loop
    update orders set status = 'no_show' where offer_id = r.id and status = 'paid';
    update orders set status = 'expired' where offer_id = r.id and status = 'pending_payment';
    select coalesce(sum(quantity), 0) into v_sold from orders
      where offer_id = r.id and status in ('picked_up', 'no_show');
    update offers set status = 'closed', closed_at = now(),
                      quantity_unsold = greatest(quantity_total - v_sold, 0)
    where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Comercio declara qué hizo con el sobrante (dato clave para la futura fase de donación)
create or replace function public.set_leftover_disposition(p_offer uuid, p_disposition public.leftover_disposition)
returns void language plpgsql security definer set search_path = public as $$
declare v_offer offers;
begin
  perform set_config('app.rpc', 'on', true);
  select * into v_offer from offers where id = p_offer;
  if not found or not (is_merchant_member(v_offer.merchant_id) or is_admin()) then raise exception 'forbidden'; end if;
  if v_offer.status <> 'closed' then raise exception 'offer_not_closed'; end if;
  if p_disposition = 'donated' and not is_admin() then raise exception 'donation_not_enabled'; end if;
  update offers set leftover_disposition = p_disposition where id = p_offer;
end $$;

-- Crear las ofertas del día desde plantillas (cron diario 6:00 am hora HN)
create or replace function public.generate_offers_from_templates(p_date date default (now() at time zone 'America/Tegucigalpa')::date)
returns int language plpgsql security definer set search_path = public as $$
declare t offer_templates; n int := 0;
begin
  for t in select ot.* from offer_templates ot join merchants m on m.id = ot.merchant_id
           where ot.active and m.status = 'active'
             and extract(dow from p_date)::smallint = any(ot.weekdays)
             and not exists (select 1 from offers o where o.template_id = ot.id
                             and (o.pickup_start at time zone 'America/Tegucigalpa')::date = p_date)
  loop
    insert into offers (merchant_id, template_id, title, description, category, price_hnl,
                        original_value_hnl, quantity_total, pickup_start, pickup_end)
    values (t.merchant_id, t.id, t.title, t.description, t.category, t.price_hnl, t.original_value_hnl,
            t.quantity,
            (p_date + t.pickup_start_local) at time zone 'America/Tegucigalpa',
            (p_date + t.pickup_end_local)   at time zone 'America/Tegucigalpa');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Generar liquidaciones de la semana (cron lunes). Incluye recogidos + no-shows.
create or replace function public.generate_payouts(p_start date, p_end date)
returns int language plpgsql security definer set search_path = public as $$
declare r record; v_payout uuid; n int := 0;
begin
  for r in select merchant_id, sum(total_hnl) gross, sum(commission_hnl) comm, sum(merchant_net_hnl) net
           from orders
           where status in ('picked_up', 'no_show') and payout_id is null
             and (paid_at at time zone 'America/Tegucigalpa')::date between p_start and p_end
           group by merchant_id
  loop
    insert into payouts (merchant_id, period_start, period_end, gross_hnl, commission_hnl, net_hnl)
    values (r.merchant_id, p_start, p_end, r.gross, r.comm, r.net)
    on conflict (merchant_id, period_start, period_end) do nothing
    returning id into v_payout;
    if v_payout is not null then
      update orders set payout_id = v_payout
      where merchant_id = r.merchant_id and status in ('picked_up', 'no_show') and payout_id is null
        and (paid_at at time zone 'America/Tegucigalpa')::date between p_start and p_end;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Funciones internas / de servicio: no ejecutables por clientes
revoke execute on function public.confirm_payment(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.expire_pending_orders() from public, anon, authenticated;
revoke execute on function public.close_expired_offers() from public, anon, authenticated;
revoke execute on function public.generate_offers_from_templates(date) from public, anon, authenticated;
revoke execute on function public.generate_payouts(date, date) from public, anon, authenticated;
revoke execute on function public._release_inventory(public.orders) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Vista pública del feed (solo ofertas visibles, con disponibilidad y rating)
-- ---------------------------------------------------------------------
create or replace view public.offer_feed with (security_invoker = true) as
select o.id, o.merchant_id, m.name as merchant_name, m.logo_url, m.cover_url, m.address, m.zone,
       m.lat, m.lng, m.has_parking, o.title, o.description, o.category, o.allergens_note,
       o.price_hnl, o.original_value_hnl,
       (o.quantity_total - o.quantity_reserved) as quantity_available,
       o.pickup_start, o.pickup_end,
       (select round(avg(rating)::numeric, 1) from reviews rv where rv.merchant_id = m.id and not rv.hidden) as rating_avg,
       (select count(*) from reviews rv where rv.merchant_id = m.id and not rv.hidden) as rating_count
from offers o join merchants m on m.id = o.merchant_id
where o.status = 'published' and m.status = 'active' and o.pickup_end > now();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.merchants        enable row level security;
alter table public.merchant_members enable row level security;
alter table public.offer_templates  enable row level security;
alter table public.offers           enable row level security;
alter table public.orders           enable row level security;
alter table public.order_events     enable row level security;
alter table public.reviews          enable row level security;
alter table public.favorites        enable row level security;
alter table public.push_tokens      enable row level security;
alter table public.payouts          enable row level security;

-- profiles
create policy profiles_self_read   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy profiles_admin_all   on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- merchants: público ve activos; miembros ven el suyo; admin todo
create policy merchants_public_read on public.merchants for select
  using (status = 'active' or public.is_merchant_member(id) or public.is_admin());
create policy merchants_member_update on public.merchants for update
  using (public.is_merchant_member(id))
  with check (public.is_merchant_member(id));
create policy merchants_admin_all on public.merchants for all using (public.is_admin()) with check (public.is_admin());

-- Un comercio no puede cambiarse la comisión, estado ni RTN por sí mismo
create or replace function public.guard_merchant_fields()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    new.commission_rate := old.commission_rate;
    new.status := old.status;
    new.rtn := old.rtn;
    new.legal_name := old.legal_name;
  end if;
  return new;
end $$;
create trigger merchants_guard before update on public.merchants
  for each row execute function public.guard_merchant_fields();

-- merchant_members
create policy members_read on public.merchant_members for select
  using (user_id = auth.uid() or public.is_merchant_member(merchant_id) or public.is_admin());
create policy members_admin_all on public.merchant_members for all using (public.is_admin()) with check (public.is_admin());

-- offer_templates
create policy templates_member_all on public.offer_templates for all
  using (public.is_merchant_member(merchant_id) or public.is_admin())
  with check (public.is_merchant_member(merchant_id) or public.is_admin());

-- offers: público lee publicadas de comercios activos; miembros gestionan las suyas
create policy offers_public_read on public.offers for select
  using ((status = 'published' and exists (select 1 from public.merchants m where m.id = merchant_id and m.status = 'active'))
         or public.is_merchant_member(merchant_id) or public.is_admin());
create policy offers_member_insert on public.offers for insert
  with check ((public.is_merchant_member(merchant_id) or public.is_admin()) and quantity_reserved = 0);
create policy offers_member_update on public.offers for update
  using ((public.is_merchant_member(merchant_id) and status in ('draft', 'published')) or public.is_admin())
  with check (public.is_merchant_member(merchant_id) or public.is_admin());

-- Protección: el comercio no puede tocar inventario reservado ni cierres directamente
create or replace function public.guard_offer_fields()
returns trigger language plpgsql as $$
begin
  -- Las RPC de este archivo marcan app.rpc='on' y se saltan la protección.
  if coalesce(current_setting('app.rpc', true), '') <> 'on'
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role', '') = 'authenticated'
     and not public.is_admin() then
    new.quantity_reserved := old.quantity_reserved;
    new.quantity_unsold := old.quantity_unsold;
    new.closed_at := old.closed_at;
    new.leftover_disposition := old.leftover_disposition;
    if new.status in ('closed', 'cancelled') and new.status <> old.status then
      raise exception 'use_rpc_to_close_or_cancel';
    end if;
    if new.quantity_total < old.quantity_reserved then
      raise exception 'quantity_below_reserved';
    end if;
    if old.quantity_reserved > 0 and (new.price_hnl <> old.price_hnl or new.pickup_start <> old.pickup_start or new.pickup_end <> old.pickup_end) then
      raise exception 'cannot_change_terms_with_orders';
    end if;
  end if;
  return new;
end $$;
create trigger offers_guard before update on public.offers
  for each row execute function public.guard_offer_fields();

-- orders: solo lectura para cliente y comercio; escritura vía RPC
create policy orders_read on public.orders for select
  using (customer_id = auth.uid() or public.is_merchant_member(merchant_id) or public.is_admin());
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());

create policy order_events_read on public.order_events for select
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id
         and (o.customer_id = auth.uid() or public.is_merchant_member(o.merchant_id))));

-- reviews: público lee no ocultas; cliente reseña su pedido recogido
create policy reviews_public_read on public.reviews for select using (not hidden or public.is_admin());
create policy reviews_customer_insert on public.reviews for insert
  with check (customer_id = auth.uid() and exists (
    select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
      and o.status = 'picked_up' and o.merchant_id = reviews.merchant_id));
create policy reviews_admin_update on public.reviews for update using (public.is_admin()) with check (public.is_admin());

-- favorites / push_tokens: propios
create policy favorites_own on public.favorites for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy push_tokens_own on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- payouts: comercio lee los suyos; admin gestiona
create policy payouts_read on public.payouts for select
  using (public.is_merchant_member(merchant_id) or public.is_admin());
create policy payouts_admin_all on public.payouts for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Cron (requiere extensión pg_cron habilitada en Supabase: Database > Extensions)
-- Ejecutar por separado una vez habilitada:
--   select cron.schedule('expire-pending', '* * * * *', 'select public.expire_pending_orders()');
--   select cron.schedule('close-offers', '*/5 * * * *', 'select public.close_expired_offers()');
--   select cron.schedule('daily-offers', '0 12 * * *', 'select public.generate_offers_from_templates()'); -- 6:00 am HN (UTC-6)
--   select cron.schedule('weekly-payouts', '0 13 * * 1', $$select public.generate_payouts(current_date - 7, current_date - 1)$$);
-- ---------------------------------------------------------------------
