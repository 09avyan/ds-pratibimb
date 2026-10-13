export const UI_OPTIONS = [
  {
    number: "2",
    slug: "blockcraft",
    version: "v2",
    name: "Block Market",
    title: "A voxel-built trading world",
    tagline: "Chunky pixel borders, grass-top panels, and block-built market cards bring a voxel-game feeling to the same live trading floor.",
    highlights: ["Block-shaped company tiles and market controls", "A bright chart and trading panel with familiar game energy", "A matching voxel audience wall in both themes"],
    palette: "blockcraft",
  },
  {
    number: "3",
    slug: "arcade",
    version: "v3",
    name: "Market Mash",
    title: "A playful trading board",
    tagline: "A lively trading board keeps the fast game feeling while bringing Buy, Sell, and Short directly into the selected-stock panel.",
    highlights: ["Warm, tactile board-game cards", "Inline order controls beside the live chart", "A matching audience screen and readable dark mode"],
    palette: "mash",
  },
  {
    number: "4",
    slug: "paper",
    version: "v4",
    name: "Paper Parade",
    title: "A paper-crafted market spectacle",
    tagline: "Layered paper scenery, lively cutout shapes, and bright editorial cards turn the entire market floor into a tactile paper-craft scene.",
    highlights: ["Stacked paper cards with bold market colors", "A playful cut-paper chart stage and company tiles", "Functional order controls remain clear and easy to use"],
    palette: "paper",
  },
  {
    number: "5",
    slug: "pacman",
    version: "v5",
    name: "Market Maze",
    title: "A Pac-Man-inspired arcade floor",
    tagline: "A glowing maze, yellow hero orb, scattered pellets, and arcade-blue market cards bring classic maze-chase energy to the live round.",
    highlights: ["Maze paths and pellet details across the market floor", "A distinct arcade palette that holds up in dark mode", "The same shared market, stock list, and order controls"],
    palette: "pacman",
  },
  {
    number: "6",
    slug: "aurora",
    version: "v6",
    name: "Aurora Exchange",
    title: "A glowing festival market",
    tagline: "An aurora-lit trading floor pairs deep midnight colors with luminous glass cards, orbital accents, and a bold live-market stage.",
    highlights: ["Iridescent market lighting and floating glass cards", "A colorful chart-focused trading floor", "An audience wall that keeps the aurora look in both themes"],
    palette: "aurora",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];

export function uiVariantForVersion(version: string): UiVariant | null | undefined {
  if (version === "v1") return null;
  return UI_OPTIONS.find(option => option.version === version)?.slug;
}
