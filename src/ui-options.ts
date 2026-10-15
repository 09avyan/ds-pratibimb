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
    tagline: "A tactile paper market with a pinned-up headline board, lively cutout cards, and a warm editorial trading desk.",
    highlights: ["Layered stock cards with paper edges, tape, and print-like detail", "A market report and chart presented as a paper stage", "A matching notice-board audience wall in both themes"],
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
    name: "Neon Nights ’88",
    title: "A 1980s arcade trading floor",
    tagline: "Neon marquees, glowing arcade buttons, a sunset grid, and playful high-score market cards bring back the bright fun of the 1980s.",
    highlights: ["A retro arcade cabinet feel with hot pink, cyan, and electric yellow", "A glowing market chart and high-score style stock board", "The same neon arcade identity on the audience wall in light and dark mode"],
    palette: "aurora",
  },
  {
    number: "7",
    slug: "canopy",
    version: "v7",
    name: "Canopy Club",
    title: "A market in a glasshouse garden",
    tagline: "A bright conservatory turns company cards into lively garden markers, with leafy silhouettes, greenhouse glass, and a sunny chart wall.",
    highlights: ["Leafy, hand-shaped stock cards with every price and position detail", "A sunlit greenhouse trading desk and chart", "A lush audience garden that stays readable in dark mode"],
    palette: "canopy",
  },
  {
    number: "8",
    slug: "bluecurrent",
    version: "v8",
    name: "Blue Current",
    title: "A submersible market expedition",
    tagline: "Dive below the surface into a vivid undersea world of porthole stock cards, sonar ripples, coral color, and a captain’s chart console.",
    highlights: ["Porthole-inspired stock cards keep each logo, price, move, sector, and position visible", "A deep-sea chart console with sonar details", "An underwater audience reef in both light and dark mode"],
    palette: "bluecurrent",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];

export function uiVariantForVersion(version: string): UiVariant | null | undefined {
  if (version === "v1") return null;
  return UI_OPTIONS.find(option => option.version === version)?.slug;
}
