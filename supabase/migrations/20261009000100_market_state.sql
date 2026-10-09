create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.runtime_secrets (
  id boolean primary key default true check (id),
  market_signing_secret text not null
);

create table if not exists private.game_state (
  mode text primary key check (mode in ('live', 'test')),
  version bigint not null default 1,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table private.runtime_secrets enable row level security;
alter table private.runtime_secrets force row level security;
alter table private.game_state enable row level security;
alter table private.game_state force row level security;
revoke all on private.runtime_secrets, private.game_state from public, anon, authenticated;

create or replace function public.get_game_state(p_secret text, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state jsonb;
  v_secret text;
begin
  select market_signing_secret into v_secret from private.runtime_secrets where id = true;
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_mode not in ('live', 'test') then raise exception 'invalid mode' using errcode = '22023'; end if;
  select jsonb_build_object('version', version, 'state', state) into v_state from private.game_state where mode = p_mode;
  return v_state;
end;
$$;

create or replace function public.save_game_state(p_secret text, p_mode text, p_expected_version bigint, p_state jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_secret text; v_changed integer;
begin
  select market_signing_secret into v_secret from private.runtime_secrets where id = true;
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_mode not in ('live', 'test') then raise exception 'invalid mode' using errcode = '22023'; end if;
  if p_expected_version = 0 then
    insert into private.game_state(mode, version, state, updated_at) values (p_mode, 1, p_state, now()) on conflict (mode) do nothing;
    get diagnostics v_changed = row_count;
    return v_changed = 1;
  end if;
  update private.game_state set version = version + 1, state = p_state, updated_at = now()
  where mode = p_mode and version = p_expected_version;
  get diagnostics v_changed = row_count;
  return v_changed = 1;
end;
$$;

revoke all on function public.get_game_state(text, text) from public, anon, authenticated;
revoke all on function public.save_game_state(text, text, bigint, jsonb) from public, anon, authenticated;
grant usage on schema public to anon;
grant execute on function public.get_game_state(text, text) to anon;
grant execute on function public.save_game_state(text, text, bigint, jsonb) to anon;
