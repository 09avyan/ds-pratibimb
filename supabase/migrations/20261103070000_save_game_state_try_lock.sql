-- One save at a time, and nobody waits for it: a save that finds another save in progress returns false
-- at once (the caller re-reads or, for a poll, answers with the saved state) instead of queueing on the
-- row lock until the 3-second statement timeout cancels it.
create or replace function public.save_game_state(p_secret text, p_mode text, p_expected_version bigint, p_state jsonb)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare v_secret text; v_changed integer;
begin
  select market_signing_secret into v_secret from private.runtime_secrets where id = true;
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_mode not in ('live', 'test') then raise exception 'invalid mode' using errcode = '22023'; end if;
  if not pg_try_advisory_xact_lock(hashtext('dalaal_game_state:' || p_mode)) then return false; end if;
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
$function$;
