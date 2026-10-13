export const UI_OPTIONS = [
  {
    number: "2",
    slug: "atlas",
    version: "v2",
    name: "Market Atlas",
    title: "A live market map",
    tagline: "A compact, high-contrast market map keeps the whole watchlist in view and brings a selected company into focus.",
    highlights: ["Scan the full market in a dense card field", "Keep the active chart beside the watchlist", "Open a quick trade panel from any company card"],
    palette: "atlas",
  },
  {
    number: "3",
    slug: "arcade",
    version: "v3",
    name: "Market Mash",
    title: "A playful trading board",
    tagline: "A warm, tactile board-game screen makes the chart the feature and turns a fast market round into a friendly challenge.",
    highlights: ["Large, easy-to-scan company cards", "A chart-first market with an instant trade drawer", "A brighter board with a fully working dark mode"],
    palette: "mash",
  },
  {
    number: "4",
    slug: "paper",
    version: "v4",
    name: "Paper Pop",
    title: "A paper-inspired card UI",
    tagline: "Soft paper grain, ink-like outlines, and lively paper cards give the screen a handmade feel without changing how the market works.",
    highlights: ["A paper-like surface with crisp, functional cards", "Chart, watchlist, and order controls stay easy to reach", "Paper cutout accents add character without hiding data"],
    palette: "paper",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];

export function uiVariantForVersion(version: string): UiVariant | null | undefined {
  if (version === "v1") return null;
  return UI_OPTIONS.find(option => option.version === version)?.slug;
}
