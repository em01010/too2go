-- =====================================================================
-- Autoregistro de comercios ("Quiero vender en Too2Go").
-- El usuario autenticado crea su comercio en estado 'pending' y queda como
-- dueño; el admin lo aprueba desde el panel. Las políticas RLS no permiten a
-- usuarios normales insertar en merchants/merchant_members, por eso es una RPC.
-- =====================================================================
create or replace function public.register_merchant(
  p_name        text,
  p_category    public.food_category,
  p_address     text,
  p_zone        text default null,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_whatsapp    text default null,
  p_description text default null,
  p_has_parking boolean default false
)
returns public.merchants
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_m merchants;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from merchant_members where user_id = v_uid) then
    raise exception 'already_member';
  end if;
  if p_name is null or length(trim(p_name)) < 3 then raise exception 'invalid_name'; end if;
  if p_address is null or length(trim(p_address)) < 5 then raise exception 'invalid_address'; end if;
  -- Coordenadas dentro de Honduras (aprox.)
  if p_lat is null or p_lng is null
     or p_lat not between 12.9 and 16.6 or p_lng not between -89.4 and -83.1 then
    raise exception 'invalid_location';
  end if;

  insert into merchants (name, category, address, zone, lat, lng, whatsapp, description, has_parking, status)
  values (trim(p_name), p_category, trim(p_address), nullif(trim(p_zone), ''), p_lat, p_lng,
          nullif(trim(p_whatsapp), ''), nullif(trim(p_description), ''), coalesce(p_has_parking, false), 'pending')
  returning * into v_m;

  insert into merchant_members (merchant_id, user_id, role) values (v_m.id, v_uid, 'owner');
  update profiles set role = 'merchant' where id = v_uid and role = 'customer';
  return v_m;
end $$;

revoke execute on function public.register_merchant(text, public.food_category, text, text, double precision, double precision, text, text, boolean) from public, anon;
grant execute on function public.register_merchant(text, public.food_category, text, text, double precision, double precision, text, text, boolean) to authenticated;
