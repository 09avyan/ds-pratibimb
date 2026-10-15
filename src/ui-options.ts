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
    name: "Clay Market",
    title: "A market you can almost touch",
    tagline: "Soft sculpted shapes and tactile controls give the fast market a playful claymorphism feel.",
    highlights: ["Raised clay-like stock tiles", "Buy, Sell, and Short below the chart", "Matching audience screen and dark mode"],
    palette: "mash",
  },
  {
    number: "4",
    slug: "gallery",
    version: "v4",
    name: "Premiere Exchange",
    title: "Your market takes the spotlight",
    tagline: "A cinema-inspired market premiere uses ticket-like stock tiles, an index marquee, and a focused chart stage.",
    highlights: ["Ticket-inspired company tiles", "Chart and order controls share the spotlight", "Matching premiere audience board"],
    palette: "gallery",
  },
  {
    number: "5",
    slug: "broadcast",
    version: "v5",
    name: "Platform Exchange",
    title: "The market is on the move",
    tagline: "A nostalgic departure board arranges companies as clear market listings beside the trading platform.",
    highlights: ["Adaptive departure-board stock rows", "Route-style chart and trading platform", "Matching station audience board"],
    palette: "broadcast",
  },
  {
    number: "6",
    slug: "conservatory",
    version: "v6",
    name: "Vinyl Exchange",
    title: "Find your market rhythm",
    tagline: "A record-store trading floor presents companies as album-like sleeves around a warm listening-deck chart.",
    highlights: ["Vinyl-inspired company sleeves", "Chart and order controls on one listening deck", "Matching record-wall audience view"],
    palette: "conservatory",
  },
  {
    number: "7",
    slug: "tangram",
    version: "v7",
    name: "Tangram Exchange",
    title: "A market in motion",
    tagline: "Angular cut-paper geometry turns each company into part of a kinetic market composition.",
    highlights: ["Tessellated stock tiles that adapt to width", "Clear chart and inline trade controls", "Matching geometric audience wall"],
    palette: "tangram",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];

export function uiVariantForVersion(version: string): UiVariant | null | undefined {
  if (version === "v1") return null;
  return UI_OPTIONS.find(option => option.version === version)?.slug;
}
