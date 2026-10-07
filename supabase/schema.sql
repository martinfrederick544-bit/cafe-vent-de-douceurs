-- =====================================================================
-- Café Vent de douceurs express — schéma COMPLET pour un NOUVEAU projet Supabase
-- À coller en entier dans Supabase > SQL Editor > New query > Run.
-- Idempotent : peut être relancé sans casser les données existantes.
--
-- Modèle de sécurité :
--   * Comptes = Supabase Auth (courriel + mot de passe, réinitialisation par courriel).
--   * Aucun accès direct en écriture aux tables : tout passe par des fonctions
--     SECURITY DEFINER qui vérifient auth.uid() / is_staff.
--   * Le staff est un compte Auth dont vd_profiles.is_staff = true (voir fin du fichier).
-- =====================================================================

-- Nettoyage (anciennes versions : code d'accès staff et gestion des rôles, remplacés par un compte staff universel)
drop function if exists public.vd_claim_staff(text);
drop function if exists public.vd_staff_set_code(text);
drop function if exists public.vd_staff_set_role(uuid, boolean);
drop table if exists public.vd_staff_attempts;
drop table if exists public.vd_staff_code;

-- ---------------------------------------------------------------------
-- 1) TABLES
-- ---------------------------------------------------------------------
create table if not exists public.vd_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  name          text not null,
  location      text not null default '',
  photo         text,                                   -- data URL JPEG ~256px
  has_photo     boolean generated always as (photo is not null and photo <> '') stored,
  is_staff      boolean not null default false,
  balance_cents int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.vd_settings (
  id                int primary key default 1 check (id = 1),
  menu              jsonb not null,
  periods           jsonb not null,
  hours             jsonb not null,
  cup_count         int  not null default 30,
  require_photo     boolean not null default false,   -- photo facultative : le staff l'ajoute au besoin
  low_balance_cents int  not null default 400,
  credit_limit_cents int not null default 1000,       -- solde négatif autorisé jusqu'à −10 $
  updated_at        timestamptz not null default now()
);

