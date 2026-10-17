import type { Player } from "./types";
import { TERMINAL_COUNT } from "./terminals";

export type ParticipantGroup = Player & {
  sessionIds: string[];
  linkedSessionCount: number;
  activeSessionCount: number;
};

const lastSeen = (player: Player) => player.lastSeenAt ?? player.joinedAt;

export function groupTerminalSessions(sessions: Record<string, Player>, now = Date.now(), activeWindowMs = 30_000): ParticipantGroup[] {
  const groups = new Map<string, Player[]>();
  for (const player of Object.values(sessions)) {
    if (!Number.isInteger(player.terminalNumber) || player.terminalNumber! < 1 || player.terminalNumber! > TERMINAL_COUNT) continue;
    const key = player.terminalNumber ? `terminal-${player.terminalNumber}` : `session-${player.id}`;
    groups.set(key, [...(groups.get(key) ?? []), player]);
  }

  return [...groups.values()].map(members => {
    const ordered = [...members].sort((a, b) => lastSeen(b) - lastSeen(a) || b.joinedAt - a.joinedAt);
    const activeMembers = ordered.filter(player => now - lastSeen(player) < activeWindowMs);
    // A terminal row describes one actual login. Older IDs can remain in storage
    // after browser data is reset, so never add separate portfolios together.
    const current = activeMembers[0] ?? ordered[0];
    return {
      ...current,
      sessionIds: ordered.map(player => player.id),
      linkedSessionCount: members.length,
      activeSessionCount: activeMembers.length,
    };
  }).sort((a, b) => (a.terminalNumber ?? 99) - (b.terminalNumber ?? 99) || a.joinedAt - b.joinedAt);
}
