export const TERMINAL_COUNT = 10;
export const TERMINAL_ACTIVE_WINDOW_MS = 30_000;

export const isValidTerminalPath = (value: string) => /^0[1-9]$|^10$/.test(value);
