-- =====================================================================
-- Vista para la app y el panel: pedidos con datos de oferta y comercio.
-- Los clientes no pueden leer ofertas cerradas por RLS (offers_public_read),
-- así que el historial necesita una vista con su propio filtro de acceso.
-- La vista corre como su dueño (sin security_invoker) y filtra por auth.uid().
-- =====================================================================
create or replace view public.order_summaries as
select
  o.id, o.offer_id, o.merchant_id, o.customer_id, o.quantity, o.unit_price_hnl, o.total_hnl,
  o.commission_hnl, o.merchant_net_hnl, o.status, o.pickup_code, o.reservation_expires_at,
  o.payment_provider, o.payment_ref, o.paid_at, o.picked_up_at, o.cancelled_at, o.cancel_reason,
  o.payout_id, o.created_at, o.updated_at,
  f.title       as offer_title,
  f.category    as category,
  f.original_value_hnl,
  f.pickup_start,
  f.pickup_end,
  f.status      as offer_status,
  m.name        as merchant_name,
  m.address     as merchant_address,
  m.zone        as merchant_zone,
  m.lat         as merchant_lat,
  m.lng         as merchant_lng,
  m.whatsapp    as merchant_whatsapp,
  m.logo_url    as merchant_logo_url,
  m.cover_url   as merchant_cover_url,
  p.full_name   as customer_name,
  p.phone       as customer_phone,
  (f.original_value_hnl * o.quantity - o.total_hnl) as saved_hnl,
  exists (select 1 from public.reviews r where r.order_id = o.id) as has_review
from public.orders o
join public.offers f on f.id = o.offer_id
join public.merchants m on m.id = o.merchant_id
left join public.profiles p on p.id = o.customer_id
where o.customer_id = auth.uid()
   or public.is_merchant_member(o.merchant_id)
   or public.is_admin();

revoke all on public.order_summaries from anon;
grant select on public.order_summaries to authenticated, service_role;
