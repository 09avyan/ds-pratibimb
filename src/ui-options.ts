export const UI_OPTIONS = [
  {
    number: "2",
    slug: "orbit",
    version: "v2",
    name: "Orbit Exchange",
    title: "A market beneath the night sky",
    tagline: "An observatory-inspired trading floor puts the shared market in a calm, star-mapped setting with instrument-like price displays.",
    highlights: ["A telescope-framed chart and precise market readings", "A constellation-style stock board with every price and position", "Matching audience screens in light and dark mode"],
    palette: "orbit",
  },
  {
    number: "3",
    slug: "arcade",
    version: "v3",
    name: "Market Mash",
    title: "A playful trading board",
    tagline: "A lively trading board keeps the fast game feeling while bringing Buy, Sell, and Short directly into the selected-stock panel.",
    highlights: ["Warm, tactile board-game cards", "Buy, Sell, and Short controls below the live chart", "A matching audience screen and readable dark mode"],
    palette: "mash",
  },
  {
    number: "4",
    slug: "gallery",
    version: "v4",
    name: "Gallery Floor",
    title: "A market arranged like an exhibition",
    tagline: "An architectural gallery uses strong typography, generous space, and carefully placed market details to make each move easy to take in.",
    highlights: ["Asymmetric exhibit-style market composition", "A clear company gallery beside the selected chart and order controls", "Audience boards designed like a live exhibition wall"],
    palette: "gallery",
  },
  {
    number: "5",
    slug: "broadcast",
    version: "v5",
    name: "Studio Exchange",
    title: "Live from the market desk",
    tagline: "A warm radio-studio trading floor turns prices into a live broadcast, with a ticker wall, signal meters, and a focused order console.",
    highlights: ["A compact broadcast ticker keeps more companies in view", "Studio-style chart and trade controls stay together", "A matching on-air audience view with every batch headline"],
    palette: "broadcast",
  },
  {
    number: "6",
    slug: "conservatory",
    version: "v6",
    name: "Greenhouse Exchange",
    title: "A market growing in good company",
    tagline: "A botanical conservatory turns each company into a market specimen, pairing quiet garden details with clear prices and live trade controls.",
    highlights: ["A greenhouse-inspired company board with visible prices and positions", "A calm chart-and-trade workbench with Buy, Sell, and Short below the chart", "A garden market wall with movers, takeaways, and every headline"],
    palette: "conservatory",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];

export function uiVariantForVersion(version: string): UiVariant | null | undefined {
  if (version === "v1") return null;
  return UI_OPTIONS.find(option => option.version === version)?.slug;
}
