export const UI_OPTIONS = [
  {
    number: "A",
    slug: "floor",
    version: "v2",
    name: "Ticker Floor",
    title: "A lively exchange floor",
    tagline: "Night-market navy, sharp lime accents, and bright price moves.",
    highlights: ["Deep, high-contrast colours", "Lime-highlighted actions", "Easy-to-scan price moves"],
    palette: "navy",
  },
  {
    number: "B",
    slug: "arcade",
    version: "v3",
    name: "Market Game Night",
    title: "A playful game table",
    tagline: "Warm cream, coral, and a few playful colour accents.",
    highlights: ["Welcoming pastel surfaces", "Coral-highlighted actions", "A lighter, playful tone"],
    palette: "coral",
  },
  {
    number: "C",
    slug: "studio",
    version: "v4",
    name: "Market Studio",
    title: "A bright market studio",
    tagline: "Crisp indigo, blue, and aqua with a bright, modern feel.",
    highlights: ["Bold blue and violet accents", "Aqua up-moves, clear red down-moves", "The familiar game layout"],
    palette: "violet",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];
