// Device clocks drift. Countdowns use the server's clock, estimated from each answer, so every
// terminal and the audience wall count the same seconds and show the opening on time.
let offset = 0, known = false;
export function noteServerTime(serverNow: unknown, sentAt: number, receivedAt: number) {
  if (typeof serverNow !== "number" || !Number.isFinite(serverNow)) return;
  const estimate = serverNow + (receivedAt - sentAt) / 2 - receivedAt;
  offset = known ? offset * .7 + estimate * .3 : estimate;
  known = true;
}
export const serverNow = () => Date.now() + offset;
