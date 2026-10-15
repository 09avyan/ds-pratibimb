export const UI_OPTIONS = [
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
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];

export function uiVariantForVersion(version: string): UiVariant | null | undefined {
  if (version === "v1") return null;
  return UI_OPTIONS.find(option => option.version === version)?.slug;
}
