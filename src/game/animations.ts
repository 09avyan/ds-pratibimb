// Every animation the host can switch on or off, per screen. A missing entry means on.
export type AnimationScreen = "audience" | "trading";
export type AnimationInfo = { key: string; screen: AnimationScreen; label: string; detail: string };

export const ANIMATIONS: readonly AnimationInfo[] = [
  { key: "countdown", screen: "audience", label: "Countdown light show", detail: "Pixel numbers, streaks, spotlights and the version's motif. Off: a plain number." },
  { key: "marketOpen", screen: "audience", label: "Market open burst", detail: "The burst of light and words when trading starts." },
  { key: "boardEntrance", screen: "audience", label: "Board entrance", detail: "Each version's way of bringing the 25 companies in." },
  { key: "priceTick", screen: "audience", label: "Price ticks", detail: "The flash and each version's effect when a price changes." },
  { key: "priceDelta", screen: "audience", label: "Floating amounts", detail: "The +0.35 / −0.20 that floats up from a company." },
  { key: "newsArrival", screen: "audience", label: "News arrival", detail: "Stories sliding in and landing word by word." },
  { key: "newsGlow", screen: "audience", label: "News glow on companies", detail: "Companies touched by the latest news light up." },
  { key: "rankChange", screen: "audience", label: "Rank change pixels", detail: "Rows break into pixels and reassemble at their new rank." },
  { key: "leadBanner", screen: "audience", label: "New leader banner", detail: "\"Terminal 03 takes the lead\" when first place changes." },
  { key: "crown", screen: "audience", label: "Leader's crown", detail: "The gold crown over first place." },
  { key: "indexSpark", screen: "audience", label: "Index line", detail: "The live line of the Dalaal-10 in the header." },
  { key: "ambient", screen: "audience", label: "Background motion", detail: "Light sweeps, stars, breathing clay, spinning records, shimmer." },
  { key: "lastTen", screen: "audience", label: "Last ten seconds", detail: "The pixel ghost number and red edge pulse." },
  { key: "closing", screen: "audience", label: "Closing shutter", detail: "Shutters slam on \"Market closed\" at the bell." },
  { key: "finalReveal", screen: "audience", label: "Final standings reveal", detail: "Standings revealed from last place up to the winner." },
  { key: "confetti", screen: "audience", label: "Confetti", detail: "Gold confetti over the final standings." },
  { key: "tradeCountdown", screen: "trading", label: "Countdown light show", detail: "The same countdown on every terminal." },
  { key: "tradeMarketOpen", screen: "trading", label: "Market open burst", detail: "The burst when trading starts." },
  { key: "tradeBurst", screen: "trading", label: "Order filled burst", detail: "Sparks and the chip that flies into the portfolio." },
  { key: "tradePriceColour", screen: "trading", label: "Price colours", detail: "Prices stay green after a rise and red after a fall." },
  { key: "tradePriceTick", screen: "trading", label: "Price tick glow", detail: "The faint glow as a price changes." },
  { key: "tradeDelta", screen: "trading", label: "Floating amount", detail: "The amount that floats up from the selected price." },
  { key: "tradeNews", screen: "trading", label: "News arrival", detail: "News cards sliding in word by word." },
  { key: "tradeButton", screen: "trading", label: "Order button shine", detail: "The light that runs across the order button." },
  { key: "tradeLastTen", screen: "trading", label: "Last ten seconds", detail: "The pixel ghost number and red edge pulse." },
  { key: "tradeClosing", screen: "trading", label: "Closing shutter", detail: "Shutters on \"Market closed\" at the bell." },
] as const;

export const ANIMATION_KEYS = new Set(ANIMATIONS.map(item => item.key));

/** Classes like `off-confetti` for every animation the host switched off. */
export function animationOffClasses(flags: Record<string, boolean> | undefined) {
  return Object.entries(flags ?? {}).filter(([key, on]) => on === false && ANIMATION_KEYS.has(key)).map(([key]) => ` off-${key}`).join("");
}
export const animationOn = (flags: Record<string, boolean> | undefined, key: string) => flags?.[key] !== false;