create table if not exists public.vd_orders (
  id               text primary key,
  created_at_ms    bigint not null,
  user_id          uuid references public.vd_profiles(id),
  user_name        text not null,
  default_location text,
  location         text not null,
  mode             text not null default 'deliver' check (mode in ('deliver','pickup')),
  comment          text,
  status           text not null default 'NOUVELLE' check (status in ('NOUVELLE','COMPLÉTÉE','ANNULÉE')),
  items            jsonb not null,
  total_cents      int not null,
  free_item        boolean not null default false,
  cup_numbers      int[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index if not exists vd_orders_user_idx    on public.vd_orders(user_id, created_at_ms desc);
create index if not exists vd_orders_created_idx on public.vd_orders(created_at_ms desc);

create table if not exists public.vd_cups (
  number      int primary key,
  status      text not null default 'available' check (status in ('available','in_use')),
  order_id    text references public.vd_orders(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.vd_wallet_tx (
  id             bigserial primary key,
  user_id        uuid not null references public.vd_profiles(id),
  kind           text not null check (kind in ('topup','order','refund','adjust')),
  amount_cents   int  not null,              -- + crédit / − débit
  balance_after  int  not null,
  order_id       text,
  note           text,
  created_by     uuid,
  created_at     timestamptz not null default now()
);
create index if not exists vd_wallet_tx_user_idx on public.vd_wallet_tx(user_id, created_at desc);

-- Configuration interne (URL + secret du service de notifications) — jamais lisible côté navigateur
create table if not exists public.vd_config (
  key   text primary key,
  value text not null
);

create table if not exists public.vd_push_subscriptions (
  endpoint    text not null,
  role        text not null check (role in ('staff','client')),
  p256dh      text,
  auth        text,
  user_id     uuid,
  user_name   text,
  created_at  timestamptz not null default now(),
  primary key (endpoint, role)
);

-- ---------------------------------------------------------------------
-- 2) RÉGLAGES PAR DÉFAUT (menu de lancement, périodes, horaires)
--    6 périodes (heures fournies par l'école le 2026-10-07), modifiables dans Staff > Horaires.
-- ---------------------------------------------------------------------
insert into public.vd_settings (id, menu, periods, hours)
values (
  1,
  $menu$
  {
    "syrupSurchargeCents": 50,
    "drinks": [
      {"id":"expresso",        "name":"Expresso",        "priceCents":200, "icon":"espresso.jpg",        "available":true},
      {"id":"cafe",            "name":"Café",            "priceCents":200, "icon":"cafe.jpg",            "available":true},
      {"id":"americano",       "name":"Américano",       "priceCents":200, "icon":"americano.jpg",       "available":true},
      {"id":"cappuccino",      "name":"Cappuccino",      "priceCents":200, "icon":"cappuccino.jpg",      "available":true},
      {"id":"latte-macchiato", "name":"Latte macchiato", "priceCents":200, "icon":"latte-macchiato.jpg", "available":true},
      {"id":"cafe-glace",      "name":"Café glacé",      "priceCents":200, "icon":"cafe-glace.jpg",      "available":true},
      {"id":"latte-glace",     "name":"Latte glacé",     "priceCents":200, "icon":"latte-glace.jpg",     "available":true},
      {"id":"chocolat-chaud",  "name":"Chocolat chaud",  "priceCents":200, "icon":"chocolat-chaud.jpg",  "available":true, "dairyFreeOption":true}
    ],
    "syrups": [
      {"id":"noisette", "name":"Sirop aux noisettes",                "icon":"sirop-noisette.jpg", "available":true},
      {"id":"caramel",  "name":"Sirop au caramel et fleur de sel",   "icon":"sirop-caramel.jpg",  "available":true},
      {"id":"vanille",  "name":"Sirop à la vanille",                 "icon":"sirop-vanille.jpg",  "available":true},
      {"id":"marula",   "name":"Sirop à la crème et fruit du marula","icon":"sirop-marula.jpg",   "available":true}
    ]
  }
  $menu$::jsonb,
  $per$
  [
    {"k":"P1","start":"09:00","end":"10:00"},
    {"k":"P2","start":"10:05","end":"11:05"},
    {"k":"P3","start":"11:07","end":"12:07"},
    {"k":"P4","start":"12:07","end":"13:07"},
    {"k":"P5","start":"13:10","end":"14:10"},
    {"k":"P6","start":"14:15","end":"15:15"}
  ]
  $per$::jsonb,
  $hrs$
  {"mon":["P1","P2","P3","P4","P5","P6"],"tue":["P1","P2","P3","P4","P5","P6"],"wed":["P1","P2","P3","P4","P5","P6"],"thu":["P1","P2","P3","P4","P5","P6"],"fri":["P1","P2","P3","P4","P5","P6"]}
  $hrs$::jsonb
)
on conflict (id) do nothing;

-- Tasses numérotées 1..cup_count
insert into public.vd_cups (number)
select g from generate_series(1, (select cup_count from public.vd_settings where id = 1)) g
on conflict (number) do nothing;

-- ---------------------------------------------------------------------
-- 3) FONCTIONS UTILITAIRES
-- ---------------------------------------------------------------------
-- Entier tiré d'un JSON, sans jamais lever d'erreur (valeur invalide → défaut)
create or replace function public.vd_json_int(p jsonb, p_default int default 0)
returns int language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p) = 'number' then least(greatest((p #>> '{}')::numeric, -1000000), 1000000)::int else p_default end;
$$;
create or replace function public.vd_json_bool(p jsonb)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(p = 'true'::jsonb, false);
$$;

create or replace function public.vd_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_staff from public.vd_profiles where id = auth.uid()), false);
$$;

create or replace function public.vd_require_staff()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.vd_is_staff() then raise exception 'NOT_STAFF'; end if;
end;
$$;

-- Création automatique du profil à l'inscription
create or replace function public.vd_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.vd_profiles (id, email, name, location)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)), 80),
    left(coalesce(trim(new.raw_user_meta_data->>'location'), ''), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists vd_on_auth_user_created on auth.users;
create trigger vd_on_auth_user_created
  after insert on auth.users
  for each row execute function public.vd_handle_new_user();

-- Fidélité : 10 boissons payées = 1 gratuite
create or replace function public.vd_loyalty_for(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with paid as (
    select count(*)::int as n
    from public.vd_orders o, jsonb_array_elements(o.items) it
    where o.user_id = p_user and o.status <> 'ANNULÉE' and (it->>'price_cents')::int > 0
  ), used as (
    select count(*)::int as n
    from public.vd_orders o
    where o.user_id = p_user and o.status <> 'ANNULÉE' and o.free_item
  )
  select jsonb_build_object(
    'paid',      paid.n,
    'free_used', used.n,
    'progress',  paid.n % 10,
    'available', greatest(paid.n / 10 - used.n, 0)
  ) from paid, used;
$$;

create or replace function public.vd_my_loyalty()
returns jsonb language sql stable security definer set search_path = public as $$
  select public.vd_loyalty_for(auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 4) CLIENT : profil
-- ---------------------------------------------------------------------
create or replace function public.vd_update_my_profile(p_name text, p_location text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'NAME_REQUIRED'; end if;
  update public.vd_profiles
     set name = left(trim(p_name), 80), location = left(coalesce(trim(p_location), ''), 80)
   where id = auth.uid();
end;
$$;

create or replace function public.vd_set_my_photo(p_photo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_photo is null or p_photo !~ '^data:image/(jpeg|png|webp);base64,' or length(p_photo) > 250000 then
    raise exception 'BAD_PHOTO';
  end if;
  update public.vd_profiles set photo = p_photo where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- 5) CLIENT : passer une commande (prix calculés ICI, jamais côté navigateur)
--    Format d'un item envoyé :
--    {"drink":"cafe","syrup":{"id":"vanille","level":1|2}|null,
--     "milk":0-3,"cream":0-3,"sugar":0-3,"sweetener":0-3,
--     "marshmallows":bool,"dairy_free":bool}
--    Une entrée = une tasse.
-- ---------------------------------------------------------------------
create or replace function public.vd_place_order(
  p_id text, p_items jsonb, p_location text, p_comment text,
  p_mode text default 'deliver', p_use_free boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_prof     public.vd_profiles%rowtype;
  v_set      public.vd_settings%rowtype;
  v_menu     jsonb;
  v_it       jsonb;
  v_drink    jsonb;
  v_syrup    jsonb;
  v_clean    jsonb := '[]'::jsonb;
  v_price    int;
  v_level    int;
  v_surcharge int;
  v_total    int := 0;
  v_free     boolean := false;
  v_best_idx int := -1;
  v_best_prc int := -1;
  v_idx      int := 0;
  v_loy      jsonb;
  v_new_bal  int;
  v_simple   boolean;
  v_exid     text;
  v_ex       jsonb;
  v_exclean  jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_prof from public.vd_profiles where id = v_uid for update;   -- verrou : évite le double débit
  if not found then raise exception 'NO_PROFILE'; end if;

  select * into v_set from public.vd_settings where id = 1;
  if v_set.require_photo and coalesce(v_prof.photo, '') = '' then raise exception 'PHOTO_REQUIRED'; end if;
  if coalesce(trim(p_location), '') = '' then raise exception 'LOCATION_REQUIRED'; end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'BAD_ID'; end if;
  if p_mode not in ('deliver','pickup') then p_mode := 'deliver'; end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'BAD_ITEMS';
  end if;

  v_menu := v_set.menu;
  v_surcharge := coalesce((v_menu->>'syrupSurchargeCents')::int, 50);

  for v_it in select * from jsonb_array_elements(p_items) loop
    v_drink := null;
    select d into v_drink
      from jsonb_array_elements(v_menu->'drinks') d
     where d->>'id' = v_it->>'drink' and coalesce((d->>'available')::boolean, true);
    if v_drink is null then raise exception 'BAD_DRINK'; end if;

    v_price := (v_drink->>'priceCents')::int;
    v_syrup := null;
    v_level := 0;
    v_simple := coalesce((v_drink->>'simple')::boolean, false);   -- produit « simple » : ni sirop ni ajouts classiques
    v_exclean := '[]'::jsonb;
    if jsonb_typeof(v_it->'extras') = 'array' then
      if jsonb_array_length(v_it->'extras') > 12 then raise exception 'BAD_EXTRA'; end if;
      for v_exid in select distinct x from jsonb_array_elements_text(v_it->'extras') x loop
        v_ex := null;
        select e into v_ex from jsonb_array_elements(coalesce(v_drink->'extras', '[]'::jsonb)) e where e->>'id' = v_exid;
        if v_ex is null then raise exception 'BAD_EXTRA'; end if;
        v_exclean := v_exclean || jsonb_build_array(jsonb_build_object(
          'id', v_ex->>'id', 'name', v_ex->>'name', 'price_cents', coalesce((v_ex->>'priceCents')::int, 0)));
        v_price := v_price + coalesce((v_ex->>'priceCents')::int, 0);
      end loop;
    end if;
    if not v_simple and jsonb_typeof(v_it->'syrup') = 'object' then
      select s into v_syrup
        from jsonb_array_elements(v_menu->'syrups') s
       where s->>'id' = v_it->'syrup'->>'id' and coalesce((s->>'available')::boolean, true);
      if v_syrup is null then raise exception 'BAD_SYRUP'; end if;
      v_level := case when public.vd_json_int(v_it->'syrup'->'level') = 1 then 1 else 2 end;
      v_price := v_price + v_surcharge;
    end if;

    v_clean := v_clean || jsonb_build_array(jsonb_build_object(
      'drink',        v_drink->>'id',
      'name',         v_drink->>'name',
      'icon',         v_drink->>'icon',
      'qty',          1,
      'price_cents',  v_price,
      'syrup',        case when v_syrup is null then null else jsonb_build_object(
                         'id', v_syrup->>'id', 'name', v_syrup->>'name',
                         'icon', v_syrup->>'icon', 'level', v_level) end,
      'milk',         case when v_simple then 0 else least(greatest(public.vd_json_int(v_it->'milk'), 0), 3) end,
      'cream',        case when v_simple then 0 else least(greatest(public.vd_json_int(v_it->'cream'), 0), 3) end,
      'sugar',        case when v_simple then 0 else least(greatest(public.vd_json_int(v_it->'sugar'), 0), 3) end,
      'sweetener',    case when v_simple then 0 else least(greatest(public.vd_json_int(v_it->'sweetener'), 0), 3) end,
      'marshmallows', public.vd_json_bool(v_it->'marshmallows') and not v_simple,
      'dairy_free',   public.vd_json_bool(v_it->'dairy_free') and not v_simple
                      and coalesce((v_drink->>'dairyFreeOption')::boolean, false),
      'extras',       v_exclean
    ));

    if v_price > v_best_prc then v_best_prc := v_price; v_best_idx := v_idx; end if;
    v_idx := v_idx + 1;
  end loop;

  -- Boisson gratuite (fidélité) : appliquée sur la boisson la plus chère du panier
  if p_use_free then
    v_loy := public.vd_loyalty_for(v_uid);
    if (v_loy->>'available')::int <= 0 then raise exception 'NO_FREE_AVAILABLE'; end if;
    v_clean := jsonb_set(jsonb_set(v_clean, array[v_best_idx::text, 'price_cents'], '0'::jsonb),
                         array[v_best_idx::text, 'free'], 'true'::jsonb);
    v_free := true;
  end if;

  select coalesce(sum((it->>'price_cents')::int), 0) into v_total from jsonb_array_elements(v_clean) it;

  v_new_bal := v_prof.balance_cents - v_total;
  if v_new_bal < -v_set.credit_limit_cents then raise exception 'CREDIT_LIMIT_REACHED'; end if;

  insert into public.vd_orders
    (id, created_at_ms, user_id, user_name, default_location, location, mode, comment, status, items, total_cents, free_item)
  values
    (p_id, (extract(epoch from now()) * 1000)::bigint, v_uid, v_prof.name, v_prof.location,
     left(trim(p_location), 80), p_mode, nullif(left(trim(coalesce(p_comment, '')), 300), ''), 'NOUVELLE', v_clean, v_total, v_free);

  if v_total > 0 then
    update public.vd_profiles set balance_cents = v_new_bal where id = v_uid;
    insert into public.vd_wallet_tx (user_id, kind, amount_cents, balance_after, order_id, note)
    values (v_uid, 'order', -v_total, v_new_bal, p_id, 'Commande');
  end if;

  return jsonb_build_object('id', p_id, 'total_cents', v_total, 'balance_cents', v_new_bal, 'free_item', v_free);
end;
$$;

-- ---------------------------------------------------------------------
-- 6) STAFF : commandes, tasses, portefeuille, photos, réglages, rapport
-- ---------------------------------------------------------------------
create or replace function public.vd_staff_set_status(p_order_id text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_o public.vd_orders%rowtype;
  v_bal int;
begin
  perform public.vd_require_staff();
  if p_status not in ('NOUVELLE','COMPLÉTÉE','ANNULÉE') then raise exception 'BAD_STATUS'; end if;

  select * into v_o from public.vd_orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_o.status = p_status then return; end if;
  if v_o.status = 'ANNULÉE' then raise exception 'ORDER_ALREADY_CANCELLED'; end if;

  if p_status = 'ANNULÉE' then
    if v_o.total_cents > 0 then
      update public.vd_profiles set balance_cents = balance_cents + v_o.total_cents
       where id = v_o.user_id returning balance_cents into v_bal;
      insert into public.vd_wallet_tx (user_id, kind, amount_cents, balance_after, order_id, note, created_by)
      values (v_o.user_id, 'refund', v_o.total_cents, v_bal, v_o.id, 'Commande annulée', auth.uid());
    end if;
    update public.vd_cups set status = 'available', order_id = null, updated_at = now() where order_id = v_o.id;
  end if;

  update public.vd_orders set status = p_status where id = p_order_id;
end;
$$;

-- Attribue une tasse à une commande (numéro précis, ou la plus petite disponible si p_cup est null)
create or replace function public.vd_staff_assign_cup(p_order_id text, p_cup int default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_cup int;
begin
  perform public.vd_require_staff();
  if not exists (select 1 from public.vd_orders where id = p_order_id) then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_cup is null then
    select number into v_cup from public.vd_cups where status = 'available' order by number limit 1 for update skip locked;
    if v_cup is null then raise exception 'NO_CUP_AVAILABLE'; end if;
  else
    select number into v_cup from public.vd_cups where number = p_cup and status = 'available' for update;
    if v_cup is null then raise exception 'CUP_NOT_AVAILABLE'; end if;
  end if;

  update public.vd_cups set status = 'in_use', order_id = p_order_id, updated_at = now() where number = v_cup;
  update public.vd_orders set cup_numbers = array_append(cup_numbers, v_cup) where id = p_order_id;
  return v_cup;
end;
$$;

-- Attribue plusieurs tasses d'un coup (les plus petits numéros disponibles) ; retourne les numéros attribués
create or replace function public.vd_staff_assign_cups(p_order_id text, p_count int)
returns int[] language plpgsql security definer set search_path = public as $$
declare
  v_nums int[];
begin
  perform public.vd_require_staff();
  if p_count is null or p_count < 1 or p_count > 20 then raise exception 'BAD_COUNT'; end if;
  if not exists (select 1 from public.vd_orders where id = p_order_id) then raise exception 'ORDER_NOT_FOUND'; end if;
  select array_agg(number order by number) into v_nums from (
    select number from public.vd_cups where status = 'available' order by number limit p_count for update
  ) c;
  if coalesce(array_length(v_nums, 1), 0) < p_count then raise exception 'NO_CUP_AVAILABLE'; end if;
  update public.vd_cups set status = 'in_use', order_id = p_order_id, updated_at = now() where number = any(v_nums);
  update public.vd_orders set cup_numbers = cup_numbers || v_nums where id = p_order_id;
  return v_nums;
end;
$$;

create or replace function public.vd_staff_return_cup(p_cup int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.vd_require_staff();
  update public.vd_cups set status = 'available', order_id = null, updated_at = now() where number = p_cup;
end;
$$;

create or replace function public.vd_staff_set_cup_count(p_count int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.vd_require_staff();
  if p_count < 1 or p_count > 300 then raise exception 'BAD_COUNT'; end if;
  if exists (select 1 from public.vd_cups where number > p_count and status = 'in_use') then
    raise exception 'CUPS_IN_USE_ABOVE';
  end if;
  insert into public.vd_cups (number) select g from generate_series(1, p_count) g on conflict (number) do nothing;
  delete from public.vd_cups where number > p_count;
  update public.vd_settings set cup_count = p_count, updated_at = now() where id = 1;
end;
$$;

-- Recharge manuelle du portefeuille (p_amount_cents > 0) ou correction (< 0)
create or replace function public.vd_staff_topup(p_user uuid, p_amount_cents int, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_bal int;
begin
  perform public.vd_require_staff();
  if p_amount_cents is null or p_amount_cents = 0 or abs(p_amount_cents) > 100000 then raise exception 'BAD_AMOUNT'; end if;

  update public.vd_profiles set balance_cents = balance_cents + p_amount_cents
   where id = p_user returning balance_cents into v_bal;
  if v_bal is null then raise exception 'USER_NOT_FOUND'; end if;

  insert into public.vd_wallet_tx (user_id, kind, amount_cents, balance_after, note, created_by)
  values (p_user, case when p_amount_cents > 0 then 'topup' else 'adjust' end,
          p_amount_cents, v_bal, nullif(left(trim(coalesce(p_note, '')), 200), ''), auth.uid());

  return jsonb_build_object('balance_cents', v_bal);
end;
$$;

create or replace function public.vd_staff_set_photo(p_user uuid, p_photo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.vd_require_staff();
  if p_photo is null or p_photo !~ '^data:image/(jpeg|png|webp);base64,' or length(p_photo) > 250000 then
    raise exception 'BAD_PHOTO';
  end if;
  update public.vd_profiles set photo = p_photo where id = p_user;
end;
$$;

create or replace function public.vd_staff_update_user(p_user uuid, p_name text, p_location text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.vd_require_staff();
  if coalesce(trim(p_name),'') = '' then raise exception 'NAME_REQUIRED'; end if;
  update public.vd_profiles set name = left(trim(p_name), 80), location = left(coalesce(trim(p_location), ''), 80) where id = p_user;
end;
$$;

-- Réglages : menu / horaires / périodes / photo obligatoire / seuil solde bas
create or replace function public.vd_staff_save_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.vd_require_staff();
  case p_key
    when 'menu'              then update public.vd_settings set menu = p_value, updated_at = now() where id = 1;
    when 'hours'             then update public.vd_settings set hours = p_value, updated_at = now() where id = 1;
    when 'periods'           then update public.vd_settings set periods = p_value, updated_at = now() where id = 1;
    when 'require_photo'     then update public.vd_settings set require_photo = (p_value #>> '{}')::boolean, updated_at = now() where id = 1;
    when 'low_balance_cents' then update public.vd_settings set low_balance_cents = (p_value #>> '{}')::int, updated_at = now() where id = 1;
    when 'credit_limit_cents' then update public.vd_settings set credit_limit_cents = greatest((p_value #>> '{}')::int, 0), updated_at = now() where id = 1;
    else raise exception 'BAD_SETTING';
  end case;
end;
$$;

-- Rapport (mois ou période) : roulement d'argent
create or replace function public.vd_staff_report(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_res jsonb;
begin
  perform public.vd_require_staff();

  with ord as (
    select (to_timestamp(o.created_at_ms / 1000.0) at time zone 'America/Toronto')::date as d,
           o.total_cents, jsonb_array_length(o.items) as nb, o.free_item, o.items
      from public.vd_orders o
     where o.status <> 'ANNULÉE'
  ), ord_r as (
    select * from ord where d between p_from and p_to
  ), tx_r as (
    select (t.created_at at time zone 'America/Toronto')::date as d, t.kind, t.amount_cents
      from public.vd_wallet_tx t
     where (t.created_at at time zone 'America/Toronto')::date between p_from and p_to
  ), od as (
    select d, count(*) as orders, sum(nb) as drinks, sum(total_cents) as sales from ord_r group by d
  ), td as (
    select d,
           coalesce(sum(amount_cents) filter (where kind = 'topup'), 0)  as topups,
           coalesce(sum(amount_cents) filter (where kind = 'adjust'), 0) as adjusts,
           coalesce(sum(amount_cents) filter (where kind = 'refund'), 0) as refunds
      from tx_r group by d
  ), days as (
    select coalesce(od.d, td.d) as d,
           coalesce(od.orders, 0) as orders, coalesce(od.drinks, 0) as drinks,
           coalesce(od.sales, 0) as sales,
           coalesce(td.topups, 0) as topups, coalesce(td.adjusts, 0) as adjusts, coalesce(td.refunds, 0) as refunds
      from od full join td on od.d = td.d
  ), top as (
    select it->>'name' as name, count(*) as n
      from ord_r, jsonb_array_elements(ord_r.items) it
     group by 1 order by 2 desc limit 10
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'orders',        coalesce((select sum(orders) from days), 0),
    'drinks',        coalesce((select sum(drinks) from days), 0),
    'sales_cents',   coalesce((select sum(sales) from days), 0),
    'topups_cents',  coalesce((select sum(topups) from days), 0),
    'adjusts_cents', coalesce((select sum(adjusts) from days), 0),
    'refunds_cents', coalesce((select sum(refunds) from days), 0),
    'free_drinks',   coalesce((select count(*) from ord_r where free_item), 0),
    'outstanding_cents', coalesce((select sum(balance_cents) from public.vd_profiles where not is_staff), 0),
    'days', coalesce((select jsonb_agg(to_jsonb(days) order by days.d) from days), '[]'::jsonb),
    'top',  coalesce((select jsonb_agg(to_jsonb(top)) from top), '[]'::jsonb)
  ) into v_res;

  return v_res;
end;
$$;

-- Désabonnement push (à la déconnexion)
create or replace function public.vd_unsave_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.vd_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

-- Abonnement push (le staff ne peut s'abonner qu'en tant que staff)
create or replace function public.vd_save_push(p_endpoint text, p_p256dh text, p_auth text, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_role not in ('staff','client') then raise exception 'BAD_ROLE'; end if;
  if p_role = 'staff' then perform public.vd_require_staff(); end if;
  select name into v_name from public.vd_profiles where id = auth.uid();

  insert into public.vd_push_subscriptions (endpoint, role, p256dh, auth, user_id, user_name)
  values (p_endpoint, p_role, p_p256dh, p_auth, auth.uid(), v_name)
  on conflict (endpoint, role)
  do update set p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id, user_name = excluded.user_name;
end;
$$;

-- ---------------------------------------------------------------------
-- 6b) STAFF : code d'accès, rôles, ping
-- ---------------------------------------------------------------------
-- Assistant d'aide : limite d'utilisation par jour (évite abus et coûts imprévus)
create table if not exists public.vd_help_usage (
  user_id uuid not null references public.vd_profiles(id) on delete cascade,
  day     date not null,
  n       int  not null default 0,
  primary key (user_id, day)
);

-- Appelée par /api/help avec le jeton de l'utilisateur : compte la question, applique la limite quotidienne
-- (30 questions pour un client, 100 pour le compte staff partagé) et retourne le rôle.
create or replace function public.vd_help_check()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_staff boolean;
  v_today date := (now() at time zone 'America/Toronto')::date;
  v_n     int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select is_staff into v_staff from public.vd_profiles where id = v_uid;
  if v_staff is null then raise exception 'NO_PROFILE'; end if;
  insert into public.vd_help_usage (user_id, day, n) values (v_uid, v_today, 1)
  on conflict (user_id, day) do update set n = public.vd_help_usage.n + 1
  returning n into v_n;
  delete from public.vd_help_usage where day < v_today - 7;
  if v_n > (case when v_staff then 100 else 30 end) then raise exception 'HELP_LIMIT'; end if;
  return jsonb_build_object('is_staff', v_staff, 'used', v_n);
end;
$$;

-- Ping public (garde le projet Supabase actif : appelé chaque jour par Vercel Cron)
create or replace function public.vd_ping()
returns timestamptz language sql stable security definer set search_path = public as $$
  select now() from public.vd_settings where id = 1;
$$;

-- ---------------------------------------------------------------------
-- 6c) NOTIFICATIONS PUSH : des triggers préparent le message + les abonnements,
--     puis l'envoient (pg_net) au service /api/push hébergé sur Vercel.
-- ---------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.vd_money_txt(p_cents int)
returns text language sql immutable set search_path = public as $$
  select replace(to_char(p_cents / 100.0, 'FM999990.00'), '.', ',') || ' $';
$$;

create or replace function public.vd_push_subs(p_role text, p_user uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
    from public.vd_push_subscriptions
   where role = p_role and (p_user is null or user_id = p_user);
$$;

create or replace function public.vd_push_dispatch(p_payload jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text; v_secret text;
begin
  if jsonb_array_length(coalesce(p_payload->'subs', '[]'::jsonb)) = 0 then return; end if;
  select value into v_url    from public.vd_config where key = 'push_url';
  select value into v_secret from public.vd_config where key = 'push_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url, body := p_payload,
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000);
exception when others then
  null;   -- un problème de notification ne doit JAMAIS bloquer une commande
end;
$$;

create or replace function public.vd_trg_order_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.vd_push_dispatch(jsonb_build_object(
    'title', 'Nouvelle commande ☕',
    'body',  new.user_name || ' — ' || case when new.mode = 'pickup' then 'ramassage' else new.location end,
    'url',   '/#staff', 'tag', 'new_' || new.id,
    'subs',  public.vd_push_subs('staff')));
  return new;
end;
$$;

create or replace function public.vd_trg_order_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.user_id is not null then
    if new.status = 'COMPLÉTÉE' then
      perform public.vd_push_dispatch(jsonb_build_object(
        'title', 'Commande prête ✅',
        'body',  case when coalesce(array_length(new.cup_numbers, 1), 0) > 0
                      then 'Ta boisson est prête — tasse n° ' || array_to_string(new.cup_numbers, ', ')
                      else 'Ta boisson est prête !' end,
        'url', '/#orders', 'tag', 'done_' || new.id,
        'subs', public.vd_push_subs('client', new.user_id)));
    elsif new.status = 'ANNULÉE' then
      perform public.vd_push_dispatch(jsonb_build_object(
        'title', 'Commande annulée',
        'body',  'Ta commande a été annulée et remboursée.',
        'url', '/#orders', 'tag', 'cancel_' || new.id,
        'subs', public.vd_push_subs('client', new.user_id)));
    end if;
  end if;
  return new;
end;
$$;

-- Alerte « solde bas » : seulement quand le solde passe sous le seuil (pas à chaque commande)
create or replace function public.vd_trg_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_low int;
begin
  select low_balance_cents into v_low from public.vd_settings where id = 1;
  if not new.is_staff and new.balance_cents < v_low and (old.balance_cents >= v_low or (old.balance_cents >= 0 and new.balance_cents < 0)) then
    perform public.vd_push_dispatch(jsonb_build_object(
      'title', case when new.balance_cents < 0 then 'Solde négatif 💰' else 'Solde bas 💰' end,
      'body',  'Il te reste ' || public.vd_money_txt(new.balance_cents) || '. Passe au café pour recharger ton portefeuille.',
      'url', '/#account', 'tag', 'lowbal_' || new.id,
      'subs', public.vd_push_subs('client', new.id)));
  end if;
  return new;
end;
$$;

drop trigger if exists vd_order_insert_push on public.vd_orders;
create trigger vd_order_insert_push after insert on public.vd_orders
  for each row execute function public.vd_trg_order_insert();
drop trigger if exists vd_order_update_push on public.vd_orders;
create trigger vd_order_update_push after update of status on public.vd_orders
  for each row execute function public.vd_trg_order_update();
drop trigger if exists vd_balance_push on public.vd_profiles;
create trigger vd_balance_push after update of balance_cents on public.vd_profiles
  for each row execute function public.vd_trg_balance();

-- Nettoyage des abonnements expirés (appelé par /api/push avec le secret)
create or replace function public.vd_push_prune(p_secret text, p_endpoints text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is distinct from (select value from public.vd_config where key = 'push_secret') then
    raise exception 'FORBIDDEN';
  end if;
  delete from public.vd_push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

-- ---------------------------------------------------------------------
-- 7) RLS + PERMISSIONS
-- ---------------------------------------------------------------------
alter table public.vd_profiles           enable row level security;
alter table public.vd_settings           enable row level security;
alter table public.vd_orders             enable row level security;
alter table public.vd_cups               enable row level security;
alter table public.vd_wallet_tx          enable row level security;
alter table public.vd_push_subscriptions enable row level security;
alter table public.vd_help_usage         enable row level security;
alter table public.vd_config             enable row level security;

drop policy if exists vd_profiles_select on public.vd_profiles;
create policy vd_profiles_select on public.vd_profiles for select to authenticated
  using (id = auth.uid() or public.vd_is_staff());

drop policy if exists vd_settings_select on public.vd_settings;
create policy vd_settings_select on public.vd_settings for select to authenticated using (true);

drop policy if exists vd_orders_select on public.vd_orders;
create policy vd_orders_select on public.vd_orders for select to authenticated
  using (user_id = auth.uid() or public.vd_is_staff());

drop policy if exists vd_cups_select on public.vd_cups;
create policy vd_cups_select on public.vd_cups for select to authenticated using (public.vd_is_staff());

drop policy if exists vd_wallet_tx_select on public.vd_wallet_tx;
create policy vd_wallet_tx_select on public.vd_wallet_tx for select to authenticated
  using (user_id = auth.uid() or public.vd_is_staff());

-- Aucune écriture directe : tout passe par les fonctions ci-dessus
revoke all on public.vd_profiles, public.vd_settings, public.vd_orders, public.vd_cups,
              public.vd_wallet_tx, public.vd_push_subscriptions, public.vd_config, public.vd_help_usage from anon, authenticated;
revoke all on sequence public.vd_wallet_tx_id_seq from anon, authenticated;
grant select on public.vd_profiles, public.vd_settings, public.vd_orders, public.vd_cups, public.vd_wallet_tx to authenticated;

-- Les fonctions ne sont exécutables que par un utilisateur connecté
revoke execute on all functions in schema public from public, anon, authenticated;
-- les futures fonctions ne seront pas exposées automatiquement
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
grant execute on function
  public.vd_is_staff(), public.vd_my_loyalty(),
  public.vd_update_my_profile(text, text), public.vd_set_my_photo(text),
  public.vd_place_order(text, jsonb, text, text, text, boolean),
  public.vd_staff_set_status(text, text), public.vd_staff_assign_cup(text, int),
  public.vd_staff_assign_cups(text, int),
  public.vd_staff_return_cup(int), public.vd_staff_set_cup_count(int),
  public.vd_staff_topup(uuid, int, text), public.vd_staff_set_photo(uuid, text),
  public.vd_staff_update_user(uuid, text, text), public.vd_staff_save_setting(text, jsonb),
  public.vd_staff_report(date, date), public.vd_save_push(text, text, text, text),
  public.vd_unsave_push(text), public.vd_help_check()
to authenticated;
grant execute on function public.vd_ping(), public.vd_push_prune(text, text[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8) REALTIME (commandes en direct pour le staff, solde/menu en direct pour les clients)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['vd_orders','vd_settings','vd_cups','vd_profiles'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 9) DÉMARRAGE : à exécuter UNE fois après ce fichier (voir supabase/setup.sql)
--    URL/secret des notifications push, puis création du compte staff universel
--    (Authentication > Users > Add user, puis : update public.vd_profiles set is_staff = true where email = '...';)
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 9) Images des produits ajoutés par le staff (bucket public en lecture, écriture réservée au staff)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 500000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 500000, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists vd_menu_img_insert on storage.objects;
create policy vd_menu_img_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and public.vd_is_staff());
drop policy if exists vd_menu_img_update on storage.objects;
create policy vd_menu_img_update on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and public.vd_is_staff());
drop policy if exists vd_menu_img_delete on storage.objects;
create policy vd_menu_img_delete on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and public.vd_is_staff());
drop policy if exists vd_menu_img_select on storage.objects;
create policy vd_menu_img_select on storage.objects for select to authenticated
  using (bucket_id = 'menu-images' and public.vd_is_staff());
