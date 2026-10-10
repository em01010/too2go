-- =====================================================================
-- Mejoras inspiradas en Too Good To Go, adaptadas a Honduras:
--  - instrucciones de recogida por comercio
--  - etiquetas dietéticas en ofertas y plantillas
--  - etiquetas en reseñas (variedad, cantidad, calidad, atención, puntualidad)
--  - impacto comunitario público (bolsas rescatadas, lempiras ahorrados, CO2e)
-- =====================================================================

alter table public.merchants add column if not exists pickup_instructions text;

alter table public.offers add column if not exists dietary_tags text[] not null default '{}';
alter table public.offer_templates add column if not exists dietary_tags text[] not null default '{}';

alter table public.reviews add column if not exists tags text[] not null default '{}';
alter table public.reviews add constraint reviews_tags_known
  check (tags <@ array['variedad','cantidad','calidad','atencion','puntualidad']::text[]);

-- La generación diaria copia las etiquetas dietéticas de la plantilla.
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
                        original_value_hnl, quantity_total, pickup_start, pickup_end, dietary_tags)
    values (t.merchant_id, t.id, t.title, t.description, t.category, t.price_hnl, t.original_value_hnl,
            t.quantity,
            (p_date + t.pickup_start_local) at time zone 'America/Tegucigalpa',
            (p_date + t.pickup_end_local)   at time zone 'America/Tegucigalpa',
            t.dietary_tags);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Feed: se agregan columnas al final (create or replace lo permite).
create or replace view public.offer_feed with (security_invoker = true) as
select o.id, o.merchant_id, m.name as merchant_name, m.logo_url, m.cover_url, m.address, m.zone,
       m.lat, m.lng, m.has_parking, o.title, o.description, o.category, o.allergens_note,
       o.price_hnl, o.original_value_hnl,
       (o.quantity_total - o.quantity_reserved) as quantity_available,
       o.pickup_start, o.pickup_end,
       (select round(avg(rating)::numeric, 1) from reviews rv where rv.merchant_id = m.id and not rv.hidden) as rating_avg,
       (select count(*) from reviews rv where rv.merchant_id = m.id and not rv.hidden) as rating_count,
       o.dietary_tags,
       m.pickup_instructions,
       o.quantity_total,
       m.category as merchant_category,
       m.description as merchant_description,
       m.whatsapp as merchant_whatsapp
from offers o join merchants m on m.id = o.merchant_id
where o.status = 'published' and m.status = 'active' and o.pickup_end > now();

-- Impacto comunitario (público). 2.7 kg CO2e por bolsa: metodología de Too Good To Go
-- (1 bolsa ≈ 1 kg de comida rescatada ≈ 2.7 kg CO2e evitados).
create or replace function public.community_impact()
returns table (bags_rescued bigint, saved_hnl numeric, co2e_kg numeric, merchants_active bigint, customers bigint)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(o.quantity), 0)::bigint,
    coalesce(sum(f.original_value_hnl * o.quantity - o.total_hnl), 0)::numeric,
    round(coalesce(sum(o.quantity), 0) * 2.7, 1)::numeric,
    (select count(*) from merchants where status = 'active'),
    (select count(*) from profiles where role = 'customer')
  from orders o join offers f on f.id = o.offer_id
  where o.status = 'picked_up';
$$;
grant execute on function public.community_impact() to anon, authenticated;

-- Reseñas públicas con etiquetas para la página del comercio (sin exponer perfiles completos).
create or replace view public.merchant_reviews with (security_invoker = false) as
select r.id, r.merchant_id, r.rating, r.comment, r.tags, r.created_at,
       coalesce(split_part(p.full_name, ' ', 1), 'Cliente') as customer_first_name
from public.reviews r left join public.profiles p on p.id = r.customer_id
where not r.hidden;
grant select on public.merchant_reviews to anon, authenticated;
