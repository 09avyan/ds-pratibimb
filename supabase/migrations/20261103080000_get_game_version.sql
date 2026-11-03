-- A ~100-byte check so servers can reuse their cached game instead of downloading the whole row (egress).
create or replace function public.get_game_version(p_secret text, p_mode text)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare v_secret text; v_version bigint;
begin
  select market_signing_secret into v_secret from private.runtime_secrets where id = true;
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_mode not in ('live', 'test') then raise exception 'invalid mode' using errcode = '22023'; end if;
  select version into v_version from private.game_state where mode = p_mode;
  return v_version;
end;
$function$;
revoke all on function public.get_game_version(text, text) from public, anon, authenticated;
grant execute on function public.get_game_version(text, text) to anon;
