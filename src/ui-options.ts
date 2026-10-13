export const UI_OPTIONS = [
  {
    number: "A",
    slug: "floor",
    version: "v2",
    name: "Signal Rush",
    title: "A neon market cockpit",
    tagline: "A compact three-zone control deck puts the watchlist, live chart, and trade ticket in separate lanes.",
    highlights: ["Browse a dedicated, scrollable stock lane", "Give the selected chart the centre stage", "Keep the order ticket and holdings in reach"],
    palette: "signal",
  },
  {
    number: "B",
    slug: "arcade",
    version: "v3",
    name: "Market Mash",
    title: "A playful paper trading board",
    tagline: "A warm, tactile board-game layout makes the chart the feature and turns the market into a bright card wall.",
    highlights: ["Large, easy-to-scan company cards", "A chart-first layout with the ticket below", "Chunky, friendly controls for quick rounds"],
    palette: "paper",
  },
  {
    number: "C",
    slug: "studio",
    version: "v4",
    name: "Ticker Arena",
    title: "A live sports-broadcast market",
    tagline: "A sharp broadcast scoreboard pairs a wide trade station with a dense market board built for a room full of players.",
    highlights: ["Chart and trade ticket share the top row", "All companies sit together in a broad market board", "High-contrast broadcast styling for a big screen"],
    palette: "arena",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];
