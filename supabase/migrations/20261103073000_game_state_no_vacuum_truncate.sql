-- The game is one row rewritten every second, so autovacuum runs on it often. Truncating the freed
-- space at the end of the table (and its TOAST table) takes an ACCESS EXCLUSIVE lock, which blocked
-- every read and save for 1-2 seconds, sometimes up to the statement timeout: the "freezes".
-- Skipping truncation keeps vacuum's cleanup without that lock; the table stays a few pages long.
alter table private.game_state set (vacuum_truncate = false, toast.vacuum_truncate = false);
